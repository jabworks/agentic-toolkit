import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseVerdict, newestRunDir, initTools, judgePrompt, buildSummary, settingsOverride } from '../scripts/eval-research-quality.mjs';

// The pure half of the condux:research quality eval (docket #98). The runner
// spawns real research runs and a judge, so it is manual-only; everything it
// decides with is tested here.

const VERDICT = '{"factual":0.9,"citation":0.8,"completeness":0.7,"sourceQuality":1,"toolEfficiency":0.6,"pass":true}';

test('parseVerdict reads a trailing fenced json block', () => {
  const v = parseVerdict(`Reasoning here.\n\n\`\`\`json\n${VERDICT}\n\`\`\`\n`);
  assert.deepEqual(v, {
    scores: { factual: 0.9, citation: 0.8, completeness: 0.7, sourceQuality: 1, toolEfficiency: 0.6 },
    pass: true,
  });
});

test('parseVerdict rejects anything that is not a complete, in-range verdict', () => {
  assert.equal(parseVerdict(''), null, 'empty');
  assert.equal(parseVerdict(undefined), null, 'undefined');
  assert.equal(parseVerdict(VERDICT), null, 'bare JSON with no fence');
  assert.equal(parseVerdict(`\`\`\`json\n${VERDICT}\n\`\`\`\nTrailing prose.`), null, 'fence not last');
  assert.equal(parseVerdict('```json\n{not json}\n```'), null, 'malformed JSON');
  assert.equal(parseVerdict('```json\n{"factual":0.9,"citation":0.8,"completeness":0.7,"sourceQuality":1,"pass":true}\n```'), null, 'missing criterion');
  assert.equal(parseVerdict('```json\n{"factual":1.2,"citation":0.8,"completeness":0.7,"sourceQuality":1,"toolEfficiency":0.6,"pass":true}\n```'), null, 'score above 1');
  assert.equal(parseVerdict('```json\n{"factual":"0.9","citation":0.8,"completeness":0.7,"sourceQuality":1,"toolEfficiency":0.6,"pass":true}\n```'), null, 'score as string');
  assert.equal(parseVerdict('```json\n{"factual":0.9,"citation":0.8,"completeness":0.7,"sourceQuality":1,"toolEfficiency":0.6,"pass":"yes"}\n```'), null, 'non-boolean pass');
});

test('newestRunDir picks the newest run folder with a report written since the case started', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rq-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, mtimeMs) => {
    fs.mkdirSync(path.join(root, name), { recursive: true });
    const file = path.join(root, name, 'report.md');
    fs.writeFileSync(file, '# r\n');
    fs.utimesSync(file, mtimeMs / 1000, mtimeMs / 1000);
  };
  const since = 1_700_000_000_000;
  write('2026-10-01-old', since - 60_000);
  write('2026-10-08-a', since + 1_000);
  write('2026-10-08-b', since + 5_000);
  fs.mkdirSync(path.join(root, '2026-10-08-no-report'));
  assert.equal(newestRunDir(root, since), path.join(root, '2026-10-08-b'));
  assert.equal(newestRunDir(root, since + 10_000), null, 'only older reports');
  assert.equal(newestRunDir(path.join(root, 'missing'), since), null, 'no research dir at all');
});

test('initTools reads the tool list from the stream-json init event', () => {
  const stream = [
    'not json',
    JSON.stringify({ type: 'system', subtype: 'init', tools: ['Agent', 'WebSearch', 'Write'] }),
    JSON.stringify({ type: 'assistant', message: {} }),
  ].join('\n');
  assert.deepEqual(initTools(stream), ['Agent', 'WebSearch', 'Write']);
  assert.deepEqual(initTools(''), []);
  assert.deepEqual(initTools(JSON.stringify({ type: 'system', subtype: 'init' })), []);
});

test('judgePrompt carries the question, report, notes, and the exact verdict shape', () => {
  const p = judgePrompt({ query: 'Q?', report: 'REPORT BODY', notes: [{ name: 'a.md', text: 'NOTE A' }] });
  for (const s of ['Q?', 'REPORT BODY', 'notes/a.md', 'NOTE A', '"toolEfficiency"', '"pass"', 'up to 3']) assert.ok(p.includes(s), s);
  assert.ok(judgePrompt({ query: 'Q', report: 'R', notes: [] }).includes('no notes files'));
});

test('buildSummary reports scores, means, pass rate, environment, and unscored cases separately', () => {
  const verdict = parseVerdict(`\`\`\`json\n${VERDICT}\n\`\`\``);
  const results = [
    { id: 'a', query: 'qa', shape: 'comparison', fallback: false, runDir: '/r/a', verdict },
    { id: 'b', query: 'qb', shape: 'survey', fallback: true, runDir: '/r/b', verdict: { ...verdict, pass: false } },
    { id: 'c', query: 'qc', shape: 'survey', fallback: false, runDir: null, verdict: null, error: 'no report.md written' },
    { id: 'd', query: 'qd', shape: 'survey', fallback: false, runDir: '/r/d', verdict: null },
  ];
  const md = buildSummary(results, { host: 'claude', tools: ['Agent', 'WebFetch'], plugin: '/p (condux 2.35.0)', disabledPlugins: ['context-mode@context-mode'] });
  assert.match(md, /Disabled plugins: context-mode@context-mode/);
  assert.match(md, /Plugin: \/p \(condux 2\.35\.0\)/);
  assert.match(md, /Lead tools: Agent, WebFetch/);
  assert.match(md, /\| a \| comparison \| no \| 0\.90 \| 0\.80 \| 0\.70 \| 1\.00 \| 0\.60 \| ✓ \|/);
  assert.match(md, /\| b \| survey \| yes \|.*\| ✗ \|/);
  assert.match(md, /\| c \|.*no report\.md written/);
  assert.match(md, /\| d \|.*unparseable verdict/);
  assert.match(md, /Means over 2 scored case\(s\):\*\* factual 0\.90/);
  assert.match(md, /Pass rate:\*\* 1\/2/);
  assert.match(md, /Unscored:\*\* 2/);
});

test('buildSummary says so when nothing was scorable', () => {
  const md = buildSummary([{ id: 'x', query: 'q', shape: 'survey', fallback: false, runDir: null, verdict: null, error: 'boom' }], { host: 'claude', tools: [], plugin: 'p' });
  assert.match(md, /No case produced a scorable verdict/);
  assert.match(md, /Lead tools: \(unknown\)/);
  assert.match(md, /Disabled plugins: none/);
});

test('settingsOverride disables each named plugin, and adds nothing when none are named', () => {
  assert.deepEqual(settingsOverride([]), []);
  const [flagName, json] = settingsOverride(['context-mode@context-mode', 'x@y']);
  assert.equal(flagName, '--settings');
  assert.deepEqual(JSON.parse(json), { enabledPlugins: { 'context-mode@context-mode': false, 'x@y': false } });
});
