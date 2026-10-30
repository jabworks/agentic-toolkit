import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import { recordSnapshot } from '../skills/usage-trace/bin/snapshot.mjs';
import { runIngest } from '../skills/usage-trace/lib/ingest.mjs';
import { parseClaudeRecord } from '../skills/usage-trace/lib/parse-claude.mjs';
import { parseCodexRecord } from '../skills/usage-trace/lib/parse-codex.mjs';
import { loadPrivacy } from '../skills/usage-trace/lib/privacy.mjs';
import { makeEvent } from '../skills/usage-trace/lib/schema.mjs';
import { applySetup, undoSetup } from '../skills/usage-trace/lib/setup.mjs';
import { readEvents } from '../skills/usage-trace/lib/store.mjs';

const MARKER_PATH = '/secret/MARKERPROJECT';
const MARKER_PROMPT = 'MARKERPROMPT please do this';
const MARKER_FILE = '/secret/MARKERPROJECT/MARKERFILE.ts';

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'usage-trace-'));

const claudeRecords = [
  {
    type: 'user',
    uuid: 'u1',
    sessionId: 's1',
    cwd: MARKER_PATH,
    gitBranch: 'MARKERBRANCH',
    version: '9',
    timestamp: '2026-10-01T00:00:00Z',
    message: { role: 'user', content: MARKER_PROMPT },
  },
  {
    type: 'assistant',
    uuid: 'a1',
    requestId: 'r1',
    sessionId: 's1',
    cwd: MARKER_PATH,
    timestamp: '2026-10-01T00:00:01Z',
    attributionSkill: 'MARKERSKILL',
    message: {
      model: 'claude-opus-5-5',
      usage: { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 },
      content: [{ type: 'thinking', thinking: 'MARKERTHINKING' }],
    },
  },
  {
    type: 'assistant',
    uuid: 'a2',
    requestId: 'r1',
    sessionId: 's1',
    cwd: MARKER_PATH,
    timestamp: '2026-10-01T00:00:02Z',
    message: {
      model: 'claude-opus-5-5',
      usage: { input_tokens: 1, output_tokens: 50, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 },
      content: [{ type: 'tool_use', id: 't1', name: 'Edit', input: { file_path: MARKER_FILE, new_string: 'MARKERCODE' } }],
    },
  },
  {
    type: 'user',
    uuid: 'u2',
    sessionId: 's1',
    cwd: MARKER_PATH,
    timestamp: '2026-10-01T00:00:03Z',
    toolUseResult: { stdout: 'MARKEROUTPUT' },
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'MARKEROUTPUT' }] },
  },
  { type: 'pr-link', sessionId: 's1', prUrl: 'https://x/MARKERPR/1', timestamp: '2026-10-01T00:00:04Z' },
  { type: 'brand-new-type', sessionId: 's1', timestamp: '2026-10-01T00:00:05Z' },
];

const setupSource = () => {
  const root = tempDir();
  const home = tempDir();
  const file = path.join(root, 'p', 's1.jsonl');

  fs.mkdirSync(path.dirname(file));
  fs.writeFileSync(file, `${claudeRecords.map(record => JSON.stringify(record)).join('\n')}\n`);

  return {
    home,
    file,
    sources: [{ host: 'claude', root, parse: parseClaudeRecord }],
    privacy: loadPrivacy(home, { plugins: new Set() }),
  };
};

test('makeEvent rejects fields outside the allowlist', () => {
  assert.throws(() => makeEvent('turn', { id: 'a', ts: 't', prompt: 'x' }), /unknown field/);
  assert.throws(() => makeEvent('nope', { id: 'a', ts: 't' }), /unknown event type/);
});

test('default settings keep every marker out of the store', () => {
  const { home, sources, privacy } = setupSource();

  runIngest({ home, sources, privacy });

  const raw = fs.readdirSync(path.join(home, 'events'))
    .map(name => fs.readFileSync(path.join(home, 'events', name)))
    .join('');

  assert.doesNotMatch(raw, /MARKER/);
});

test('an allowlisted project keeps its name and prompt text', () => {
  const { home, sources } = setupSource();

  fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({ allow: [MARKER_PATH] }));
  runIngest({ home, sources, privacy: loadPrivacy(home, { plugins: new Set() }) });

  const prompt = [...readEvents({ home })].find(event => event.prompt_text);

  assert.equal(prompt.prompt_text, MARKER_PROMPT);
  assert.equal(prompt.project_name, MARKER_PATH);
});

test('a streamed response counts once, at its final output', () => {
  const { home, sources, privacy } = setupSource();

  runIngest({ home, sources, privacy });

  const calls = [...readEvents({ home })].filter(event => event.type === 'api_call');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].output, 50);
});

test('re-running adds nothing, and a resumed read picks up only new lines', () => {
  const { home, file, sources, privacy } = setupSource();

  runIngest({ home, sources, privacy });

  const before = [...readEvents({ home })].length;

  fs.rmSync(path.join(home, 'state.json'));
  runIngest({ home, sources, privacy });

  const replayed = [...readEvents({ home })].filter(event => event.type !== 'coverage').length;

  assert.ok(replayed <= before);

  fs.appendFileSync(file, `${JSON.stringify({ ...claudeRecords[0], uuid: 'u9', timestamp: '2026-10-01T01:00:00Z' })}\n`);
  runIngest({ home, sources, privacy });

  const turns = [...readEvents({ home })].filter(event => event.type === 'turn');

  assert.equal(turns.length, 2);
});

test('a partial last line waits for the next run', () => {
  const { home, file, sources, privacy } = setupSource();

  fs.appendFileSync(file, '{"type":"user","uuid":"u3"');
  runIngest({ home, sources, privacy });

  const result = runIngest({ home, sources, privacy });

  assert.equal(result.failures, 0);
});

test('unknown record types surface in coverage', () => {
  const { home, sources, privacy } = setupSource();
  const result = runIngest({ home, sources, privacy });

  assert.equal(result.unknown['claude:brand-new-type'], 1);
});

test('closed months are gzipped and still readable', () => {
  const { home, sources, privacy } = setupSource();

  runIngest({ home, sources, privacy, now: new Date('2026-12-01T00:00:00Z') });

  assert.ok(fs.existsSync(path.join(home, 'events', '2026-10.jsonl.gz')));
  assert.ok([...readEvents({ home })].some(event => event.type === 'api_call'));
});

test('a held lock skips the run; a dead holder is taken over', () => {
  const { home, sources, privacy } = setupSource();

  fs.writeFileSync(path.join(home, 'lock'), String(process.pid));
  assert.equal(runIngest({ home, sources, privacy }).skipped, 'locked');

  fs.writeFileSync(path.join(home, 'lock'), '999999');
  assert.equal(runIngest({ home, sources, privacy }).skipped, undefined);
});

test('codex: replayed history is dropped, cached tokens split out, null limits emit nothing', () => {
  const home = tempDir();
  const privacy = loadPrivacy(home, { plugins: new Set() });
  const ctx = {};
  const run = record => parseCodexRecord(record, ctx, privacy).events;

  run({ type: 'session_meta', timestamp: '2026-10-02T00:00:00Z', payload: { id: 'c1', cwd: MARKER_PATH, timestamp: '2026-10-02T00:00:00Z' } });
  run({ type: 'turn_context', timestamp: '2026-10-02T00:00:01Z', payload: { model: 'gpt-x', cwd: MARKER_PATH } });

  const usage = { input_tokens: 100, cached_input_tokens: 90, output_tokens: 5 };
  const replay = run({ type: 'event_msg', timestamp: '2026-10-01T00:00:00Z', payload: { type: 'token_count', info: { last_token_usage: usage } } });
  const live = run({
    type: 'event_msg',
    timestamp: '2026-10-02T00:00:02Z',
    payload: { type: 'token_count', info: { last_token_usage: usage }, rate_limits: { primary: null, secondary: null } },
  });
  const limited = run({
    type: 'event_msg',
    timestamp: '2026-10-02T00:00:03Z',
    payload: { type: 'token_count', rate_limits: { primary: { used_percent: 12 }, secondary: { used_percent: 34 } } },
  });

  assert.equal(replay.length, 0);
  assert.equal(live.length, 1);
  assert.equal(live[0].input, 10);
  assert.equal(live[0].cache_read, 90);
  assert.deepEqual([limited[0].five_hour, limited[0].seven_day], [12, 34]);
});

test('a custom name is hashed; a plugin name stays readable', () => {
  const privacy = loadPrivacy(tempDir(), { plugins: new Set(['condux']) });

  assert.equal(privacy.publicName('condux:workflow'), 'condux:workflow');
  assert.equal(privacy.publicName('Bash'), 'Bash');
  assert.match(privacy.publicName('acme-secret'), /^h:/);
  assert.match(privacy.publicName('mcp__acme__do'), /^h:/);
});

test('snapshot writes on change or after 5 minutes, and ignores missing limits', () => {
  const home = tempDir();
  const at = new Date('2026-10-03T00:00:00Z');
  const input = JSON.stringify({ session_id: 's', rate_limits: { five_hour: { used_percentage: 10 }, seven_day: { used_percentage: 20 } } });

  assert.equal(recordSnapshot(input, home, at), true);
  assert.equal(recordSnapshot(input, home, new Date(at.getTime() + 1000)), false);
  assert.equal(recordSnapshot(input, home, new Date(at.getTime() + 301000)), true);
  assert.equal(recordSnapshot('{}', home, at), false);

  const limit = [...readEvents({ home })].find(event => event.type === 'limit');

  const { v, type, ...fields } = limit;

  // snapshot.mjs is self-contained, so this keeps it in step with the schema.
  assert.deepEqual(makeEvent(type, fields), limit);
  assert.equal(v, 1);
});

test('the status line shim passes input through to the original, and undo restores it', () => {
  const home = tempDir();
  const config = tempDir();
  const previous = process.env.CLAUDE_CONFIG_DIR;
  const original = { type: 'command', command: 'cat', padding: 1 };

  process.env.CLAUDE_CONFIG_DIR = config;

  try {
    fs.writeFileSync(path.join(config, 'settings.json'), JSON.stringify({ statusLine: original, keep: true }));
    applySetup(home, new URL('../skills/usage-trace/bin/snapshot.mjs', import.meta.url).pathname);

    const applied = JSON.parse(fs.readFileSync(path.join(config, 'settings.json'), 'utf8'));
    const input = JSON.stringify({ rate_limits: { five_hour: { used_percentage: 1 } } });
    // Without this the shim's background snapshot writes to the real ~/.usage-trace.
    const env = { ...process.env, USAGE_TRACE_HOME: home };
    const run = spawnSync('bash', [path.join(home, 'statusline.sh')], { input, encoding: 'utf8', env });

    assert.equal(run.stdout, input);
    assert.equal(applied.statusLine.padding, 1);
    assert.equal(applied.keep, true);

    undoSetup(home);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(config, 'settings.json'), 'utf8')).statusLine, original);
  } finally {
    if (previous === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR;
    } else {
      process.env.CLAUDE_CONFIG_DIR = previous;
    }
  }
});

test('the session hook returns quickly and prints nothing', () => {
  const home = tempDir();
  const started = Date.now();
  const run = spawnSync('node', [new URL('../skills/usage-trace/hooks/session-start.mjs', import.meta.url).pathname], {
    encoding: 'utf8',
    env: { ...process.env, USAGE_TRACE_HOME: home, CLAUDE_CONFIG_DIR: tempDir(), CODEX_HOME: tempDir() },
  });

  assert.equal(run.status, 0);
  assert.equal(run.stdout, '');
  assert.ok(Date.now() - started < 2000);
});
