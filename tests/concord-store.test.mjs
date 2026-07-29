import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { tierPaths } from '../skills/concord/lib/paths.mjs';
import {
  RECENT_DAYS,
  appendBuffer,
  appendPinned,
  atomicWrite,
  entryId,
  promote,
  readState,
  readTier,
  readToday,
  writeState,
} from '../skills/concord/lib/store.mjs';

// --- helpers -----------------------------------------------------------------

function freshPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-store-'));
  return tierPaths(path.join(dir, '.concord'));
}

function entry(kind, text, at, tool) {
  return { at, kind, text, ...(tool ? { tool } : {}) };
}

const AT = '2026-07-27T10:30:00.000Z';
const NOW = new Date('2026-07-27T12:00:00.000Z');

function daysAgo(n, from = NOW) {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- atomic writes -----------------------------------------------------------

test('atomicWrite creates parent directories and leaves no temp file behind', () => {
  const p = freshPaths();
  const nested = path.join(p.dir, 'a', 'b', 'c.md');
  atomicWrite(nested, 'hello\n');

  assert.equal(fs.readFileSync(nested, 'utf8'), 'hello\n');
  assert.deepEqual(
    fs.readdirSync(path.dirname(nested)).filter((f) => f.includes('.tmp')),
    [],
  );
});

test('a reader never observes a partially written file', () => {
  // Atomicity means the target either has the old bytes or the new ones. The
  // temp file is what absorbs the partial state, and it is never at the target
  // path — so a concurrent reader cannot see a half-written tier.
  const p = freshPaths();
  atomicWrite(p.recent, 'v1\n');
  const before = fs.readFileSync(p.recent, 'utf8');
  atomicWrite(p.recent, 'v2-longer-content\n');
  const after = fs.readFileSync(p.recent, 'utf8');

  assert.equal(before, 'v1\n');
  assert.equal(after, 'v2-longer-content\n');
});

// --- self-ignoring -----------------------------------------------------------

test('the memory dir ignores itself on creation, whichever writer gets there first', () => {
  // The hooks create this directory on the first session, before any agent has
  // read SKILL.md. The tiers hold verbatim prompts, so this cannot depend on an
  // agent remembering to edit the repo's .gitignore.
  const writers = [
    ['appendBuffer', (p) => appendBuffer(p, [entry('user', 'secret prompt', AT)], NOW)],
    ['appendPinned', (p) => appendPinned(p, 'a fact', NOW)],
    ['writeState', (p) => writeState(p, { rollouts: {}, lastConsolidated: null, skippedSubagents: 0 })],
    ['promote', (p) => promote(p, NOW)],
  ];

  for (const [name, write] of writers) {
    const p = freshPaths();
    write(p);
    const marker = path.join(p.dir, '.gitignore');
    assert.ok(fs.existsSync(marker), `${name} left the memory dir un-ignored`);
    assert.equal(fs.readFileSync(marker, 'utf8'), '*\n', `${name}: wrong ignore contents`);
  }
});

test('an existing .gitignore in the memory dir is never overwritten', () => {
  const p = freshPaths();
  fs.mkdirSync(p.dir, { recursive: true });
  fs.writeFileSync(path.join(p.dir, '.gitignore'), '# hand-tuned\n*\n!keep.md\n');

  appendBuffer(p, [entry('user', 'work', AT)], NOW);
  assert.match(fs.readFileSync(path.join(p.dir, '.gitignore'), 'utf8'), /hand-tuned/);
});

// --- state -------------------------------------------------------------------

test('state round-trips', () => {
  const p = freshPaths();
  const state = {
    rollouts: { abc: { path: '/tmp/r.jsonl', line: 42 } },
    lastConsolidated: '2026-07-27T00:00:00.000Z',
    skippedSubagents: 3,
  };
  writeState(p, state);
  assert.deepEqual(readState(p), state);
});

test('a missing or corrupt state.json degrades to amnesia, never a throw', () => {
  const p = freshPaths();
  assert.deepEqual(readState(p), { rollouts: {}, lastConsolidated: null, skippedSubagents: 0 });

  for (const junk of ['not json', '[]', 'null', '{"rollouts": "nope"}']) {
    atomicWrite(p.state, junk);
    const s = readState(p);
    assert.deepEqual(s.rollouts, {}, `corrupt state (${junk}) yields empty rollouts`);
    assert.equal(s.lastConsolidated, null);
  }
});

// --- buffer ------------------------------------------------------------------

test('appendBuffer writes entries and suppresses exact duplicates', () => {
  const p = freshPaths();
  const entries = [entry('user', 'Add a health check', AT), entry('agent', 'Done.', AT)];

  assert.equal(appendBuffer(p, entries, NOW), 2);
  assert.equal(appendBuffer(p, entries, NOW), 0, 're-appending the same entries writes nothing');

  const text = readTier(p.buffer);
  assert.equal(text.match(/Add a health check/g).length, 1);
  assert.ok(text.includes(`<!--c:${entryId(entries[0])}-->`));
});

test('buffer lines carry the full date so a session spanning midnight files correctly', () => {
  const p = freshPaths();
  appendBuffer(p, [entry('user', 'late night', '2026-07-26T23:59:00.000Z')], NOW);
  assert.match(readTier(p.buffer), /^- 2026-07-26 \d\d:\d\d /m);
});

test('appendBuffer on an empty list is a no-op', () => {
  const p = freshPaths();
  assert.equal(appendBuffer(p, [], NOW), 0);
  assert.equal(appendBuffer(p, undefined, NOW), 0);
  assert.equal(fs.existsSync(p.buffer), false);
});

// --- promotion ---------------------------------------------------------------

test('promote flushes the buffer into per-day files and clears the buffer', () => {
  const p = freshPaths();
  appendBuffer(p, [entry('user', 'work', AT)], NOW);

  const { promoted } = promote(p, NOW);
  assert.deepEqual(promoted, ['2026-07-27']);
  assert.equal(readTier(p.buffer), '', 'buffer is cleared only after the day file is durable');
  assert.match(readTier(path.join(p.days, '2026-07-27.md')), /# 2026-07-27/);
  assert.match(readTier(path.join(p.days, '2026-07-27.md')), /\*\*user\*\* work/);
});

test('entries are filed under their OWN date, not the promotion date', () => {
  const p = freshPaths();
  appendBuffer(
    p,
    [
      entry('user', 'before midnight', '2026-07-26T23:50:00.000Z'),
      entry('agent', 'after midnight', '2026-07-27T00:10:00.000Z'),
    ],
    NOW,
  );
  promote(p, NOW);

  assert.match(readTier(path.join(p.days, '2026-07-26.md')), /before midnight/);
  assert.match(readTier(path.join(p.days, '2026-07-27.md')), /after midnight/);
});

test('promotion is idempotent — running it twice changes nothing', () => {
  const p = freshPaths();
  appendBuffer(p, [entry('user', 'work', AT)], NOW);
  promote(p, NOW);
  const first = readTier(path.join(p.days, '2026-07-27.md'));

  promote(p, NOW);
  assert.equal(readTier(path.join(p.days, '2026-07-27.md')), first);
});

test('a crash between the two promotion writes duplicates nothing on retry', () => {
  // Simulate copy-then-truncate interrupted after the copy: the day file has the
  // content, the buffer still does too. The retry must not double it.
  const p = freshPaths();
  const e = entry('user', 'work', AT);
  appendBuffer(p, [e], NOW);
  const bufferContents = readTier(p.buffer);

  promote(p, NOW);
  atomicWrite(p.buffer, bufferContents); // the crash: source never got cleared

  promote(p, NOW);
  const day = readTier(path.join(p.days, '2026-07-27.md'));
  assert.equal(day.match(/\*\*user\*\* work/g).length, 1, 'entry appears exactly once');
});

test('promote creates its directories and survives a completely empty store', () => {
  const p = freshPaths();
  const result = promote(p, NOW);
  assert.deepEqual(result, { promoted: [], archived: [] });
  assert.ok(fs.existsSync(p.days));
});

// --- aging -------------------------------------------------------------------

test('day files past the recent window move to the archive and are removed', () => {
  const p = freshPaths();
  const old = daysAgo(RECENT_DAYS + 1);
  const oldDate = isoDate(old);

  appendBuffer(p, [entry('user', 'ancient work', old.toISOString())], NOW);
  promote(p, NOW);

  assert.equal(fs.existsSync(path.join(p.days, `${oldDate}.md`)), false, 'day file removed');
  const archive = readTier(p.archive);
  assert.match(archive, /ancient work/);
  assert.ok(archive.includes(`<!--d:${oldDate}-->`), 'archived day carries its marker');
});

test('archiving is idempotent — a retried pass does not append the day twice', () => {
  const p = freshPaths();
  const old = daysAgo(RECENT_DAYS + 1);
  appendBuffer(p, [entry('user', 'ancient work', old.toISOString())], NOW);
  promote(p, NOW);

  const archiveAfterFirst = readTier(p.archive);
  // Put the day file back, as a partially-completed archive pass would leave it.
  atomicWrite(path.join(p.days, `${isoDate(old)}.md`), `# ${isoDate(old)}\n\n- 10:00 **user** ancient work\n`);
  promote(p, NOW);

  assert.equal(readTier(p.archive), archiveAfterFirst, 'archive unchanged on retry');
});

test('recent.md is derived from the surviving day files, so it cannot drift', () => {
  const p = freshPaths();
  appendBuffer(p, [entry('user', 'day one', daysAgo(2).toISOString())], NOW);
  promote(p, NOW);
  appendBuffer(p, [entry('user', 'day two', daysAgo(1).toISOString())], NOW);
  promote(p, NOW);

  const recent = readTier(p.recent);
  assert.match(recent, /day one/);
  assert.match(recent, /day two/);

  // Regenerated, never appended — so repeated promotes cannot duplicate it.
  promote(p, NOW);
  promote(p, NOW);
  assert.equal(readTier(p.recent).match(/day one/g).length, 1);
});

test("recent.md excludes today, so recall does not inject today's entries twice", () => {
  // "Recent" and "Today" are separate recall sections. If recent.md included
  // today's day file, every session start would spend budget rendering the same
  // entries in both.
  const p = freshPaths();
  appendBuffer(p, [entry('user', 'yesterday work', daysAgo(1).toISOString())], NOW);
  appendBuffer(p, [entry('user', 'today work', NOW.toISOString())], NOW);
  promote(p, NOW);

  const recent = readTier(p.recent);
  assert.match(recent, /yesterday work/, 'earlier days are the point of recent.md');
  assert.doesNotMatch(recent, /today work/, "today is rendered by readToday, not recent.md");

  // Today is still reachable — just from the tier that owns it.
  assert.match(readToday(p, NOW), /today work/);
});

test('recent.md is empty when today is the only day of history', () => {
  const p = freshPaths();
  appendBuffer(p, [entry('user', 'today work', NOW.toISOString())], NOW);
  promote(p, NOW);
  assert.equal(readTier(p.recent).trim(), '');
});

test('recent.md drops content once it ages into the archive', () => {
  const p = freshPaths();
  appendBuffer(p, [entry('user', 'ancient work', daysAgo(RECENT_DAYS + 1).toISOString())], NOW);
  promote(p, NOW);

  assert.doesNotMatch(readTier(p.recent), /ancient work/);
  assert.match(readTier(p.archive), /ancient work/);
});

// --- pinned ------------------------------------------------------------------

test('pinned entries are dated, appended, and never touched by promotion', () => {
  const p = freshPaths();
  assert.equal(appendPinned(p, 'Deploys need the VPN', NOW), true);
  assert.equal(appendPinned(p, 'Staging DB resets nightly', NOW), true);

  const before = readTier(p.pinned);
  assert.match(before, /- 2026-07-27 Deploys need the VPN/);

  appendBuffer(p, [entry('user', 'work', AT)], NOW);
  promote(p, NOW);
  promote(p, NOW);

  assert.equal(readTier(p.pinned), before, 'promotion never rewrites pinned.md');
});

test('empty pinned text is rejected rather than written as a blank line', () => {
  const p = freshPaths();
  assert.equal(appendPinned(p, '   ', NOW), false);
  assert.equal(appendPinned(p, null, NOW), false);
  assert.equal(fs.existsSync(p.pinned), false);
});

// --- today -------------------------------------------------------------------

test("readToday combines today's day file and the live buffer, in order", () => {
  const p = freshPaths();
  appendBuffer(p, [entry('user', 'earlier', AT)], NOW);
  promote(p, NOW);
  appendBuffer(p, [entry('agent', 'later', AT)], NOW);

  const today = readToday(p, NOW);
  assert.ok(today.indexOf('earlier') < today.indexOf('later'), 'promoted work precedes live buffer');
});

test('readToday is empty when nothing has happened', () => {
  assert.equal(readToday(freshPaths(), NOW), '');
});
