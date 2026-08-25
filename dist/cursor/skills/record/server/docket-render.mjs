// Renderer: docket handle in, one self-contained HTML string out.
// No egress, no CDN, inline CSS/JS only — the plan-review renderer contract.
// Serving and file-watching live in the CLI, which is what keeps the render
// smoke test trivial — this file still has no server and no watcher.
//
// The document shell, the stylesheet and the client script live beside this
// file in board-shell.html. They were moved there so the shared design-system
// regions sit in an .html file rather than inside a JS template literal, where
// a backslash is silently eaten — `/\s/` becomes `/s/` with no error, in one
// surface only (specs/surface-kit/quirks.md, Q1). annotate-server.js reads its
// template the same way.

import fs from 'node:fs';
import path from 'node:path';
import { parseOpen, archiveFiles } from './docket-core.mjs';

const ARCHIVE_ENTRY_RE = /^##\s+(\d+(?:\s*\([^)]*\))?)\.\s+(.*)$/;

// Reserved scope for the archive block. Leading underscores keep it from
// colliding with a real DOCKET.md section name.
const ARCHIVE_SCOPE = '__archive';

// Topic tags are a file-level convention, not a format change: `#build` in an
// item title and nothing else. The leading letter is what keeps `#21`, `#4` and
// every "split from #2" cross-reference from being read as a tag — ids are the
// other thing `#` means in this file, and they are always numeric.
const TAG_RE = /#([a-z][a-z0-9-]*)/g;

function itemTags(title) {
  return [...title.matchAll(TAG_RE)].map((m) => m[1]);
}

// Colour comes from the shared core (scripts/tokens/core.css), inlined into
// board-shell.html's <style> block: dark-base with a light override, the
// reverse of the dialect this board carried before. Both honour the OS, so only
// the no-preference fallback changed; light is still what gets verified first
// (toolkit rule). This note lives in source rather than in the shell because
// repo-tooling prose has no business shipping inside every rendered board.

// Read once at module scope. --serve renders per request, and re-reading the
// shell each time would let a served board disagree with a written one.
const SHELL = fs.readFileSync(new URL('./board-shell.html', import.meta.url), 'utf8');

// Single pass with a replacer, never chained .replace() calls: the replacer's
// return value is not re-scanned, so a docket item literally titled
// "{{ARCHIVE}}" cannot be substituted a second time.
function fillShell(values) {
  return SHELL.replace(
    /\{\{(TITLE|BODY_ATTRS|META|TAGS|EMPTY|BOARD|ARCHIVE|SSE_JS)\}\}/g,
    (_, key) => values[key],
  );
}

// Anchor ids for the column heads — the kit's g+N jump targets. Sections are
// user-authored DOCKET.md names, so they are slugged rather than trusted as
// id-safe.
function slugSection(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return 'sec-' + (slug || 'section');
}

// The title tail carries the added stamp — "(2026-06-01)", or "(2026-07-02,
// split from #2)" — and `add` guards against leaving two now (docket #47),
// but old archive entries still carry the pre-guard duplicate. Every trailing
// stamp leaves the DISPLAYED title; the first date found is the added date.
// The file is never rewritten, and tags still read the raw title.
const STAMP_TAIL_RE = /\s*\(\d{4}-\d{2}-\d{2}[^)]*\)\s*$/;

// close() appends this after the title, so on an archived entry the added
// stamp is no longer trailing — it sits right before this suffix instead of
// at the string end, and STAMP_TAIL_RE's `$` stops matching it (docket #47).
// The close stamp itself is not a date-parenthetical (no wrapping parens), so
// it survives display deliberately; only the added stamp ahead of it is noise.
const CLOSE_STAMP_RE = /\s*—\s*✅\s*DONE\s+\d{4}-\d{2}-\d{2}\s*$/;

function displayTitle(raw) {
  const dates = [...raw.matchAll(/\((\d{4}-\d{2}-\d{2})[^)]*\)/g)].map((m) => m[1]);
  const closeMatch = raw.match(CLOSE_STAMP_RE);
  const closeStamp = closeMatch?.[0]?.trim() ?? '';
  let text = closeMatch ? raw.slice(0, closeMatch.index) : raw;
  while (STAMP_TAIL_RE.test(text)) text = text.replace(STAMP_TAIL_RE, '');
  text = text.trim();

  return { text: closeStamp ? text + ' ' + closeStamp : text, date: dates[0] ?? null };
}

function ageDays(from, to) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
}

export function renderHtml(d, { openId = null, date, live = false } = {}) {
  const open = parseOpen(fs.readFileSync(d.paths.open, 'utf8'));
  const title = (open.lines[0] ?? '').replace(/^#\s*/, '') || 'DOCKET';
  const years = archiveFiles(d).map((file) => parseArchive(file));
  const archivedCount = years.reduce((sum, year) => sum + year.entries.length, 0);

  const sections = open.sections.map((section) => ({
    ...section,
    items: open.items.filter((item) => item.section === section.name),
  }));

  return fillShell({
    TITLE: esc(title),
    BODY_ATTRS: openId !== null ? ' data-open="item-' + Number(openId) + '"' : '',
    META: metaLine(open.items, archivedCount, years.length > 0, date),
    TAGS: tagPills(open.items, years),
    EMPTY: open.items.length === 0 ? EMPTY_STATE : '',
    BOARD: sections.map((section) => column(section, open, date)).join('\n'),
    ARCHIVE: years.length > 0 ? archiveDrawer(years, archivedCount) : '',
    SSE_JS: live ? SSE_JS : '',
  });
}

// The header's one row of figures: what no column says. Per-section counts sit
// on the column heads, so only the totals and the oldest age live here.
function metaLine(items, archivedCount, hasArchive, date) {
  const parts = [`<span><b>${items.length}</b> open</span>`];

  if (hasArchive) parts.push(`<span><b>${archivedCount}</b> archived</span>`);
  const oldest = oldestAge(items, date);
  if (oldest !== null) parts.push(`<span>oldest <b>${oldest}d</b></span>`);

  return `<div class="meta">${parts.join('')}</div>`;
}

// One column per section (docket #45). The head is the kit's g+N target and
// carries the count as a numeral rather than a chip. A section with neither
// items nor prose renders a quiet slot, never nothing: "nothing committed" is
// information (docket #44, closed by decision). A populated column also ships
// a hidden no-match slot: when a filter empties it, the client script reveals
// that instead of leaving a blank lane — inert in the written file, where
// nothing ever filters.
function column(section, open, date) {
  const prose = sectionProse(section, open);
  const lower = esc(section.name.toLowerCase());
  const body =
    section.items.length > 0 || prose !== ''
      ? [
          ...section.items.map((item) => itemCard(item, open.lines, date)),
          ...(prose === '' ? [] : [prose]),
          ...(section.items.length > 0 ? [`<div class="empty nohit" hidden>No match in ${lower}</div>`] : []),
        ].join('\n')
      : `<div class="empty">Nothing in ${lower}</div>`;

  return `<section class="col" data-section="${esc(section.name)}">
<div class="colhead"><h2 id="${slugSection(section.name)}" data-kit-section>${esc(section.name)}</h2><span class="n${section.items.length === 0 ? ' zero' : ''}">${section.items.length}</span></div>
${body}
</section>`;
}

// Tags are discovered, never declared: the set is whatever the open items
// happen to use. So a docket that never adopts the convention renders no tag
// row at all, and adopting it is a title edit rather than a migration.
function tagPills(items, years) {
  const counts = new Map();

  // Archived entries count too — a tag filter reaches them, so a total that
  // ignored them would undercount what clicking the pill actually shows.
  for (const item of [...items, ...years.flatMap((year) => year.entries)]) {
    for (const tag of itemTags(item.title)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  if (counts.size === 0) return '';

  const pills = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([tag, count]) =>
        `<button type="button" class="scope tag" data-tag="${esc(tag)}" data-total="${count}" aria-pressed="false">`
        + `#${esc(tag)}<span class="count">${count}</span></button>`,
    )
    .join('');

  return `<div class="tags" role="group" aria-label="Filter by tag">${pills}</div>`;
}

function oldestAge(items, date) {
  if (!date || items.length === 0) return null;
  const dates = items.map((item) => displayTitle(item.title).date).filter(Boolean).sort();

  return dates.length === 0 ? null : ageDays(dates[0], date);
}

function idLink(entry) {
  return `<a class="id" href="#item-${entry.id}" data-kit-copy="${esc(entry.idPart)}">#${esc(entry.idPart)}</a>`;
}

// A card: id + added date + age, the cleaned title, the first block as the
// lede, and — only when there is more — the rest folded behind "Read on · N
// more". The fold is a <details>, so the written board reads offline without
// JS. Bodies run 100–200 words; a column cannot hold them open.
//
// data-kit-item only on OPEN cards. Archived rows (archiveRow, below) sit
// inside a closed <details> by default; kit.js's j/k walk would happily focus
// an invisible row (moveItem uses history.replaceState, which does not trigger
// the browser's auto-expand-on-fragment-navigation behaviour), so they are
// left out of the walk. Their id link still carries data-kit-copy — that only
// needs the anchor to receive focus, which a plain Tab into an open <details>
// still does.
function itemCard(item, lines, date) {
  const body = lines.slice(item.start + 1, item.end).join('\n').trim();
  const blocks = mdBlocks(body);
  const { text, date: added } = displayTitle(item.title);
  const age = added && date ? ' · ' + ageDays(added, date) + 'd' : '';
  const more =
    blocks.length > 1
      ? `\n<details class="more"><summary>Read on · ${blocks.length - 1} more</summary>\n${blocks.slice(1).join('\n')}\n</details>`
      : '';

  return `<article class="card" id="item-${item.id}" data-kit-item data-tags="${esc(itemTags(item.title).join(' '))}" data-search="${esc((item.idPart + ' ' + item.title + ' ' + body).toLowerCase())}">
<div class="top">${idLink(item)}<span class="age">${added ? esc(added) + age : ''}</span></div>
<h3>${esc(text)}</h3>
<div class="lede">${blocks[0] ?? ''}</div>${more}
</article>`;
}

function sectionProse(section, open) {
  // Unnumbered content (Loose threads bullets) rendered after the cards.
  const itemRanges = open.items.filter((i) => i.section === section.name);
  const prose = [];

  for (let i = section.start + 1; i < section.end; i++) {
    if (!itemRanges.some((item) => item.start <= i && i < item.end)) prose.push(open.lines[i]);
  }
  const text = prose.join('\n').trim();

  return text === '' ? '' : '<div class="prose">' + mdLite(text) + '</div>';
}

function parseArchive(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const entries = [];

  for (let i = 0; i < lines.length; i++) {
    const entry = lines[i].match(ARCHIVE_ENTRY_RE);
    if (!entry) continue;

    let end = i + 1;
    while (end < lines.length && !/^##\s/.test(lines[end])) end++;
    entries.push({ idPart: entry[1], id: parseInt(entry[1], 10), title: entry[2], body: lines.slice(i + 1, end).join('\n').trim() });
    i = end - 1;
  }

  return { label: path.basename(file, '.md'), entries };
}

// The archive is a drawer under the board, never a peer column — 35 closed
// against 9 open would dominate. Rows carry id, title and year and open to the
// full body, so nothing the old per-year blocks showed is lost. The reserved
// scope name keeps it addressable without colliding with a DOCKET.md section.
function archiveDrawer(years, archivedCount) {
  const rows = years.flatMap((year) => year.entries.map((entry) => archiveRow(entry, year.label)));

  return `<details class="drawer" data-section="${ARCHIVE_SCOPE}"><summary><span>Archive</span><span class="n">${archivedCount}</span></summary>
<div class="years">
${rows.join('\n')}
</div>
</details>`;
}

function archiveRow(entry, year) {
  return `<details class="row archived" id="item-${entry.id}" data-tags="${esc(itemTags(entry.title).join(' '))}" data-search="${esc((entry.idPart + ' ' + entry.title + ' ' + entry.body).toLowerCase())}"><summary>${idLink(entry)}<span class="t">${esc(displayTitle(entry.title).text)}</span><span class="y">${esc(year)}</span></summary><div class="body">${mdLite(entry.body)}</div></details>`;
}

function esc(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

// A deliberate markdown subset: paragraphs, #### subheads, bullets, fences,
// pipe tables, inline code, bold. Anything fancier renders as plain escaped
// text — honest beats wrong for a board view.
function mdLite(text) {
  return mdBlocks(text).join('\n');
}

// A table is a header row, a delimiter row, then body rows (docket #43). The
// delimiter is what makes it a table: a line of pipes on its own is prose that
// happens to contain pipes, and used to render as such. Alignment colons parse
// but are ignored — the board sets its own column behaviour.
const TABLE_DELIM = /^\|?(?:\s*:?-+:?\s*\|)+(?:\s*:?-+:?\s*)?\|?$/;

// Split on unescaped pipes only — an escaped \| is cell content, not a column
// break, which is the whole point of escaping it. Same rule spec-index.test.mjs
// applies when it reads the generated catalog.
function cellsOf(line) {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (/(?<!\\)\|$/.test(row)) row = row.slice(0, -1);
  return row.split(/(?<!\\)\|/).map((c) => c.trim().replaceAll('\\|', '|'));
}

// Rows arrive as raw lines, header first, delimiter second. The caller has
// already confirmed the delimiter by lookahead, so this only shapes the output.
function tableBlock(rows) {
  const head = cellsOf(rows[0]);
  const cell = (c) => '<td>' + inline(c) + '</td>';
  const body = rows.slice(2).map((row) => {
    const got = cellsOf(row);
    // Pad a short row so the grid stays rectangular; keep the extras on a long
    // one, because dropping a cell loses content the author wrote.
    while (got.length < head.length) got.push('');
    return '<tr>' + got.map(cell).join('') + '</tr>';
  });
  // Wrapped because a card column is ~450px and a table does not reflow: the
  // wrapper scrolls, the column does not stretch, and the page never gains a
  // horizontal scrollbar of its own.
  return (
    '<div class="tbl"><table>\n<thead><tr>' +
    head.map((c) => '<th>' + inline(c) + '</th>').join('') +
    '</tr></thead>' +
    (body.length > 0 ? '\n<tbody>' + body.join('\n') + '</tbody>' : '') +
    '\n</table></div>'
  );
}

// One entry per block — a paragraph, a whole list, a fence, a subhead — so the
// card can split the first block off as its lede. A list is one block, not an
// opening tag plus items; a lede that was "<ul>" alone would be nothing.
function mdBlocks(text) {
  if (text === '') return [];
  const out = [];
  const lines = text.split('\n');
  let fence = null;
  let list = null;
  let paragraph = [];

  const flush = () => {
    if (paragraph.length > 0) {
      out.push('<p>' + inline(paragraph.join(' ')) + '</p>');
      paragraph = [];
    }
    if (list !== null) {
      out.push('<ul>\n' + list.join('\n') + '\n</ul>');
      list = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fence !== null) {
      if (line.startsWith('```')) {
        out.push('<pre><code>' + esc(fence.join('\n')) + '</code></pre>');
        fence = null;
      } else {
        fence.push(line);
      }
      continue;
    }
    if (line.startsWith('```')) {
      flush();
      fence = [];
      continue;
    }
    // Confirmed by lookahead rather than buffered: a pipe line only starts a
    // table if the NEXT line is a delimiter. Buffering instead made the
    // not-a-table fallback its own block, which split a paragraph that merely
    // contained pipes into two — a regression on prose that never involved a
    // table at all.
    if (line.startsWith('|') && TABLE_DELIM.test((lines[i + 1] ?? '').trim())) {
      flush();
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      i -= 1;
      out.push(tableBlock(rows));
      continue;
    }
    if (/^####\s/.test(line)) {
      flush();
      out.push('<h4>' + inline(line.replace(/^####\s+/, '')) + '</h4>');
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      if (paragraph.length > 0) flush();
      if (list === null) list = [];
      list.push('<li>' + inline(line.replace(/^[-*]\s+/, '')) + '</li>');
      continue;
    }
    if (line.trim() === '') {
      flush();
      continue;
    }
    paragraph.push(line);
  }
  if (fence !== null) out.push('<pre><code>' + esc(fence.join('\n')) + '</code></pre>');
  flush();

  return out;
}

function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

const EMPTY_STATE = `<div class="kit-empty">
<p class="kit-empty__title"><strong>Nothing on the docket yet.</strong></p>
<p class="kit-empty__body">Add the first item: <code>docket add "Title" --section someday</code> — it gets #1.</p>
</div>`;

// A banner rather than a new placeholder: SSE_JS is already conditional on
// --serve, so building the .kit-error element here (instead of shipping it,
// hidden, in every offline board too) keeps the static-file case untouched.
// 'error' fires on every failed retry, so the id guard stops it from stacking
// banners; 'open' fires on a successful reconnect, so the banner clears itself
// rather than lying once the board is live again. Inserted as the header's
// first child, not the body's: header is position:sticky, so a banner placed
// in normal body flow scrolls out of view on the first scroll — exactly the
// "silently freezing" failure this exists to announce.
const SSE_JS = `
(function () {
  var es = new EventSource('/events');
  es.addEventListener('reload', function () { location.reload(); });
  es.addEventListener('error', function () {
    if (document.getElementById('sse-lost')) return;
    var banner = document.createElement('div');
    banner.id = 'sse-lost';
    banner.className = 'kit-error';
    banner.setAttribute('role', 'status');
    banner.textContent = 'Live reload lost connection — this board may be stale.';
    var header = document.querySelector('header');
    if (header) header.insertBefore(banner, header.firstChild);
    else document.body.insertBefore(banner, document.body.firstChild);
  });
  es.addEventListener('open', function () {
    var banner = document.getElementById('sse-lost');
    if (banner) banner.remove();
  });
})();
`;
