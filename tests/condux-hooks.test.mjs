import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const SRC = path.join(REPO_ROOT, 'skills', 'workflow', 'hooks');

// Both hosts load hooks from the PLUGIN root, which no skill-tree copy
// reaches. The verbatim-mirror assertion for dist/plugins/condux/hooks/ lives
// in tests/composition.test.mjs now — the pair is declared in composition.json
// and guarded generically. What stays here is the behavior of the hooks
// themselves.
test('each host hook manifest is valid JSON and uses only its own root variable', () => {
  // Getting this backwards yields a hook that silently never runs: the wrong
  // variable expands to empty and the command path is nonsense.
  const cases = [
    { file: 'hooks.json', own: 'CLAUDE_PLUGIN_ROOT', foreign: 'PLUGIN_ROOT', host: 'Claude Code' },
    { file: 'codex-hooks.json', own: 'PLUGIN_ROOT', foreign: 'CLAUDE_PLUGIN_ROOT', host: 'Codex' },
  ];

  for (const { file, own, foreign, host } of cases) {
    const raw = fs.readFileSync(path.join(SRC, file), 'utf8');
    let parsed;
    assert.doesNotThrow(() => { parsed = JSON.parse(raw); }, `${file} is not valid JSON`);
    assert.ok(parsed.hooks?.SessionStart, `${file}: no SessionStart hook — ${host} would not get the routing rule`);
    assert.ok(raw.includes('${' + own + '}'), `${file}: does not reference \${${own}}`);

    // CLAUDE_PLUGIN_ROOT contains PLUGIN_ROOT as a substring, so match the
    // exact `${VAR}` form rather than testing for the bare name.
    if (foreign === 'CLAUDE_PLUGIN_ROOT') {
      assert.ok(!raw.includes('${CLAUDE_PLUGIN_ROOT}'), `${file}: runs under ${host} — use \${PLUGIN_ROOT}`);
    } else {
      assert.ok(
        !/(?<!CLAUDE_)\$\{PLUGIN_ROOT\}/.test(raw),
        `${file}: runs under ${host} — use \${CLAUDE_PLUGIN_ROOT}`,
      );
    }
  }
});

test('the Codex manifest keeps plan-review\'s Stop hook alongside the routing hook', () => {
  // The Stop hook predates this dir being sourced; bringing it under sync must
  // not have dropped it (95425c8, 2a675cf).
  const codex = JSON.parse(fs.readFileSync(path.join(SRC, 'codex-hooks.json'), 'utf8'));
  const stop = JSON.stringify(codex.hooks?.Stop ?? null);
  assert.match(stop, /annotate-server\.js/, 'plan-review Codex Stop hook is missing from codex-hooks.json');
});

test('session-start emits the routing payload in each host\'s wire format', () => {
  const script = path.join(SRC, 'session-start.mjs');
  const payload = fs.readFileSync(path.join(SRC, 'routing.md'), 'utf8').trim();
  assert.match(payload, /^<EXTREMELY_IMPORTANT>/, 'routing.md must open with the emphasis tag');
  assert.match(payload, /\/condux:workflow/, 'routing.md must name the skill it routes to');

  // Claude Code: a JSON envelope. Parsing it here is the point — a shell-escaped
  // version of this hook is exactly where quoting bugs hide.
  const claude = execFileSync(process.execPath, [script, '--claude'], { encoding: 'utf8' });
  const parsed = JSON.parse(claude);
  assert.equal(parsed.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(parsed.hookSpecificOutput.additionalContext, payload);

  // Codex: raw stdout.
  const codex = execFileSync(process.execPath, [script, '--codex'], { encoding: 'utf8' });
  assert.equal(codex.trim(), payload);
  assert.doesNotMatch(codex, /hookSpecificOutput/, 'Codex output must not be wrapped in the Claude envelope');
});

test('session-start fails open when its payload is unreadable', () => {
  // A hook that breaks every session start is worse than one that does nothing;
  // the skill catalog still routes correctly most of the time without it.
  const scratch = fs.mkdtempSync(path.join(REPO_ROOT, 'node_modules', '.hooktest-'));
  try {
    const script = path.join(scratch, 'session-start.mjs');
    fs.copyFileSync(path.join(SRC, 'session-start.mjs'), script); // no routing.md beside it
    const out = execFileSync(process.execPath, [script, '--claude'], { encoding: 'utf8' });
    assert.equal(out.trim(), '', 'expected no output when the payload is missing');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
