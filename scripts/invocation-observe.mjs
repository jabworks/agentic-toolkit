'use strict';
// Pure half of the invocation-observing trigger harness (docket #68).
//
// eval-invocations.mjs spawns a real `claude -p` agent per corpus case and
// hands the stream-json transcript here. Everything that turns that transcript
// into a verdict — which skills the agent invoked, whether the expected one
// fired, the per-run and per-skill aggregates, the report — lives in this
// module so it can be exercised by tests/invocation-observe.test.mjs without a
// paid run. Same reasoning as trigger-eval-score.mjs (docket #53): a fire
// counter that silently returns zero looks exactly like a corpus that never
// fires.
//
// Why a second harness at all: scripts/eval-triggers.mjs *asks* a router which
// skill handles a message, so the trigger is consulted by construction. Live
// suppression (specs/trigger-reliability/quirks.md Q1/Q4) is the model never
// reaching that question. Only an ordinary turn posed to an agent with the
// skills actually installed can observe that — this harness measures whether a
// skill FIRES, the router eval measures whether the vocabulary ROUTES. They are
// reported side by side and never merged (the #53/#55 comparability rule).

import fs from 'node:fs';
import path from 'node:path';

// Plugin skills are invoked as `<plugin>:<skill>` (session-handoff:session-handoff);
// the corpus names the bare skill. Strip the qualifier so the two compare.
export const normalizeSkill = (name) => String(name).split(':').pop();

// --- transcript --------------------------------------------------------------
// One parsed `--output-format stream-json --verbose` transcript. Tolerant by
// design: a run that hits --max-turns exits 1 with `result/error_max_turns`,
// and that transcript is complete and scorable — an agent that spent every turn
// reading memory instead of invoking the skill IS the suppression shape. The
// only failed run is one with no `system/init`, because then nothing is known
// about which skills were installed.
export function parseStream(text) {
  const obs = {
    ok: false,
    installed: [],
    invoked: [],
    hooks: [],
    turns: 0,
    cost: 0,
    durationMs: 0,
    model: null,
    resultSubtype: null,
    error: null,
    // Last assistant text, for the miss table: a case that missed with one
    // turn and no tool call answered in prose, and the prose says whether the
    // stimulus read as a task at all (docket #14's portability finding).
    said: '',
  };
  const lines = String(text).split('\n');
  let toolTurn = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue; // progress noise or a torn line — never fatal
    }

    if (e.type === 'system' && e.subtype === 'init') {
      obs.ok = true;
      obs.installed = (e.skills || []).map(normalizeSkill);
      obs.model = e.model ?? null;
    } else if (e.type === 'system' && e.subtype === 'hook_started') {
      obs.hooks.push(e.hook_name);
    } else if (e.type === 'assistant') {
      toolTurn++;
      for (const block of e.message?.content || []) {
        // Only the Skill tool counts as a fire. An agent that `Read`s a
        // SKILL.md has found the file, not run the workflow — the gates,
        // scoring and cleanup the skill exists for did not happen.
        if (block.type === 'tool_use' && block.name === 'Skill' && block.input?.skill) {
          obs.invoked.push({ raw: block.input.skill, skill: normalizeSkill(block.input.skill), turn: toolTurn });
        } else if (block.type === 'text' && block.text?.trim()) {
          obs.said = block.text.trim();
        }
      }
    } else if (e.type === 'result') {
      obs.resultSubtype = e.subtype ?? null;
      obs.turns = e.num_turns ?? 0;
      obs.cost = e.total_cost_usd ?? 0;
      obs.durationMs = e.duration_ms ?? 0;
      if (e.is_error && e.subtype !== 'error_max_turns') obs.error = e.subtype ?? 'error';
    }
  }

  return obs;
}

// --- scoring -----------------------------------------------------------------
// A case fires when any invoked skill is the expected one or an `accept`
// alternate (workflow is doctrine-correct for an implementation request, so a
// case that fires workflow instead of the named skill fired). A should-not-
// trigger case (expected null) fires when the agent invoked nothing at all —
// strict on purpose; a stray invocation on a null case is a real false fire.
//
// `uninstalled` is the case the fire denominator must exclude: the expected
// skill was not in the agent's `system/init` skill list, so no fire was
// possible. Counting it as a miss would blame the contract for a missing
// install.
export function scoreCase(c, obs) {
  const names = obs.invoked.map((i) => i.skill);
  const wanted = c.expected == null ? [] : [c.expected, ...(c.accept || [])];
  const uninstalled = c.expected != null && obs.installed.length > 0 && !obs.installed.includes(c.expected);
  const fired = c.expected == null ? names.length === 0 : names.some((n) => wanted.includes(n));
  const violations = [...new Set(names.filter((n) => (c.disallowed || []).includes(n)))];

  return { fired, uninstalled, violations, invoked: names };
}

// --- corpus ------------------------------------------------------------------
// Same files, same dedup key and the same `disallowed` merge as the router eval
// (scripts/eval-triggers.mjs) — a case must mean the same thing to both
// harnesses or the side-by-side report compares two corpora. Kept as a
// function here rather than extracted from eval-triggers.mjs so the band
// script stays byte-identical across the change (its numbers are the ones the
// campaign is judged on; touching it for a refactor would be a comparability
// question in its own right).
export const corpusKey = (query, expected, context) => query + '||' + expected + '||' + (context || '');

export function loadCorpus(skillsDir, { skills = null } = {}) {
  const seen = new Set();
  const cases = [];

  for (const name of fs.readdirSync(skillsDir)) {
    if (skills && !skills.includes(name)) continue;

    const file = path.join(skillsDir, name, 'evals', 'trigger_eval.json');
    if (!fs.existsSync(file)) continue;

    for (const c of JSON.parse(fs.readFileSync(file, 'utf8'))) {
      const expected = c.should_trigger ? c.expected_skill : null;
      const context = c.context || null;
      const key = corpusKey(c.query, expected, context);

      if (seen.has(key)) {
        const kept = cases.find((x) => corpusKey(x.query, x.expected, x.context) === key);
        for (const d of c.disallowed || []) if (!kept.disallowed.includes(d)) kept.disallowed.push(d);
        continue;
      }

      seen.add(key);
      cases.push({
        query: c.query,
        expected,
        accept: c.accept || [],
        disallowed: c.disallowed || [],
        kind: c.kind || 'cold',
        context,
        source: name,
      });
    }
  }

  return cases;
}

// Which corpus rows this harness can pose. `in-context` follow-ups assume a
// skill is already loaded, which a fresh agent cannot replay. `context`
// cases carry a preamble to inject — here context comes from the real
// environment (--cwd), not a string, so they are reported as skipped rather
// than posed with their preamble silently dropped.
export function selectCases(cases) {
  const eligible = cases.filter((c) => c.kind !== 'in-context' && !c.context);
  const skipped = cases.length - eligible.length;

  return { eligible, skipped };
}

// --- aggregates --------------------------------------------------------------
export const caseKey = (r) => r.query + '||' + (r.expected ?? '');

// Every trial folded per case: fires, trials seen, what was invoked when it
// missed. Rows with `uninstalled` or a run error are counted apart from the
// fire denominator.
export function fireRows(runsData) {
  const map = new Map();

  for (const results of runsData) {
    for (const r of results) {
      const key = caseKey(r);
      const cur = map.get(key) || { case: r, fired: 0, seen: 0, errors: 0, uninstalled: 0, missInvoked: [], violations: new Set() };
      if (r.error) {
        cur.errors++;
      } else if (r.uninstalled) {
        cur.uninstalled++;
      } else {
        cur.seen++;
        if (r.fired) cur.fired++;
        else {
          cur.missInvoked.push(r.invoked.length ? r.invoked.join('+') : '(nothing)');
          if (r.said) cur.missSaid = r.said;
        }
      }
      for (const v of r.violations || []) cur.violations.add(v);
      map.set(key, cur);
    }
  }

  return [...map.values()];
}

// Per-run fire rate, then mean ± 95% CI over runs (t-distribution, small n) —
// the same statistic the router eval reports, so the two headlines read alike.
const T95 = { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262 };

export function fireStats(runsData) {
  const perRun = runsData.map((results) => {
    const scored = results.filter((r) => !r.error && !r.uninstalled);
    return scored.length ? scored.filter((r) => r.fired).length / scored.length : 0;
  });
  const runs = perRun.length;
  const mean = runs ? perRun.reduce((a, b) => a + b, 0) / runs : 0;
  const sd = runs > 1 ? Math.sqrt(perRun.reduce((s, a) => s + (a - mean) ** 2, 0) / (runs - 1)) : 0;
  const ci95 = runs > 1 ? ((T95[runs - 1] || 1.96) * sd) / Math.sqrt(runs) : 0;

  return { perRun, mean, ci95 };
}

// Per source skill, all trials pooled — a 3-trial mean, never the last run
// (the router eval's docket #71 lesson, applied here from the start).
export function bySkillRows(runsData) {
  const map = new Map();

  for (const results of runsData) {
    for (const r of results) {
      if (r.error || r.uninstalled) continue;
      const cur = map.get(r.source) || { skill: r.source, fired: 0, seen: 0 };
      cur.seen++;
      if (r.fired) cur.fired++;
      map.set(r.source, cur);
    }
  }

  return [...map.values()].sort((a, b) => a.fired / a.seen - b.fired / b.seen || a.skill.localeCompare(b.skill));
}

// --- report ------------------------------------------------------------------
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const pct = (n, d) => (d ? (100 * n / d).toFixed(1) + '%' : '—');

export function reportLines({ model, maxTurns, cwdMode, runsData, skipped, totalCost, elapsedMs }) {
  const rows = fireRows(runsData);
  const stats = fireStats(runsData);
  const scoredRows = rows.filter((r) => r.seen > 0);
  const misses = scoredRows.filter((r) => r.fired < r.seen);
  const uninstalled = rows.filter((r) => r.uninstalled > 0);
  const errored = rows.filter((r) => r.errors > 0);
  const violations = rows.filter((r) => r.violations.size > 0);
  const runs = runsData.length;
  const lines = [];

  lines.push('# Invocation-observing trigger eval (fire rate)');
  lines.push('');
  lines.push(`- model: \`${model}\` · max turns: ${maxTurns} · cwd: ${cwdMode} · trials: ${runs}`);
  lines.push(`- cases: ${scoredRows.length} scored · ${uninstalled.length} uninstalled · ${errored.length} errored · ${skipped} skipped (in-context / preamble cases)`);
  lines.push(`- cost: $${totalCost.toFixed(2)} · wall: ${Math.round(elapsedMs / 1000)}s`);
  lines.push('');
  lines.push('A fire is a `Skill` tool_use naming the expected skill (or an `accept` alternate)');
  lines.push('in an ordinary headless turn with the skills actually installed. This is a');
  lines.push('separate metric from the router eval (`scripts/eval-triggers.mjs`) and never');
  lines.push("enters A3's routing band — see specs/trigger-reliability/quirks.md Q4.");
  lines.push('');
  lines.push(`## Fire rate: ${(100 * stats.mean).toFixed(1)}%` + (runs > 1 ? ` ± ${(100 * stats.ci95).toFixed(1)}pp (95% CI, ${runs} trials)` : ''));
  lines.push('');
  if (runs > 1) lines.push(`Per trial: ${stats.perRun.map((p) => (100 * p).toFixed(1) + '%').join(' · ')}`);
  lines.push('');
  lines.push('## By skill (all trials pooled)');
  lines.push('');
  lines.push('| skill | fired | rate |');
  lines.push('|---|---|---|');
  for (const s of bySkillRows(runsData)) lines.push(`| ${s.skill} | ${s.fired}/${s.seen} | ${pct(s.fired, s.seen)} |`);
  lines.push('');

  if (misses.length) {
    lines.push(`## Misses (${misses.length})`);
    lines.push('');
    lines.push('| query | expected | fired | invoked when missed | said (last miss, trimmed) |');
    lines.push('|---|---|---|---|---|');
    for (const m of misses) {
      lines.push(`| ${cell(m.case.query)} | ${m.case.expected ?? 'null'} | ${m.fired}/${m.seen} | ${[...new Set(m.missInvoked)].join(', ')} | ${cell((m.missSaid || '').slice(0, 120))} |`);
    }
    lines.push('');
  }

  if (violations.length) {
    lines.push(`## Disallowed fires (${violations.length})`);
    lines.push('');
    lines.push('| query | expected | invoked |');
    lines.push('|---|---|---|');
    for (const v of violations) lines.push(`| ${cell(v.case.query)} | ${v.case.expected ?? 'null'} | ${[...v.violations].join(', ')} |`);
    lines.push('');
  }

  if (uninstalled.length) {
    lines.push(`## Uninstalled (${uninstalled.length} — expected skill absent from the agent's skill list; excluded from the rate)`);
    lines.push('');
    for (const u of uninstalled) lines.push(`- ${u.case.expected} — ${cell(u.case.query)}`);
    lines.push('');
  }

  if (errored.length) {
    lines.push(`## Run errors (${errored.length})`);
    lines.push('');
    for (const e of errored) lines.push(`- ${cell(e.case.query)} (${e.errors}/${runs} trials)`);
    lines.push('');
  }

  return lines;
}
