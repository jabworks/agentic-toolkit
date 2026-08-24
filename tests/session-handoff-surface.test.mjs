// tests/session-handoff-surface.test.mjs
// Pins the session-handoff document surface's structure (surface-kit D8).
//
// Before this file the surface had no markup guard at all — dist-mirror and the
// frontmatter suites cover the copies and the header, nothing covered the shape.
// Every assertion here is an invariant that was measured into existence during
// the D8 redesign and would otherwise regress silently.
//
// Assertions run against `skills/`, the editable source. The three dist mirrors
// are already byte-compared by dist-mirror / opencode-dist / cursor-dist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML_PATH = path.join(ROOT, 'skills/session-handoff/references/handoff-template.html');
const MD_PATH = path.join(ROOT, 'skills/session-handoff/references/handoff-template.md');

const html = fs.readFileSync(HTML_PATH, 'utf8');
const md = fs.readFileSync(MD_PATH, 'utf8');

// The surface's own CSS and markup — everything outside the three kit regions.
// Assertions about surface rules must never accidentally match kit source.
function outsideKitRegions(source) {
  const cuts = [
    ['/* tokens:core:start */', '/* tokens:core:end */'],
    ['/* kit:css:start */', '/* kit:css:end */'],
    ['/* kit:js:start */', '/* kit:js:end */'],
  ];
  let out = source;

  for (const [start, end] of cuts) {
    const from = out.indexOf(start);
    const to = out.indexOf(end);
    if (from !== -1 && to !== -1) out = out.slice(0, from) + out.slice(to + end.length);
  }

  return out;
}

const surface = outsideKitRegions(html);
const stripComments = (source) => source.replace(/<!--[\s\S]*?-->/g, '');

const SECTION_ORDER = [
  'next-steps',
  'blockers',
  'current-state',
  'stack-snapshot',
  'architecture',
  'completed-work',
  'decisions',
  'important-context',
  'deferred',
];

test('the pane leads with next steps and blockers, and every section stays keyboard-addressable', () => {
  const ids = [...html.matchAll(/data-kit-section id="([a-z-]+)"/g)].map((m) => m[1]);

  assert.deepEqual(ids, SECTION_ORDER, 'pane section order is the D8 hoist order');

  // kit:js enumerates querySelectorAll('[data-kit-section]') and g+digit indexes
  // into that list. A section that loses the attribute silently leaves the
  // keyboard layer with no error anywhere.
  const sections = [...html.matchAll(/<section\b[^>]*>/g)].map((m) => m[0]);
  for (const tag of sections) {
    assert.match(tag, /data-kit-section/, 'every <section> carries data-kit-section: ' + tag);
  }
});

test('the markdown template carries the same section order as the HTML', () => {
  // SKILL.md promises "identical sections in the same order, no divergence", and
  // markdown is the default save format — so the hoist has to exist in both or
  // it ships in the format nobody gets by default.
  const headings = [...md.matchAll(/^## (.+)$/gm)].map((m) =>
    m[1]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  );

  assert.deepEqual(headings, [
    'immediate-next-steps',
    'blockers',
    'current-state-summary',
    'stack-snapshot',
    'architecture-context',
    'completed-work',
    'decisions-made',
    'important-context',
    'deferred-out-of-scope',
  ]);
  assert.equal(headings[0].includes('next-steps'), true, 'markdown leads with next steps');
});

test('the rail indexes the pane — every rail step links to a step that exists', () => {
  const markup = stripComments(html);
  const rail = markup.slice(markup.indexOf('<aside class="rail"'), markup.indexOf('</aside>'));

  const linked = [...rail.matchAll(/href="#(step-\d+)"/g)].map((m) => m[1]);
  const targets = [...markup.matchAll(/<li id="(step-\d+)"/g)].map((m) => m[1]);

  assert.ok(linked.length > 0, 'the rail carries at least one step link');
  assert.deepEqual(
    linked,
    targets,
    'each rail step links to its twin in the pane, in order — a link with no id scrolls nowhere',
  );
});

test('the rail is an index, never the only copy of a step', () => {
  const markup = stripComments(html);
  const rail = markup.slice(markup.indexOf('<aside class="rail"'), markup.indexOf('</aside>'));

  // The clamp is what makes this necessary: a rail entry is truncated to three
  // lines, so text that lives only there is unreadable. This was the defect in
  // the direction's first draft.
  assert.match(surface, /-webkit-line-clamp/, 'rail entries are clamped');
  for (const link of rail.matchAll(/<a href="#(step-\d+)">([^<]+)<\/a>/g)) {
    const [, id, text] = link;
    const paneItem = markup.match(new RegExp('<li id="' + id + '">([^<]*)</li>'));
    assert.ok(paneItem, 'pane holds ' + id);
    assert.equal(paneItem[1].trim(), text.trim(), 'rail and pane carry the same text for ' + id);
  }
});

test('data-kit-chrome marks the whole nav box, and nothing that carries content', () => {
  // kit:css puts [data-kit-chrome] inside @media print alongside .kit-help and
  // .kit-theme, so it hides exactly the element it marks. On the <nav> alone it
  // left the box's "sections" label heading nothing on every printout; on the
  // rail itself it would delete identity, steps and blockers from print too.
  const markup = stripComments(html);
  const tagged = [...markup.matchAll(/<(\w+)([^>]*)data-kit-chrome([^>]*)>/g)];

  assert.equal(tagged.length, 1, 'exactly one element is marked as chrome');
  assert.equal(tagged[0][1], 'div', 'the mark sits on the rail box, not the <nav> inside it');
  assert.match(tagged[0][2] + tagged[0][3], /class="railbox"/, 'and that div is the nav box');

  const box = markup.slice(markup.indexOf('<div class="railbox" data-kit-chrome>'));
  const label = box.slice(0, box.indexOf('</div>'));
  assert.match(label, /<span class="eyebrow">sections<\/span>/, 'the label is inside the marked box');
  assert.match(label, /<nav aria-label="Sections">/, 'so is the nav it labels');
});

test('the retired terminal chrome leaves nothing behind', () => {
  for (const dead of ['section-nav', 'term-body', 'class="cmd"', 'id="meta-line"']) {
    assert.equal(html.includes(dead), false, dead + ' was retired by D8 and must not linger');
  }
});

test('measure is capped on list items, not only paragraphs', () => {
  // The longest line in a filled handoff was a list item in "important context",
  // the one section the template marks MUST READ.
  const liRule = surface.match(/\n\s*li \{[^}]*\}/);

  assert.ok(liRule, 'the surface defines an li rule');
  assert.match(liRule[0], /max-width:\s*68ch/, 'li carries the measure cap');
  assert.match(surface, /td p,\s*\n\s*td li \{[^}]*max-width:\s*none/, 'table cells are exempt');
});

test('no grid column floors at min-content', () => {
  // A bare `1fr` resolves to minmax(auto, 1fr), and auto-as-minimum is
  // min-content — one long path in a table then pushes the page sideways.
  const columns = [...surface.matchAll(/grid-template-columns:\s*([^;]+);/g)].map((m) => m[1].trim());

  assert.ok(columns.length > 0, 'the surface defines grid columns');
  for (const value of columns) {
    assert.equal(
      /(^|\s)1fr(\s|$)/.test(value),
      false,
      'grid-template-columns must use minmax(0, 1fr), not a bare 1fr: ' + value,
    );
  }
});

test('the surface prints as one column without touching the kit print block', () => {
  const print = surface.match(/@media print \{[\s\S]*?\n {6}\}/);

  assert.ok(print, 'the surface defines its own @media print block');
  assert.match(print[0], /\.shell \{[^}]*display:\s*block/, 'the two-column shell collapses');
  assert.match(print[0], /\.rail \{[^}]*position:\s*static/, 'the sticky rail is released');
});

// The extension-token theme-pairing assertion that used to live here now runs
// over all four surfaces at once in tests/surface-theme-pairing.test.mjs.
// It moved when plan-review — the last surface still carrying the defect —
// was fixed (docket #48), which is what let one test close the class.

test('the rail stays reachable and the layout stacks when narrow', () => {
  assert.match(surface, /\.rail \{[\s\S]*?max-height:\s*calc\(100dvh[^)]*\)/, 'rail is height-bounded');
  assert.match(surface, /\.rail \{[\s\S]*?overflow-y:\s*auto/, 'rail scrolls within itself');
  assert.match(surface, /@media \(max-width: 62rem\)/, 'the shell has a stacking breakpoint');
  assert.match(surface, /min-height:\s*100dvh/, 'dvh, not vh');
  assert.equal(/[^d]100vh/.test(surface), false, 'no bare 100vh');
});
