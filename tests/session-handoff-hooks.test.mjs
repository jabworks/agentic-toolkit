import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const SRC = path.join(REPO_ROOT, 'skills', 'session-handoff', 'hooks');

// The dist mirror of this dir is declared in composition.json and guarded by
// tests/composition.test.mjs; what lives here is the behavior of the nudge
// itself. The nudge is the suppressed-class countermeasure from
// specs/trigger-reliability/ (D2): conditional, directive-only, fail-open.

test('each host hook manifest is valid JSON and uses only its own root variable', () => {
  const cases = [
    { file: 'hooks.json', own: 'CLAUDE_PLUGIN_ROOT', host: 'Claude Code' },
    { file: 'codex-hooks.json', own: 'PLUGIN_ROOT', host: 'Codex' },
  ];

  for (const { file, own, host } of cases) {
    const raw = fs.readFileSync(path.join(SRC, file), 'utf8');
    let parsed;
    assert.doesNotThrow(() => { parsed = JSON.parse(raw); }, `${file} is not valid JSON`);
    assert.ok(parsed.hooks?.SessionStart, `${file}: no SessionStart hook — ${host} would not get the nudge`);
    assert.ok(raw.includes('${' + own + '}'), `${file}: does not reference \${${own}}`);

    if (own === 'PLUGIN_ROOT') {
      assert.ok(!raw.includes('${CLAUDE_PLUGIN_ROOT}'), `${file}: runs under ${host} — use \${PLUGIN_ROOT}`);
    } else {
      assert.ok(
        !/(?<!CLAUDE_)\$\{PLUGIN_ROOT\}/.test(raw),
        `${file}: runs under ${host} — use \${CLAUDE_PLUGIN_ROOT}`,
      );
    }
  }
});

test('the nudge payload is a directive, not content', () => {
  // A nudge that carries handoff content recreates the suppression it exists
  // to counter (specs/trigger-reliability/quirks.md Q3). Keep it small and
  // pointed at the skill.
  const payload = fs.readFileSync(path.join(SRC, 'nudge.md'), 'utf8').trim();
  assert.match(payload, /session-handoff/, 'nudge.md must name the skill it routes to');
  assert.match(payload, /resume/i, 'nudge.md must name the resume-shaped request class');
  assert.ok(payload.length < 700, `nudge.md is ${payload.length} chars — a directive, not a document`);
});

// Run the hook with a controlled cwd. The script keys its conditionality off
// the git root walked up from process.cwd().
function runHook(cwd, flag) {
  return execFileSync(process.execPath, [path.join(SRC, 'session-start.mjs'), flag], {
    encoding: 'utf8',
    cwd,
  });
}

function scratchRepo(withHandoff) {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, 'node_modules', '.shnudge-'));
  fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
  if (withHandoff) {
    fs.mkdirSync(path.join(dir, '.session-handoff'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.session-handoff', '2026-01-01-000000-x.md'), '# handoff\n');
  }
  return dir;
}

test('with a handoff on disk, session-start emits the nudge in each host wire format', () => {
  const payload = fs.readFileSync(path.join(SRC, 'nudge.md'), 'utf8').trim();
  const repo = scratchRepo(true);
  try {
    const claude = runHook(repo, '--claude');
    const parsed = JSON.parse(claude);
    assert.equal(parsed.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.equal(parsed.hookSpecificOutput.additionalContext, payload);

    const codex = runHook(repo, '--codex');
    assert.equal(codex.trim(), payload);
    assert.doesNotMatch(codex, /hookSpecificOutput/, 'Codex output must not be wrapped in the Claude envelope');
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('with no handoff on disk, session-start says nothing at all', () => {
  // The conditionality is the contract: an unconditional nudge is exactly the
  // toolkit-wide shouting the design rejected.
  const repo = scratchRepo(false);
  try {
    for (const flag of ['--claude', '--codex']) {
      assert.equal(runHook(repo, flag).trim(), '', `expected no output for ${flag} in a handoff-less repo`);
    }
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('a handoff-shaped file in the legacy handoffs/ dir also arms the nudge', () => {
  const repo = scratchRepo(false);
  try {
    fs.mkdirSync(path.join(repo, 'handoffs'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'handoffs', 'old.md'), '# handoff\n');
    const out = runHook(repo, '--codex');
    assert.notEqual(out.trim(), '', 'legacy handoffs/ must arm the nudge — resume checks both paths');
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('session-start fails open when its payload is unreadable', () => {
  // A hook that breaks every session start is worse than one that does nothing.
  const scratch = fs.mkdtempSync(path.join(REPO_ROOT, 'node_modules', '.shnudge-'));
  try {
    const script = path.join(scratch, 'session-start.mjs');
    fs.copyFileSync(path.join(SRC, 'session-start.mjs'), script); // no nudge.md beside it
    const repo = path.join(scratch, 'repo');
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
    fs.mkdirSync(path.join(repo, '.session-handoff'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.session-handoff', 'x.md'), 'h\n');
    const out = execFileSync(process.execPath, [script, '--claude'], { encoding: 'utf8', cwd: repo });
    assert.equal(out.trim(), '', 'expected no output when the payload is missing');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test('session-handoff ships Codex hooks and therefore no root Agent Plugins manifest', () => {
  // Q2: a root plugin.json flips Codex to the Agent Plugins loader, which has
  // no hooks support — the nudge would silently die on Codex (the 8688e5b
  // failure mode). agent-plugins.test.mjs guards this generically; this
  // assertion keeps the coupling visible next to the hook it protects.
  const codexManifest = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'dist', 'plugins', 'session-handoff', '.codex-plugin', 'plugin.json'), 'utf8'),
  );
  assert.ok(codexManifest.hooks, 'Codex manifest must declare hooks');
  assert.ok(
    !fs.existsSync(path.join(REPO_ROOT, 'dist', 'plugins', 'session-handoff', 'plugin.json')),
    'session-handoff must not ship a root plugin.json while it declares Codex hooks',
  );
});
