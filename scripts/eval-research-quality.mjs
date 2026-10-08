#!/usr/bin/env node
// Quality eval for condux:research (docket #98, specs/research-orchestration).
//
// Poses each corpus question (skills/research/evals/quality_eval.json) to a
// headless `claude -p` lead with condux loaded from --plugin-dir, in a fresh
// git-initialised temp dir per case, then hands the run's report.md and notes
// to ONE judge call that scores the five rubric criteria from Anthropic's
// multi-agent research post (factual accuracy, citation accuracy,
// completeness, source quality, tool efficiency) 0–1 plus pass/fail. A case
// marked `fallback: true` runs with the subagent tool disallowed, so no scout can
// spawn and the skill's sequential branch is what gets measured.
//
// MANUAL ONLY. Every case is a full research run — roughly 15× a chat turn in
// tokens — so this never runs in CI. tests/research-quality.test.mjs covers the
// pure functions exported below; the agent runs themselves are not tested.
//
// Usage:
//   node scripts/eval-research-quality.mjs [--cases <file>] [--ids a,b | --limit n]
//         [--plugin-dir <dir>] [--model <id>] [--judge-model <id>]
//         [--max-turns <n>] [--timeout <ms>] [--out <report.md>]
//         [--disable-plugins <id,id>]
//
// --disable-plugins turns installed plugins off for every lead and judge run
// via a settings override, e.g. context-mode@context-mode, whose WebFetch
// redirect blocks allowlisted agents (specs/research-orchestration quirks Q4).
// The summary records what was disabled, so the baseline says what it measured.
//
// If condux is also installed from the marketplace, --plugin-dir loads a
// second copy; the summary records which plugin dir and version answered.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CRITERIA = ['factual', 'citation', 'completeness', 'sourceQuality', 'toolEfficiency'];

// --------------------------------------------------------------------------
// Pure functions (tested)
// --------------------------------------------------------------------------

// The judge ends its reply with exactly one fenced JSON block. Anything else —
// no fence, a fence that is not last, a missing criterion, a score outside
// [0,1], a non-boolean pass — is null: an unparseable verdict is a harness
// failure to report, never a score to average.
export function parseVerdict(text) {
  const m = String(text ?? '').match(/```json\s*(\{[\s\S]*?\})\s*```\s*$/);
  if (!m) return null;
  let raw;
  try {
    raw = JSON.parse(m[1]);
  } catch {
    return null;
  }
  const scores = {};
  for (const key of CRITERIA) {
    const v = raw[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) return null;
    scores[key] = v;
  }
  if (typeof raw.pass !== 'boolean') return null;
  return { scores, pass: raw.pass };
}

// The run folder the lead created during this case: the newest directory under
// `root` holding a report.md modified at or after `since` (ms epoch). A run
// that wrote no report, or only an older one, yields null.
export function newestRunDir(root, since) {
  if (!fs.existsSync(root)) return null;
  let best = null;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const report = path.join(root, entry.name, 'report.md');
    if (!fs.existsSync(report)) continue;
    const mtime = fs.statSync(report).mtimeMs;
    if (mtime < since) continue;
    if (!best || mtime > best.mtime) best = { dir: path.join(root, entry.name), mtime };
  }
  return best ? best.dir : null;
}

// The tool names the lead actually had, read from the stream-json init event.
// Recorded so a baseline says which environment it measured (quirks Q4: hosts
// and plugins differ in what search and fetch tools exist).
export function initTools(streamText) {
  for (const line of String(streamText ?? '').split('\n')) {
    if (!line.trim()) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (e.type === 'system' && e.subtype === 'init') return Array.isArray(e.tools) ? e.tools : [];
  }
  return [];
}

export function judgePrompt({ query, report, notes }) {
  const notesBlock = notes.length
    ? notes.map((n) => `--- notes/${n.name} ---\n${n.text}`).join('\n\n')
    : '(no notes files were written)';
  return [
    'You are grading one research report against the notes it was built from.',
    '',
    `The question asked: ${query}`,
    '',
    'Score each criterion from 0.0 to 1.0:',
    '- factual: do the report\'s claims match what the notes and sources say?',
    '- citation: does each cited source actually support the claim it is attached to? Fetch up to 3 cited URLs to spot-check; no more.',
    '- completeness: does the report answer every part of the question?',
    '- sourceQuality: are the sources primary (official docs, changelogs, maintainers) rather than aggregators or SEO pages?',
    '- toolEfficiency: judging from the notes, was the research proportionate — no padding, no obvious missed source?',
    'Then decide pass: true only if a developer could act on this report as written.',
    '',
    'End your reply with exactly one fenced json block and nothing after it:',
    '```json',
    '{"factual":0.0,"citation":0.0,"completeness":0.0,"sourceQuality":0.0,"toolEfficiency":0.0,"pass":false}',
    '```',
    '',
    '=== report.md ===',
    report,
    '',
    '=== notes ===',
    notesBlock,
  ].join('\n');
}

const fmt = (v) => (typeof v === 'number' ? v.toFixed(2) : '—');

// Result = { id, query, shape, fallback, runDir, verdict, error? }
// env = { host, tools, plugin, disabledPlugins? }
export function buildSummary(results, env) {
  const lines = ['# condux:research quality eval', ''];
  lines.push(`- Host: ${env.host}`, `- Plugin: ${env.plugin}`);
  lines.push(`- Disabled plugins: ${env.disabledPlugins?.length ? env.disabledPlugins.join(', ') : 'none'}`);
  lines.push(`- Lead tools: ${env.tools.length ? env.tools.join(', ') : '(unknown)'}`, '');
  lines.push('| id | shape | fallback | factual | citation | completeness | source quality | tool efficiency | pass | note |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const s = r.verdict?.scores ?? {};
    const pass = r.verdict ? (r.verdict.pass ? '✓' : '✗') : '—';
    const note = r.error ? r.error.replace(/\|/g, '/').slice(0, 120) : r.verdict ? '' : 'unparseable verdict';
    lines.push(`| ${r.id} | ${r.shape} | ${r.fallback ? 'yes' : 'no'} | ${fmt(s.factual)} | ${fmt(s.citation)} | ${fmt(s.completeness)} | ${fmt(s.sourceQuality)} | ${fmt(s.toolEfficiency)} | ${pass} | ${note} |`);
  }
  const scored = results.filter((r) => r.verdict);
  lines.push('');
  if (scored.length) {
    const avg = (key) => scored.reduce((sum, r) => sum + r.verdict.scores[key], 0) / scored.length;
    lines.push(`**Means over ${scored.length} scored case(s):** ` + CRITERIA.map((k) => `${k} ${fmt(avg(k))}`).join(' · '));
    lines.push(`**Pass rate:** ${scored.filter((r) => r.verdict.pass).length}/${scored.length}`);
  } else {
    lines.push('**No case produced a scorable verdict.**');
  }
  const unscored = results.length - scored.length;
  if (unscored) lines.push(`**Unscored:** ${unscored} (harness errors or unparseable verdicts — not counted as failures)`);
  return lines.join('\n') + '\n';
}

// --------------------------------------------------------------------------
// Runner (manual; not tested)
// --------------------------------------------------------------------------

function flag(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

// Research needs the web, the scout dispatch, and writes inside the temp dir —
// nothing else. An allowlist, not a permission bypass. The subagent tool is
// `Task` in headless `claude -p` and `Agent` in interactive sessions, so both
// names are listed here and both are denied for fallback cases.
const SUBAGENT_TOOLS = ['Task', 'Agent'];
const LEAD_TOOLS = [...SUBAGENT_TOOLS, 'Skill', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Bash(git check-ignore:*)', 'Bash(mkdir:*)', 'Bash(date:*)', 'Bash(ls:*)'];

export const settingsOverride = (disabled) =>
  disabled.length ? ['--settings', JSON.stringify({ enabledPlugins: Object.fromEntries(disabled.map((id) => [id, false])) })] : [];

function runLead(c, { pluginDir, model, maxTurns, timeout, disabled }) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-research-'));
  spawnSync('git', ['init', '-q'], { cwd });
  fs.writeFileSync(path.join(cwd, '.gitignore'), '.condux/\n');
  const args = [
    '-p', `Use the condux:research skill to research this: ${c.query}`,
    '--plugin-dir', pluginDir,
    '--model', model,
    '--output-format', 'stream-json', '--verbose',
    '--max-turns', String(maxTurns),
    ...settingsOverride(disabled),
    '--allowedTools', ...LEAD_TOOLS,
  ];
  if (c.fallback) args.push('--disallowedTools', ...SUBAGENT_TOOLS);
  const since = Date.now();
  const res = spawnSync('claude', args, { cwd, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  return { cwd, since, stream: res.stdout || '', error: res.error ? String(res.error.code || res.error.message) : null };
}

function runJudge(prompt, { model, timeout, disabled }) {
  const res = spawnSync('claude', ['-p', prompt, '--model', model, '--output-format', 'json', '--max-turns', '10', ...settingsOverride(disabled), '--allowedTools', 'WebFetch'], {
    encoding: 'utf8',
    timeout,
    maxBuffer: 16 * 1024 * 1024,
  });
  try {
    return JSON.parse(res.stdout).result ?? '';
  } catch {
    return '';
  }
}

function main() {
  const args = process.argv.slice(2);
  const casesPath = path.resolve(flag(args, '--cases', path.join(REPO, 'skills/research/evals/quality_eval.json')));
  const pluginDir = path.resolve(flag(args, '--plugin-dir', path.join(REPO, 'dist/plugins/condux')));
  const model = flag(args, '--model', 'opus');
  const judgeModel = flag(args, '--judge-model', 'opus');
  const maxTurns = Number(flag(args, '--max-turns', '80'));
  const timeout = Number(flag(args, '--timeout', String(30 * 60 * 1000)));
  const out = flag(args, '--out', null);
  const ids = flag(args, '--ids', null)?.split(',');
  const limit = Number(flag(args, '--limit', '0'));
  const disabled = flag(args, '--disable-plugins', '').split(',').filter(Boolean);

  let cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  if (ids) cases = cases.filter((c) => ids.includes(c.id));
  if (limit > 0) cases = cases.slice(0, limit);

  const version = JSON.parse(fs.readFileSync(path.join(pluginDir, '.claude-plugin/plugin.json'), 'utf8')).version;
  process.stderr.write(`${cases.length} case(s) · lead ${model} · judge ${judgeModel} · condux ${version} from ${pluginDir}\n`);

  const results = [];
  let tools = [];
  for (const c of cases) {
    process.stderr.write(`→ ${c.id}${c.fallback ? ' (fallback)' : ''}\n`);
    const base = { id: c.id, query: c.query, shape: c.shape, fallback: Boolean(c.fallback), runDir: null, verdict: null };
    const lead = runLead(c, { pluginDir, model, maxTurns, timeout, disabled });
    if (!tools.length) tools = initTools(lead.stream);
    const runDir = newestRunDir(path.join(lead.cwd, '.condux/research'), lead.since);
    if (!runDir) {
      results.push({ ...base, error: lead.error || 'no report.md written' });
      continue;
    }
    const notesDir = path.join(runDir, 'notes');
    const notes = fs.existsSync(notesDir)
      ? fs.readdirSync(notesDir).filter((f) => f.endsWith('.md')).map((f) => ({ name: f, text: fs.readFileSync(path.join(notesDir, f), 'utf8') }))
      : [];
    const report = fs.readFileSync(path.join(runDir, 'report.md'), 'utf8');
    const verdict = parseVerdict(runJudge(judgePrompt({ query: c.query, report, notes }), { model: judgeModel, timeout, disabled }));
    results.push({ ...base, runDir, verdict });
  }

  const summary = buildSummary(results, { host: 'claude', tools, plugin: `${pluginDir} (condux ${version})`, disabledPlugins: disabled });
  if (out) fs.writeFileSync(out, summary);
  process.stdout.write(summary);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
