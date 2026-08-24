// tests/surface-theme-pairing.test.mjs
// Docket #48 / surface-kit Q16, generalised to every surface at once.
//
// Each surface defines its own extension tokens outside the `tokens:core`
// markers (`--secondary`, `--card-hover`, `--hl`, and the aliases built on
// them). They are dark-first like the core, so their light values are an
// OVERRIDE — and all of them originally wrote that override as a bare
// `@media (prefers-color-scheme: light) { :root { … } }` with no `[data-theme]`
// blocks at all.
//
// On a light system, clicking Dark then flipped every core token and left the
// extension tokens at their light values, because the media query still
// matched. The tell is partial and so reads as a rendering glitch rather than a
// token bug: tokens that alias a core token (`--term-bg: var(--background)`)
// follow the toggle, literal hexes do not. On session-handoff the card inverted
// to #111110 while its own header stayed cream; on plan-review the annotation
// highlight stayed light-yellow on a dark page.
//
// This lived as a per-surface copy in session-handoff-surface.test.mjs and
// session-report-surface.test.mjs while the other surfaces were still broken.
// It is one test over all four now, which is what closes the class rather than
// its last instance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SURFACES = [
  ['plan-review', 'skills/plan-review/references/plan-review-template.html'],
  ['session-handoff', 'skills/session-handoff/references/handoff-template.html'],
  ['session-report', 'skills/session-report/template.html'],
  ['docket board', 'skills/record/server/board-shell.html'],
];

// The kit regions are propagated byte-for-byte from scripts/tokens/core.css by
// check-tokens.mjs, and core.css has its own polarity test. Cutting them keeps
// this test about what each surface wrote for itself — and stops a surface
// passing on the strength of the kit's blocks rather than its own.
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

const declarations = (block) =>
  [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => m[1] + ':' + m[2].trim()).sort();

for (const [name, rel] of SURFACES) {
  test(`${name}: extension tokens follow the theme toggle, not only the system`, () => {
    const file = path.join(ROOT, rel);
    assert.ok(fs.existsSync(file), `${rel} exists`);
    const surface = outsideKitRegions(fs.readFileSync(file, 'utf8'));

    // A surface that defines NO extension tokens of its own cannot have this
    // defect, and must not be failed for the absence.
    //
    // This is the exact error the original 2026-08-22 sweep made: it counted
    // "zero [data-theme] blocks outside the kit regions" and so flagged
    // board-shell — which declares no extension tokens at all — as loudly as a
    // surface whose tokens were genuinely stranded in a media query. That put a
    // fourth surface on docket #48 that was never affected. Detect the
    // condition, not the absence of the cure.
    const lightBlocks = [...surface.matchAll(/@media \(prefers-color-scheme: light\)\s*\{\s*(:root[^{]*)\{([^}]*)\}/g)];
    const declaresExtensionTokens = lightBlocks.some(([, , body]) => declarations(body).length > 0);
    if (!declaresExtensionTokens) return;

    assert.match(
      surface,
      /@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme="dark"\]\)/,
      'the system-light block must exclude an explicit dark override',
    );
    assert.match(surface, /:root\[data-theme="light"\] \{/, 'an explicit light override exists');

    const guarded = surface.match(/:root:not\(\[data-theme="dark"\]\) \{([^}]*)\}/);
    const explicit = surface.match(/:root\[data-theme="light"\] \{([^}]*)\}/);

    // Compare declarations, not just token names: the light palette is written
    // twice, so a names-only check would pass while the two copies drifted to
    // different values — the same toggle-vs-system disagreement this catches.
    assert.deepEqual(
      declarations(guarded[1]),
      declarations(explicit[1]),
      'both light blocks must declare the same tokens with the same values',
    );
  });
}

test('the generalised check would still catch a stranded token', () => {
  // A guard that cannot fail is not a guard. This is the pre-fix shape of
  // plan-review's own block, which shipped for months.
  const broken = `
    :root { --hl: rgba(255, 202, 22, 0.30); }
    @media (prefers-color-scheme: light) {
      :root { --hl: rgba(234, 179, 8, 0.42); }
    }
  `;
  const lightBlocks = [...broken.matchAll(/@media \(prefers-color-scheme: light\)\s*\{\s*(:root[^{]*)\{([^}]*)\}/g)];
  assert.equal(lightBlocks.length, 1, 'the fixture declares extension tokens, so the check engages');
  assert.ok(declarations(lightBlocks[0][2]).length > 0, 'and they are real declarations');
  assert.doesNotMatch(
    broken,
    /@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme="dark"\]\)/,
    'the unguarded block is exactly what the assertion rejects',
  );
});

test('a surface with no extension tokens is exempt rather than failed', () => {
  // board-shell's shape: everything comes from the kit region, so the cut
  // leaves no light block behind. It must pass, not be re-filed as a defect.
  const noExtensions = `
    /* tokens:core:start */
    @media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { --background: #f6f5ef; } }
    /* tokens:core:end */
    .board { display: grid; }
  `;
  const surface = outsideKitRegions(noExtensions);
  const lightBlocks = [...surface.matchAll(/@media \(prefers-color-scheme: light\)\s*\{\s*(:root[^{]*)\{([^}]*)\}/g)];
  assert.equal(lightBlocks.length, 0, 'nothing outside the kit region declares tokens');
});
