#!/usr/bin/env node
'use strict';
// Trigger-routing eval harness (health campaign, Front A3).
//
// Presents the live skill catalog (name + description + when_to_use from
// skills/*/SKILL.md) to a model and asks it to route each corpus query
// (skills/*/evals/trigger_eval.json) to one skill or null, then scores the
// answers against expected_skill.
//
// Usage:
//   node scripts/eval-triggers.mjs [--model <id>] [--batch <n>] [--limit <n>] [--out <report.md>]
//
// Requires the `claude` CLI on PATH (runs headless via `claude -p` with your
// logged-in session; no API key handling here). Node stdlib only.
//
// Progress (run, batch, %, elapsed, ETA, running accuracy) goes to STDERR; the
// report goes to stdout. A full run is ~10 minutes, so do NOT redirect stderr
// into a buffering pipe — `2>&1 | tail -n` swallows every progress line until
// the process exits, which looks exactly like a hung run. Let stderr through:
//   node scripts/eval-triggers.mjs --runs 3 --out report.md > /dev/null

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  isHit,
  violationRows,
  violationHeadline,
  violationSection,
  scoredWithDisallowed,
} from './trigger-eval-score.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}
const MODEL = flag('--model', 'claude-haiku-4-5-20251001');
const BATCH = Number(flag('--batch', '12'));
const LIMIT = Number(flag('--limit', '0')); // 0 = all
const OUT = flag('--out', '');
const INCLUDE_ALL = args.includes('--all'); // also score kind:"in-context" cases
const RUNS = Math.max(1, Number(flag('--runs', '1'))); // trials; >1 reports mean ± 95% CI

// --- catalog ---------------------------------------------------------------
// Decodes a frontmatter scalar the way a YAML parser would. Stripping only the
// outer quotes leaves JSON escapes literal, so a double-quoted value would be
// scored as `\"review this\"` — the eval must see the catalog the host sees.
function fmField(block, key) {
  const m = block.match(new RegExp('^' + key + ':[ \\t]*(.*)$', 'm'));
  if (!m) return null;
  const raw = m[1].trim();
  if (raw.startsWith('"')) {
    try { return JSON.parse(raw); } catch { /* fall through to the raw form */ }
  }
  return raw.replace(/^'|'$/g, '');
}
const catalog = [];
// Every name the judge is allowed to answer with. An answer outside this set is
// the model reaching past its instructions for a skill it knows from elsewhere
// (Claude Code's built-ins), not a routing decision — see the report section.
const catalogNames = new Set();
for (const name of fs.readdirSync(SKILLS_DIR)) {
  const file = path.join(SKILLS_DIR, name, 'SKILL.md');
  if (!fs.existsSync(file)) continue;
  const m = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  if (!m) continue;
  const desc = fmField(m[1], 'description');
  const wtu = fmField(m[1], 'when_to_use');
  catalog.push(`- ${name}: ${desc}${wtu ? ' | When: ' + wtu : ''}`);
  catalogNames.add(name);
}

// --- corpus ----------------------------------------------------------------
const seen = new Set();
const cases = [];
for (const name of fs.readdirSync(SKILLS_DIR)) {
  const file = path.join(SKILLS_DIR, name, 'evals', 'trigger_eval.json');
  if (!fs.existsSync(file)) continue;
  for (const c of JSON.parse(fs.readFileSync(file, 'utf8'))) {
    const expected = c.should_trigger ? c.expected_skill : null;
    const key = c.query + '||' + expected;
    if (seen.has(key)) {
      // A duplicate is dropped, but its `disallowed` is merged into the case
      // already kept — a collision assertion is a claim about the query, and
      // which corpus file happened to be read first is an accident of
      // readdirSync order (docket #53).
      //
      // `accept` is deliberately NOT merged, even though it is dropped the
      // same way. accept feeds isHit, so widening it can flip a miss to a hit
      // and move A3's operating band — the exact thing this item's
      // separate-metric decision exists to prevent. Two collisions in the
      // corpus today do carry divergent accept sets; that is its own item,
      // not a side effect of this one.
      const kept = cases.find((x) => x.query + '||' + x.expected === key);
      for (const d of c.disallowed || []) if (!kept.disallowed.includes(d)) kept.disallowed.push(d);
      continue;
    }
    seen.add(key);
    // kind: "cold" (default) = a fresh user message that should route by itself;
    //       "in-context"     = a follow-up asked while the skill is already
    //                          loaded — excluded from routing scores unless --all.
    // accept: alternate skills that count as correct (e.g. doctrine-correct
    //         `workflow` routing for implementation requests).
    // disallowed: skills that must NEVER win this query, scored as a separate
    //         metric — see scripts/trigger-eval-score.mjs.
    cases.push({
      query: c.query,
      expected,
      accept: c.accept || [],
      disallowed: c.disallowed || [],
      kind: c.kind || 'cold',
      source: name,
    });
  }
}
const inContext = cases.filter((c) => c.kind === 'in-context').length;
const eligible = INCLUDE_ALL ? cases : cases.filter((c) => c.kind !== 'in-context');
const corpus = LIMIT > 0 ? eligible.slice(0, LIMIT) : eligible;

// --- routing ---------------------------------------------------------------
const EMPTY_MCP = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'eval-triggers-')), 'empty-mcp.json');
fs.writeFileSync(EMPTY_MCP, '{"mcpServers":{}}\n');

function routeBatch(batch) {
  const prompt = [
    'You route user messages to a coding agent\'s skills. For each numbered user',
    'message below, pick the SINGLE catalog skill best suited to HANDLE it (whether',
    'it would auto-trigger or the user is explicitly requesting that capability),',
    'or null if none clearly matches. Judge only by the catalog text. Prefer null',
    'over a weak match.',
    '',
    'Reply with ONLY a JSON array, no prose, exactly one entry per message:',
    '[{"i":1,"skill":"workflow"},{"i":2,"skill":null}]',
    '',
    'CATALOG:',
    ...catalog,
    '',
    'MESSAGES:',
    ...batch.map((c, k) => `${k + 1}. ${c.query}`),
  ].join('\n');

  // Judge sessions must not load the user's MCP servers — without isolation,
  // every batch spawns the full MCP stack (chrome-devtools-mcp launches Chrome
  // windows on localhost debug ports, etc.) and pays its startup cost.
  // NOTE: --bare would be stronger but skips keychain reads and breaks auth;
  // --strict-mcp-config + an empty config keeps auth and blocks all servers.
  const res = spawnSync('claude', ['-p', prompt, '--model', MODEL, '--strict-mcp-config', '--mcp-config', EMPTY_MCP], {
    encoding: 'utf8',
    cwd: os.tmpdir(), // avoid loading this repo's project context into the router sim
    timeout: 180000,
  });
  if (res.status !== 0) throw new Error('claude -p failed: ' + (res.stderr || res.stdout || String(res.error)).trim().slice(0, 300));
  const text = res.stdout;
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('no JSON array in output: ' + text.slice(0, 200));
  return JSON.parse(text.slice(start, end + 1));
}

// --- run -------------------------------------------------------------------
// isHit is imported (not defined here) so the live progress line, the final
// report and the unit tests all score with exactly the same predicate — a
// running accuracy that disagreed with the report would be worse than none.

function hms(ms) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
}

function runOnce(runIdx) {
  const results = [];
  let batchErrors = 0;
  const totalBatches = Math.ceil(corpus.length / BATCH);
  const started = Date.now();
  for (let i = 0; i < corpus.length; i += BATCH) {
    const batch = corpus.slice(i, i + BATCH);
    try {
      let routed;
      try {
        routed = routeBatch(batch);
      } catch (e) {
        // One retry with backoff — transient CLI errors and brief limit windows
        // recover; a second failure propagates.
        process.stderr.write('  batch error, retrying in 60s: ' + e.message.slice(0, 120) + '\n');
        spawnSync('sleep', ['60']);
        routed = routeBatch(batch);
      }
      for (const c of batch) {
        const k = batch.indexOf(c) + 1;
        const hit = routed.find((r) => r.i === k);
        results.push({ ...c, got: hit ? hit.skill : '(missing)' });
      }
    } catch (e) {
      batchErrors++;
      process.stderr.write('  batch failed: ' + e.message.slice(0, 200) + '\n');
      for (const c of batch) results.push({ ...c, got: '(batch-error)' });
      if (/limit|overloaded|429/i.test(e.message)) {
        // Session/rate limit: every remaining batch is doomed — don't burn them.
        process.stderr.write('  limit-class error — aborting the remaining batches of this run\n');
        for (const c of corpus.slice(i + BATCH)) results.push({ ...c, got: '(batch-error)' });
        break;
      }
    }

    // Reported AFTER the batch so elapsed and ETA are measured, not predicted.
    // A 40-batch run takes ~10 minutes; "batch 12/40" alone says nothing about
    // how long is left or whether the numbers are going anywhere good.
    const done = Math.min(i + BATCH, corpus.length);
    const doneBatches = Math.ceil(done / BATCH);
    const elapsed = Date.now() - started;
    const eta = (elapsed / doneBatches) * (totalBatches - doneBatches);
    const judged = results.filter((r) => r.got !== '(batch-error)');
    const acc = judged.length ? (100 * judged.filter(isHit).length / judged.length).toFixed(1) : '—';
    process.stderr.write(
      `run ${runIdx + 1}/${RUNS} · batch ${doneBatches}/${totalBatches}`
      + ` · ${Math.round(100 * done / corpus.length)}%`
      + ` · ${hms(elapsed)} elapsed`
      + (doneBatches < totalBatches ? ` · ~${hms(eta)} left` : '')
      + ` · running ${acc}%\n`,
    );
  }
  return { results, batchErrors };
}
const runsData = [];
for (let r = 0; r < RUNS; r++) runsData.push(runOnce(r));
const results = runsData[runsData.length - 1].results; // last run drives the miss table
const batchErrors = runsData.reduce((s, r) => s + r.batchErrors, 0);

// --- score -----------------------------------------------------------------
const scored = results.filter((r) => r.got !== '(batch-error)');
const hits = scored.filter(isHit);
const misses = scored.filter((r) => !isHit(r));
const bySkill = {};
for (const r of scored) {
  const key = r.expected ?? '(null)';
  bySkill[key] = bySkill[key] || { total: 0, hit: 0 };
  bySkill[key].total++;
  if (isHit(r)) bySkill[key].hit++;
}

// Multi-run statistics: per-run accuracy, mean ± 95% CI (t-distribution), and
// flaky cases (hit in some runs, missed in others).
const perRunAcc = runsData.map(({ results: rr }) => {
  const s = rr.filter((r) => r.got !== '(batch-error)');
  return s.length ? s.filter(isHit).length / s.length : 0;
});
const T95 = { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262 };
const meanAcc = perRunAcc.reduce((a, b) => a + b, 0) / perRunAcc.length;
const sd = RUNS > 1 ? Math.sqrt(perRunAcc.reduce((s, a) => s + (a - meanAcc) ** 2, 0) / (RUNS - 1)) : 0;
const ci95 = RUNS > 1 ? (T95[RUNS - 1] || 1.96) * sd / Math.sqrt(RUNS) : 0;
const caseKey = (r) => r.query + '||' + (r.expected ?? '');
const hitCounts = new Map();
// Every run's answer per case, not just the last one's. The runs already happen;
// keeping only `results` (the final run) threw this away, which made a per-case
// question like "where does this case go when it misses?" unanswerable without
// paying for another band. Reporting only — scoring is untouched (docket #37).
const answers = new Map();
for (const { results: rr } of runsData) {
  for (const r of rr) {
    if (r.got === '(batch-error)') continue;
    const key = caseKey(r);
    const cur = hitCounts.get(key) || { case: r, hit: 0, seen: 0 };
    cur.seen++;
    if (isHit(r)) cur.hit++;
    hitCounts.set(key, cur);
    if (!answers.has(key)) answers.set(key, []);
    answers.get(key).push(r.got ?? null);
  }
}
const flaky = [...hitCounts.values()].filter((c) => c.hit > 0 && c.hit < c.seen);
// Distinct answers a case gave when it did NOT hit — the miss-target distribution.
// `accept` alternates are only defensible when this names a real sibling; a case
// that misses to null has no alternate to accept.
const missTargets = (c) => [...new Set(
  (answers.get(caseKey(c)) || [])
    .filter((g) => !isHit({ ...c, got: g }))
    .map((g) => g ?? 'null'),
)];
// Answers naming a skill the judge was never shown. Scored as-is (changing that
// would break comparability with prior bands); surfaced so they are not mistaken
// for contract defects.
const outOfCatalog = [...hitCounts.values()]
  .map((c) => ({ case: c.case, seen: [...new Set(answers.get(caseKey(c.case)) || [])].filter((g) => g != null && !catalogNames.has(g)) }))
  .filter((c) => c.seen.length);

const lines = [];
lines.push(`# Trigger-routing run — ${new Date().toISOString().slice(0, 10)}`);
lines.push('');
lines.push(`Model: ${MODEL} · batch ${BATCH} · corpus ${corpus.length} cold-trigger cases scored (${inContext} in-context cases ${INCLUDE_ALL ? 'included' : 'excluded'}; ${batchErrors} failed batches). Hits include per-case \`accept\` alternates.`);
if (RUNS > 1) {
  lines.push('');
  lines.push(`Trials: ${RUNS} · per-run: ${perRunAcc.map((a) => (100 * a).toFixed(1) + '%').join(' / ')} · mean **${(100 * meanAcc).toFixed(1)}% ± ${(100 * ci95).toFixed(1)}pp** (95% CI, t-dist) · flaky cases: ${flaky.length}`);
}
lines.push(`Overall routing accuracy: **${hits.length}/${scored.length} = ${(100 * hits.length / scored.length).toFixed(1)}%**`);
// docket #53. Computed from the same per-trial answers the flaky table uses, so
// a collision that fires in one trial of three still shows. Kept off the
// accuracy line on purpose — see trigger-eval-score.mjs.
const violations = violationRows(hitCounts, answers, caseKey);
const violationLine = violationHeadline(violations, scoredWithDisallowed(hitCounts));
if (violationLine) lines.push(violationLine);
lines.push('');
lines.push('## Per expected skill');
lines.push('');
lines.push('| expected | accuracy |');
lines.push('|---|---|');
for (const [k, v] of Object.entries(bySkill).sort((a, b) => a[1].hit / a[1].total - b[1].hit / b[1].total)) {
  lines.push(`| ${k} | ${v.hit}/${v.total} |`);
}
lines.push('');
lines.push(`## Misses (${misses.length})`);
lines.push('');
lines.push('| query | expected | got | corpus file |');
lines.push('|---|---|---|---|');
for (const r of misses) {
  lines.push(`| ${r.query.replace(/\|/g, '\\|')} | ${r.expected ?? 'null'} | ${r.got ?? 'null'} | ${r.source} |`);
}
lines.push('');
lines.push(...violationSection(violations));
if (RUNS > 1 && flaky.length) {
  lines.push(`## Flaky cases (${flaky.length} — hit in some trials, missed in others)`);
  lines.push('');
  lines.push('| query | expected | hits | got when missed |');
  lines.push('|---|---|---|---|');
  for (const f of flaky) {
    lines.push(`| ${f.case.query.replace(/\|/g, '\\|')} | ${f.case.expected ?? 'null'} | ${f.hit}/${f.seen} | ${missTargets(f.case).join(', ')} |`);
  }
  lines.push('');
}
if (outOfCatalog.length) {
  lines.push(`## Out-of-catalog answers (${outOfCatalog.length})`);
  lines.push('');
  lines.push('The judge named a skill it was never shown. Scored as given — these are');
  lines.push('harness contamination, not routing defects, and no `accept` alternate can');
  lines.push('fix one.');
  lines.push('');
  lines.push('| query | expected | named |');
  lines.push('|---|---|---|');
  for (const o of outOfCatalog) {
    lines.push(`| ${o.case.query.replace(/\|/g, '\\|')} | ${o.case.expected ?? 'null'} | ${o.seen.join(', ')} |`);
  }
  lines.push('');
}
const report = lines.join('\n');

if (OUT) {
  fs.writeFileSync(OUT, report + '\n');
  // `got` stays the final run's answer so prior analyses keep working; `runs`
  // carries every trial, which is what per-case questions actually need.
  const exported = results.map((r) => ({ ...r, runs: answers.get(caseKey(r)) ?? [] }));
  fs.writeFileSync(OUT.replace(/\.md$/, '') + '.json', JSON.stringify(exported, null, 2) + '\n');
  process.stderr.write(`wrote ${OUT}\n`);
} else {
  process.stdout.write(report + '\n');
}
process.stderr.write(`done: ${hits.length}/${scored.length}\n`);
