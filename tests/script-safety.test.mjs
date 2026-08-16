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

// --- condux's install front door -------------------------------------------
// It composes two position-dependent sub-installers and edits two config files
// it does not own, so the things worth guarding are: it writes nothing under
// --dry-run, it refuses configs it cannot parse, it is re-runnable, and
// --uninstall leaves shared state alone.
const CONDUX_INSTALLER = path.resolve(__dirname, '../plugins/condux/install.mjs');

function installerSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-condux-install-'));
  const dirs = {
    root,
    home: path.join(root, 'home'),
    codex: path.join(root, 'codex'),
    config: path.join(root, 'config'),
  };
  fs.mkdirSync(dirs.home, { recursive: true });
  fs.mkdirSync(dirs.codex, { recursive: true });
  fs.mkdirSync(path.join(dirs.config, 'opencode'), { recursive: true });

  return dirs;
}

function runInstaller(sandbox, args = []) {
  return spawnSync(process.execPath, [CONDUX_INSTALLER, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: sandbox.home,
      CODEX_HOME: sandbox.codex,
      XDG_CONFIG_HOME: sandbox.config,
    },
  });
}

test('condux installer --dry-run writes nothing at all', () => {
  const sandbox = installerSandbox();
  try {
    const result = runInstaller(sandbox, ['--dry-run']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /dry run — nothing was written/);
    // The hook installer has no --dry-run of its own, so the only safe thing to
    // do with it under one is not to run it.
    assert.match(result.stdout, /would run .*install-codex-hook\.sh/);
    assert.deepEqual(fs.readdirSync(sandbox.codex), []);
    assert.deepEqual(fs.readdirSync(path.join(sandbox.config, 'opencode')), []);
  } finally {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  }
});

test('condux installer is re-runnable without duplicating anything', () => {
  const sandbox = installerSandbox();
  try {
    assert.equal(runInstaller(sandbox).status, 0);
    assert.equal(runInstaller(sandbox).status, 0);

    const config = fs.readFileSync(path.join(sandbox.codex, 'config.toml'), 'utf8');
    assert.equal(config.match(/^\[features\]/gm).length, 1, '[features] must not accumulate');
    assert.equal(config.match(/hooks = true/g).length, 1, 'the flag must not accumulate');

    const hooks = JSON.parse(fs.readFileSync(path.join(sandbox.codex, 'hooks.json'), 'utf8'));
    assert.equal(hooks.hooks.Stop.length, 1, 'the Stop hook must not accumulate');

    const opencode = JSON.parse(fs.readFileSync(path.join(sandbox.config, 'opencode', 'opencode.json'), 'utf8'));
    assert.deepEqual(opencode.plugin, ['@jabworks/condux']);
  } finally {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  }
});

test('condux installer refuses a config it cannot parse instead of overwriting it', () => {
  const sandbox = installerSandbox();
  try {
    const opencode = path.join(sandbox.config, 'opencode', 'opencode.json');
    fs.writeFileSync(opencode, '{ not json');
    const bad = runInstaller(sandbox, ['--host', 'opencode']);

    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /does not parse/);
    assert.equal(fs.readFileSync(opencode, 'utf8'), '{ not json', 'the user file must survive');

    // Two [features] tables is invalid TOML; resolving it is a human's call.
    fs.writeFileSync(path.join(sandbox.codex, 'config.toml'), '[features]\nhooks = false\n\n[features]\n');
    const dupe = runInstaller(sandbox, ['--host', 'codex']);

    assert.equal(dupe.status, 1);
    assert.match(dupe.stdout, /\[features\] more than once/);
  } finally {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  }
});

test('condux installer --uninstall leaves the shared hooks flag set', () => {
  const sandbox = installerSandbox();
  try {
    const opencode = path.join(sandbox.config, 'opencode', 'opencode.json');
    fs.writeFileSync(opencode, JSON.stringify({ plugin: ['@jabworks/condux', '@other/keep'] }, null, 2));
    runInstaller(sandbox);

    const result = runInstaller(sandbox, ['--uninstall']);
    assert.equal(result.status, 0);

    // concord and plan-review ride the same flag — clearing it on condux's way
    // out would break them. The report must say so by name: a user who reads
    // "still set" without being told who else needs it cannot tell a correct
    // result from an incomplete uninstall, and will clear it by hand.
    assert.match(fs.readFileSync(path.join(sandbox.codex, 'config.toml'), 'utf8'), /hooks = true/);
    assert.match(result.stdout, /concord and plan-review/);

    const after = JSON.parse(fs.readFileSync(opencode, 'utf8'));
    assert.deepEqual(after.plugin, ['@other/keep'], 'only condux may be removed');
  } finally {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  }
});

// --- sync.sh's copy status --------------------------------------------------
// sync_skill runs inside an `if`, which disables errexit for everything it
// calls. copy_dir therefore has to propagate the copy's status by hand, or a
// genuine failure is counted as a success: a code-11 rsync once printed
// `36 synced, 0 skipped, 0 failed` and only node --test caught the empty
// plugin afterwards (docket #31).
//
// The failure is injected with a stub rsync on PATH, and the whole run happens
// against a throwaway copy of the repo. Both halves matter: a stub alone does
// not neuter sync_plugin_files (it uses cp) or the four generators, so a run
// started from a mid-edit working tree would write a *partial* sync into the
// real dist/ as a test side effect.
//
// It has to be the argument-less full run: the single-skill path calls
// sync_skill as a plain command, where errexit already aborts on its own. The
// counting loop is the only place the status was dropped, so it is the only
// place this regresses.
const REPO = path.resolve(__dirname, '..');

function cloneRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-sync-repo-'));
  fs.cpSync(REPO, root, {
    recursive: true,
    filter: (src) => !/(^|\/)(\.git|node_modules)$/.test(src),
  });
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}

test('sync.sh counts a failed copy instead of reporting 0 failed', () => {
  const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-sync-rsync-'));
  const repo = cloneRepo();
  try {
    const stub = path.join(stubDir, 'rsync');
    fs.writeFileSync(stub, '#!/usr/bin/env bash\necho "rsync: stub failure" >&2\nexit 11\n');
    fs.chmodSync(stub, 0o755);

    const result = spawnSync('bash', [path.join(repo, 'scripts/sync.sh')], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${stubDir}${path.delimiter}${process.env.PATH}` },
    });

    assert.notEqual(result.status, 0, 'a failed copy must fail the run');
    assert.match(result.stderr, /copy failed/);
    assert.match(
      result.stdout,
      /done — 0 synced, 0 skipped, \d+ failed/,
      'the summary must count the failure, not report 0 failed',
    );
  } finally {
    fs.rmSync(stubDir, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
