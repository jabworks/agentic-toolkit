import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  normalizeSkill,
  parseStream,
  parseOpenCodeStream,
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

// Docket #73. Trimmed from the 2026-09-01 probe (`opencode run --format json
// "add an export button to the invoice table"`, OpenCode 1.18.25,
// opencode/big-pickle, clean room with the local 0.21.0 plugin): every event
// kind the OpenCode parser reads, paths sanitised. There is no init and no
// result event on this host — completion is the process exiting.
const SES = 'ses_fa3192ec7ffeERUzKkJgV7hEv9';
const oc = (type, part, timestamp) => ev({ type, timestamp, sessionID: SES, part: { sessionID: SES, messageID: 'msg_05ce6d786001Jn2LNhXEvT0JTx', ...part } });
const OC_BANNER = '> build · big-pickle';
const OC_STEP_START = oc('step_start', { id: 'prt_1', type: 'step-start', snapshot: '4b825dc6', text: '' }, 1788265030022);
const OC_SKILL = oc(
  'tool_use',
  { id: 'prt_2', type: 'tool', tool: 'skill', callID: 'call_8528da13', state: { status: 'completed', input: { name: 'workflow' }, output: '<skill_content name="workflow">…', title: 'Loaded skill: workflow' }, text: '' },
  1788265030320,
);
const OC_STEP_FINISH = oc('step_finish', { id: 'prt_3', type: 'step-finish', reason: 'tool-calls', tokens: { total: 11578, input: 9665, output: 57, reasoning: 0, cache: { write: 0, read: 1856 } }, cost: 0, text: '' }, 1788265030340);
const OC_TEXT = oc('text', { id: 'prt_4', type: 'text', text: 'Let me explore the codebase to understand the invoice table and check for specs.' }, 1788265033419);
const OC_READ = oc('tool_use', { id: 'prt_5', type: 'tool', tool: 'read', callID: 'call_7ab073c7', state: { status: 'completed', input: { filePath: '/tmp/case-0' }, output: '<path>/tmp/case-0</path>' }, text: '' }, 1788265032753);
const OC_FIRED = [OC_BANNER, OC_STEP_START, OC_SKILL, OC_STEP_FINISH, OC_STEP_START, OC_TEXT, OC_READ, OC_STEP_FINISH].join('\n');
const OC_MISSED = [OC_BANNER, OC_STEP_START, OC_TEXT, OC_READ, OC_STEP_FINISH].join('\n');
const OC_INSTALLED = ['blueprint', 'code-review', 'finalize', 'workflow'];

test('parseOpenCodeStream reads a skill fire, turns, cost, the session and the last text', () => {
  const obs = parseOpenCodeStream(OC_FIRED, { installed: OC_INSTALLED });
  assert.equal(obs.ok, true);
  assert.equal(obs.sessionID, SES);
  assert.equal(obs.events, 7, 'the banner line is noise, every JSON event counts');
  assert.deepEqual(obs.invoked, [{ raw: 'workflow', skill: 'workflow', turn: 1 }]);
  assert.equal(obs.turns, 2, 'one turn per step_start');
  assert.equal(obs.cost, 0, 'big-pickle is free; step_finish cost is summed');
  assert.equal(obs.durationMs, 1788265033419 - 1788265030022);
  assert.equal(obs.said, 'Let me explore the codebase to understand the invoice table and check for specs.');
  assert.equal(obs.resultSubtype, 'success', 'a run that exited is complete');
  assert.deepEqual(obs.installed, OC_INSTALLED, 'installed comes from the caller — the stream has no init');
  assert.equal(obs.error, null);
});

test('parseOpenCodeStream: only the skill tool counts — a read of a SKILL.md is not a fire', () => {
  const read = oc('tool_use', { type: 'tool', tool: 'read', state: { status: 'completed', input: { filePath: '/x/skills/workflow/SKILL.md' } } }, 1);
  const obs = parseOpenCodeStream([OC_STEP_START, read, OC_STEP_FINISH].join('\n'));
  assert.deepEqual(obs.invoked, []);
  assert.equal(obs.ok, true);
});

test('parseOpenCodeStream: no events is not ok (the quirks-Q6 stall); noise and torn lines are skipped', () => {
  assert.equal(parseOpenCodeStream('').ok, false);
  assert.equal(parseOpenCodeStream(OC_BANNER + '\n').ok, false);
  assert.equal(parseOpenCodeStream('{"type":"step_start"}\n').ok, false, 'an event without a session id proves nothing');
  const obs = parseOpenCodeStream(['garbage', OC_STEP_START, OC_SKILL, '{trunc'].join('\n'));
  assert.equal(obs.ok, true);
  assert.deepEqual(obs.invoked.map((i) => i.skill), ['workflow']);
});

test('parseOpenCodeStream: a run killed after a fire is a fire, one killed before any fire has no result', () => {
  const afterFire = parseOpenCodeStream(OC_FIRED, { exited: false });
  assert.equal(afterFire.resultSubtype, 'timeout_after_fire');
  assert.equal(scoreCase({ query: 'q', expected: 'workflow', accept: [], disallowed: [] }, afterFire).fired, true);

  const beforeFire = parseOpenCodeStream(OC_MISSED, { exited: false });
  assert.equal(beforeFire.ok, true);
  assert.equal(beforeFire.resultSubtype, null, 'truncated before any skill call — the harness must not score it as a miss');
});

test('parseOpenCodeStream feeds scoreCase like the Claude parser: fires, misses, uninstalled', () => {
  const c = { query: 'q', expected: 'workflow', accept: [], disallowed: [] };
  assert.equal(scoreCase(c, parseOpenCodeStream(OC_FIRED, { installed: OC_INSTALLED })).fired, true);
  assert.equal(scoreCase(c, parseOpenCodeStream(OC_MISSED, { installed: OC_INSTALLED })).fired, false);
  // `record` is not in a condux-only clean room: uninstalled, never a miss.
  const s = scoreCase({ ...c, expected: 'record' }, parseOpenCodeStream(OC_MISSED, { installed: OC_INSTALLED }));
  assert.equal(s.uninstalled, true);
  assert.equal(s.fired, false);
  // With no installed list the parser makes no claim, same as an old Claude CLI.
  assert.equal(scoreCase({ ...c, expected: 'record' }, parseOpenCodeStream(OC_MISSED)).uninstalled, false);
});

test('reportLines names the OpenCode host, the plugin arm and the skill-tool fire definition', () => {
  const c = { query: 'add an export button to the invoice table', expected: 'workflow', accept: [], disallowed: [], source: 'workflow' };
  const obs = parseOpenCodeStream(OC_FIRED, { installed: OC_INSTALLED });
  const row = { ...c, ...scoreCase(c, obs), turns: obs.turns };
  const lines = reportLines({
    host: 'opencode',
    plugin: '@jabworks/condux@0.20.0',
    model: 'opencode/big-pickle',
    maxTurns: 3,
    cwdMode: 'fresh temp dir per case',
    runsData: [[row]],
    skipped: 0,
    totalCost: 0,
    elapsedMs: 1000,
  });
  const text = lines.join('\n');
  assert.ok(text.includes('- host: `opencode run` · plugin: `@jabworks/condux@0.20.0`'), 'the report must say which arm was measured');
  assert.ok(text.includes('max turns: n/a'), 'OpenCode has no max-turns');
  assert.ok(text.includes('A fire is a `skill` tool call'), 'fire definition must match the host');
  assert.ok(text.includes('## Fire rate: 100.0%'));

  const claude = reportLines({ model: 'm', maxTurns: 3, cwdMode: 'x', runsData: [[row]], skipped: 0, totalCost: 0, elapsedMs: 1 }).join('\n');
  assert.ok(claude.includes('- host: `claude -p`') && claude.includes('A fire is a `Skill` tool_use'), 'the Claude report is unchanged in meaning');
});

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

  // --cases: exact queries, corpus metadata kept, unmatched surfaced (docket #54).
  const named = selectCases(all, { queries: ['not alpha', 'do alpha', 'nope', 'resume'] });
  assert.deepEqual(named.eligible.map((c) => c.query), ['do alpha', 'not alpha']);
  assert.deepEqual(named.eligible[0].disallowed, ['beta', 'gamma'], 'a named case keeps its merged corpus metadata');
  assert.equal(named.skipped, 1, 'the context twin is selected then skipped, and counted');
  assert.deepEqual(named.unmatched, ['nope']);
  assert.deepEqual(selectCases(all).unmatched, []);
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
