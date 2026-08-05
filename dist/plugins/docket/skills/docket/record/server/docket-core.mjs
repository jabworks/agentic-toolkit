// Core model + mechanical ops for a docket (file-based backlog). Everything
// that must be byte-exact or collision-proof lives here — the CLI, the MCP
// server, and the renderer are thin wrappers so the three surfaces can never
// disagree on behaviour.
//
// Two layouts are understood:
//   docket  <root>/docket/{DOCKET.md, archive/<year>.md, docket.json}
//   legacy  <root>/BACKLOG.md (+ optional BACKLOG_ARCHIVE.md) — the terminus
//           shape, usable in place so adopting the skill never forces a move.
//
// Dates are always injected by callers: the CLI passes today, tests pass
// fixtures. Nothing in here reads the clock — clock-dependent behaviour is
// how the concord suite broke (b94a630).

import fs from 'node:fs';
import path from 'node:path';

// `### 47. Title (2026-07-23)` — also tolerates the terminus variants
// `### 1 (remainder). Title` and `### 24 (follow-ups). Title`.
const ITEM_RE = /^###\s+(\d+(?:\s*\([^)]*\))?)\.\s+(.*)$/;
// Archive entries are `## 47. Title — ✅ DONE 2026-08-05`.
const ARCHIVE_ENTRY_RE = /^##\s+(\d+(?:\s*\([^)]*\))?)\.\s+/;
// A section heading is any `## ` line that is not a numbered archive entry.
const SECTION_RE = /^##\s+(.+)$/;
// An item block ends at the next `## ` or `### ` heading — `#### Status`
// follow-ups belong to the item above them.
const BLOCK_END_RE = /^#{2,3}\s/;

const DEFAULT_SECTIONS = ['Committed', 'Someday', 'Loose threads'];

export function resolveDocket(cwd) {
  let dir = path.resolve(cwd);

  // Nearest marker wins on the way up; `.git` is the stop so a docket in a
  // parent checkout is never silently adopted by a nested repo.
  while (true) {
    const hasDocket = fs.existsSync(path.join(dir, 'docket', 'DOCKET.md'));
    const hasLegacy = fs.existsSync(path.join(dir, 'BACKLOG.md'));

    if (hasDocket || hasLegacy) {
      return makeHandle(dir, hasDocket ? 'docket' : 'legacy', hasDocket && hasLegacy);
    }
    if (fs.existsSync(path.join(dir, '.git'))) {
      return makeHandle(dir, null, false);
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return makeHandle(path.resolve(cwd), null, false);
    }
    dir = parent;
  }
}

function makeHandle(root, layout, alsoLegacy) {
  const paths = layout === 'docket'
    ? {
        dir: path.join(root, 'docket'),
        open: path.join(root, 'docket', 'DOCKET.md'),
        archiveDir: path.join(root, 'docket', 'archive'),
        config: path.join(root, 'docket', 'docket.json'),
      }
    : layout === 'legacy'
      ? {
          open: path.join(root, 'BACKLOG.md'),
          archive: path.join(root, 'BACKLOG_ARCHIVE.md'),
        }
      : {};

  return { root, layout, paths, alsoLegacy };
}

function requireLayout(d) {
  if (d.layout === null) {
    throw new Error('no docket found — run `scaffold` first (looked for docket/DOCKET.md and BACKLOG.md up to ' + d.root + ')');
  }
}

export function archiveFiles(d) {
  if (d.layout === 'docket') {
    if (!fs.existsSync(d.paths.archiveDir)) return [];

    return fs
      .readdirSync(d.paths.archiveDir)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((f) => path.join(d.paths.archiveDir, f));
  }

  return fs.existsSync(d.paths.archive) ? [d.paths.archive] : [];
}

export function parseOpen(text) {
  const lines = text.split('\n');
  const sections = [];
  const items = [];

  for (let i = 0; i < lines.length; i++) {
    const section = lines[i].match(SECTION_RE);

    if (section && !ARCHIVE_ENTRY_RE.test(lines[i])) {
      if (sections.length > 0) sections[sections.length - 1].end = i;
      sections.push({ name: section[1].trim(), start: i, end: lines.length });
      continue;
    }

    const item = lines[i].match(ITEM_RE);

    if (item) {
      let end = i + 1;
      while (end < lines.length && !BLOCK_END_RE.test(lines[end])) end++;
      items.push({
        idPart: item[1],
        id: parseInt(item[1], 10),
        title: item[2],
        start: i,
        end,
        section: sections.length > 0 ? sections[sections.length - 1].name : null,
      });
    }
  }

  return { lines, sections, items };
}

export function collectIds(d) {
  requireLayout(d);
  const ids = [];
  const open = parseOpen(fs.readFileSync(d.paths.open, 'utf8'));

  for (const item of open.items) {
    ids.push({ id: item.id, source: d.paths.open });
  }
  for (const file of archiveFiles(d)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const entry = line.match(ARCHIVE_ENTRY_RE);
      if (entry) ids.push({ id: parseInt(entry[1], 10), source: file });
    }
  }

  return ids;
}

function readConfig(d) {
  return JSON.parse(fs.readFileSync(d.paths.config, 'utf8'));
}

function writeConfig(d, config) {
  fs.writeFileSync(d.paths.config, JSON.stringify(config, null, 2) + '\n');
}

export function nextId(d) {
  requireLayout(d);
  const maxObserved = collectIds(d).reduce((max, entry) => Math.max(max, entry.id), 0);

  if (d.layout === 'legacy') return maxObserved + 1;

  const config = readConfig(d);

  // Allocating past a hand-edit would mint a duplicate id into commit
  // history, which is unrecoverable — refuse and point at `check` instead.
  if (config.next_id <= maxObserved) {
    throw new Error(
      'next_id drift: docket.json says ' + config.next_id + ' but #' + maxObserved + ' already exists — run `check`',
    );
  }

  return config.next_id;
}

function findSection(sections, key) {
  const wanted = key.toLowerCase();

  return sections.find((s) => s.name.toLowerCase().startsWith(wanted)) ?? null;
}

export function addItem(d, { title, section = 'someday', body = '', date }) {
  requireLayout(d);
  if (!title || !date) throw new Error('addItem needs a title and an injected date');

  // A body line that looks like a section or item heading would reparse as
  // one on the next read — corrupting the model silently. Bodies use #### and
  // below (the Status-block level); reject anything higher.
  const badLine = body.split('\n').find((line) => /^#{1,3}\s/.test(line));
  if (badLine !== undefined) {
    throw new Error('body line "' + badLine + '" would reparse as a heading — use #### or lower inside item bodies');
  }

  const id = nextId(d);
  const open = parseOpen(fs.readFileSync(d.paths.open, 'utf8'));
  const target = findSection(open.sections, section);

  if (target === null) {
    throw new Error('no section matching "' + section + '" in ' + d.paths.open);
  }

  // Insert at the end of the section, before its trailing blank lines, so the
  // file keeps one blank line between blocks without accumulating more.
  let at = target.end;
  while (at > target.start + 1 && open.lines[at - 1].trim() === '') at--;

  const block = ['', '### ' + id + '. ' + title + ' (' + date + ')'];
  if (body.trim() !== '') block.push('', ...body.replace(/\n+$/, '').split('\n'));
  if (at < open.lines.length && open.lines[at] !== '') block.push('');

  open.lines.splice(at, 0, ...block);
  fs.writeFileSync(d.paths.open, ensureTrailingNewline(open.lines.join('\n')));

  if (d.layout === 'docket') {
    const config = readConfig(d);
    config.next_id = id + 1;
    writeConfig(d, config);
  }

  return { id };
}

export function closeItem(d, id, { note = '', date }) {
  requireLayout(d);
  if (!date) throw new Error('closeItem needs an injected date');

  const open = parseOpen(fs.readFileSync(d.paths.open, 'utf8'));
  const item = open.items.find((entry) => entry.id === id);

  if (!item) {
    throw new Error('#' + id + ' not found among open items in ' + d.paths.open);
  }

  const block = open.lines.slice(item.start, item.end);
  while (block.length > 0 && block[block.length - 1].trim() === '') block.pop();

  const entryLines = ['## ' + item.idPart + '. ' + item.title + ' — ✅ DONE ' + date, ...block.slice(1)];
  if (note.trim() !== '') entryLines.push('', 'Verification: ' + note.trim());

  const archiveFile = d.layout === 'docket'
    ? path.join(d.paths.archiveDir, date.slice(0, 4) + '.md')
    : d.paths.archive;

  // Archive first, open file second: a crash between the writes leaves a
  // duplicate (which `check` reports) rather than a silently lost item.
  appendArchiveEntry(d, archiveFile, entryLines, date);

  open.lines.splice(item.start, item.end - item.start);
  while (open.lines[item.start] === '' && open.lines[item.start - 1] === '') {
    open.lines.splice(item.start, 1);
  }
  fs.writeFileSync(d.paths.open, ensureTrailingNewline(open.lines.join('\n')));

  return { id, archiveFile, commitSubject: 'docs(docket): close #' + id };
}

function appendArchiveEntry(d, archiveFile, entryLines, date) {
  let text;

  if (fs.existsSync(archiveFile)) {
    text = fs.readFileSync(archiveFile, 'utf8').replace(/\n+$/, '\n');
  } else {
    if (d.layout === 'docket') fs.mkdirSync(d.paths.archiveDir, { recursive: true });
    const label = d.layout === 'docket' ? 'DOCKET ARCHIVE ' + date.slice(0, 4) : 'BACKLOG ARCHIVE';
    text = '# ' + label + '\n\nClosed items with their verification records. The id space is shared with the open file — ids are never reused.\n';
  }

  fs.writeFileSync(archiveFile, text + '\n' + entryLines.join('\n') + '\n');
}

export function checkDocket(d) {
  requireLayout(d);
  const findings = [];
  let ids = [];

  try {
    ids = collectIds(d);
  } catch (err) {
    findings.push({ kind: 'unreadable', message: String(err.message ?? err) });
  }

  const seen = new Map();
  for (const entry of ids) {
    if (seen.has(entry.id)) {
      findings.push({
        kind: 'duplicate-id',
        id: entry.id,
        message: '#' + entry.id + ' appears in ' + seen.get(entry.id) + ' and ' + entry.source,
      });
    } else {
      seen.set(entry.id, entry.source);
    }
  }

  for (const [index, line] of fs.readFileSync(d.paths.open, 'utf8').split('\n').entries()) {
    if (line.startsWith('### ') && !ITEM_RE.test(line)) {
      findings.push({
        kind: 'malformed-heading',
        message: d.paths.open + ':' + (index + 1) + ' — "' + line + '" is not `### <id>. Title (date)`',
      });
    }
  }

  if (d.layout === 'docket') {
    const maxObserved = ids.reduce((max, entry) => Math.max(max, entry.id), 0);

    try {
      const config = readConfig(d);
      if (config.next_id <= maxObserved) {
        findings.push({
          kind: 'next-id-drift',
          message: 'docket.json next_id is ' + config.next_id + ' but #' + maxObserved + ' already exists',
        });
      }
    } catch {
      findings.push({ kind: 'config-missing', message: d.paths.config + ' is missing or not valid JSON' });
    }
  }

  if (d.alsoLegacy) {
    findings.push({
      kind: 'orphaned-legacy',
      message: 'both docket/ and root BACKLOG.md exist — docket/ wins; delete or migrate the root files',
    });
  }

  return { ok: findings.length === 0, findings };
}

export function scaffold(root, { project = '', date }) {
  if (!date) throw new Error('scaffold needs an injected date');

  const existing = resolveDocket(root);
  if (existing.layout !== null) {
    throw new Error('a ' + existing.layout + ' docket already exists at ' + existing.root + ' — refusing to scaffold over it');
  }

  const name = (project || path.basename(path.resolve(root))).toUpperCase();
  const dir = path.join(root, 'docket');
  fs.mkdirSync(path.join(dir, 'archive'), { recursive: true });

  fs.writeFileSync(path.join(dir, 'DOCKET.md'), [
    '# ' + name + ' DOCKET',
    '',
    '**Open items only.** Closed items move to `archive/<year>.md` with their',
    'verification records. The id space is shared across open and archive and ids',
    'are never reused — a "#N" in a commit subject refers to these numbers (this',
    'docket is the tracker). When an item ships: stamp it ✅ with the date and',
    'verification status, then move the entry to the archive in the same action.',
    'Stale open markers cost real sessions — closing means moving.',
    '',
    '## Committed',
    '',
    '## Someday',
    '',
    '## Loose threads',
    '',
  ].join('\n'));

  fs.writeFileSync(path.join(dir, 'docket.json'), JSON.stringify({
    version: 1,
    next_id: 1,
    sections: DEFAULT_SECTIONS,
    created: date,
  }, null, 2) + '\n');

  return { dir };
}

export function migrate(d) {
  if (d.layout !== 'legacy') {
    throw new Error('migrate needs a legacy layout (root BACKLOG.md); found: ' + String(d.layout));
  }

  const dir = path.join(d.root, 'docket');
  if (fs.existsSync(dir)) {
    throw new Error(dir + ' already exists — refusing to migrate over it');
  }

  const text = fs.readFileSync(d.paths.open, 'utf8');
  const open = parseOpen(text);
  const lines = text.split('\n');

  // Everything from the first section heading down is copied verbatim — item
  // bodies and ids are referenced from commit history, so they must survive
  // byte-identically. Only the header prose above it is regenerated.
  const firstSection = open.sections.length > 0 ? open.sections[0].start : lines.length;
  const title = lines[0]?.match(/^#\s+(.*?)\s+BACKLOG\s*$/);
  const name = title ? title[1] : path.basename(d.root).toUpperCase();

  fs.mkdirSync(path.join(dir, 'archive'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'DOCKET.md'), [
    '# ' + name + ' DOCKET',
    '',
    '**Open items only.** Closed items move to `archive/<year>.md` with their',
    'verification records (migrated history: `archive/legacy.md`). The id space is',
    'shared across open and archive and ids are never reused — a "#N" in a commit',
    'subject refers to these numbers (this docket is the tracker). When an item',
    'ships: stamp it ✅ with the date and verification status, then move the entry',
    'to the archive in the same action.',
    '',
    ...lines.slice(firstSection),
  ].join('\n'));

  let moved = open.items.length;

  if (fs.existsSync(d.paths.archive)) {
    // The legacy archive keeps its original close dates internally; splitting
    // it into per-year files would mean parsing freeform stamps, so it lands
    // whole as legacy.md and only new closes rotate by year.
    fs.copyFileSync(d.paths.archive, path.join(dir, 'archive', 'legacy.md'));
    moved += 1;
  }

  const migrated = makeHandle(d.root, 'docket', false);
  const maxObserved = collectIds(migrated).reduce((max, entry) => Math.max(max, entry.id), 0);

  fs.writeFileSync(path.join(dir, 'docket.json'), JSON.stringify({
    version: 1,
    next_id: maxObserved + 1,
    sections: open.sections.map((s) => s.name),
    created: null,
  }, null, 2) + '\n');

  return { moved };
}

function ensureTrailingNewline(text) {
  return text.endsWith('\n') ? text.replace(/\n+$/, '\n') : text + '\n';
}
