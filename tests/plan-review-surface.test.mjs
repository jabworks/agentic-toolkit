// tests/plan-review-surface.test.mjs
// Pins the plan-review reviewer surface (surface-kit D10, step 2's fourth and
// last surface).
//
// This surface is the only INTERACTIVE one of the four: an absolutely-positioned
// popover anchored to a live Range, and highlights that mutate the reviewed
// document with surroundContents. Almost everything asserted here was measured
// into existence by breaking the page, and the failures it guards against are
// quiet ones — a popover that anchors to the wrong box still renders, a thread
// numbered in the wrong order still lists every note, and a print stylesheet
// that drops the plan into a 151px column looks fine on screen.
//
// Assertions run against `skills/`, the editable source. The four dist mirrors
// are byte-compared by dist-mirror / opencode-dist / cursor-dist.
//
// The extension-token theme pairing (docket #48) is NOT asserted here — it runs
// over all four surfaces in tests/surface-theme-pairing.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML_PATH = path.join(ROOT, 'skills/plan-review/references/plan-review-template.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

// Cut the kit regions so a surface assertion can never pass on the strength of
// kit source it does not own. A kit change is atomic across all four surfaces
// plus an npm changeset; a surface change is one plugin.
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

// `.main` is declared more than once — the base rule plus a narrow-viewport
// padding override inside @media (max-width: 640px), which appears FIRST in the
// file. A naive /\.main \{/ therefore matches the media-query copy, and an
// assertion written against it passes vacuously: the graph-paper check below
// "passed" that way before this helper existed. Select the block that actually
// carries the layout declarations.
function baseRule(selector) {
  const blocks = [...surface.matchAll(new RegExp(`${selector} \\{([^}]*)\\}`, 'g'))].map((m) => m[1]);
  const base = blocks.find((b) => /position:|overflow-y:/.test(b));
  assert.ok(base, `${selector} has a base rule with layout declarations`);
  return base;
}

test('the anchoring contract on .main survives', () => {
  // C1. #popover is position:absolute and a DIRECT CHILD of .main; selDoc stores
  // `rect.left - host.left + main.scrollLeft`, and placePopover clamps against
  // main.scrollWidth. So .main must remain BOTH the offsetParent and the scroll
  // container. Moving the scroll to body, or wrapping #plan in its own scroller,
  // silently breaks every annotation anchor — the popover still renders, just in
  // the wrong place.
  const mainRule = baseRule('\\.main');
  assert.match(mainRule, /position:\s*relative/, '.main stays the offsetParent');
  assert.match(mainRule, /overflow-y:\s*auto/, '.main stays the scroll container');

  assert.match(
    html,
    /<div class="popover" id="popover"[^>]*>/,
    'the popover element is still the one placePopover addresses',
  );
  // The popover must not gain an intermediate positioned ancestor. It is a
  // direct child of <main class="main"> in the markup; assert that adjacency
  // rather than trusting a comment.
  const mainOpen = html.indexOf('<main class="main">');
  const mainClose = html.indexOf('</main>');
  const popAt = html.indexOf('<div class="popover" id="popover"');
  assert.ok(popAt > mainOpen && popAt < mainClose, 'the popover lives inside .main');
});

test('no sticky chrome is introduced inside the scroll area', () => {
  // C2. placePopover flips the popover below with `top < main.scrollTop + 4` — a
  // hardcoded 4px that assumes nothing occupies the top of .main's viewport. D8
  // added a sticky rail and D9 a sticky strip; inheriting that pattern here
  // would place the popover BEHIND the sticky chrome for any selection near the
  // top of the scroll area. If this ever needs to change, the 4 becomes a
  // measured offset, re-measured on resize (surface-kit Q19).
  assert.match(surface, /top\s*<\s*main\.scrollTop\s*\+\s*4/, 'the flip test is still the documented one');
  const stickyRules = [...surface.matchAll(/([^{};]+)\{[^}]*position:\s*sticky[^}]*\}/g)].map((m) => m[1].trim());
  const insideMain = stickyRules.filter((sel) => /\.(main|doc|docpane|crumbs|blk)\b/.test(sel));
  assert.deepEqual(insideMain, [], 'nothing inside the scroll area is sticky');
});

test('the document reads as a manuscript, not a dashboard', () => {
  // D10. The graph paper competed with prose on every line.
  assert.doesNotMatch(baseRule('\\.main'), /background-image/, 'the graph-paper background is gone');

  assert.match(surface, /h1 \{[^}]*border-bottom: 1px solid var\(--border\)/, 'h1 closes with a rule');
  assert.match(surface, /h2 \{[^}]*border-top: 1px solid var\(--border\)/, 'h2 opens against a hairline');

  // Q15 — capping measure on <p> alone misses the worst line, and a plan is
  // mostly list items. Table cells must keep their column.
  assert.match(surface, /\.doc p, \.doc li \{ max-width: 68ch; \}/, 'measure is capped on li too');
  assert.match(surface, /\.doc td p, \.doc td li[^}]*max-width: none/, 'table cells are exempt');

  // Q14 — one long file path in a task card must not widen a column.
  assert.match(surface, /\.app > \* \{ min-width: 0; \}/, 'grid children have an explicit floor');
});

test('highlights are numbered and the numbering has a defined order', () => {
  // The counter is what ties the two columns into one artifact, and it numbers
  // by DOCUMENT position. The thread must therefore render in document order —
  // in insertion order the two numberings disagree the moment a note is added
  // above an earlier one, which is most of a real review.
  assert.match(surface, /\.doc \{[^}]*counter-reset: hl/, 'the document resets the counter');
  assert.match(surface, /mark\.hl \{[^}]*counter-increment: hl/, 'each highlight increments it');
  assert.match(surface, /mark\.hl::after \{[^}]*content: counter\(hl\)/, 'and renders its ordinal');
  assert.match(surface, /\.thread \{[^}]*counter-reset: note/, 'the thread resets its own counter');
  assert.match(surface, /\.msg::before \{[^}]*content: counter\(note\)/, 'and the gutter repeats the ordinal');

  assert.match(surface, /function threadOrder\(\)/, 'the ordering is a named function, not inline');
  assert.match(surface, /threadOrder\(\)\.forEach/, 'paint renders the ordered list');

  // The submitted payload must carry the SAME order the reviewer saw. Posting
  // the raw insertion-order array hands the agent a different numbering than the
  // one rendered in the gutter, so "note 1" means two different notes depending
  // on who is reading. Caught end-to-end: the UI showed document order while the
  // written feedback file listed insertion order.
  assert.match(surface, /thread:threadOrder\(\)/, 'the decision payload is ordered too');
  assert.doesNotMatch(surface, /thread:annotations\b/, 'never the raw insertion-order array');
  assert.doesNotMatch(surface, /annotations\.forEach\(function\(a\)\{\s*const m=document\.createElement/, 'paint no longer renders insertion order');
});

test('the two numberings agree in directory mode', () => {
  // `counter-reset: hl` lives on .doc — one counter for all of #plan — and marks
  // inside a display:none .docpane do NOT increment it. So the in-document
  // ordinals count only the ACTIVE document. `counter-reset: note` lives on
  // .thread, whose rows are all visible, so the gutter would count notes across
  // EVERY document. Measured in DIRMODE before the fix: a note at gutter
  // position 3 whose highlight rendered "1" — precisely the divergence the
  // numbering exists to remove, surviving in the multi-document case.
  //
  // Rows belonging to another document are flagged and take no ordinal, which
  // leaves both sequences running 1..m over the same set. The written feedback
  // file agrees too: feedbackMarkdown groups DIRMODE notes per file and
  // restarts its enumeration at 1 in each group.
  assert.match(
    surface,
    /if\(a\.kind==='note'&&a\.doc&&a\.doc!==activeDoc\) m\.dataset\.otherDoc='1';/,
    'paint flags rows from other documents',
  );
  assert.match(
    surface,
    /\.msg\[data-other-doc\]::before \{ counter-increment: none;/,
    'and those rows take no ordinal',
  );
});

test('a plan does not get two dividers before every task card', () => {
  // h2 opens a section against its own rule, and draft-plan's canonical template
  // puts `---` immediately before every task card — so nearly every plan this
  // surface renders doubled the divider. Measured 9 in one 9-task plan.
  // Each block is wrapped in its own .blk, so `hr + h2` cannot match; the
  // relative selector has to look forward to the next block.
  assert.match(
    surface,
    /\.blk:has\(> hr\):has\(\+ \.blk h2\) \{ display: none; \}/,
    'the redundant separator is suppressed, not the h2 rule',
  );
  assert.match(surface, /h2 \{[^}]*border-top: 1px solid var\(--border\)/, 'the h2 keeps the spine');
});

test('threadOrder sorts a copy and never the live store', () => {
  // annotations is the identity store: saveNote pushes to it and the delete
  // handler resolves rows with annotations.indexOf(a). Sorting it in place
  // breaks deletion — the wrong note disappears — while looking correct.
  const fn = surface.slice(surface.indexOf('function threadOrder()'), surface.indexOf('function paint()'));
  assert.match(fn, /annotations\.slice\(\)\.sort\(/, 'it sorts a copy');
  assert.doesNotMatch(fn, /\bannotations\.sort\(/, 'it never sorts the store itself');
  assert.match(fn, /if\(x\.kind!=='note'\|\|y\.kind!=='note'\) return 0;/, 'chat messages hold their place');
  assert.match(fn, /if\(!mx\|\|!my\) return 0;/, 'a note whose mark is missing does not throw');
  assert.match(fn, /compareDocumentPosition/, 'order comes from document position, not geometry');

  // DIRMODE keeps every doc's pane in the DOM, hidden. A document-wide lookup
  // matches a mark in another document's pane and sorts against it.
  assert.match(fn, /docState\[activeDoc\][^;]*\.pane/, 'the mark lookup is scoped to a pane');
  assert.match(fn, /pane\?pane\.querySelector\('mark\.hl\[data-aid="'/, 'and queries within it');
  assert.doesNotMatch(fn, /document\.querySelector\('mark\.hl/, 'never document-wide');
});

test('category is exposed as data so CSS can select on it', () => {
  // The category is otherwise written only as TEXT into .meta .who, and CSS
  // cannot select on text content — without this the coloured gutter is unreachable.
  assert.match(surface, /m\.dataset\.cat=\(a\.kind==='note'\?\(a\.cat\|\|'Note'\):'message'\)/, 'paint sets data-cat');

  // The styled set must be exactly the popover's chips. An earlier draft styled
  // "Praise", which is not a category this surface offers, and left "Comment" —
  // the most common one — unaccounted for. The chips are the source of truth.
  const chips = [...html.matchAll(/<button type="button" class="chip[^"]*" data-cat="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(chips, ['Comment', 'Issue', 'Question', 'Suggestion', 'Nitpick'], 'the chip set is unchanged');

  for (const cat of ['Issue', 'Question', 'Suggestion', 'Nitpick']) {
    assert.match(
      surface,
      new RegExp(`\\.msg\\[data-cat="${cat}"\\][^}]*border-left-color`),
      `${cat} has a gutter colour`,
    );
  }
  // Comment and Note are the quiet default and must NOT be coloured, or the
  // colour stops meaning anything on a thread that is mostly comments.
  for (const cat of ['Comment', 'Note']) {
    assert.doesNotMatch(
      surface,
      new RegExp(`\\.msg\\[data-cat="${cat}"\\]`),
      `${cat} stays uncoloured`,
    );
  }
});

test('print collapses the shell instead of only hiding its chrome', () => {
  // Docket #50. [data-kit-chrome] { display: none } hides .nav and .chat but
  // leaves their grid TRACKS on .app, so .main auto-placed into the first
  // (248px) track and the plan printed in a ~151px column. .main is also the
  // scroll container, so print was clipped to one screenful.
  const printBlock = surface.match(/@media print \{([\s\S]*?)\n      \}/);
  assert.ok(printBlock, 'the surface has its own print block');
  assert.match(printBlock[1], /\.app \{ display: block; \}/, 'the grid collapses');
  assert.match(printBlock[1], /\.main \{[^}]*overflow: visible/, 'the scroll container unclips');
  assert.match(printBlock[1], /\.main \{[^}]*height: auto/, 'and stops being viewport-bound');
  // The measure cap must survive: prose set to full page width is no more
  // readable on paper than on screen.
  assert.doesNotMatch(printBlock[1], /\.doc[^}]*max-width: none/, 'the measure cap stays');
});

test('the popover keeps its own print suppression', () => {
  // data-kit-chrome is print suppression, not navigation machinery (Q13).
  // Putting it on a container that also holds content silently removes that
  // content from every printout — so it belongs on the popover and the rail,
  // and never on .main.
  assert.match(html, /<div class="popover" id="popover" data-kit-chrome>/, 'the popover is chrome');
  assert.match(html, /<aside class="chat" data-kit-chrome>/, 'the review column is chrome');
  assert.doesNotMatch(html, /<main class="main"[^>]*data-kit-chrome/, '.main is never chrome — it holds the plan');
});
