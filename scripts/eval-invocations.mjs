#!/usr/bin/env node
'use strict';
// Invocation-observing trigger harness (docket #68).
//
// Poses each corpus query (skills/*/evals/trigger_eval.json) as an ORDINARY
// user turn to a headless `claude -p` agent that has the skills actually
// installed on this machine, and observes whether the expected skill was
// INVOKED (a `Skill` tool_use in the stream-json transcript). The router eval
// (scripts/eval-triggers.mjs) asks a model which skill handles a message, so
// its trigger is consulted by construction; this one measures whether the
// routing decision gets made at all — the suppressed class of
// specs/trigger-reliability/quirks.md Q1/Q4, which the router eval cannot see.
//
// Usage:
//   node scripts/eval-invocations.mjs (--skills a,b | --limit n | --all)
//         [--model <id>] [--runs <n>] [--max-turns <n>] [--cwd <dir>]
//         [--out <report.md>] [--timeout <ms>]
//
// A selector is REQUIRED. The full corpus is ~645 cases at ~$0.035 and ~13s
// each on haiku-4-5 (2026-08-31 probe) — ~$23 and ~2.3h per trial — so a bare
// run is a mistake nobody should make by omission. --all says you meant it.
//
// --cwd <dir> runs every case in that directory instead of a fresh temp dir per
// case. Claude Code keys its auto-memory on the cwd, so a shared dir would leak
// one case's memory writes into the next; a fixture dir with real state (a
// .session-handoff/ handoff, a memory file) is the deliberate use — that is the
// period-3 lever for measuring suppression under an environment, not a preamble.
//
// Requires the `claude` CLI on PATH (your logged-in session; no API key handling
// here). Node stdlib only. Progress goes to STDERR, the report to stdout (or
// --out, which also writes <out>.json with every trial's invocations per case).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadCorpus, selectCases, parseStream, scoreCase, fireStats, reportLines, caseKey } from './invocation-observe.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}
const MODEL = flag('--model', 'claude-haiku-4-5-20251001');
const RUNS = Math.max(1, Number(flag('--runs', '1')));
const MAX_TURNS = Math.max(1, Number(flag('--max-turns', '3')));
const LIMIT = Number(flag('--limit', '0'));
const SKILLS = flag('--skills', '') ? flag('--skills', '').split(',').map((s) => s.trim()).filter(Boolean) : null;
const CWD = flag('--cwd', '');
const OUT = flag('--out', '');
const ALL = args.includes('--all');
const TIMEOUT_MS = Number(flag('--timeout', '300000'));

// Probe constants for the pre-run estimate (2026-08-31, haiku-4-5, 3 turns).
// Estimates only — the report carries the measured cost.
const EST_COST = 0.035;
const EST_SECONDS = 13;

if (!SKILLS && !LIMIT && !ALL) {
  console.error('eval-invocations: pick a selector — --skills a,b | --limit n | --all (a full run is ~$23 and ~2.3h per trial).');
  process.exit(2);
}

if (SKILLS) {
  const missing = SKILLS.filter((s) => !fs.existsSync(path.join(SKILLS_DIR, s, 'evals', 'trigger_eval.json')));
  if (missing.length) {
    console.error(`eval-invocations: no evals/trigger_eval.json for: ${missing.join(', ')}`);
    process.exit(2);
  }
}

if (CWD && !fs.existsSync(CWD)) {
  console.error(`eval-invocations: --cwd ${CWD} does not exist`);
  process.exit(2);
}

// --- corpus ------------------------------------------------------------------
const { eligible, skipped } = selectCases(loadCorpus(SKILLS_DIR, { skills: SKILLS }));
const corpus = LIMIT > 0 ? eligible.slice(0, LIMIT) : eligible;

if (!corpus.length) {
  console.error('eval-invocations: no eligible cases after selection');
  process.exit(2);
}

const total = corpus.length * RUNS;
process.stderr.write(
  `${corpus.length} cases × ${RUNS} trial(s) = ${total} agent runs · est. ~$${(total * EST_COST).toFixed(2)} · ~${hms(total * EST_SECONDS * 1000)}` +
    ` (${skipped} skipped: in-context / preamble cases) · model ${MODEL} · cwd ${CWD || 'fresh temp dir per case'}\n`,
);

// --- agent runs --------------------------------------------------------------
// Every run spawns the full MCP stack unless told not to (chrome-devtools-mcp
// launches Chrome), and none of it bears on whether a skill fires.
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-invocations-'));
const EMPTY_MCP = path.join(SCRATCH, 'empty-mcp.json');
fs.writeFileSync(EMPTY_MCP, '{"mcpServers":{}}\n');

function poseOnce(query, cwd) {
  const res = spawnSync(
    'claude',
    ['-p', query, '--model', MODEL, '--output-format', 'stream-json', '--verbose', '--max-turns', String(MAX_TURNS), '--strict-mcp-config', '--mcp-config', EMPTY_MCP],
    { encoding: 'utf8', cwd, timeout: TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 },
  );
  const obs = parseStream(res.stdout || '');

  // A non-zero exit with a parseable transcript is a scorable run (max-turns
  // reached, tool denied). No init at all is the failure — nothing is known
  // about the installed skills, so nothing can be scored.
  if (!obs.ok) {
    const why = (res.stderr || res.stdout || String(res.error || '')).trim().slice(0, 300);
    throw new Error('claude -p produced no init event: ' + (why || `exit ${res.status}`));
  }

  // A timeout (or a killed process) leaves init in place and the result
  // missing. That transcript is a truncated run, not an observed miss — scoring
  // it would count the harness's own limit as suppression.
  if (!obs.resultSubtype) {
    throw new Error('claude -p transcript has no result event' + (res.error ? ` (${res.error.code || res.error.message})` : ''));
  }

  return obs;
}

function poseWithRetry(query, cwd) {
  try {
    return poseOnce(query, cwd);
  } catch (e) {
    if (!/limit|overloaded|429/i.test(e.message)) throw e;
    process.stderr.write('  limit-class error — sleeping 60s before one retry\n');
    spawnSync('sleep', ['60']);
    return poseOnce(query, cwd);
  }
}

function caseCwd(idx) {
  if (CWD) return CWD;
  const dir = path.join(SCRATCH, 'case-' + idx);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function hms(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m` : m ? `${m}m${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

const started = Date.now();
let totalCost = 0;
const runsData = [];

for (let run = 0; run < RUNS; run++) {
  const results = [];

  for (let i = 0; i < corpus.length; i++) {
    const c = corpus[i];
    let row;
    try {
      const obs = poseWithRetry(c.query, caseCwd(run * corpus.length + i));
      totalCost += obs.cost;
      row = { ...c, ...scoreCase(c, obs), turns: obs.turns, hooks: obs.hooks, resultSubtype: obs.resultSubtype, error: obs.error, said: obs.said };
    } catch (e) {
      process.stderr.write('  case failed: ' + e.message.slice(0, 200) + '\n');
      row = { ...c, fired: false, uninstalled: false, violations: [], invoked: [], error: e.message.slice(0, 120) };
    }
    results.push(row);

    const done = run * corpus.length + i + 1;
    const elapsed = Date.now() - started;
    const eta = (elapsed / done) * (total - done);
    const scored = results.filter((r) => !r.error && !r.uninstalled);
    const rate = scored.length ? (100 * scored.filter((r) => r.fired).length / scored.length).toFixed(1) : '—';
    process.stderr.write(
      `run ${run + 1}/${RUNS} · case ${i + 1}/${corpus.length}` +
        ` · ${Math.round(100 * done / total)}%` +
        ` · ${hms(elapsed)} elapsed` +
        (done < total ? ` · ~${hms(eta)} left` : '') +
        ` · $${totalCost.toFixed(2)}` +
        ` · running fire ${rate}%` +
        ` · ${row.error ? 'ERR' : row.uninstalled ? 'uninstalled' : row.fired ? 'fire' : 'miss'}` +
        (row.invoked?.length ? ` [${row.invoked.join('+')}]` : '') +
        '\n',
    );
  }

  runsData.push(results);
}

// --- report ------------------------------------------------------------------
const report = reportLines({
  model: MODEL,
  maxTurns: MAX_TURNS,
  cwdMode: CWD || 'fresh temp dir per case',
  runsData,
  skipped,
  totalCost,
  elapsedMs: Date.now() - started,
}).join('\n');

if (OUT) {
  fs.writeFileSync(OUT, report + '\n');
  // Every trial's invocations per case, so a per-case question ("what did it
  // do instead?") is answerable without paying for another run.
  const trials = new Map();
  for (const results of runsData) {
    for (const r of results) {
      const key = caseKey(r);
      if (!trials.has(key)) trials.set(key, []);
      trials.get(key).push({ fired: r.fired, invoked: r.invoked, turns: r.turns ?? null, error: r.error ?? null, said: r.said ?? '' });
    }
  }
  const exported = runsData[runsData.length - 1].map((r) => ({ ...r, trials: trials.get(caseKey(r)) }));
  fs.writeFileSync(OUT.replace(/\.md$/, '') + '.json', JSON.stringify(exported, null, 2) + '\n');
  process.stderr.write(`wrote ${OUT}\n`);
} else {
  process.stdout.write(report + '\n');
}

const { mean } = fireStats(runsData);
process.stderr.write(`done: fire rate ${(100 * mean).toFixed(1)}% · $${totalCost.toFixed(2)}\n`);
