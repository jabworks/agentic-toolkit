// Pure renderer: docket handle in, one self-contained HTML string out.
// No egress, no CDN, inline CSS/JS only — the plan-review renderer contract.
// Serving and file-watching live in the CLI; keeping this pure keeps the
// render smoke test trivial.

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

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body${openId !== null ? ' data-open="item-' + Number(openId) + '"' : ''}>
<header>
  <h1>${esc(title)}</h1>
  <div class="bar">
    <div class="scopes" role="group" aria-label="Filter by section">${scopePills(sections, open.items.length, archivedCount, years.length > 0)}</div>
    <button type="button" id="filter-toggle" class="scope filter-btn" aria-expanded="false" aria-controls="filter">Filter</button>
  </div>
  <input id="filter" type="search" placeholder="Filter items — title, body, #id" autocomplete="off" hidden>
  ${tagPills(open.items, years)}
  ${stats.length > 0 ? `<div class="stats">${stats.join('')}</div>` : ''}
</header>
<main>
${open.items.length === 0 ? EMPTY_STATE : ''}
${sections
  .map(
    (section) => `<section data-section="${esc(section.name)}">
<h2>${esc(section.name)}${section.items.length > 0 ? `<span class="count">${section.items.length}</span>` : ''}</h2>
${section.items.map((item) => itemCard(item, open.lines)).join('\n')}
${sectionProse(section, open)}
</section>`,
  )
  .join('\n')}
${years.length > 0 ? `<section class="archive" data-section="${ARCHIVE_SCOPE}"><h2>Archive<span class="count">${archivedCount}</span></h2>
${years.map((year) => yearBlock(year)).join('\n')}</section>` : ''}
</main>
<script>${JS}${live ? SSE_JS : ''}</script>
</body>
</html>`;
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

// Colour comes from the shared core (scripts/tokens/core.css), which is
// dark-base with a light override — the reverse of the dialect this board
// carried before. Both honour the OS, so only the no-preference fallback
// changed; light is still what gets verified first (toolkit rule).
const CSS = `
/* tokens:core:start */
/* Shared colour core — do not hand-edit; edit scripts/tokens/core.css. */
:root {
  --background: #111110;
  --card: #191918;
  --card-foreground: #eeeeec;
  --popover: #222221;
  --foreground: #eeeeec;
  --muted: #222221;
  --muted-foreground: #b5b3ad;
  --border: #3b3a37;
  --input: #3b3a37;
  --primary: #978365;
  --primary-foreground: #ffffff;
  --primary-hover: #a39073;
  --primary-muted: #24231f;
  --primary-text: #cbb99f;
  --ring: #978365;
  --accent: #2a2a28;
  --success: #71d083;
  --success-muted: #1b2a1e;
  --success-border: #2d5736;
  --warning: #ffca16;
  --warning-muted: #302008;
  --warning-border: #5c3d05;
  --destructive: #ff977d;
  --destructive-muted: #391714;
  --destructive-border: #6e2920;
  --info: #70b8ff;
  --info-muted: #0d2847;
  --info-border: #104d87;
  --outline: rgba(237, 237, 236, 0.08);
  --subtle: #686560;
  --radius: 0.25rem;
  --mono: "Geist Mono", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Monaco, "Cascadia Code", monospace;
}
@media (prefers-color-scheme: light) {
  :root {
    --background: #f6f5ef;
    --card: #fcfbf6;
    --card-foreground: #36302a;
    --popover: #fcfbf6;
    --foreground: #36302a;
    --muted: #f0efe3;
    --muted-foreground: #726c5e;
    --border: #ddd6c6;
    --input: #ddd6c6;
    --primary: #967e60;
    --primary-foreground: #ffffff;
    --primary-hover: #897254;
    --primary-muted: #efece0;
    --primary-text: #6f5e44;
    --ring: #967e60;
    --accent: #eae7da;
    --success: #3f7a34;
    --success-muted: #e6f5e2;
    --success-border: #c2e1b3;
    --warning: #93761d;
    --warning-muted: #fbf4c4;
    --warning-border: #ebd87f;
    --destructive: #bf4f3b;
    --destructive-muted: #fbe8e2;
    --destructive-border: #f0c9ba;
    --info: #3f6fa6;
    --info-muted: #e6f1fc;
    --info-border: #bed7ef;
    --outline: rgba(54, 48, 42, 0.08);
    --subtle: #a8a294;
  }
}
/* tokens:core:end */

/* docket board extension — the count chip rides the muted surface. Outside the
   markers on purpose: anything inside them is replaced by --fix. */
:root{--chip:var(--muted)}
*{box-sizing:border-box}
body{margin:0;background:var(--background);color:var(--foreground);font:15px/1.55 ui-sans-serif,system-ui,sans-serif}
header{position:sticky;top:0;background:var(--background);border-bottom:1px solid var(--border);padding:1rem 1.25rem .75rem;z-index:2}
h1{margin:0 0 .35rem;font-size:1.15rem;letter-spacing:.04em}
.stats{display:flex;gap:.75rem;flex-wrap:wrap;color:var(--muted-foreground);font-size:.8rem;margin-bottom:.6rem}
.stat b{color:var(--foreground)}
#filter{width:100%;max-width:28rem;padding:.45rem .6rem;border:1px solid var(--border);border-radius:.4rem;background:var(--card);color:var(--foreground)}
.bar{display:flex;gap:.5rem;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
.scopes{display:flex;gap:.35rem;flex-wrap:wrap}
.scope{display:inline-flex;align-items:center;gap:.4rem;font:inherit;font-size:.75rem;padding:.2rem .6rem;border:1px solid var(--border);border-radius:.6rem;background:var(--card);color:var(--muted-foreground);cursor:pointer}
.scope:hover{color:var(--foreground);border-color:var(--primary)}
.scope.active{background:var(--primary-muted);color:var(--primary-text);border-color:var(--primary)}
.scope:focus-visible{outline:2px solid var(--primary);outline-offset:1px}
.scope .count{margin-left:0;font-variant-numeric:tabular-nums}
.scope.active .count{background:var(--card)}
.scope[data-total="0"]{opacity:.55}
.tags{display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.45rem}
.tag{font-variant-numeric:tabular-nums}
.filter-btn[aria-expanded="true"]{background:var(--primary-muted);color:var(--primary-text);border-color:var(--primary)}
#filter[hidden]{display:none}
main{max-width:52rem;margin:0 auto;padding:1rem 1.25rem 4rem}
h2{font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted-foreground);margin:1.6rem 0 .6rem;border-bottom:1px solid var(--border);padding-bottom:.3rem}
.count{margin-left:.5rem;background:var(--chip);border-radius:.6rem;padding:.05rem .5rem;font-size:.75rem}
.item{background:var(--card);border:1px solid var(--border);border-radius:.5rem;padding:.75rem .9rem;margin:.6rem 0}
.item h3{margin:0 0 .35rem;font-size:.95rem}
.item h4{margin:.6rem 0 .2rem;font-size:.8rem;color:var(--muted-foreground)}
.item p{margin:.35rem 0}
.item.archived{opacity:.85}
.idlink{color:var(--primary);text-decoration:none;font-variant-numeric:tabular-nums}
.idlink:hover{text-decoration:underline}
.item:target{outline:2px solid var(--primary);outline-offset:2px}
pre{background:var(--chip);border-radius:.4rem;padding:.5rem .7rem;overflow-x:auto;font-size:.85rem}
code{background:var(--chip);border-radius:.25rem;padding:.05rem .3rem;font-size:.88em}
pre code{background:none;padding:0}
ul{margin:.3rem 0;padding-left:1.3rem}
details{margin:.5rem 0}
summary{cursor:pointer;color:var(--muted-foreground)}
.prose{color:var(--muted-foreground);font-size:.9rem}
.empty{border:1px dashed var(--border);border-radius:.5rem;padding:1.5rem;text-align:center;color:var(--muted-foreground)}
.hidden{display:none}
`;

const JS = `
const filter = document.getElementById('filter');
const filterToggle = document.getElementById('filter-toggle');
const pills = [...document.querySelectorAll('.scopes .scope')];
const tagButtons = [...document.querySelectorAll('.tags .tag')];
let scope = '';
let tag = '';

function applyFilters() {
  const q = filter.value.trim().toLowerCase();
  const filtering = q !== '' || tag !== '';
  // Facet counts: each row reports what picking one of its OWN options would
  // yield, so a row never discounts itself. Scope counts ignore the active
  // scope, tag counts ignore the active tag; both respect everything else.
  const scopeCounts = new Map();
  const tagCounts = new Map();

  for (const section of document.querySelectorAll('main > section')) {
    const inScope = scope === '' || section.dataset.section === scope;
    let visible = 0;

    for (const item of section.querySelectorAll('.item')) {
      const tags = item.dataset.tags === '' ? [] : item.dataset.tags.split(' ');
      const hitQuery = q === '' || item.dataset.search.includes(q);
      const hitTag = tag === '' || tags.includes(tag);

      item.classList.toggle('hidden', !(inScope && hitQuery && hitTag));
      if (hitQuery && hitTag) visible++;
      if (inScope && hitQuery) {
        for (const each of tags) tagCounts.set(each, (tagCounts.get(each) ?? 0) + 1);
      }
    }

    scopeCounts.set(section.dataset.section, visible);

    // Collapse a section only when a filter emptied it — a heading with no hits
    // under it is noise. Unfiltered, an empty section still shows: "Loose
    // threads, nothing in it" is information, and it is what the page renders
    // on load, so touching a chip must not make it disappear.
    section.classList.toggle('hidden', !inScope || (filtering && visible === 0));
  }

  for (const pill of pills) {
    const key = pill.dataset.scope;
    const shown = !filtering
      ? pill.dataset.total
      : key === ''
        ? [...scopeCounts].reduce((sum, [k, n]) => sum + (k === '${ARCHIVE_SCOPE}' ? 0 : n), 0)
        : (scopeCounts.get(key) ?? 0);
    pill.querySelector('.count').textContent = shown;
  }

  for (const pill of tagButtons) {
    const unfiltered = q === '' && scope === '';
    pill.querySelector('.count').textContent = unfiltered
      ? pill.dataset.total
      : (tagCounts.get(pill.dataset.tag) ?? 0);
  }

  if (q !== '') {
    for (const details of document.querySelectorAll('details')) details.open = true;
  }
}

filter.addEventListener('input', applyFilters);

filterToggle.addEventListener('click', () => {
  const open = filter.hasAttribute('hidden');
  filter.toggleAttribute('hidden', !open);
  filterToggle.setAttribute('aria-expanded', String(open));

  if (open) {
    filter.focus();
  } else if (filter.value !== '') {
    // Collapsing the box must not leave an invisible query filtering the board.
    filter.value = '';
    applyFilters();
  }
});

// Tags toggle rather than switch: clicking the active one clears it, so there
// is no "All tags" pill to keep in sync with the scope row's "All".
for (const button of tagButtons) {
  button.addEventListener('click', () => {
    tag = tag === button.dataset.tag ? '' : button.dataset.tag;
    for (const other of tagButtons) {
      const on = other.dataset.tag === tag;
      other.classList.toggle('active', on);
      other.setAttribute('aria-pressed', String(on));
    }
    applyFilters();
  });
}

for (const button of pills) {
  button.addEventListener('click', () => {
    scope = button.dataset.scope;
    for (const other of pills) {
      const on = other === button;
      other.classList.toggle('active', on);
      other.setAttribute('aria-pressed', String(on));
    }
    applyFilters();
  });
}
const target = document.body.dataset.open;
if (target) {
  const el = document.getElementById(target);
  if (el) {
    const details = el.closest('details');
    if (details) details.open = true;
    el.scrollIntoView();
    el.style.outline = '2px solid var(--primary)';
  }
}
`;

const SSE_JS = `
new EventSource('/events').addEventListener('reload', () => location.reload());
`;
