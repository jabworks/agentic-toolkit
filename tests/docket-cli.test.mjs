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
// Every scratch dir carries a `.git` marker: resolveDocket walks up until one,
// and without it a fresh scratch dir adopts the toolkit's own dogfood docket/
// at the repo root.
function scratchDir() {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, 'node_modules', '.dockettest-'));
  fs.mkdirSync(path.join(dir, '.git'));

  return dir;
}

function scratchCopy(fixture) {
  const dir = scratchDir();
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

// docket #47: addItem appends "(date)" itself, so a hand-typed trailing date
// used to double up once close() appended its own stamp on top.
test('addItem rejects a title that already ends with a date stamp', () => {
  const layoutA = scratchCopy('layout-a');
  try {
    assert.throws(
      () => addItem(resolveDocket(layoutA), { title: 'Already dated (2026-08-21)', date: '2026-08-21' }),
      /already ends with a date stamp/,
    );
    // A parenthetical that is not a bare date must stay legal.
    addItem(resolveDocket(layoutA), { title: 'Reopen X (the 2026-07-14 falsification)', date: '2026-08-21' });
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
    // The title moves verbatim, tags included — the board counts tags on archived
  // entries, so a close that dropped them would undercount every tag pill.
  assert.match(archive, /## 1\. Ship the widget pipeline #build #ui \(2026-06-01\) — ✅ DONE 2026-08-05/);
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
  const dir = scratchDir();
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

// The board is a column per DOCKET.md section (docket #45): lede-first cards,
// a one-row header with a meta line, the archive as a drawer under the board.
// Scope pills, the stats row and the section nav are gone — the columns are
// the scopes, so the header only carries what no column says.
test('renderHtml produces a self-contained column board with cards, a drawer, and a meta line', () => {
  const layoutA = scratchCopy('layout-a');
  try {
    const html = renderHtml(resolveDocket(layoutA), { openId: 4, date: '2026-08-05' });

    assert.match(html, /<title>ACME DOCKET<\/title>/);
    assert.match(html, /data-open="item-4"/, '--open must deep-link');

    assert.match(html, /<div class="meta">[\s\S]*?<b>3<\/b> open/, 'the meta line reports the open count');
    assert.match(html, /<div class="meta">[\s\S]*?<b>1<\/b> archived/, 'the meta line reports the archived count');
    assert.match(html, /oldest <b>65d<\/b>/, 'the oldest-open age survives in the meta line');
    assert.doesNotMatch(html, /data-scope=/, 'scope pills are gone — the columns are the scopes');

    // One column per section, in file order, each head a kit g+N target.
    assert.match(html, /<section class="col" data-section="Committed">/, 'each section is a column carrying its name');
    assert.match(html, /<h2 id="sec-committed" data-kit-section>Committed<\/h2><span class="n">1<\/span>/, 'the column head carries the count');
    assert.match(html, /<h2 id="sec-loose-threads" data-kit-section>Loose threads<\/h2><span class="n zero">0<\/span>/, 'a zero count is marked');
    assert.match(html, /data-section="Loose threads">[\s\S]*?<div class="prose">/, 'section prose still renders inside its column');
    assert.doesNotMatch(html, /data-section="Loose threads">[\s\S]*?class="empty"/, 'a column with prose is not an empty slot');
    assert.ok(html.indexOf('data-section="Committed"') < html.indexOf('data-section="Someday"'), 'columns keep file order');

    // Cards: id + added date + age, a cleaned title, the first block as the
    // lede, the rest folded behind a count. Tags are discovered from `#tag` in
    // the RAW title; the leading-letter rule keeps "split from #2" out.
    assert.match(html, /<article class="card" id="item-1" data-kit-item data-tags="build ui"/, 'open cards walk with j/k and carry their tags');
    assert.match(html, /id="item-4"[^>]*data-tags=""/, 'an untagged item carries an empty tag list');
    assert.match(html, /<a class="id" href="#item-1" data-kit-copy="1">#1<\/a><span class="age">2026-06-01 · 65d<\/span>/, 'the card meta carries the added date and age');
    assert.match(html, /<h3>Ship the widget pipeline #build #ui<\/h3>/, 'the date stamp leaves the displayed title');
    assert.match(html, /<h3>Evaluate open-sourcing<\/h3>/, 'a stamp with a note in the title tail is stripped whole');
    assert.match(html, /<div class="lede"><p>First body line with <code>code<\/code> and a — dash.<\/p><\/div>/, 'the first block is the lede');
    assert.match(html, /<details class="more"><summary>Read on · 2 more<\/summary>\n<h4>Status 2026-07-01 — half landed<\/h4>/, 'the remaining blocks fold behind a count');
    assert.doesNotMatch(html, /id="item-2"[\s\S]*?<details class="more">[\s\S]*?id="item-4"/, 'a single-block body has no fold');
    // A filter that empties a populated column must say so, not leave a blank
    // lane: every column with items ships a hidden no-match slot the client
    // script reveals. Columns without items have their own slot already.
    assert.match(html, /data-section="Someday">[\s\S]*?id="item-4"[\s\S]*?<div class="empty nohit" hidden>No match in someday<\/div>\n<\/section>/, 'populated columns carry a hidden no-match slot after their cards');
    assert.doesNotMatch(html, /No match in loose threads/, 'a column with no items has no no-match slot');

    // Archive: a drawer after the board, rows that expand to the body, never a
    // peer column. Rows stay out of the j/k walk (closed <details> would let
    // it focus an invisible row).
    assert.match(html, /<\/main>\s*<details class="drawer" data-section="__archive">/, 'the archive is a drawer under the board');
    assert.match(html, /<details class="row archived" id="item-3"/, 'archived rows keep #N anchors');
    assert.doesNotMatch(html, /id="item-3"[^>]*data-kit-item/, 'archived rows stay out of the j/k walk');
    assert.match(html, /<span class="y">2025<\/span>/, 'a row names its archive year');
    assert.match(html, /<div class="body"><p>Archived body.<\/p>/, 'a row opens to the full body');

    // Filter: hidden until toggled; the kit's / binding targets the button
    // because a hidden input cannot take focus.
    assert.match(html, /id="filter"[^>]*hidden>/, 'the search box starts collapsed');
    assert.match(html, /data-kit-filter[^>]*aria-controls="filter"[^>]*aria-expanded="false"/, 'the Filter button reveals it and reports its state');

    assert.match(html, /<div class="tags"/, 'a docket that uses tags gets a tag row');
    assert.match(html, /data-tag="build" data-total="1"/, 'each tag pill carries its own total');
    assert.match(html, /data-tag="research"/, 'tags are discovered across sections');
    assert.doesNotMatch(html, /data-tag="2"/, 'a numeric #N cross-reference is an id, not a tag');
    // The board adopted the shared token core (docket #21), which is dark-base
    // with a light override — the reverse of the dialect this used to assert.
    assert.match(html, /@media \(prefers-color-scheme: light\)/, 'light derives from the shared dark base');

    // Self-contained: no external fetches of any kind.
    assert.doesNotMatch(html, /(?:src|href)="https?:/, 'renderer must not reference external resources');
  } finally {
    cleanup(layoutA);
  }
});

test('renderHtml shows a usable empty state on a fresh scaffold', () => {
  const dir = scratchDir();
  try {
    scaffold(dir, { project: 'fresh', date: '2026-08-05' });
    const html = renderHtml(resolveDocket(dir), { date: '2026-08-05' });

    assert.match(html, /Nothing on the docket yet/);
    assert.match(html, /docket add/, 'the empty state must say how to add the first item');
    // A section with no items and no prose is a quiet slot, never hidden:
    // "nothing committed" is information (docket #44, closed by decision).
    assert.match(html, /<div class="empty">Nothing in committed<\/div>/, 'an empty section renders as a slot');
  } finally {
    cleanup(dir);
  }
});

// docket #47: the close stamp ("— ✅ DONE <date>") is not a date-parenthetical,
// so it must never be treated as the trailing group STAMP_TAIL_RE strips — but
// it also must not shield a filed date immediately ahead of it from being
// stripped, which is exactly what let the old duplicate through.
test('renderHtml strips a filed date immediately before the close stamp, keeps the stamp, and leaves other parens alone', () => {
  const dir = scratchDir();
  try {
    scaffold(dir, { project: 'probe', date: '2026-08-01' });
    fs.mkdirSync(path.join(dir, 'docket', 'archive'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'docket', 'archive', '2026.md'),
      [
        '# DOCKET ARCHIVE 2026',
        '',
        'Closed items.',
        '',
        '## 1. Retire the legacy exporter (2026-08-05) — ✅ DONE 2026-08-21',
        '',
        'Verification: shipped',
        '',
        // Pre-guard data (written before docket #47's addItem check existed) —
        // the render must still clean this up on read, not just refuse new ones.
        '## 2. Legacy duplicate (2026-08-21) (2026-08-21) — ✅ DONE 2026-08-21',
        '',
        'Verification: shipped',
        '',
        '## 3. Reopen A4 collision detection (the 2026-07-14 falsification) — ✅ DONE 2026-08-21',
        '',
        'Verification: shipped',
        '',
      ].join('\n'),
    );

    const html = renderHtml(resolveDocket(dir), { date: '2026-08-21' });

    assert.match(html, /<span class="t">Retire the legacy exporter — ✅ DONE 2026-08-21<\/span>/, 'the filed date ahead of the stamp is stripped, the stamp survives');
    assert.match(html, /<span class="t">Legacy duplicate — ✅ DONE 2026-08-21<\/span>/, 'both stacked dates from pre-guard data are stripped, not just one');
    assert.match(html, /<span class="t">Reopen A4 collision detection \(the 2026-07-14 falsification\) — ✅ DONE 2026-08-21<\/span>/, 'a non-date parenthetical elsewhere in the title survives untouched');
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

// A qualified id slot (`### 1 (remainder).`) references a parent item instead
// of allocating a new id — the terminus partial-ship convention, which the
// parser and migrate already tolerated while check reported it as corruption.
test('a qualified id references its parent instead of duplicating it', () => {
  const dir = scratchCopy('qualified');
  try {
    const result = checkDocket(resolveDocket(dir));

    assert.deepEqual(result, { ok: true, findings: [] },
      'the parent/slice convention is legal, not corruption');
  } finally {
    cleanup(dir);
  }
});

test('duplicate detection still fires on bare ids', () => {
  const dir = scratchCopy('corrupted');
  try {
    const { findings } = checkDocket(resolveDocket(dir));
    const duplicates = findings.filter((finding) => finding.kind === 'duplicate-id');

    assert.equal(duplicates.length, 1, 'two bare `### 2.` headings are still a collision');
    assert.equal(duplicates[0].id, 2);
  } finally {
    cleanup(dir);
  }
});

test('a reference with no allocated parent is reported', () => {
  const dir = scratchCopy('orphan-ref');
  try {
    const { ok, findings } = checkDocket(resolveDocket(dir));

    assert.equal(ok, false);
    assert.deepEqual(findings.map((finding) => finding.kind), ['orphan-reference']);
    assert.equal(findings[0].id, 99);
    assert.match(findings[0].message, /99 \(remainder\)/);
  } finally {
    cleanup(dir);
  }
});

test('close resolves a qualified item by number when only one open item carries it', () => {
  const dir = scratchCopy('qualified');
  try {
    // The terminus case: open `1 (remainder)` against archived bare `1`.
    const result = closeItem(resolveDocket(dir), 1, { note: 'verified', date: '2026-08-06' });
    const archive = fs.readFileSync(path.join(dir, 'docket', 'archive', '2026.md'), 'utf8');

    assert.match(archive, /## 1 \(remainder\)\. Open the agentic tools/,
      'the qualifier must survive into the archive entry');
    assert.equal(result.id, 1);
  } finally {
    cleanup(dir);
  }
});

test('close refuses an ambiguous id instead of archiving the wrong item', () => {
  const dir = scratchCopy('qualified');
  try {
    const openFile = path.join(dir, 'docket', 'DOCKET.md');
    fs.appendFileSync(openFile, '\n### 1 (second slice). A rival claim on the same number (2026-07-20)\n\nBody.\n');

    assert.throws(
      () => closeItem(resolveDocket(dir), 1, { note: '', date: '2026-08-06' }),
      /ambiguous/,
      'two open items numbered 1 must not resolve to a silent first match',
    );

    // The escape hatch the error points at.
    const result = closeItem(resolveDocket(dir), '1 (second slice)', { note: '', date: '2026-08-06' });
    assert.equal(result.id, 1);

    const stillOpen = fs.readFileSync(openFile, 'utf8');
    assert.match(stillOpen, /### 1 \(remainder\)\./, 'the other claimant must be untouched');
  } finally {
    cleanup(dir);
  }
});

// Docket #43: mdLite had no table support, so a markdown table in an item body
// rendered as literal pipe text. Nine tables were affected across the dogfood
// docket, eight of them in the archive — which is why the alternative fix
// (convention: use lists) was rejected. Rewriting them means rewriting the
// record of closed work.
function withBody(body) {
  const dir = scratchDir();
  fs.mkdirSync(path.join(dir, 'docket'));
  fs.writeFileSync(
    path.join(dir, 'docket', 'docket.json'),
    JSON.stringify({ version: 1, next_id: 2, sections: ['Someday'], created: '2026-08-25' }),
  );
  fs.writeFileSync(
    path.join(dir, 'docket', 'DOCKET.md'),
    `# T DOCKET\n\n## Someday\n\n### 1. An item (2026-08-25)\n\n${body}\n`,
  );
  return dir;
}

test('mdLite renders a pipe table as a table, not as literal pipe text (docket #43)', () => {
  const dir = withBody(
    'Lede.\n\n| idea | what it does |\n|---|---|\n| semantic compare | judged by `meaning` |\n| containment | one **open** issue |\n\nTrailing paragraph.',
  );
  try {
    const html = renderHtml(resolveDocket(dir), { date: '2026-08-25' });
    // data-search deliberately carries the RAW body so search matches what the
    // author typed — delimiter row included. Scope the absence checks to
    // rendered output or they read their own search index back.
    const rendered = html.replaceAll(/ data-search="[^"]*"/g, '');

    assert.match(html, /<div class="tbl"><table>/, 'the table is wrapped so a narrow card scrolls it');
    assert.match(html, /<thead><tr><th>idea<\/th><th>what it does<\/th><\/tr><\/thead>/);
    assert.match(html, /<td>semantic compare<\/td><td>judged by <code>meaning<\/code><\/td>/, 'inline markup still runs inside cells');
    assert.match(html, /<td>containment<\/td><td>one <strong>open<\/strong> issue<\/td>/);
    assert.doesNotMatch(rendered, /<p>\s*\|/, 'no row may survive as a paragraph');
    assert.doesNotMatch(rendered, /\|---\|/, 'the delimiter row is consumed, never printed');

    // The table is a block boundary in both directions — the paragraph after it
    // must not be swallowed, which is what happens without an explicit flush on
    // the first non-row line (a table has no blank-line terminator).
    assert.match(html, /<p>Trailing paragraph\.<\/p>/, 'the block after a table survives');
  } finally {
    cleanup(dir);
  }
});

test('mdLite leaves pipe text that is not a table alone (docket #43)', () => {
  // No delimiter row: this is prose that happens to contain pipes, and it
  // rendered as a paragraph before the table support existed. It still must.
  const dir = withBody('| not | a table |\nstill the same paragraph.');
  try {
    const html = renderHtml(resolveDocket(dir), { date: '2026-08-25' });
    assert.match(html, /<p>\| not \| a table \| still the same paragraph\.<\/p>/);
    assert.doesNotMatch(html, /<table>/, 'a delimiter row is what makes a table');
  } finally {
    cleanup(dir);
  }
});

test('mdLite table handles escaped pipes, ragged rows, alignment, and EOF (docket #43)', () => {
  const dir = withBody(
    '| a | b |\n|:--|--:|\n| has \\| pipe | two |\n| short |\n| x | y | extra |',
  );
  try {
    const html = renderHtml(resolveDocket(dir), { date: '2026-08-25' });
    const rendered = html.replaceAll(/ data-search="[^"]*"/g, '');

    // An escaped pipe is cell content, not a column break — the same rule
    // spec-index.test.mjs applies when reading the generated catalog.
    assert.match(html, /<td>has \| pipe<\/td><td>two<\/td>/, 'an escaped pipe stays inside its cell');
    // A short row is padded so the grid stays rectangular.
    assert.match(html, /<tr><td>short<\/td><td><\/td><\/tr>/, 'a ragged row is padded, not dropped');
    // A long row keeps its extra cell — dropping one loses authored content.
    assert.match(html, /<tr><td>x<\/td><td>y<\/td><td>extra<\/td><\/tr>/, 'an over-long row keeps every cell');
    // Alignment colons parse and are ignored; the row never reaches the output.
    assert.doesNotMatch(rendered, /:--/, 'an alignment delimiter is still a delimiter');
    // The table is the last block in the body — it must still close.
    assert.match(html, /<\/table><\/div>/, 'a table at end of body still flushes');
  } finally {
    cleanup(dir);
  }
});
