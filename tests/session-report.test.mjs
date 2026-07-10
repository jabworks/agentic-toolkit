import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODEX = path.resolve(__dirname, '../skills/session-report/analyze-codex.mjs');
const CLAUDE = path.resolve(__dirname, '../skills/session-report/analyze-claude.mjs');
const OFFLINE = path.resolve(__dirname, 'offline-fetch.mjs');
const ATTACK = '</script><script>globalThis.PWNED=1</script>';

function analyze(script, root) {
  return execFileSync(
    process.execPath,
    ['--import', OFFLINE, script, '--dir', root, '--json'],
    { encoding: 'utf8' },
  );
}

test('session-report analyzers emit script-safe JSON', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-session-report-safe-'));
  try {
    const codexRoot = path.join(tmp, 'codex');
    fs.mkdirSync(codexRoot);
    fs.writeFileSync(path.join(codexRoot, 'session.jsonl'), [
      JSON.stringify({ type: 'session_meta', payload: { id: 'codex-1', cwd: '/tmp/project', timestamp: '2026-01-01T00:00:00Z' } }),
      JSON.stringify({ timestamp: '2026-01-01T00:00:01Z', type: 'event_msg', payload: { type: 'user_message', message: ATTACK } }),
      JSON.stringify({ timestamp: '2026-01-01T00:00:02Z', type: 'event_msg', payload: { type: 'token_count', info: { last_token_usage: { input_tokens: 10, cached_input_tokens: 0, output_tokens: 5 } } } }),
    ].join('\n') + '\n');

    const claudeRoot = path.join(tmp, 'claude');
    const projectDir = path.join(claudeRoot, 'project');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'session.jsonl'), [
      JSON.stringify({ uuid: 'user-1', type: 'user', timestamp: '2026-01-01T00:00:01Z', message: { content: 'hello' } }),
      JSON.stringify({ uuid: 'assistant-1', requestId: 'request-1', type: 'assistant', timestamp: '2026-01-01T00:00:02Z', message: { model: ATTACK, content: [], usage: { input_tokens: 10, output_tokens: 5 } } }),
    ].join('\n') + '\n');

    for (const [script, root] of [[CODEX, codexRoot], [CLAUDE, claudeRoot]]) {
      const raw = analyze(script, root);
      assert.doesNotMatch(raw, /<\/script>/i);
      assert.match(raw, /\\u003c\/script>/i);
      assert.ok(JSON.parse(raw).overall.api_calls > 0);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('session-report analyzers do not score an empty dataset', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-session-report-empty-'));
  try {
    for (const script of [CODEX, CLAUDE]) {
      const report = JSON.parse(analyze(script, tmp));
      assert.equal(report.overall.efficiency_score, null);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
