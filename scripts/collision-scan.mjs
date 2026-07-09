#!/usr/bin/env node
'use strict';
// Trigger-collision scanner (health campaign, Front A4).
//
// EXPERIMENT ARTIFACT — hypothesis falsified 2026-07-09. Static lexical
// overlap (pairwise Jaccard over trigger-contract content words) CANNOT
// reproduce the empirically observed collisions: max recall 5% at every
// threshold 0.08–0.18 against the preregistered ≥80% criterion. Two reasons,
// both verified on this library:
//   1. Observed collisions are SEMANTIC adjacencies ("resume"/"done"/"review"
//      concept-spaces) — the contracts share almost no vocabulary because the
//      2026-07-08 disambiguation passes de-overlapped them lexically.
//   2. The highest lexical overlaps are mutual cross-reference vocabulary
//      (subagent pair, discovery↔draft-plan's shared "signed-off design"
//      pipeline terms) — i.e. high overlap often marks DELIBERATE
//      disambiguation. The signal is partially inverted.
// Adopted detector instead: the eval harness (scripts/eval-triggers.mjs) —
// sibling-miss pairs and the flaky list from periodic runs.
//
// Kept as: (a) the falsification record, (b) the curated EMPIRICAL_PAIRS
// registry (update it per eval round), (c) an exploratory lens (--top).
//
// Usage:
//   node scripts/collision-scan.mjs [--threshold 0.18] [--top 15]
//   node scripts/collision-scan.mjs --check     # score against empirical pairs
//   node scripts/collision-scan.mjs --json      # machine-readable pairs
//
// The --check validation set is the collision pairs OBSERVED in the 2026-07-08
// A3 eval rounds (a judge routed a query expected by one skill to the other) —
// see skills/toolkit-research-frontier/references/eval-round3-2026-07-08.md
// and eval-trials-2026-07-08.md.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const THRESHOLD = Number(flag('--threshold', '0.18'));
const TOP = Number(flag('--top', '15'));
const CHECK = args.includes('--check');
const JSON_OUT = args.includes('--json');

// Observed collision pairs from the 2026-07-08 A3 rounds (order-insensitive).
const EMPIRICAL_PAIRS = [
  ['plan-review', 'spec-browser'],
  ['discovery', 'session-handoff'],
  ['discovery', 'draft-plan'],
  ['draft-plan', 'technical-spec'],
  ['draft-plan', 'workflow'],
  ['preflight', 'code-review'],
  ['preflight', 'finalize'],
  ['plugin-foundry', 'adapting-skills'],
  ['toolkit-change-control', 'toolkit-plugin-reference'],
  ['toolkit-change-control', 'toolkit-orientation'],
  ['toolkit-change-control', 'toolkit-debugging-playbook'],
  ['toolkit-change-control', 'adapting-skills'],
  ['toolkit-skill-standards', 'toolkit-change-control'],
  ['toolkit-skill-standards', 'toolkit-debugging-playbook'],
  ['toolkit-debugging-playbook', 'root-cause-analysis'],
  ['toolkit-failure-archaeology', 'toolkit-orientation'],
  ['toolkit-failure-archaeology', 'toolkit-research-frontier'],
  ['toolkit-plugin-reference', 'toolkit-orientation'],
  ['toolkit-plugin-reference', 'toolkit-debugging-playbook'],
  ['subagent-execution', 'session-handoff'],
];

const STOP = new Set(('use when the a an and or of to for in on with — - is are was be this that it its ' +
  'you your before after any all only never always also not no do does did done what which who how ' +
  'skill skills trigger triggers triggered triggering include includes including like via one two ' +
  'more than then them they their there here into out up down over under between against jabworks ' +
  'agentic toolkit repo').split(/\s+/));

function fmField(block, key) {
  const m = block.match(new RegExp('^' + key + ':[ \\t]*(.*)$', 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
}
function tokens(text) {
  return new Set(
    text.toLowerCase().replace(/\\n/g, ' ').replace(/[^a-z0-9\s-]/g, ' ').split(/[\s]+/)
      .map((w) => w.replace(/^-+|-+$/g, ''))
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

const contracts = [];
for (const name of fs.readdirSync(SKILLS_DIR)) {
  const file = path.join(SKILLS_DIR, name, 'SKILL.md');
  if (!fs.existsSync(file)) continue;
  const m = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  if (!m) continue;
  contracts.push({ name, toks: tokens(fmField(m[1], 'description') + ' ' + fmField(m[1], 'when_to_use')) });
}

const pairs = [];
for (let i = 0; i < contracts.length; i++) {
  for (let j = i + 1; j < contracts.length; j++) {
    const a = contracts[i], b = contracts[j];
    const shared = [...a.toks].filter((t) => b.toks.has(t));
    const jaccard = shared.length / (a.toks.size + b.toks.size - shared.length);
    pairs.push({ a: a.name, b: b.name, jaccard, shared });
  }
}
pairs.sort((x, y) => y.jaccard - x.jaccard);
const flagged = pairs.filter((p) => p.jaccard >= THRESHOLD);

if (JSON_OUT) {
  console.log(JSON.stringify(flagged.map(({ a, b, jaccard, shared }) => ({ a, b, jaccard: +jaccard.toFixed(3), shared })), null, 2));
  process.exit(0);
}

if (CHECK) {
  const key = (a, b) => [a, b].sort().join('|');
  const empirical = new Set(EMPIRICAL_PAIRS.map(([a, b]) => key(a, b)));
  const flaggedKeys = new Set(flagged.map((p) => key(p.a, p.b)));
  const caught = [...empirical].filter((k) => flaggedKeys.has(k));
  const falseAlarms = [...flaggedKeys].filter((k) => !empirical.has(k));
  console.log(`threshold ${THRESHOLD}: flagged ${flagged.length} pairs`);
  console.log(`recall:      ${caught.length}/${empirical.size} empirical pairs caught (${(100 * caught.length / empirical.size).toFixed(0)}%)`);
  console.log(`false-alarm: ${falseAlarms.length}/${flagged.length} flagged pairs not empirically observed (${flagged.length ? (100 * falseAlarms.length / flagged.length).toFixed(0) : 0}%)`);
  console.log(`missed: ${[...empirical].filter((k) => !flaggedKeys.has(k)).join(', ') || 'none'}`);
  process.exit(0);
}

console.log(`Top ${TOP} trigger-contract overlaps (Jaccard over content words; threshold ${THRESHOLD}):\n`);
for (const p of pairs.slice(0, TOP)) {
  console.log(`${p.jaccard >= THRESHOLD ? '⚠' : ' '} ${p.jaccard.toFixed(3)}  ${p.a} ↔ ${p.b}`);
  if (p.jaccard >= THRESHOLD) console.log(`         shared: ${p.shared.slice(0, 10).join(', ')}`);
}
