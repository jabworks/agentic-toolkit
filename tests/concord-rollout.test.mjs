import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readRollout, lineCount } from '../skills/remember/lib/rollout.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures', 'concord');
const BASIC = path.join(FIXTURES, 'rollout-basic.jsonl');
const SUBAGENT = path.join(FIXTURES, 'rollout-subagent.jsonl');

function tmpFile(contents, name = 'rollout.jsonl') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-rollout-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, contents);
  return file;
}

// --- identity ----------------------------------------------------------------

test('session_meta supplies identity', () => {
  const { meta } = readRollout(BASIC);
  assert.equal(meta.sessionId, '019fa1bf-2ea1-7b90-a595-44ace0430653');
  assert.equal(meta.cwd, '/home/u/projects/demo');
  assert.equal(meta.startedAt, '2026-07-27T04:04:48.000Z');
  assert.equal(meta.isSubagent, false);
});

test('identity is still available when resuming mid-file', () => {
  // Line 0 is read for meta regardless of where the content scan starts —
  // otherwise a resumed session loses track of whose rollout it is.
  const { meta, entries } = readRollout(BASIC, { fromLine: 8 });
  assert.equal(meta.sessionId, '019fa1bf-2ea1-7b90-a595-44ace0430653');
  assert.deepEqual(
    entries.map((e) => e.kind),
    ['agent'],
  );
});

// --- what is and is not captured ---------------------------------------------

test('captures user and agent messages and tool calls, and nothing else', () => {
  const { entries } = readRollout(BASIC);
  assert.deepEqual(
    entries.map((e) => e.kind),
    ['user', 'tool', 'agent'],
  );
  assert.equal(entries[0].text, 'Add a health check endpoint');
  assert.equal(entries[1].tool, 'shell');
  assert.equal(entries[2].text, 'Added GET /healthz returning 200.');
});

test('response_item/message is NOT captured — it mirrors event_msg and would double-count', () => {
  const { entries } = readRollout(BASIC);

  // The fixture contains the same user text twice (event_msg/user_message and
  // response_item/message) and the same agent text twice. Each must appear once.
  const userHits = entries.filter((e) => e.text === 'Add a health check endpoint');
  const agentHits = entries.filter((e) => e.text === 'Added GET /healthz returning 200.');
  assert.equal(userHits.length, 1, 'user message captured exactly once');
  assert.equal(agentHits.length, 1, 'agent message captured exactly once');
});

test('noise records are dropped', () => {
  const { entries } = readRollout(BASIC);
  // reasoning, token_count, turn_context, custom_tool_call_output, task_complete
  assert.equal(entries.length, 3);
});

// --- subagents ---------------------------------------------------------------

test('subagent rollouts are skipped without parsing the body', () => {
  const { meta, entries, skipped, lastLine } = readRollout(SUBAGENT);
  assert.equal(meta.isSubagent, true);
  assert.equal(skipped.subagent, true);
  assert.deepEqual(entries, []);
  assert.equal(lastLine, lineCount(SUBAGENT), 'position advances past the whole file');
});

test('subagent detection does not rely on agent_role, which is null even for real subagents', () => {
  // Mirrors observed reality: agent_role null, thread_source the real signal.
  const file = tmpFile(
    JSON.stringify({
      timestamp: '2026-05-12T16:51:50.000Z',
      type: 'session_meta',
      payload: { session_id: 's', cwd: '/x', agent_role: null, thread_source: 'subagent' },
    }) + '\n',
  );
  assert.equal(readRollout(file).skipped.subagent, true);
});

// --- ordering and resumption -------------------------------------------------

test('out-of-order timestamps are preserved, not reordered or rejected', () => {
  // The fixture's user_message predates session_meta.timestamp — a real quirk.
  const { entries } = readRollout(BASIC);
  assert.equal(entries[0].at, '2026-07-27T04:04:40.000Z');
  assert.ok(entries[0].at < entries[1].at, 'entries stay in file order');
});

test('fromLine resumes without re-emitting earlier entries', () => {
  const all = readRollout(BASIC);
  const tail = readRollout(BASIC, { fromLine: all.lastLine });
  assert.deepEqual(tail.entries, [], 'nothing new after a full read');
  assert.equal(tail.lastLine, all.lastLine, 'position does not move backwards');
});

test('incremental reads of a growing rollout equal one read of the finished file', () => {
  // The real scenario: hooks fire repeatedly while Codex is still appending.
  // Every entry must be seen exactly once across all the partial reads.
  const lines = fs.readFileSync(BASIC, 'utf8').split('\n').filter(Boolean);
  const file = tmpFile('');

  const collected = [];
  let position = 0;
  for (const line of lines) {
    fs.appendFileSync(file, line + '\n');
    const { entries, lastLine } = readRollout(file, { fromLine: position });
    collected.push(...entries);
    position = lastLine;
  }

  const whole = readRollout(BASIC);
  assert.deepEqual(collected, whole.entries, 'no entry lost, none duplicated');
  assert.equal(position, whole.lastLine);
});

// --- malformed input ---------------------------------------------------------

test('a truncated final line is normal and is left unconsumed for the next pass', () => {
  const good = fs.readFileSync(BASIC, 'utf8');
  const file = tmpFile(good + '{"timestamp":"2026-07-27T04:05:00.000Z","type":"event_ms');

  const { entries, lastLine } = readRollout(file);
  assert.equal(entries.length, 3, 'complete records still parse');

  const total = good.split('\n').filter(Boolean).length;
  assert.equal(lastLine, total, 'the partial tail is NOT counted as consumed');

  // Completing the line makes it available on the next read — nothing was lost.
  fs.appendFileSync(file, 'g","payload":{"type":"agent_message","message":"done"}}\n');
  const next = readRollout(file, { fromLine: lastLine });
  assert.deepEqual(
    next.entries.map((e) => e.text),
    ['done'],
  );
});

test('a corrupt interior line is skipped, not fatal', () => {
  const lines = fs.readFileSync(BASIC, 'utf8').split('\n').filter(Boolean);
  lines.splice(4, 0, '{not json at all');
  const file = tmpFile(lines.join('\n') + '\n');

  const { entries } = readRollout(file);
  assert.equal(entries.length, 3, 'surrounding records still parse');
});

test('a missing or unreadable rollout is a no-op, never a throw', () => {
  const result = readRollout('/definitely/not/here.jsonl');
  assert.deepEqual(result, {
    meta: null,
    entries: [],
    lastLine: 0,
    skipped: { subagent: false },
  });
  assert.equal(lineCount('/definitely/not/here.jsonl'), 0);
});

test('an empty file yields nothing and does not crash', () => {
  const file = tmpFile('');
  const { meta, entries, lastLine } = readRollout(file);
  assert.equal(meta, null);
  assert.deepEqual(entries, []);
  assert.equal(lastLine, 0);
});

// --- text caps ---------------------------------------------------------------

test('long messages are clipped so one paste cannot dominate a day of memory', () => {
  const file = tmpFile(
    JSON.stringify({
      timestamp: '2026-07-27T04:04:48.000Z',
      type: 'session_meta',
      payload: { session_id: 's', cwd: '/x', thread_source: 'user' },
    }) +
      '\n' +
      JSON.stringify({
        timestamp: '2026-07-27T04:04:49.000Z',
        type: 'event_msg',
        payload: { type: 'user_message', message: 'x'.repeat(9000) },
      }) +
      '\n',
  );
  const { entries } = readRollout(file);
  assert.ok(entries[0].text.length < 9000);
  assert.ok(entries[0].text.endsWith('…'), 'clipping is visible, not silent');
});

test('tool input is clipped harder than prose', () => {
  const file = tmpFile(
    JSON.stringify({
      timestamp: '2026-07-27T04:04:48.000Z',
      type: 'session_meta',
      payload: { session_id: 's', cwd: '/x', thread_source: 'user' },
    }) +
      '\n' +
      JSON.stringify({
        timestamp: '2026-07-27T04:04:49.000Z',
        type: 'response_item',
        payload: { type: 'custom_tool_call', name: 'shell', input: 'y'.repeat(5000) },
      }) +
      '\n',
  );
  const { entries } = readRollout(file);
  assert.equal(entries[0].kind, 'tool');
  assert.ok(entries[0].text.length <= 201);
});
