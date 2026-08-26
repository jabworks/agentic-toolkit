import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeDensity } from '../scripts/spec-density.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SPECS = path.join(REPO_ROOT, 'specs');

// The three structural checks from specs/spec-artifact-readability (§5): the
// gate checks structure, not a prose percentage — structure caps prose
// mechanically, and each failure here names the file and the missing shape.
// No grandfathering: every spec dir complies (design decision 8).
//
// Scope: concern files by exact filename (quirks.md / decisions.md / api.md).
// design.md, verification.md, findings.md etc. are promoted artifacts, not
// concern files, and make no structural claim.

const specDirs = fs
  .readdirSync(SPECS)
  .filter((d) => fs.statSync(path.join(SPECS, d)).isDirectory());

// ---------------------------------------------------------------------------
// Check 1 — quirks.md headings are `## Q<n> — Title`
// ---------------------------------------------------------------------------

// durable-citations.test.mjs resolves every cited Q<n> against a `## Q<n>`
// heading, but until 2026-08-26 the template never taught the format — eight
// files carried no numbers and two variants existed (`Q1 —` and `Q1.`). The
// heading is a citation contract, so it is asserted, not advised.
//
// Numbers must be unique and ascending. NOT gap-free: quirks get deleted, and
// renumbering is forbidden (citations from other specs point at them), so a
// gap is history, not an error.

for (const dir of specDirs) {
  const p = path.join(SPECS, dir, 'quirks.md');
  if (!fs.existsSync(p)) continue;

  test(`specs/${dir}/quirks.md headings are \`## Q<n> — Title\``, () => {
    const md = fs.readFileSync(p, 'utf8');
    const headings = md.match(/^## .*$/gm) || [];
    const nums = [];
    for (const h of headings) {
      const m = /^## Q(\d+) — \S/.exec(h);
      assert.ok(m, `specs/${dir}/quirks.md: heading "${h}" is not \`## Q<n> — Title\``);
      nums.push(Number(m[1]));
    }
    const sorted = [...nums].sort((a, b) => a - b);
    assert.deepEqual(nums, sorted, `specs/${dir}/quirks.md: quirk numbers are not ascending (${nums.join(', ')})`);
    assert.equal(new Set(nums).size, nums.length, `specs/${dir}/quirks.md: duplicate quirk number (${nums.join(', ')})`);
  });
}

// ---------------------------------------------------------------------------
// Check 2 — decisions.md opens with the summary table
// ---------------------------------------------------------------------------

// "Which decisions exist" must be answerable without reading the file. The
// header row is Task 1's exact spelling; the table must appear before the
// first per-decision `## ` heading.

for (const dir of specDirs) {
  const p = path.join(SPECS, dir, 'decisions.md');
  if (!fs.existsSync(p)) continue;

  test(`specs/${dir}/decisions.md opens with the summary table`, () => {
    const md = fs.readFileSync(p, 'utf8');
    const firstHeading = md.search(/^## /m);
    const head = firstHeading === -1 ? md : md.slice(0, firstHeading);
    assert.match(
      head,
      /^\| # \| Decision \| Because \| Status \|$/m,
      `specs/${dir}/decisions.md: no \`| # | Decision | Because | Status |\` summary table before the first decision heading`,
    );
  });
}

// ---------------------------------------------------------------------------
// Check 3 — api.md ts-fenced type declarations annotate every field
// ---------------------------------------------------------------------------

// The two-homes rule: the type says what a field MEANS; fields.md says what
// happens to it. Scoped to fenced blocks tagged ts/typescript that declare an
// interface or type — measured at design time, zero such blocks existed in
// the corpus, so the check is vacuous on old content and binding on new.
// Zero matching blocks is a PASS (resolved question 1), never a skip-warning.

function tsBlocks(md) {
  const blocks = [];
  const re = /^```(?:ts|typescript)\s*$([\s\S]*?)^```\s*$/gm;
  let m;
  while ((m = re.exec(md)) !== null) blocks.push(m[1]);
  return blocks;
}

for (const dir of specDirs) {
  const p = path.join(SPECS, dir, 'api.md');
  if (!fs.existsSync(p)) continue;

  test(`specs/${dir}/api.md annotates every field in ts-fenced type blocks`, () => {
    const md = fs.readFileSync(p, 'utf8');
    for (const block of tsBlocks(md)) {
      if (!/\b(interface|type)\s+\w/.test(block)) continue;
      const lines = block.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/^\s+[\w$]+\??\s*:.*;\s*(\/\/.*)?$/.test(line)) continue; // field lines only
        const commented = /\/\//.test(line) || /\*\/\s*$/.test(lines[i - 1] || '');
        assert.ok(
          commented,
          `specs/${dir}/api.md: field "${line.trim()}" has no meaning annotation — ` +
            'the type says what a field means (trailing `//`), fields.md says what happens to it',
        );
      }
    }
  });
}

// ---------------------------------------------------------------------------
// computeDensity — the reporter's measurement stays pinned to the baseline
// ---------------------------------------------------------------------------

// The 2026-08-26 baseline numbers in the design are only comparable while the
// measurement holds still: fenced interiors count as nothing, tables and list
// items as structure, everything else in a run as one paragraph.

test('computeDensity counts long paragraphs and skips fenced interiors', () => {
  const md = [
    '# T',
    '',
    'one', 'two', 'three', 'four', // 4-line paragraph → long
    '',
    'short',
    '',
    '```',
    'a', 'b', 'c', 'd', 'e', // fenced — counts as nothing
    '```',
    '| a | b |',
    '- item',
  ].join('\n');
  const d = computeDensity(md);
  assert.equal(d.longParas, 1, 'exactly one paragraph exceeds three lines');
  // prose = 4 + 1 = 5, struct = 2 → 71%
  assert.equal(d.prosePct, 71);
});

test('computeDensity treats labelled one-liners as prose (the known quirks.md bias)', () => {
  // Documented, not fixed: this is WHY prose % is context and longParas is
  // primary. If this ever changes, the design's §5 addendum is stale.
  const md = ['**Symptom:** x', '**Trigger:** y', '**Cause:** z'].join('\n');
  assert.equal(computeDensity(md).prosePct, 100);
  assert.equal(computeDensity(md).longParas, 0);
});
