#!/usr/bin/env node
// Canonical-form gate for the shared design system across every HTML surface.
//
// Four plugins in this toolkit render HTML, and each built its own answer.
// Measured 2026-08-12: session-report and session-handoff were byte-identical
// twins (56 tokens each), plan-review shared 32 of its 35 with them, and only
// the docket board spoke a different dialect entirely. So three of the four
// already agreed — by copy, with nothing holding them together, and nothing
// that would notice if one drifted.
//
// The fix is the same shape as check-frontmatter.mjs: a narrow canonical form
// plus a fixer, rather than a tolerant parser that reconciles four dialects.
// Each entry in REGIONS names a canonical file; every surface carries it
// verbatim between that region's markers, and per-surface content lives outside
// them. The comparison is byte-exact — no CSS or JS parsing, no
// property-by-property diff — which is only possible because a region has
// exactly one legal form.
//
// It began as a colour-only gate. The mechanism was never about colour: it is
// a byte-exact region inliner, which is how four artifacts that may not share a
// runtime dependency can still share source. It now carries the palette, the
// state layer (kit.css) and the behaviour layer (kit.js).
//
// Deliberately NOT a build step. A generator would make the marked region build
// output, so hand-editing it would be a bug and skills/ would become partly
// generated — against this repo's "edit skills/, it is the source of truth".
// As a checker, the region stays authored and merely has to match. It is wired
// as a gate on sync.sh and pre-commit, never as a copy arm, so it adds nothing
// to the surface docket #11 is filed against.
//
// Notes for whoever edits these: per-surface content belongs OUTSIDE the
// markers — anything inside is replaced without warning. Type, space, radius
// and motion tokens are theme-invariant, so the light blocks omit them;
// colour and elevation are restated per theme. Each canonical file's header is
// deliberately one line: it is inlined into four shipped artifacts, where a
// paragraph about repo tooling would be noise to anyone who installed a plugin.
//
// Dependency-free on purpose: it gates sync.sh and the pre-commit hook, which
// must work in a fresh clone with no node_modules.
//
// Usage:
//   node scripts/check-tokens.mjs                      # check every region
//   node scripts/check-tokens.mjs --fix                # rewrite the regions

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

export const REGIONS = [
  {
    name: 'tokens:core',
    source: 'scripts/tokens/core.css',
    start: '/* tokens:core:start */',
    end: '/* tokens:core:end */',
  },
  {
    name: 'kit:css',
    source: 'scripts/tokens/kit.css',
    start: '/* kit:css:start */',
    end: '/* kit:css:end */',
  },
  {
    name: 'kit:js',
    source: 'scripts/tokens/kit.js',
    start: '/* kit:js:start */',
    end: '/* kit:js:end */',
  },
];

// The colour core is the default region for the single-region helpers, which
// keeps every existing caller and test working unchanged.
export const CORE_REGION = REGIONS[0];
export const CORE_PATH = CORE_REGION.source;
export const START = CORE_REGION.start;
export const END = CORE_REGION.end;

// Literal, not globbed. Probing the tree for membership is exactly the failure
// mode docket #11 is filed against: a source of truth that infers itself.
// A new HTML surface is a deliberate edit here, not something a scan discovers.
export const SURFACES = [
  'skills/plan-review/references/plan-review-template.html',
  'skills/session-report/template.html',
  'skills/session-handoff/references/handoff-template.html',
  'skills/record/server/board-shell.html',
];

// Not shipped, but it carries the same regions and is checked with them: the
// style guide is the design system's documentation, and documentation that can
// drift from the thing it documents is worse than none. It renders in the real
// tokens and runs the real kit:js, so "the guide says X" and "the surfaces do
// X" cannot come apart. Kept separate from SURFACES so the shipped-artifact
// list stays exactly that.
export const DOC_SURFACES = ['specs/surface-kit/style-guide.html'];

export const ALL_TARGETS = [...SURFACES, ...DOC_SURFACES];

// A region inlined into a JS template literal is corrupted silently: the
// literal eats the backslash, so `/\s/` becomes `/s/` with no error, in one
// surface only. docket-render.mjs was such a target until the board-shell
// extraction. Every target is .html today, so this asserts nothing — it is a
// latch that re-arms by itself if a JS target ever returns to SURFACES, rather
// than depending on whoever adds one to remember why it mattered.
export function hasJsTarget(surfaces = SURFACES) {
  return surfaces.some((rel) => /\.[cm]?js$/.test(rel));
}

// Unconditional, unlike the latch above: a literal `</script` or `</style`
// closes the element early in the *output document*, so it breaks every
// surface, not only a JS one.
const ELEMENT_BREAKERS = ['</script', '</style'];

export function assertSourceSafe(text, label, { jsTarget = hasJsTarget() } = {}) {
  for (const breaker of ELEMENT_BREAKERS) {
    if (text.includes(breaker)) {
      throw new Error(`${label} contains ${breaker} — it would close the element early in every surface`);
    }
  }

  if (!jsTarget) return;

  for (const [what, needle] of [
    ['a backtick', '`'],
    ['an interpolation opener', '${'],
    ['a backslash', '\\'],
  ]) {
    if (text.includes(needle)) {
      throw new Error(`${label} contains ${what} — a JS target inlines it into a template literal, which would eat it`);
    }
  }
}

export function readRegionSource(region, root = REPO_ROOT, options = {}) {
  const text = fs.readFileSync(path.join(root, region.source), 'utf8');

  assertSourceSafe(text, region.source, options);

  return text;
}

export function readCore(root = REPO_ROOT) {
  return readRegionSource(CORE_REGION, root);
}

// The expected region body: a newline after the start marker, then the source
// verbatim (which already ends in a newline) leading into the end marker.
export function expectedBody(text) {
  return `\n${text}`;
}

export function findRegion(src, rel, region = CORE_REGION) {
  const start = src.indexOf(region.start);
  const end = src.indexOf(region.end);

  if (start < 0 || end < 0) return { problem: `missing the ${start < 0 ? 'start' : 'end'} marker` };
  if (end < start) return { problem: 'end marker precedes the start marker' };
  if (src.indexOf(region.start, start + 1) >= 0) return { problem: 'duplicate start marker' };
  if (src.indexOf(region.end, end + 1) >= 0) return { problem: 'duplicate end marker' };

  return { body: src.slice(start + region.start.length, end), from: start + region.start.length, to: end, rel };
}

export function checkSurface(src, text, rel, region = CORE_REGION) {
  const found = findRegion(src, rel, region);

  if (found.problem) return { ok: false, reason: `${region.name}: ${found.problem}` };
  if (found.body !== expectedBody(text)) return { ok: false, reason: `${region.name}: differs from ${region.source}` };

  return { ok: true };
}

// Replaces the marked region only — never anything outside it, and never by
// matching code structure. The markers are the sole anchors.
export function applyCore(src, text, rel, region = CORE_REGION) {
  const found = findRegion(src, rel, region);

  if (found.problem) return { changed: false, problem: found.problem, src };

  const next = src.slice(0, found.from) + expectedBody(text) + src.slice(found.to);

  return { changed: next !== src, src: next };
}

// Sequential in-memory application, deliberately: each region's marker search
// runs against the CURRENT src, so offsets recompute for free after the
// previous rewrite. Precomputing all three offsets against the original text
// and splicing them in one pass would shift every region after the first.
export function applyRegions(src, sources, rel, regions = REGIONS) {
  let next = src;
  let changed = false;

  for (const region of regions) {
    const result = applyCore(next, sources[region.name], rel, region);

    if (result.problem) continue;
    if (result.changed) changed = true;

    next = result.src;
  }

  return { changed, src: next };
}

export function checkTokens({ root = REPO_ROOT, fix = false, surfaces = ALL_TARGETS, regions = REGIONS } = {}) {
  const jsTarget = hasJsTarget(surfaces);
  const sources = Object.fromEntries(
    regions.map((region) => [region.name, readRegionSource(region, root, { jsTarget })]),
  );

  const findings = [];
  let fixed = 0;

  for (const rel of surfaces) {
    const abs = path.join(root, rel);
    let src = fs.readFileSync(abs, 'utf8');

    if (fix) {
      const result = applyRegions(src, sources, rel, regions);

      if (result.changed) {
        // One read, one write, however many regions moved.
        fs.writeFileSync(abs, result.src);
        src = result.src;
        fixed++;
      }
    }

    for (const region of regions) {
      const { ok, reason } = checkSurface(src, sources[region.name], rel, region);

      if (!ok) findings.push({ file: rel, reason });
    }
  }

  return { ok: findings.length === 0, findings, fixed };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  const fix = argv.includes('--fix');
  const { ok, findings, fixed } = checkTokens({ fix });

  if (fixed > 0) console.log(`fixed   ${fixed} surface(s)`);

  if (!ok) {
    for (const finding of findings) console.error(`✘ ${finding.file}  ${finding.reason}`);
    console.error(`\n${findings.length} region(s) out of sync across ${ALL_TARGETS.length} file(s).`);
    console.error('Run `node scripts/check-tokens.mjs --fix` to rewrite the marked regions.');
    console.error('A missing marker is not mechanical — add the marker pair by hand first.');

    return 1;
  }

  const label = `${REGIONS.length} region(s) canonical — ${SURFACES.length} surface(s) + ${DOC_SURFACES.length} doc`;

  console.log(`✔ ${label}${fixed ? `, ${fixed} fixed` : ''}`);

  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
