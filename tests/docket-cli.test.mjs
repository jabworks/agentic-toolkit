import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  resolveDocket,
  parseOpen,
  nextId,
  addItem,
  closeItem,
  checkDocket,
  scaffold,
  migrate,
} from '../skills/record/server/docket-core.mjs';
import { renderHtml } from '../skills/record/server/docket-render.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURES = path.join(__dirname, 'fixtures', 'docket');
const CLI = path.join(REPO_ROOT, 'skills', 'record', 'server', 'docket.mjs');

// Fixtures are copied per test because most ops mutate; scratch lives inside
// the repo (same pattern as condux-hooks) so path resolution stays on one fs.
function scratchCopy(fixture) {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, 'node_modules', '.dockettest-'));
  fs.cpSync(path.join(FIXTURES, fixture), dir, { recursive: true });

  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('resolveDocket detects both layouts and prefers docket/ over legacy', () => {
  const layoutA = scratchCopy('layout-a');
  const legacy = scratchCopy('legacy');
  try {
    assert.equal(resolveDocket(layoutA).layout, 'docket');
    assert.equal(resolveDocket(legacy).layout, 'legacy');

    fs.copyFileSync(path.join(legacy, 'BACKLOG.md'), path.join(layoutA, 'BACKLOG.md'));
    const both = resolveDocket(layoutA);
    assert.equal(both.layout, 'docket', 'docket/ must win when both layouts exist');
    assert.equal(both.alsoLegacy, true, 'the orphaned legacy files must be flagged');
  } finally {
    cleanup(layoutA);
    cleanup(legacy);
  }
});

test('nextId reads config in layout A, derives from observed max in legacy, refuses on drift', () => {
  const layoutA = scratchCopy('layout-a');
  const legacy = scratchCopy('legacy');
  const corrupted = scratchCopy('corrupted');
  try {
    assert.equal(nextId(resolveDocket(layoutA)), 5);
    // Legacy max is #43 in BACKLOG.md (#7 archived) — no config file exists.
    assert.equal(nextId(resolveDocket(legacy)), 44);
    assert.throws(() => nextId(resolveDocket(corrupted)), /next_id drift/, 'allocating past a hand-edit would mint a duplicate');
  } finally {
    cleanup(layoutA);
    cleanup(legacy);
    cleanup(corrupted);
  }
});

test('addItem appends to the requested section and bumps next_id', () => {
  const layoutA = scratchCopy('layout-a');
  try {
    const { id } = addItem(resolveDocket(layoutA), {
      title: 'Wire the annunciator',
      section: 'committed',
      body: 'Two lines of body.\nSecond line.',
      date: '2026-08-05',
    });
    assert.equal(id, 5);

    const text = fs.readFileSync(path.join(layoutA, 'docket', 'DOCKET.md'), 'utf8');
    assert.match(text, /### 5\. Wire the annunciator \(2026-08-05\)\n\nTwo lines of body\.\nSecond line\./);

    // The new item must land inside Committed, i.e. before the Someday heading.
    assert.ok(text.indexOf('### 5.') < text.indexOf('## Someday'), 'item landed outside its section');

    const config = JSON.parse(fs.readFileSync(path.join(layoutA, 'docket', 'docket.json'), 'utf8'));
    assert.equal(config.next_id, 6);
  } finally {
    cleanup(layoutA);
  }
});

test('addItem rejects body lines that would reparse as headings', () => {
  const layoutA = scratchCopy('layout-a');
  try {
    assert.throws(
      () => addItem(resolveDocket(layoutA), { title: 'Sneaky', body: 'fine line\n## not fine', date: '2026-08-05' }),
      /would reparse as a heading/,
    );
    // #### and below is the sanctioned Status-block level — must stay legal.
    addItem(resolveDocket(layoutA), { title: 'Fine', body: '#### Status 2026-08-05 — ok', date: '2026-08-05' });
  } finally {
    cleanup(layoutA);
  }
});

test('closeItem stamps, moves byte-identical bodies to the year archive, and reports the commit subject', () => {
  const layoutA = scratchCopy('layout-a');
  try {
    const before = parseOpen(fs.readFileSync(path.join(layoutA, 'docket', 'DOCKET.md'), 'utf8'));
    const item = before.items.find((entry) => entry.id === 1);
    const body = before.lines.slice(item.start + 1, item.end).join('\n').replace(/\n+$/, '');

    const result = closeItem(resolveDocket(layoutA), 1, { note: 'verified on preview', date: '2026-08-05' });
    assert.equal(result.commitSubject, 'docs(docket): close #1');
    assert.equal(result.archiveFile, path.join(layoutA, 'docket', 'archive', '2026.md'));

    const archive = fs.readFileSync(result.archiveFile, 'utf8');
    assert.match(archive, /^# DOCKET ARCHIVE 2026/, 'a fresh year file must get the header');
    assert.match(archive, /## 1\. Ship the widget pipeline \(2026-06-01\) — ✅ DONE 2026-08-05/);
    assert.ok(archive.includes(body), 'item body (incl. the #### Status block) must move byte-identically');
    assert.match(archive, /Verification: verified on preview/);

    const open = fs.readFileSync(path.join(layoutA, 'docket', 'DOCKET.md'), 'utf8');
    assert.doesNotMatch(open, /### 1\./, 'closed item must leave the open file');
    assert.match(open, /## Committed/, 'the emptied section heading must survive');
  } finally {
    cleanup(layoutA);
  }
});

test('closeItem works in place on a legacy layout and refuses unknown ids', () => {
  const legacy = scratchCopy('legacy');
  try {
    assert.throws(() => closeItem(resolveDocket(legacy), 999, { date: '2026-08-05' }), /#999 not found/);

    const result = closeItem(resolveDocket(legacy), 36, { date: '2026-08-05' });
    assert.equal(result.archiveFile, path.join(legacy, 'BACKLOG_ARCHIVE.md'));

    const archive = fs.readFileSync(result.archiveFile, 'utf8');
    assert.match(archive, /## 36\. Push alerting from the daemon \(2026-07-18\) — ✅ DONE 2026-08-05/);
    assert.ok(archive.includes('Legacy committed body, byte-faithful — keep this exact line.'));
  } finally {
    cleanup(legacy);
  }
});

test('checkDocket passes a clean docket and names each corruption', () => {
  const layoutA = scratchCopy('layout-a');
  const corrupted = scratchCopy('corrupted');
  try {
    assert.deepEqual(checkDocket(resolveDocket(layoutA)), { ok: true, findings: [] });

    const { ok, findings } = checkDocket(resolveDocket(corrupted));
    assert.equal(ok, false);
    const kinds = findings.map((f) => f.kind).sort();
    assert.deepEqual(kinds, ['duplicate-id', 'malformed-heading', 'next-id-drift']);
  } finally {
    cleanup(layoutA);
    cleanup(corrupted);
  }
});

test('scaffold creates the docket tree once and refuses a second run', () => {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, 'node_modules', '.dockettest-'));
  try {
    scaffold(dir, { project: 'demo', date: '2026-08-05' });
    assert.ok(fs.existsSync(path.join(dir, 'docket', 'DOCKET.md')));
    assert.ok(fs.existsSync(path.join(dir, 'docket', 'archive')));

    const config = JSON.parse(fs.readFileSync(path.join(dir, 'docket', 'docket.json'), 'utf8'));
    assert.equal(config.next_id, 1);
    assert.equal(config.created, '2026-08-05');

    const open = fs.readFileSync(path.join(dir, 'docket', 'DOCKET.md'), 'utf8');
    assert.match(open, /^# DEMO DOCKET/);
    for (const section of ['## Committed', '## Someday', '## Loose threads']) {
      assert.ok(open.includes(section), section + ' missing from scaffold');
    }

    assert.throws(() => scaffold(dir, { date: '2026-08-05' }), /already exists/);
  } finally {
    cleanup(dir);
  }
});

test('migrate converts legacy byte-faithfully and leaves the originals in place', () => {
  const legacy = scratchCopy('legacy');
  try {
    const originalArchive = fs.readFileSync(path.join(legacy, 'BACKLOG_ARCHIVE.md'));
    migrate(resolveDocket(legacy));

    const open = fs.readFileSync(path.join(legacy, 'docket', 'DOCKET.md'), 'utf8');
    assert.match(open, /^# ACME DOCKET/);
    assert.ok(open.includes('Legacy committed body, byte-faithful — keep this exact line.'));
    assert.ok(open.includes('### 1 (remainder). Open the tools to non-admin users'), 'terminus-style heading variants must survive');
    assert.ok(open.includes('## Someday / ideas'), 'original section names are preserved, not renamed');

    // The legacy archive keeps its internal close dates, so it moves whole.
    assert.ok(originalArchive.equals(fs.readFileSync(path.join(legacy, 'docket', 'archive', 'legacy.md'))));

    const config = JSON.parse(fs.readFileSync(path.join(legacy, 'docket', 'docket.json'), 'utf8'));
    assert.equal(config.next_id, 44);

    assert.ok(fs.existsSync(path.join(legacy, 'BACKLOG.md')), 'migrate must not delete the originals');
    assert.throws(() => migrate(resolveDocket(legacy)), /needs a legacy layout|already exists/);
  } finally {
    cleanup(legacy);
  }
});

test('renderHtml produces a self-contained board with anchors, archive, and stats', () => {
  const layoutA = scratchCopy('layout-a');
  try {
    const html = renderHtml(resolveDocket(layoutA), { openId: 4, date: '2026-08-05' });

    assert.match(html, /<title>ACME DOCKET<\/title>/);
    assert.match(html, /id="item-1"/, 'open items get #N anchors');
    assert.match(html, /id="item-3"/, 'archived items get anchors too');
    assert.match(html, /data-open="item-4"/, '--open must deep-link');
    assert.match(html, /<details><summary>2025/, 'archive collapses per year');
    assert.match(html, /<b>3<\/b> open/, 'open count stat');
    assert.match(html, /prefers-color-scheme:dark/, 'dark derives from the light base');

    // Self-contained: no external fetches of any kind.
    assert.doesNotMatch(html, /(?:src|href)="https?:/, 'renderer must not reference external resources');
  } finally {
    cleanup(layoutA);
  }
});

test('renderHtml shows a usable empty state on a fresh scaffold', () => {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, 'node_modules', '.dockettest-'));
  try {
    scaffold(dir, { project: 'fresh', date: '2026-08-05' });
    const html = renderHtml(resolveDocket(dir), { date: '2026-08-05' });

    assert.match(html, /Nothing on the docket yet/);
    assert.match(html, /docket add/, 'the empty state must say how to add the first item');
  } finally {
    cleanup(dir);
  }
});

test('CLI: browse writes the HTML file and prints its path', () => {
  const layoutA = scratchCopy('layout-a');
  try {
    const outFile = path.join(layoutA, 'board.html');
    const out = execFileSync(process.execPath, [CLI, 'browse', '--out', outFile], { cwd: layoutA, encoding: 'utf8' });

    assert.equal(out.trim(), outFile);
    assert.match(fs.readFileSync(outFile, 'utf8'), /^<!doctype html>/);
  } finally {
    cleanup(layoutA);
  }
});

test('CLI: next-id and add print machine-friendly output; check exits 1 on findings', () => {
  const layoutA = scratchCopy('layout-a');
  const corrupted = scratchCopy('corrupted');
  try {
    const next = execFileSync(process.execPath, [CLI, 'next-id'], { cwd: layoutA, encoding: 'utf8' });
    assert.equal(next.trim(), '5');

    const added = execFileSync(process.execPath, [CLI, 'add', 'From the CLI', '--section', 'someday'], {
      cwd: layoutA,
      encoding: 'utf8',
    });
    assert.equal(added.trim(), '5');

    const check = spawnSync(process.execPath, [CLI, 'check'], { cwd: corrupted, encoding: 'utf8' });
    assert.equal(check.status, 1, 'check must exit non-zero on findings');
    assert.match(check.stdout, /duplicate-id/);
  } finally {
    cleanup(layoutA);
    cleanup(corrupted);
  }
});
