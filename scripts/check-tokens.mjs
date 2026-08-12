#!/usr/bin/env node
// Canonical-form gate for the shared colour core across every HTML surface.
//
// Four plugins in this toolkit render HTML, and each built its own palette.
// Measured 2026-08-12: session-report and session-handoff were byte-identical
// twins (56 tokens each), plan-review shared 32 of its 35 with them, and only
// the docket board spoke a different dialect entirely. So three of the four
// already agreed — by copy, with nothing holding them together, and nothing
// that would notice if one drifted.
//
// The fix is the same shape as check-frontmatter.mjs: a narrow canonical form
// plus a fixer, rather than a tolerant parser that reconciles four dialects.
// scripts/tokens/core.css is the canonical text; every surface carries it
// verbatim between the two markers below, and per-surface tokens live outside
// them. The comparison is byte-exact — no CSS parsing, no property-by-property
// diff — which is only possible because the region has exactly one form.
//
// Deliberately NOT a build step. A generator would make the marked region build
// output, so hand-editing it would be a bug and skills/ would become partly
// generated — against this repo's "edit skills/, it is the source of truth".
// As a checker, the region stays authored and merely has to match. It is wired
// as a gate on sync.sh and pre-commit, never as a copy arm, so it adds nothing
// to the surface docket #11 is filed against.
//
// Notes for whoever edits the palette: per-surface tokens belong OUTSIDE the
// markers — anything inside is replaced without warning. --mono and --radius
// are theme-invariant, so the light block omits them. The core's own header is
// deliberately one line: it is inlined into four shipped artifacts, where a
// paragraph about repo tooling would be noise to anyone who installed a plugin.
//
// Dependency-free on purpose: it gates sync.sh and the pre-commit hook, which
// must work in a fresh clone with no node_modules.
//
// Usage:
//   node scripts/check-tokens.mjs                      # check every surface
//   node scripts/check-tokens.mjs --fix                # rewrite the regions

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

export const CORE_PATH = 'scripts/tokens/core.css';

export const START = '/* tokens:core:start */';
export const END = '/* tokens:core:end */';

// Literal, not globbed. Probing the tree for membership is exactly the failure
// mode docket #11 is filed against: a source of truth that infers itself.
// A new HTML surface is a deliberate edit here, not something a scan discovers.
export const SURFACES = [
  'skills/plan-review/references/plan-review-template.html',
  'skills/session-report/template.html',
  'skills/session-handoff/references/handoff-template.html',
  'skills/record/server/docket-render.mjs',
];

export function readCore(root = REPO_ROOT) {
  const core = fs.readFileSync(path.join(root, CORE_PATH), 'utf8');

  // docket-render.mjs carries its CSS inside a JS template literal, so a
  // backtick or an interpolation opener in the core would not fail here — it
  // would produce a broken renderer at runtime, in one surface only. Assert it
  // at the source instead of trusting a future palette edit to be careful.
  if (core.includes('`') || core.includes('${')) {
    throw new Error(`${CORE_PATH} contains a backtick or \${ — it is inlined into a JS template literal`);
  }

  return core;
}

// The expected region body: a newline after the start marker, then the core
// verbatim (which already ends in a newline) leading into the end marker.
export function expectedBody(core) {
  return `\n${core}`;
}

export function findRegion(src, rel) {
  const start = src.indexOf(START);
  const end = src.indexOf(END);

  if (start < 0 || end < 0) return { problem: `missing the ${start < 0 ? 'start' : 'end'} marker` };
  if (end < start) return { problem: 'end marker precedes the start marker' };
  if (src.indexOf(START, start + 1) >= 0) return { problem: 'duplicate start marker' };
  if (src.indexOf(END, end + 1) >= 0) return { problem: 'duplicate end marker' };

  return { body: src.slice(start + START.length, end), from: start + START.length, to: end, rel };
}

export function checkSurface(src, core, rel) {
  const region = findRegion(src, rel);
  if (region.problem) return { ok: false, reason: region.problem };

  if (region.body !== expectedBody(core)) return { ok: false, reason: 'core block differs from ' + CORE_PATH };

  return { ok: true };
}

// Replaces the marked region only — never anything outside it, and never by
// matching code structure. The markers are the sole anchors, which is what
// keeps this safe to run against a JS file.
export function applyCore(src, core, rel) {
  const region = findRegion(src, rel);
  if (region.problem) return { changed: false, problem: region.problem, src };

  const next = src.slice(0, region.from) + expectedBody(core) + src.slice(region.to);

  return { changed: next !== src, src: next };
}

export function checkTokens({ root = REPO_ROOT, fix = false, surfaces = SURFACES } = {}) {
  const core = readCore(root);
  const findings = [];
  let fixed = 0;

  for (const rel of surfaces) {
    const abs = path.join(root, rel);
    let src = fs.readFileSync(abs, 'utf8');

    if (fix) {
      const result = applyCore(src, core, rel);
      if (result.changed) {
        fs.writeFileSync(abs, result.src);
        src = result.src;
        fixed++;
      }
    }

    const { ok, reason } = checkSurface(src, core, rel);
    if (!ok) findings.push({ file: rel, reason });
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
    console.error(`\n${findings.length} surface(s) out of sync with ${CORE_PATH}.`);
    console.error('Run `node scripts/check-tokens.mjs --fix` to rewrite the marked regions.');
    console.error('A missing marker is not mechanical — add the marker pair by hand first.');

    return 1;
  }

  console.log(`✔ token core canonical — ${SURFACES.length} surface(s)${fixed ? `, ${fixed} fixed` : ''}`);

  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
