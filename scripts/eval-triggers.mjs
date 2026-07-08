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

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

// --- catalog ---------------------------------------------------------------
function fmField(block, key) {
  const m = block.match(new RegExp('^' + key + ':[ \\t]*(.*)$', 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}
const catalog = [];
for (const name of fs.readdirSync(SKILLS_DIR)) {
  const file = path.join(SKILLS_DIR, name, 'SKILL.md');
  if (!fs.existsSync(file)) continue;
  const m = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  if (!m) continue;
  const desc = fmField(m[1], 'description');
  const wtu = fmField(m[1], 'when_to_use');
  catalog.push(`- ${name}: ${desc}${wtu ? ' | When: ' + wtu : ''}`);
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
    if (seen.has(key)) continue;
    seen.add(key);
    // kind: "cold" (default) = a fresh user message that should route by itself;
    //       "in-context"     = a follow-up asked while the skill is already
    //                          loaded — excluded from routing scores unless --all.
    // accept: alternate skills that count as correct (e.g. doctrine-correct
    //         `workflow` routing for implementation requests).
    cases.push({ query: c.query, expected, accept: c.accept || [], kind: c.kind || 'cold', source: name });
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
const results = [];
let batchErrors = 0;
for (let i = 0; i < corpus.length; i += BATCH) {
  const batch = corpus.slice(i, i + BATCH);
  process.stderr.write(`batch ${i / BATCH + 1}/${Math.ceil(corpus.length / BATCH)}…\n`);
  try {
    const routed = routeBatch(batch);
    for (const c of batch) {
      const k = batch.indexOf(c) + 1;
      const hit = routed.find((r) => r.i === k);
      results.push({ ...c, got: hit ? hit.skill : '(missing)' });
    }
  } catch (e) {
    batchErrors++;
    process.stderr.write('  batch failed: ' + e.message + '\n');
    for (const c of batch) results.push({ ...c, got: '(batch-error)' });
  }
}

// --- score -----------------------------------------------------------------
const isHit = (r) => (r.got ?? null) === (r.expected ?? null)
  || (r.got != null && (r.accept || []).includes(r.got));
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

const lines = [];
lines.push(`# Trigger-routing run — ${new Date().toISOString().slice(0, 10)}`);
lines.push('');
lines.push(`Model: ${MODEL} · batch ${BATCH} · corpus ${corpus.length} cold-trigger cases scored (${inContext} in-context cases ${INCLUDE_ALL ? 'included' : 'excluded'}; ${batchErrors} failed batches). Hits include per-case \`accept\` alternates.`);
lines.push(`Overall routing accuracy: **${hits.length}/${scored.length} = ${(100 * hits.length / scored.length).toFixed(1)}%**`);
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
const report = lines.join('\n');

if (OUT) {
  fs.writeFileSync(OUT, report + '\n');
  fs.writeFileSync(OUT.replace(/\.md$/, '') + '.json', JSON.stringify(results, null, 2) + '\n');
  process.stderr.write(`wrote ${OUT}\n`);
} else {
  process.stdout.write(report + '\n');
}
process.stderr.write(`done: ${hits.length}/${scored.length}\n`);
