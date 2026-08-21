import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The categorical slot rule (docket #46, specs/surface-kit/decisions.md D7)
// lives inline in template.html, where no test can import it. Its interesting
// behaviour is also the behaviour that never renders during development: a
// report with eight projects exercises slots 1-8 and nothing else, so the
// composite tier and the overflow fold would ship unexercised — which is
// precisely the "unbounded series count" concern the docket item raised.
//
// So the rule is written as a pure function fenced by extraction markers, and
// this suite evaluates the real source rather than a copy. The markers are for
// this test only: they are NOT check-tokens.mjs regions, and `--fix` does not
// touch them.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(__dirname, '../skills/session-report/template.html');

function loadCatSlot() {
  const src = fs.readFileSync(TEMPLATE, 'utf8');
  const region = src.match(/\/\* cat:slots:start[^*]*\*\/([\s\S]*?)\/\* cat:slots:end \*\//);

  // A shapeless "cannot read property of null" is how this failure used to
  // read. Name it instead, the same way check-tokens.mjs reports a missing
  // marker rather than guessing.
  assert.ok(region, 'cat:slots markers missing from template.html — the slot rule cannot be extracted');

  return new Function(`${region[1]}; return catSlot;`)();
}

test('slots 1-8 are the eight hues, solid', () => {
  const catSlot = loadCatSlot();

  for (let rank = 0; rank < 8; rank++) {
    const slot = catSlot(rank);
    assert.equal(slot.token, `--cat-${rank + 1}`);
    assert.equal(slot.glyph, '█');
    assert.equal(slot.striped, false);
  }
});

test('slots 9-16 repeat the hues with the second channel', () => {
  const catSlot = loadCatSlot();

  for (let rank = 8; rank < 16; rank++) {
    const slot = catSlot(rank);

    // Same hue as its partner eight slots earlier — the second channel is what
    // separates them, not a ninth colour.
    assert.equal(slot.token, catSlot(rank - 8).token);
    assert.equal(slot.glyph, '▓');
    assert.equal(slot.striped, true);
  }
});

test('the glyph tier never uses a texture that reads as empty track', () => {
  const catSlot = loadCatSlot();
  const glyphs = new Set(Array.from({ length: 24 }, (_, rank) => catSlot(rank).glyph));

  // ░ is the empty track at 8% ink; ▒ (21.4%) and ▚ (22.4%) sit near it and
  // corrupt perceived bar length. Only █ (44.7%) and ▓ (35.1%) are legal.
  assert.deepEqual([...glyphs].sort(), ['█', '▓']);
});

test('everything past slot 16 folds to --cat-other, never a cycled hue', () => {
  const catSlot = loadCatSlot();

  for (const rank of [16, 17, 23, 40, 999]) {
    const slot = catSlot(rank);
    assert.equal(slot.token, '--cat-other');
    assert.equal(slot.striped, false);
    assert.doesNotMatch(slot.token, /--cat-\d/, 'a rank past the composite tier must not wear a numbered hue');
  }
});

test('the charts share one global slot map rather than a per-view index', () => {
  const src = fs.readFileSync(TEMPLATE, 'utf8');

  // The reported bug was that the timeline owned a private palette keyed on
  // position within the selected day range, so a project's colour changed as
  // you arrowed through days and the bars could not reach it at all.
  assert.doesNotMatch(src, /const PCOL =/, 'the private timeline palette must be gone, not re-pointed');
  assert.doesNotMatch(src, /projects\.indexOf\(p\)/, 'colour must follow the entity, never its index in the current view');
  assert.match(src, /const SLOT_OF = new Map\(/, 'the shared global slot map is missing');
  assert.match(src, /DATA\.by_project/, 'the slot map must rank from by_project, not from the day-scoped list');
});

test('the prompt histogram is a distribution and keeps the accent', () => {
  const src = fs.readFileSync(TEMPLATE, 'utf8');
  const hist = src.slice(src.indexOf('prompt-histogram'));

  // One series, so categorical colour would be re-encoding what bar length
  // already shows.
  assert.doesNotMatch(hist.slice(0, 1200), /--cat-/, 'the histogram must not consume the categorical ramp');
});
