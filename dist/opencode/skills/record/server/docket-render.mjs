// Pure renderer: docket handle in, one self-contained HTML string out.
// No egress, no CDN, inline CSS/JS only — the plan-review renderer contract.
// Serving and file-watching live in the CLI; keeping this pure keeps the
// render smoke test trivial.

import fs from 'node:fs';
import path from 'node:path';
import { parseOpen, archiveFiles } from './docket-core.mjs';

const ARCHIVE_ENTRY_RE = /^##\s+(\d+(?:\s*\([^)]*\))?)\.\s+(.*)$/;

export function renderHtml(d, { openId = null, date, live = false } = {}) {
  const open = parseOpen(fs.readFileSync(d.paths.open, 'utf8'));
  const title = (open.lines[0] ?? '').replace(/^#\s*/, '') || 'DOCKET';
  const years = archiveFiles(d).map((file) => parseArchive(file));
  const archivedCount = years.reduce((sum, year) => sum + year.entries.length, 0);

  const sections = open.sections.map((section) => ({
    ...section,
    items: open.items.filter((item) => item.section === section.name),
  }));

  const stats = [
    stat(open.items.length, 'open'),
    ...open.sections.map((s) => stat(open.items.filter((i) => i.section === s.name).length, s.name.toLowerCase())),
    stat(archivedCount, 'archived'),
    oldestStat(open.items, date),
  ].filter(Boolean);

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
  <div class="stats">${stats.join('')}</div>
  <input id="filter" type="search" placeholder="Filter items — title, body, #id" autocomplete="off">
</header>
<main>
${open.items.length === 0 ? EMPTY_STATE : ''}
${sections
  .map(
    (section) => `<section>
<h2>${esc(section.name)}<span class="count">${section.items.length || ''}</span></h2>
${section.items.map((item) => itemCard(item, open.lines)).join('\n')}
${sectionProse(section, open)}
</section>`,
  )
  .join('\n')}
${years.length > 0 ? `<section class="archive"><h2>Archive<span class="count">${archivedCount}</span></h2>
${years.map((year) => yearBlock(year)).join('\n')}</section>` : ''}
</main>
<script>${JS}${live ? SSE_JS : ''}</script>
</body>
</html>`;
}

function stat(value, label) {
  return `<span class="stat"><b>${value}</b> ${esc(label)}</span>`;
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

  return `<article class="item" id="item-${item.id}" data-search="${esc((item.idPart + ' ' + item.title + ' ' + body).toLowerCase())}">
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
    (entry) => `<article class="item archived" id="item-${entry.id}" data-search="${esc((entry.idPart + ' ' + entry.title + ' ' + entry.body).toLowerCase())}">
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

// Light is the source theme; dark derives via media query — and light is what
// gets verified first (toolkit rule).
const CSS = `
:root{--bg:#faf9f6;--fg:#1f2328;--muted:#6a6f76;--card:#ffffff;--line:#e4e1da;--accent:#0a6e5c;--chip:#eef0e9;}
@media (prefers-color-scheme:dark){:root{--bg:#14161a;--fg:#e6e4df;--muted:#9aa0a6;--card:#1c1f24;--line:#2c3036;--accent:#4fd0b5;--chip:#22262c;}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,system-ui,sans-serif}
header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:1rem 1.25rem .75rem;z-index:2}
h1{margin:0 0 .35rem;font-size:1.15rem;letter-spacing:.04em}
.stats{display:flex;gap:.75rem;flex-wrap:wrap;color:var(--muted);font-size:.8rem;margin-bottom:.6rem}
.stat b{color:var(--fg)}
#filter{width:100%;max-width:28rem;padding:.45rem .6rem;border:1px solid var(--line);border-radius:.4rem;background:var(--card);color:var(--fg)}
main{max-width:52rem;margin:0 auto;padding:1rem 1.25rem 4rem}
h2{font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:1.6rem 0 .6rem;border-bottom:1px solid var(--line);padding-bottom:.3rem}
.count{margin-left:.5rem;background:var(--chip);border-radius:.6rem;padding:.05rem .5rem;font-size:.75rem}
.item{background:var(--card);border:1px solid var(--line);border-radius:.5rem;padding:.75rem .9rem;margin:.6rem 0}
.item h3{margin:0 0 .35rem;font-size:.95rem}
.item h4{margin:.6rem 0 .2rem;font-size:.8rem;color:var(--muted)}
.item p{margin:.35rem 0}
.item.archived{opacity:.85}
.idlink{color:var(--accent);text-decoration:none;font-variant-numeric:tabular-nums}
.idlink:hover{text-decoration:underline}
.item:target{outline:2px solid var(--accent);outline-offset:2px}
pre{background:var(--chip);border-radius:.4rem;padding:.5rem .7rem;overflow-x:auto;font-size:.85rem}
code{background:var(--chip);border-radius:.25rem;padding:.05rem .3rem;font-size:.88em}
pre code{background:none;padding:0}
ul{margin:.3rem 0;padding-left:1.3rem}
details{margin:.5rem 0}
summary{cursor:pointer;color:var(--muted)}
.prose{color:var(--muted);font-size:.9rem}
.empty{border:1px dashed var(--line);border-radius:.5rem;padding:1.5rem;text-align:center;color:var(--muted)}
.hidden{display:none}
`;

const JS = `
const filter = document.getElementById('filter');
filter.addEventListener('input', () => {
  const q = filter.value.trim().toLowerCase();
  for (const item of document.querySelectorAll('.item')) {
    item.classList.toggle('hidden', q !== '' && !item.dataset.search.includes(q));
  }
  for (const details of document.querySelectorAll('details')) {
    if (q !== '') details.open = true;
  }
});
const target = document.body.dataset.open;
if (target) {
  const el = document.getElementById(target);
  if (el) {
    const details = el.closest('details');
    if (details) details.open = true;
    el.scrollIntoView();
    el.style.outline = '2px solid var(--accent)';
  }
}
`;

const SSE_JS = `
new EventSource('/events').addEventListener('reload', () => location.reload());
`;
