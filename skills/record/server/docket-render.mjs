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
// ARCHIVE_SCOPE is listed before ARCHIVE so the alternation matches the longer
// key first — regex alternation is ordered, and `ARCHIVE` would otherwise match
// the prefix of `{{ARCHIVE_SCOPE}}` and leave `_SCOPE}}` stranded in the output.
function fillShell(values) {
  return SHELL.replace(
    /\{\{(TITLE|BODY_ATTRS|SCOPES|TAGS|STATS|EMPTY|SECTIONS|ARCHIVE_SCOPE|ARCHIVE|SSE_JS)\}\}/g,
    (_, key) => values[key],
  );
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

  // The scope pills carry every count that used to live in the stats row —
  // open, per-section, archived — so only the stats that are not a section
  // survive here.
  const stats = [oldestStat(open.items, date)].filter(Boolean);

  return fillShell({
    TITLE: esc(title),
    ARCHIVE_SCOPE,
    BODY_ATTRS: openId !== null ? ' data-open="item-' + Number(openId) + '"' : '',
    SCOPES: scopePills(sections, open.items.length, archivedCount, years.length > 0),
    TAGS: tagPills(open.items, years),
    STATS: stats.length > 0 ? `<div class="stats">${stats.join('')}</div>` : '',
    EMPTY: open.items.length === 0 ? EMPTY_STATE : '',
    SECTIONS: sections
      .map(
        (section) => `<section data-section="${esc(section.name)}">
<h2>${esc(section.name)}${section.items.length > 0 ? `<span class="count">${section.items.length}</span>` : ''}</h2>
${section.items.map((item) => itemCard(item, open.lines)).join('\n')}
${sectionProse(section, open)}
</section>`,
      )
      .join('\n'),
    ARCHIVE:
      years.length > 0
        ? `<section class="archive" data-section="${ARCHIVE_SCOPE}"><h2>Archive<span class="count">${archivedCount}</span></h2>
${years.map((year) => yearBlock(year)).join('\n')}</section>`
        : '',
    SSE_JS: live ? SSE_JS : '',
  });
}

function stat(value, label) {
  return `<span class="stat"><b>${value}</b> ${esc(label)}</span>`;
}

// Sections are the board's categories — the one grouping the format already
// carries, so scoping to them costs no data-model change. Archive gets a
// reserved scope name because it is not a DOCKET.md section.
//
// Each pill carries its own count, which is why there is no separate stats row
// for section totals: one row that both reports and filters beats two rows that
// say the same numbers. data-total holds the unfiltered figure so a search can
// swap in the match count and restore it afterwards.
function scopePills(sections, openCount, archivedCount, hasArchive) {
  const scopes = [
    { value: '', label: 'All', count: openCount },
    ...sections.map((section) => ({ value: section.name, label: section.name, count: section.items.length })),
    ...(hasArchive ? [{ value: ARCHIVE_SCOPE, label: 'Archive', count: archivedCount }] : []),
  ];

  return scopes
    .map(
      (scope, i) =>
        `<button type="button" class="scope${i === 0 ? ' active' : ''}" data-scope="${esc(scope.value)}"`
        + ` data-total="${scope.count}" aria-pressed="${i === 0}">${esc(scope.label)}`
        + `<span class="count">${scope.count}</span></button>`,
    )
    .join('');
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

function oldestStat(items, date) {
  if (!date || items.length === 0) return '';
  const dates = items.map((item) => (item.title.match(/\((\d{4}-\d{2}-\d{2})/) ?? [])[1]).filter(Boolean).sort();
  if (dates.length === 0) return '';

  const days = Math.round((Date.parse(date) - Date.parse(dates[0])) / 86400000);

  return stat(days + 'd', 'oldest open');
}

function itemCard(item, lines) {
  const body = lines.slice(item.start + 1, item.end).join('\n').trim();

  return `<article class="item" id="item-${item.id}" data-tags="${esc(itemTags(item.title).join(' '))}" data-search="${esc((item.idPart + ' ' + item.title + ' ' + body).toLowerCase())}">
<h3><a class="idlink" href="#item-${item.id}">#${esc(item.idPart)}</a> ${esc(item.title)}</h3>
${mdLite(body)}
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

function yearBlock(year) {
  return `<details><summary>${esc(year.label)} <span class="count">${year.entries.length}</span></summary>
${year.entries
  .map(
    (entry) => `<article class="item archived" id="item-${entry.id}" data-tags="${esc(itemTags(entry.title).join(' '))}" data-search="${esc((entry.idPart + ' ' + entry.title + ' ' + entry.body).toLowerCase())}">
<h3><a class="idlink" href="#item-${entry.id}">#${esc(entry.idPart)}</a> ${esc(entry.title)}</h3>
${mdLite(entry.body)}
</article>`,
  )
  .join('\n')}
</details>`;
}

function esc(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

// A deliberate markdown subset: paragraphs, #### subheads, bullets, fences,
// inline code, bold. Anything fancier renders as plain escaped text — honest
// beats wrong for a board view.
function mdLite(text) {
  if (text === '') return '';
  const out = [];
  const lines = text.split('\n');
  let fence = null;
  let list = false;
  let paragraph = [];

  const flush = () => {
    if (paragraph.length > 0) {
      out.push('<p>' + inline(paragraph.join(' ')) + '</p>');
      paragraph = [];
    }
    if (list) {
      out.push('</ul>');
      list = false;
    }
  };

  for (const line of lines) {
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
    if (/^####\s/.test(line)) {
      flush();
      out.push('<h4>' + inline(line.replace(/^####\s+/, '')) + '</h4>');
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      if (paragraph.length > 0) flush();
      if (!list) {
        out.push('<ul>');
        list = true;
      }
      out.push('<li>' + inline(line.replace(/^[-*]\s+/, '')) + '</li>');
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

  return out.join('\n');
}

function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

const EMPTY_STATE = `<div class="empty">
<p><strong>Nothing on the docket yet.</strong></p>
<p>Add the first item: <code>docket add "Title" --section someday</code> — it gets #1.</p>
</div>`;

const SSE_JS = `
new EventSource('/events').addEventListener('reload', () => location.reload());
`;
