import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  normalizeSkill,
  parseStream,
  scoreCase,
  loadCorpus,
  selectCases,
  fireRows,
  fireStats,
  bySkillRows,
  reportLines,
} from '../scripts/invocation-observe.mjs';

// Docket #68. The parser and scorer live in their own module so this file can
// exercise them against a recorded transcript: eval-invocations.mjs spawns a
// real agent per case (~$0.035, ~13s), so reaching a predicate through it
// would make every assertion a paid run. A fire counter that silently returns
// zero is indistinguishable from a corpus that never fires.

// Trimmed from the 2026-08-31 probe (`claude -p "continue from last session"`,
// haiku-4-5, --max-turns 3): the shape of every event kind the parser reads.
const ev = (o) => JSON.stringify(o);
const INIT = ev({
  type: 'system',
  subtype: 'init',
  model: 'claude-haiku-4-5-20251001',
  skills: ['adapting-skills', 'ponytail', 'session-handoff:session-handoff', 'condux:workflow', 'docket:record'],
});
const HOOK = ev({ type: 'system', subtype: 'hook_started', hook_name: 'SessionStart:startup', hook_event: 'SessionStart' });
const text = (t) => ev({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: t }] } });
const tool = (name, input) => ev({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id: 'x', name, input }] } });
const result = (subtype, extra = {}) =>
  ev({ type: 'result', subtype, is_error: subtype !== 'success', num_turns: 4, total_cost_usd: 0.034716, duration_ms: 12879, ...extra });

const SUPPRESSED = [
  HOOK,
  INIT,
  text("I'll check the memory system to see what you were working on."),
  tool('Read', { file_path: '/home/x/.claude/projects/-tmp-probe/memory/MEMORY.md' }),
  tool('Bash', { command: 'ls -la' }),
  result('error_max_turns'),
].join('\n');

const FIRED = [INIT, tool('Skill', { skill: 'session-handoff:session-handoff' }), result('success')].join('\n');

test('normalizeSkill strips the plugin qualifier and leaves bare names alone', () => {
  assert.equal(normalizeSkill('session-handoff:session-handoff'), 'session-handoff');
  assert.equal(normalizeSkill('condux:workflow'), 'workflow');
  assert.equal(normalizeSkill('ponytail'), 'ponytail');
});

test('parseStream reads init skills, hooks, invocations and the result', () => {
  const obs = parseStream(FIRED);
  assert.equal(obs.ok, true);
  assert.deepEqual(obs.installed, ['adapting-skills', 'ponytail', 'session-handoff', 'workflow', 'record']);
  assert.deepEqual(obs.invoked.map((i) => i.skill), ['session-handoff']);
  assert.equal(obs.invoked[0].raw, 'session-handoff:session-handoff');
  assert.equal(obs.model, 'claude-haiku-4-5-20251001');
  assert.equal(obs.cost, 0.034716);
  assert.equal(obs.turns, 4);
  assert.equal(obs.resultSubtype, 'success');
  assert.equal(obs.error, null);
});

test('a max-turns transcript is complete and scorable, not a failed run', () => {
  const obs = parseStream(SUPPRESSED);
  assert.equal(obs.ok, true);
  assert.deepEqual(obs.hooks, ['SessionStart:startup']);
  assert.deepEqual(obs.invoked, [], 'Read of a memory file is not a fire');
  assert.equal(obs.resultSubtype, 'error_max_turns');
  assert.equal(obs.error, null, 'max-turns is the suppression shape, not an error');
  assert.equal(obs.said, "I'll check the memory system to see what you were working on.");
});

test('a transcript with no init is not ok; torn lines and noise are skipped', () => {
  assert.equal(parseStream('').ok, false);
  assert.equal(parseStream('not json\n{"type":"assistant"}\n').ok, false);
  const obs = parseStream(['garbage', INIT, '{"type": "assistant", "message": {"content": [{"type": "tool_use", "name": "Skill", "input": {"skill": "condux:workflow"}}]}}', '{trunc'].join('\n'));
  assert.equal(obs.ok, true);
  assert.deepEqual(obs.invoked.map((i) => i.skill), ['workflow']);
});

test('a genuine error result is recorded as an error', () => {
  const obs = parseStream([INIT, result('error_during_execution')].join('\n'));
  assert.equal(obs.error, 'error_during_execution');
});

test('only the Skill tool counts — Read of SKILL.md is not a fire', () => {
  const obs = parseStream([INIT, tool('Read', { file_path: '/x/skills/session-handoff/SKILL.md' }), result('success')].join('\n'));
  assert.deepEqual(obs.invoked, []);
});

test('scoreCase: expected skill invoked fires; accept alternates fire; nothing invoked misses', () => {
  const c = { query: 'q', expected: 'session-handoff', accept: [], disallowed: [] };
  assert.equal(scoreCase(c, parseStream(FIRED)).fired, true);
  assert.equal(scoreCase(c, parseStream(SUPPRESSED)).fired, false);

  const viaWorkflow = parseStream([INIT, tool('Skill', { skill: 'condux:workflow' }), result('success')].join('\n'));
  assert.equal(scoreCase({ ...c, expected: 'record' }, viaWorkflow).fired, false);
  assert.equal(scoreCase({ ...c, expected: 'record', accept: ['workflow'] }, viaWorkflow).fired, true);
});

test('scoreCase: a should-not-trigger case fires only when nothing was invoked', () => {
  const c = { query: 'q', expected: null, accept: [], disallowed: [] };
  assert.equal(scoreCase(c, parseStream(SUPPRESSED)).fired, true);
  assert.equal(scoreCase(c, parseStream(FIRED)).fired, false);
});

test('scoreCase: expected skill absent from init is uninstalled, never a miss', () => {
  const c = { query: 'q', expected: 'groom', accept: [], disallowed: [] };
  const s = scoreCase(c, parseStream(SUPPRESSED));
  assert.equal(s.uninstalled, true);
  assert.equal(s.fired, false);
  // An empty installed list (older CLI without the field) makes no claim.
  const noList = parseStream([ev({ type: 'system', subtype: 'init' }), result('success')].join('\n'));
  assert.equal(scoreCase(c, noList).uninstalled, false);
});

test('scoreCase: a disallowed skill that was invoked is a violation, deduplicated', () => {
  const c = { query: 'q', expected: 'session-handoff', accept: [], disallowed: ['workflow'] };
  const both = parseStream([INIT, tool('Skill', { skill: 'condux:workflow' }), tool('Skill', { skill: 'condux:workflow' }), tool('Skill', { skill: 'session-handoff:session-handoff' }), result('success')].join('\n'));
  const s = scoreCase(c, both);
  assert.equal(s.fired, true);
  assert.deepEqual(s.violations, ['workflow']);
  assert.deepEqual(s.invoked, ['workflow', 'workflow', 'session-handoff']);
});

test('loadCorpus mirrors the router eval: expected resolution, dedup, disallowed merge, --skills filter', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-corpus-'));
  const write = (skill, cases) => {
    fs.mkdirSync(path.join(dir, skill, 'evals'), { recursive: true });
    fs.writeFileSync(path.join(dir, skill, 'evals', 'trigger_eval.json'), JSON.stringify(cases));
  };
  write('alpha', [
    { query: 'do alpha', should_trigger: true, expected_skill: 'alpha', disallowed: ['beta'] },
    { query: 'not alpha', should_trigger: false, expected_skill: 'alpha' },
    { query: 'later', should_trigger: true, expected_skill: 'alpha', kind: 'in-context' },
    { query: 'resume', should_trigger: true, expected_skill: 'alpha', context: 'digest' },
  ]);
  write('beta', [{ query: 'do alpha', should_trigger: true, expected_skill: 'alpha', disallowed: ['gamma'] }]);
  fs.mkdirSync(path.join(dir, 'no-evals'));

  const all = loadCorpus(dir);
  assert.equal(all.length, 4, 'the beta duplicate collapses into alpha\'s row');
  const kept = all.find((c) => c.query === 'do alpha');
  assert.deepEqual(kept.disallowed, ['beta', 'gamma']);
  assert.equal(kept.source, 'alpha');
  assert.equal(all.find((c) => c.query === 'not alpha').expected, null);

  const { eligible, skipped } = selectCases(all);
  assert.deepEqual(eligible.map((c) => c.query), ['do alpha', 'not alpha']);
  assert.equal(skipped, 2);

  assert.deepEqual(loadCorpus(dir, { skills: ['beta'] }).map((c) => c.source), ['beta']);
});

test('aggregates pool every trial and keep uninstalled and errors out of the denominator', () => {
  const base = { query: 'q1', expected: 's', source: 'skill-a', accept: [], disallowed: [] };
  const runsData = [
    [{ ...base, fired: true, invoked: ['s'], violations: [] }, { ...base, query: 'q2', fired: false, invoked: [], violations: [], said: 'Nothing to save | yet' }, { ...base, query: 'q3', source: 'skill-b', uninstalled: true, fired: false, invoked: [], violations: [] }],
    [{ ...base, fired: false, invoked: ['workflow'], violations: ['workflow'] }, { ...base, query: 'q2', fired: false, invoked: [], violations: [] }, { ...base, query: 'q3', source: 'skill-b', error: 'boom', fired: false, invoked: [], violations: [] }],
  ];
  const rows = fireRows(runsData);
  const q1 = rows.find((r) => r.case.query === 'q1');
  assert.equal(q1.fired, 1);
  assert.equal(q1.seen, 2);
  assert.deepEqual(q1.missInvoked, ['workflow']);
  assert.deepEqual([...q1.violations], ['workflow']);
  const q3 = rows.find((r) => r.case.query === 'q3');
  assert.equal(q3.seen, 0);
  assert.equal(q3.uninstalled, 1);
  assert.equal(q3.errors, 1);

  const stats = fireStats(runsData);
  assert.deepEqual(stats.perRun, [0.5, 0]);
  assert.equal(stats.mean, 0.25);
  assert.ok(stats.ci95 > 0);

  assert.deepEqual(bySkillRows(runsData), [{ skill: 'skill-a', fired: 1, seen: 4 }], 'skill-b never scored');

  const report = reportLines({ model: 'm', maxTurns: 3, cwdMode: 'fresh', runsData, skipped: 1, totalCost: 0.1, elapsedMs: 1000 }).join('\n');
  assert.match(report, /## Fire rate: 25\.0% ± [\d.]+pp \(95% CI, 2 trials\)/);
  assert.match(report, /\| skill-a \| 1\/4 \| 25\.0% \|/);
  assert.match(report, /## Misses \(2\)/);
  assert.match(report, /\| q1 \| s \| 1\/2 \| workflow \|/);
  assert.match(report, /\| q2 \| s \| 0\/2 \| \(nothing\) \| Nothing to save \\\| yet \|/);
  assert.match(report, /## Disallowed fires \(1\)/);
  assert.match(report, /## Uninstalled \(1/);
  assert.match(report, /## Run errors \(1\)/);
  assert.match(report, /never\nenters A3's routing band/);
});
