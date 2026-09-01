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
//   node scripts/eval-invocations.mjs (--skills a,b | --limit n | --cases <file> | --all)
//         [--host claude|opencode] [--plugin <spec>] [--stall <ms>]
//         [--model <id>] [--runs <n>] [--max-turns <n>] [--cwd <dir>]
//         [--out <report.md>] [--timeout <ms>]
//
// --host opencode (docket #73) poses each case with `opencode run --format json`
// instead of `claude -p`, in a clean room: a scratch HOME whose only config is
// `{plugin: [<--plugin spec>]}`, with XDG_DATA_HOME left real so credentials
// resolve. That is the isolation quirks Q5 asks for — XDG_CONFIG_HOME alone
// still loads ~/.opencode and the global instruction files, which are
// routing-adjacent content and would contaminate a fire-rate number. The
// resolved plugin / instructions / skills arrays are printed before the run so
// the report says which arm was measured: `--plugin @jabworks/condux@0.20.0`
// is the config.instructions channel, a `file:///…/packages/condux-opencode/
// index.js` path is the local chat.message reminder. Fires are read from the
// JSON event stream (a `skill` tool call); the model defaults to the free
// `opencode/big-pickle`; there is no max-turns on this host, so a run goes to
// completion or to --timeout. A run that produces no event at all is the Q6
// stall — it is retried (--stall is the first-event watchdog, default 45s),
// never scored. Skills installed = whatever the plugin's skills.paths carry,
// so a case for a skill outside that set scores `uninstalled`, not miss.
//
// --cases <file> is a JSON array of exact query strings to pose (a named probe,
// e.g. docket #54's stratified 12); each keeps its corpus accept/disallowed.
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
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  loadCorpus,
  selectCases,
  parseStream,
  parseOpenCodeStream,
  scoreCase,
  fireStats,
  reportLines,
  caseKey,
} from './invocation-observe.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}
const HOST = flag('--host', 'claude');
if (!['claude', 'opencode'].includes(HOST)) {
  console.error(`eval-invocations: --host must be claude or opencode, not ${HOST}`);
  process.exit(2);
}
const OPENCODE = HOST === 'opencode';
const PLUGIN = flag('--plugin', '@jabworks/condux');
const STALL_MS = Number(flag('--stall', '45000'));
const MODEL = flag('--model', OPENCODE ? 'opencode/big-pickle' : 'claude-haiku-4-5-20251001');
const RUNS = Math.max(1, Number(flag('--runs', '1')));
const MAX_TURNS = Math.max(1, Number(flag('--max-turns', '3')));
const LIMIT = Number(flag('--limit', '0'));
const SKILLS = flag('--skills', '') ? flag('--skills', '').split(',').map((s) => s.trim()).filter(Boolean) : null;
const CASES_FILE = flag('--cases', '');
const CWD = flag('--cwd', '');
const OUT = flag('--out', '');
const ALL = args.includes('--all');
const TIMEOUT_MS = Number(flag('--timeout', '300000'));

// Probe constants for the pre-run estimate (2026-08-31, haiku-4-5, 3 turns;
// 2026-09-01, opencode/big-pickle — free, ~15s a run, plus Q6 stalls).
// Estimates only — the report carries the measured cost.
const EST_COST = OPENCODE ? 0 : 0.035;
const EST_SECONDS = OPENCODE ? 25 : 13;

if (!SKILLS && !LIMIT && !ALL && !CASES_FILE) {
  console.error('eval-invocations: pick a selector — --skills a,b | --limit n | --cases <file> | --all (a full run is ~$23 and ~2.3h per trial).');
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
const QUERIES = CASES_FILE ? JSON.parse(fs.readFileSync(CASES_FILE, 'utf8')) : null;
if (QUERIES && (!Array.isArray(QUERIES) || QUERIES.some((q) => typeof q !== 'string'))) {
  console.error(`eval-invocations: --cases ${CASES_FILE} must be a JSON array of query strings`);
  process.exit(2);
}
const { eligible, skipped, unmatched } = selectCases(loadCorpus(SKILLS_DIR, { skills: SKILLS }), { queries: QUERIES });
if (unmatched.length) {
  // A named probe must arrive intact — a silently shrunken list is a different
  // probe, and its number would be compared against the one that was planned.
  console.error(`eval-invocations: --cases names ${unmatched.length} query(ies) not in the corpus:\n  ${unmatched.join('\n  ')}`);
  process.exit(2);
}
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

// --- OpenCode host (docket #73) ----------------------------------------------
// The clean room: a scratch HOME whose only OpenCode config names the plugin
// under test. XDG_DATA_HOME stays real so ~/.local/share/opencode/auth.json
// still resolves. Everything else OpenCode would read from the real home —
// ~/.config/opencode, ~/.opencode, global AGENTS.md / instruction files, loose
// skill dirs under ~/.claude and ~/.agents — is absent by construction.
const DATA_HOME = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');

function opencodeCleanRoom() {
  const home = path.join(SCRATCH, 'home');
  const configDir = path.join(home, '.config', 'opencode');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'opencode.json'),
    JSON.stringify({ $schema: 'https://opencode.ai/config.json', autoupdate: false, plugin: [PLUGIN] }, null, 2) + '\n',
  );

  return { ...process.env, HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: DATA_HOME };
}

// Resolve the config once, in the clean room: this installs an npm plugin
// spec into the scratch cache (so the first case does not pay for it), proves
// the arm — which plugin, which instructions — and yields the installed skill
// set from skills.paths, the OpenCode equivalent of Claude's init skill list.
function opencodeResolve(env) {
  const res = spawnSync('opencode', ['debug', 'config'], {
    encoding: 'utf8',
    cwd: SCRATCH,
    env: { ...env, PWD: SCRATCH }, // quirks Q7 — see opencodeRun
    timeout: TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = res.stdout || '';
  const start = out.indexOf('{');
  if (start < 0) throw new Error('opencode debug config produced no JSON: ' + ((res.stderr || '').trim().slice(0, 300) || `exit ${res.status}`));
  const cfg = JSON.parse(out.slice(start));
  const installed = new Set();
  for (const dir of cfg.skills?.paths || []) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'SKILL.md'))) installed.add(entry.name);
    }
  }

  return { installed: [...installed].sort(), plugins: cfg.plugin || [], instructions: cfg.instructions || [] };
}

// One `opencode run`. Async because the Q6 stall needs a first-event watchdog:
// a stalled process prints nothing for as long as it lives, and waiting the
// full --timeout three times over would turn one stall into fifteen minutes.
// The stream is read as it arrives; the first `sessionID` disarms the watchdog.
function opencodeRun(query, cwd, env) {
  return new Promise((resolve) => {
    // OpenCode binds a session's directory to $PWD, not to the process cwd
    // (quirks Q7). A spawn with `cwd` inherits the parent's PWD, which for this
    // harness is the toolkit repo — every case would have run against it.
    const child = spawn('opencode', ['run', '--format', 'json', '-m', MODEL, query], { cwd, env: { ...env, PWD: cwd }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let sawEvent = false;
    let stalled = false;
    let timedOut = false;
    const stall = setTimeout(() => {
      if (sawEvent) return;
      stalled = true;
      child.kill('SIGKILL');
    }, STALL_MS);
    const hard = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, TIMEOUT_MS);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (!sawEvent && stdout.includes('"sessionID"')) sawEvent = true;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(stall);
      clearTimeout(hard);
      resolve({ stdout, stderr, status: null, stalled, timedOut, error });
    });
    child.on('close', (status) => {
      clearTimeout(stall);
      clearTimeout(hard);
      resolve({ stdout, stderr, status, stalled, timedOut, error: null });
    });
  });
}

async function poseOnceOpenCode(query, cwd) {
  const res = await opencodeRun(query, cwd, OPENCODE_ENV);
  if (res.error) throw new Error('opencode could not be spawned: ' + (res.error.code || res.error.message));
  const obs = parseOpenCodeStream(res.stdout, { exited: !res.timedOut && !res.stalled, installed: OPENCODE_ARM.installed });

  // No event at all: the Q6 stall (killed by the watchdog) or a run that died
  // before creating a session. Nothing is known about what the model would
  // have done, so this is never a miss.
  if (!obs.ok) {
    const why = res.stderr.trim().slice(0, 300);
    throw new Error(res.stalled ? 'opencode run stalled with no events (quirks Q6)' : 'opencode run produced no events: ' + (why || `exit ${res.status}`));
  }

  // Killed by --timeout before any skill call: a truncated run, not an
  // observed miss. Killed after one: the routing decision was observed.
  if (!obs.resultSubtype) throw new Error(`opencode run exceeded --timeout ${TIMEOUT_MS}ms before any skill call — truncated, not scored`);

  if (res.status !== 0 && !res.timedOut && !obs.invoked.length && !obs.said) {
    throw new Error(`opencode run exited ${res.status} with nothing observed: ` + res.stderr.trim().slice(0, 300));
  }

  return obs;
}

async function poseWithRetryOpenCode(query, cwd) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await poseOnceOpenCode(query, cwd);
    } catch (e) {
      last = e;
      if (!/stalled|limit|overloaded|429/i.test(e.message)) throw e;
      process.stderr.write(`  ${e.message.slice(0, 80)} — attempt ${attempt}/3\n`);
    }
  }
  throw last;
}

const OPENCODE_ENV = OPENCODE ? opencodeCleanRoom() : null;
const OPENCODE_ARM = OPENCODE ? opencodeResolve(OPENCODE_ENV) : null;
if (OPENCODE) {
  if (!OPENCODE_ARM.installed.length) {
    console.error(`eval-invocations: plugin ${PLUGIN} registered no skills.paths — nothing can fire`);
    process.exit(2);
  }
  process.stderr.write(
    `opencode clean room · plugin ${JSON.stringify(OPENCODE_ARM.plugins)} · instructions ${JSON.stringify(OPENCODE_ARM.instructions)}` +
      ` · ${OPENCODE_ARM.installed.length} skills installed\n`,
  );
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
      const cwd = caseCwd(run * corpus.length + i);
      const obs = OPENCODE ? await poseWithRetryOpenCode(c.query, cwd) : poseWithRetry(c.query, cwd);
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
  host: HOST,
  plugin: OPENCODE ? PLUGIN : null,
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
