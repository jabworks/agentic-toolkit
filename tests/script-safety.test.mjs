import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCAFFOLD = path.resolve(__dirname, '../skills/technical-spec/references/scaffold.sh');
const AGENT_INSTALLER = path.resolve(__dirname, '../skills/subagent-execution/references/install-codex-agents.mjs');
const HOOK_INSTALLER = path.resolve(__dirname, '../skills/plan-review/references/install-codex-hook.sh');

test('technical-spec scaffold rejects feature names that escape specs/', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-scaffold-safety-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: repo });
    const result = spawnSync('bash', [SCAFFOLD, '../outside'], { cwd: repo, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /kebab-case slug/);
    assert.equal(fs.existsSync(path.join(repo, 'outside', 'index.md')), false);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('Codex agent installer dry-run does not create CODEX_HOME', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-agent-installer-'));
  const codexHome = path.join(parent, 'missing-home');
  try {
    execFileSync(process.execPath, [AGENT_INSTALLER, '--codex-home', codexHome, '--dry-run']);
    assert.equal(fs.existsSync(codexHome), false);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('Codex hook installer replaces hooks=false without duplicating the TOML key', () => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-hook-installer-'));
  try {
    const config = path.join(codexHome, 'config.toml');
    const hooks = path.join(codexHome, 'hooks.json');
    fs.writeFileSync(config, '[features]\nhooks = false\n\n[other]\nvalue = true\n');
    fs.writeFileSync(hooks, '{"hooks":{"Stop":[]}}\n');
    fs.chmodSync(config, 0o600);
    fs.chmodSync(hooks, 0o600);
    execFileSync('bash', [HOOK_INSTALLER], {
      env: { ...process.env, CODEX_HOME: codexHome },
    });

    const updated = fs.readFileSync(config, 'utf8');
    assert.equal((updated.match(/^hooks\s*=/gm) || []).length, 1);
    assert.match(updated, /^hooks = true$/m);
    assert.doesNotMatch(updated, /^hooks\s*=\s*false$/m);
    assert.ok(Array.isArray(JSON.parse(fs.readFileSync(hooks, 'utf8')).hooks.Stop));
    assert.equal(fs.statSync(config).mode & 0o777, 0o600);
    assert.equal(fs.statSync(hooks).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(codexHome, { recursive: true, force: true });
  }
});

test('Codex hook installer refuses to overwrite malformed hooks JSON', () => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-hook-invalid-'));
  try {
    const config = path.join(codexHome, 'config.toml');
    const hooks = path.join(codexHome, 'hooks.json');
    const originalConfig = '[features]\nhooks = false\n';
    fs.writeFileSync(config, originalConfig);
    fs.writeFileSync(hooks, '{ invalid json');
    const result = spawnSync('bash', [HOOK_INSTALLER], {
      env: { ...process.env, CODEX_HOME: codexHome },
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.equal(fs.readFileSync(config, 'utf8'), originalConfig);
    assert.equal(fs.readFileSync(hooks, 'utf8'), '{ invalid json');
  } finally {
    fs.rmSync(codexHome, { recursive: true, force: true });
  }
});

const CONCORD_HOOK_INSTALLER = path.resolve(__dirname, '../skills/remember/references/install-codex-hook.sh');

// The installer finds its own entries again by matching the command string. It
// used to match the substring "concord", which stopped appearing in the path
// once the skill was renamed to `remember` — so a reinstall duplicated every
// hook and --uninstall left them behind.
test('concord hook installer stays idempotent after the remember rename', () => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-concord-hooks-'));
  const events = ['SessionStart', 'UserPromptSubmit', 'SessionEnd'];
  const read = () => JSON.parse(fs.readFileSync(path.join(codexHome, 'hooks.json'), 'utf8')).hooks ?? {};
  try {
    const env = { ...process.env, CODEX_HOME: codexHome };
    execFileSync('bash', [CONCORD_HOOK_INSTALLER], { env });
    execFileSync('bash', [CONCORD_HOOK_INSTALLER], { env });

    const installed = read();
    for (const event of events) {
      assert.equal(installed[event]?.length, 1, `${event} must not accumulate duplicates`);
      assert.match(JSON.stringify(installed[event]), /remember\/bin\//);
    }

    execFileSync('bash', [CONCORD_HOOK_INSTALLER, '--uninstall'], { env });
    const removed = read();
    for (const event of events) {
      assert.equal(removed[event], undefined, `${event} must be gone after --uninstall`);
    }
  } finally {
    fs.rmSync(codexHome, { recursive: true, force: true });
  }
});
