import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { tierPaths } from '../skills/concord/lib/paths.mjs';
import { atomicWrite } from '../skills/concord/lib/store.mjs';
import { composeRecall, DEFAULT_LIMIT } from '../skills/concord/lib/budget.mjs';

const NOW = new Date('2026-07-27T12:00:00.000Z');

function freshPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-budget-'));
  return tierPaths(path.join(dir, '.concord'));
}

/** A global-notes file that does not depend on the caller's real CODEX_HOME. */
function notesFile(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-notes-'));
  const file = path.join(dir, 'notes.md');
  if (contents !== undefined) fs.writeFileSync(file, contents);
  return file;
}

function lines(prefix, n) {
  return Array.from({ length: n }, (_, i) => `- ${prefix} ${i}`).join('\n') + '\n';
}

// --- empty -------------------------------------------------------------------

test('no memory produces no output at all', () => {
  const out = composeRecall(freshPaths(), { now: NOW, globalNotes: notesFile() });
  assert.equal(out, '', 'an empty plugin should be invisible');
});

test('whitespace-only tiers still count as empty', () => {
  const p = freshPaths();
  atomicWrite(p.pinned, '   \n\n');
  atomicWrite(p.recent, '\n');
  assert.equal(composeRecall(p, { now: NOW, globalNotes: notesFile('  \n') }), '');
});

// --- ordering ----------------------------------------------------------------

test('sections appear in order: pinned, preferences, recent, today', () => {
  const p = freshPaths();
  atomicWrite(p.pinned, '- pinned fact\n');
  atomicWrite(p.recent, '- recent work\n');
  atomicWrite(path.join(p.days, '2026-07-27.md'), '# 2026-07-27\n\n- 10:00 today work\n');
  const notes = notesFile('- prefers tabs\n');

  const out = composeRecall(p, { now: NOW, globalNotes: notes });
  const order = ['## Pinned', '## Preferences', '## Recent', '## Today'].map((h) => out.indexOf(h));

  assert.ok(order.every((i) => i >= 0), 'every populated section is present');
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'sections are in the documented order');
});

test('absent sections are omitted rather than emitted empty', () => {
  const p = freshPaths();
  atomicWrite(p.pinned, '- only pinned\n');
  const out = composeRecall(p, { now: NOW, globalNotes: notesFile() });

  assert.match(out, /## Pinned/);
  assert.doesNotMatch(out, /## Preferences/);
  assert.doesNotMatch(out, /## Recent/);
  assert.doesNotMatch(out, /## Today/);
});

// --- budget ------------------------------------------------------------------

test('output respects the budget when the aging tiers are oversized', () => {
  const p = freshPaths();
  atomicWrite(p.recent, lines('recent', 400));
  atomicWrite(path.join(p.days, '2026-07-27.md'), lines('today', 400));

  const out = composeRecall(p, { limit: 500, now: NOW, globalNotes: notesFile() });
  assert.ok(out.length <= 500, `expected <= 500 chars, got ${out.length}`);
});

test('trimming is oldest-first: today survives, recent gives way', () => {
  const p = freshPaths();
  atomicWrite(p.recent, lines('recent', 200));
  atomicWrite(path.join(p.days, '2026-07-27.md'), '# 2026-07-27\n\n- 10:00 todays work\n');

  const out = composeRecall(p, { limit: 300, now: NOW, globalNotes: notesFile() });
  assert.match(out, /todays work/, "today's detail is kept");
  assert.ok(out.length <= 300);
});

test('pinned and preferences are exempt and survive a budget that excludes everything else', () => {
  const p = freshPaths();
  atomicWrite(p.pinned, '- deploys need the VPN\n');
  atomicWrite(p.recent, lines('recent', 500));
  const notes = notesFile('- prefers named exports\n');

  const out = composeRecall(p, { limit: 120, now: NOW, globalNotes: notes });
  assert.match(out, /deploys need the VPN/, 'pinned is never trimmed');
  assert.match(out, /prefers named exports/, 'preferences are never trimmed');
});

test('exempt tiers exceeding the budget are emitted anyway, with an overflow note', () => {
  const p = freshPaths();
  atomicWrite(p.pinned, lines('pinned fact', 200));

  const out = composeRecall(p, { limit: 100, now: NOW, globalNotes: notesFile() });
  assert.match(out, /pinned fact 199/, 'the exempt tier is emitted in full');
  assert.match(out, /consider pruning/, 'the overflow is surfaced, not hidden');
  assert.ok(out.length > 100, 'exempt really does mean exempt');
});

// --- clipping ----------------------------------------------------------------

test('clipping happens on line boundaries and keeps the newest lines', () => {
  const p = freshPaths();
  atomicWrite(p.recent, lines('recent', 300));

  const out = composeRecall(p, { limit: 400, now: NOW, globalNotes: notesFile() });
  const body = out.split('\n').filter((l) => l.startsWith('- recent'));

  assert.ok(body.length > 0, 'something survived');
  assert.ok(
    body.every((l) => /^- recent \d+$/.test(l)),
    'no line was cut mid-way',
  );

  // Newest lines are the ones kept.
  const kept = body.map((l) => Number(l.split(' ')[2]));
  assert.equal(Math.max(...kept), 299, 'the newest line survives');
  assert.ok(Math.min(...kept) > 0, 'the oldest lines were dropped');
  assert.match(out, /…/, 'elision is visible, not silent');
});

test('a section that cannot fit even one line is dropped rather than emitted as a fragment', () => {
  const p = freshPaths();
  atomicWrite(p.pinned, '- p\n');
  atomicWrite(p.recent, `- ${'x'.repeat(400)}\n`);

  const out = composeRecall(p, { limit: 40, now: NOW, globalNotes: notesFile() });
  assert.doesNotMatch(out, /xxxx/, 'no partial line leaked through');
});

test('multi-byte content is never cut mid-character', () => {
  const p = freshPaths();
  atomicWrite(p.recent, Array.from({ length: 200 }, (_, i) => `- 日本語テスト ${i}`).join('\n') + '\n');

  const out = composeRecall(p, { limit: 300, now: NOW, globalNotes: notesFile() });
  assert.equal(out, Buffer.from(out, 'utf8').toString('utf8'), 'no replacement characters');
  assert.doesNotMatch(out, /�/);
});

// --- defaults ----------------------------------------------------------------

test('the default budget is applied when none is given', () => {
  const p = freshPaths();
  atomicWrite(p.recent, lines('recent', 2000));
  const out = composeRecall(p, { now: NOW, globalNotes: notesFile() });
  assert.ok(out.length <= DEFAULT_LIMIT, `expected <= ${DEFAULT_LIMIT}, got ${out.length}`);
});
