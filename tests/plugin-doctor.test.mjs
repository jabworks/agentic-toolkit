import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DOCKET_SERVER = path.join(REPO_ROOT, 'skills', 'record', 'server');
const DOCKET_DOCTOR = path.join(REPO_ROOT, 'skills', 'docket-doctor', 'doctor.mjs');
const CONDUX_HOOKS = path.join(REPO_ROOT, 'skills', 'workflow', 'hooks');
const CONDUX_AGENTS = path.join(REPO_ROOT, 'skills', 'subagent-execution', 'agents');
const CONDUX_DOCTOR = path.join(REPO_ROOT, 'skills', 'condux-doctor', 'doctor.mjs');

// A doctor only means anything with its plugin around it, so fixtures mirror
// the marketplace layout rather than the source tree. Scratch lives inside the
// repo (same pattern as docket-cli) so every path stays on one filesystem.
function scratch() {
  return fs.mkdtempSync(path.join(REPO_ROOT, 'node_modules', '.doctortest-'));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

// Mirrors dist/plugins/docket: server/ at the plugin root AND inside the skill
// tree, because sync copies it to both and the doctor probes the documented
// (record-relative) copy first.
function docketFixture({ version = '0.2.0' } = {}) {
  const root = scratch();
  const plugin = path.join(root, 'plugin');
  const skill = path.join(plugin, 'skills', 'docket', 'docket-doctor');

  fs.mkdirSync(skill, { recursive: true });
  fs.cpSync(DOCKET_SERVER, path.join(plugin, 'server'), { recursive: true });
  fs.cpSync(DOCKET_SERVER, path.join(plugin, 'skills', 'docket', 'record', 'server'), { recursive: true });
  fs.copyFileSync(DOCKET_DOCTOR, path.join(skill, 'doctor.mjs'));

  writeJson(path.join(plugin, '.claude-plugin', 'plugin.json'), { name: 'docket', version });
  writeJson(path.join(plugin, '.mcp.json'), {
    mcpServers: { docket: { command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/server/mcp-server.mjs'] } },
  });

  const home = path.join(root, 'home');
  fs.mkdirSync(home, { recursive: true });

  return {
    root,
    plugin,
    home,
    doctor: path.join(skill, 'doctor.mjs'),
    server: path.join(plugin, 'server', 'mcp-server.mjs'),
  };
}

function host(fixture, name) {
  const dir = name === 'opencode'
    ? path.join(fixture.home, '.config', 'opencode')
    : path.join(fixture.home, `.${name}`);
  fs.mkdirSync(dir, { recursive: true });

  return dir;
}

function runDoctor(fixture, args = []) {
  const res = spawnSync(process.execPath, [fixture.doctor, ...args], {
    encoding: 'utf8',
    timeout: 30000,
    env: {
      ...process.env,
      HOME: fixture.home,
      XDG_CONFIG_HOME: path.join(fixture.home, '.config'),
      // concord's doctor honours CODEX_HOME; without pinning it, a machine
      // that exports one would pull the real Codex home into the fixture.
      CODEX_HOME: path.join(fixture.home, '.codex'),
    },
  });

  const rows = (res.stdout ?? '')
    .split('\n')
    .map((line) => line.match(/^(\S+)\s+(done|broken|absent|skipped)\s+(.*)$/))
    .filter(Boolean)
    .map(([, name, status, detail]) => ({ host: name, status, detail }));

  return { status: res.status, stdout: res.stdout ?? '', rows };
}

function rowFor(result, name) {
  return result.rows.find((row) => row.host === name);
}

// Content hash of a whole tree — the must-not-mutate assertion needs to catch a
// probe that rewrites a config as much as one that creates a file.
function fingerprint(dir) {
  const hash = crypto.createHash('sha256');

  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      hash.update(path.relative(dir, full));
      if (entry.isDirectory()) walk(full);
      else hash.update(fs.readFileSync(full));
    }
  };

  walk(dir);

  return hash.digest('hex');
}

test('every registration answers — all green, exit 0', () => {
  const fixture = docketFixture();
  try {
    host(fixture, 'claude');
    const result = runDoctor(fixture);

    assert.equal(rowFor(result, 'claude').status, 'done');
    assert.match(rowFor(result, 'claude').detail, /initialize round-trip answered/);
    assert.equal(result.status, 0);
  } finally {
    cleanup(fixture.root);
  }
});

test('a registration pointing at a missing server is broken, not absent', () => {
  const fixture = docketFixture();
  try {
    host(fixture, 'claude');
    writeJson(path.join(fixture.plugin, '.mcp.json'), {
      mcpServers: { docket: { command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/server/gone.mjs'] } },
    });

    const result = runDoctor(fixture);

    assert.equal(rowFor(result, 'claude').status, 'broken');
    assert.equal(result.status, 1, 'a broken probe must fail the run');
  } finally {
    cleanup(fixture.root);
  }
});

test('a host that is not installed is absent and does not fail the run', () => {
  const fixture = docketFixture();
  try {
    const result = runDoctor(fixture);

    for (const name of ['claude', 'codex', 'opencode']) {
      assert.equal(rowFor(result, name).status, 'absent', `${name} must be absent`);
    }
    assert.equal(result.status, 0, 'absent hosts are not failures');
  } finally {
    cleanup(fixture.root);
  }
});

test('the Codex table is read and the path it names is what gets verified', () => {
  const fixture = docketFixture();
  try {
    const codex = host(fixture, 'codex');
    const table = `[mcp_servers.docket]\ncommand = "node"\nargs = ${JSON.stringify([fixture.server])}\n`;
    fs.writeFileSync(path.join(codex, 'config.toml'), table);

    assert.equal(rowFor(runDoctor(fixture), 'codex').status, 'done');

    const stale = `[mcp_servers.docket]\ncommand = "node"\nargs = ["/nowhere/mcp-server.mjs"]\n`;
    fs.writeFileSync(path.join(codex, 'config.toml'), stale);
    const broken = runDoctor(fixture);

    assert.equal(rowFor(broken, 'codex').status, 'broken');
    assert.match(rowFor(broken, 'codex').detail, /registered path does not exist/);
  } finally {
    cleanup(fixture.root);
  }
});

test('an unregistered but installed host is absent, with the installer as its fix', () => {
  const fixture = docketFixture();
  try {
    host(fixture, 'codex');
    const result = runDoctor(fixture);

    assert.equal(rowFor(result, 'codex').status, 'absent');
    assert.match(rowFor(result, 'codex').detail, /fall back to the bundled CLI/);
    assert.match(result.stdout, /install\.sh/, 'the fix line must name the installer');
    assert.equal(result.status, 0);
  } finally {
    cleanup(fixture.root);
  }
});

test('a registered but disabled OpenCode key is broken', () => {
  const fixture = docketFixture();
  try {
    const opencode = host(fixture, 'opencode');
    writeJson(path.join(opencode, 'opencode.json'), {
      mcp: { docket: { type: 'local', command: ['node', fixture.server], enabled: false } },
    });

    const result = runDoctor(fixture);

    assert.equal(rowFor(result, 'opencode').status, 'broken');
    assert.match(rowFor(result, 'opencode').detail, /disabled/);
  } finally {
    cleanup(fixture.root);
  }
});

test('probes mutate nothing — not the plugin, not the host config', () => {
  const fixture = docketFixture();
  try {
    const codex = host(fixture, 'codex');
    host(fixture, 'claude');
    fs.writeFileSync(
      path.join(codex, 'config.toml'),
      `[mcp_servers.docket]\ncommand = "node"\nargs = ${JSON.stringify([fixture.server])}\n`,
    );

    const before = fingerprint(fixture.root);
    runDoctor(fixture);

    assert.equal(fingerprint(fixture.root), before, 'a run without --fix must be read-only');
  } finally {
    cleanup(fixture.root);
  }
});

test('--host narrows the report to one host and drops the shared probes', () => {
  const fixture = docketFixture();
  try {
    host(fixture, 'claude');
    host(fixture, 'codex');
    const result = runDoctor(fixture, ['--host', 'claude']);

    assert.deepEqual(result.rows.map((row) => row.host), ['claude']);
  } finally {
    cleanup(fixture.root);
  }
});

test('installed older than the marketplace clone is broken and names the update', () => {
  const fixture = docketFixture({ version: '0.1.0' });
  try {
    host(fixture, 'claude');
    const clone = path.join(fixture.home, '.claude', 'plugins', 'marketplaces', 'jabworks-agentic-toolkit');
    writeJson(path.join(clone, '.claude-plugin', 'marketplace.json'), {
      name: 'jabworks-agentic-toolkit',
      plugins: [{ name: 'docket', source: './dist/plugins/docket' }],
    });
    writeJson(path.join(clone, 'dist', 'plugins', 'docket', '.claude-plugin', 'plugin.json'), {
      name: 'docket',
      version: '0.9.0',
    });

    const result = runDoctor(fixture);
    const version = result.rows.filter((row) => row.host === 'all').pop();

    assert.equal(version.status, 'broken');
    assert.match(version.detail, /installed 0\.1\.0, marketplace offers 0\.9\.0/);
    assert.match(result.stdout, /plugin update docket/);
  } finally {
    cleanup(fixture.root);
  }
});

test('newer than the marketplace clone is fine and says so', () => {
  const fixture = docketFixture({ version: '9.9.9' });
  try {
    host(fixture, 'claude');
    const clone = path.join(fixture.home, '.claude', 'plugins', 'marketplaces', 'jabworks-agentic-toolkit');
    writeJson(path.join(clone, '.claude-plugin', 'marketplace.json'), {
      name: 'jabworks-agentic-toolkit',
      plugins: [{ name: 'docket', source: './dist/plugins/docket' }],
    });
    writeJson(path.join(clone, 'dist', 'plugins', 'docket', '.claude-plugin', 'plugin.json'), {
      name: 'docket',
      version: '0.9.0',
    });

    const version = runDoctor(fixture).rows.filter((row) => row.host === 'all').pop();

    assert.equal(version.status, 'done');
    assert.match(version.detail, /ahead of marketplace/);
  } finally {
    cleanup(fixture.root);
  }
});

// --- condux ----------------------------------------------------------------
// Mirrors dist/plugins/condux: hooks/ and agents/ are plugin-level (their own
// sync steps), the skills live one level down.
function conduxFixture({ version = '2.11.0' } = {}) {
  const root = scratch();
  const plugin = path.join(root, 'plugin');
  const skill = path.join(plugin, 'skills', 'condux', 'condux-doctor');
  const annotate = path.join(plugin, 'skills', 'condux', 'plan-review', 'references', 'annotate-server.js');

  fs.mkdirSync(skill, { recursive: true });
  fs.mkdirSync(path.dirname(annotate), { recursive: true });
  fs.cpSync(CONDUX_HOOKS, path.join(plugin, 'hooks'), { recursive: true });
  fs.cpSync(CONDUX_AGENTS, path.join(plugin, 'agents'), { recursive: true });
  fs.copyFileSync(CONDUX_DOCTOR, path.join(skill, 'doctor.mjs'));
  fs.writeFileSync(annotate, '// stub for the Stop hook target\n');
  writeJson(path.join(plugin, '.claude-plugin', 'plugin.json'), { name: 'condux', version });

  const home = path.join(root, 'home');
  fs.mkdirSync(home, { recursive: true });

  return { root, plugin, home, doctor: path.join(skill, 'doctor.mjs') };
}

test('condux: both hook manifests run and emit their host wire format', () => {
  const fixture = conduxFixture();
  try {
    host(fixture, 'claude');
    host(fixture, 'codex');
    const result = runDoctor(fixture);

    assert.equal(rowFor(result, 'claude').status, 'done');
    assert.match(rowFor(result, 'claude').detail, /valid envelope/);
    assert.equal(rowFor(result, 'codex').status, 'done');
    assert.match(rowFor(result, 'codex').detail, /Stop hook resolves/);
    assert.equal(result.status, 0);
  } finally {
    cleanup(fixture.root);
  }
});

test('condux: a hook failing open is broken, which no static check would catch', () => {
  const fixture = conduxFixture();
  try {
    host(fixture, 'claude');
    // The manifest still parses and the script still exits 0 — only its output
    // shows the routing payload is gone.
    fs.writeFileSync(path.join(fixture.plugin, 'hooks', 'routing.md'), '');

    const result = runDoctor(fixture, ['--host', 'claude']);

    assert.equal(rowFor(result, 'claude').status, 'broken');
    assert.match(rowFor(result, 'claude').detail, /failing open/);
    assert.equal(result.status, 1);
  } finally {
    cleanup(fixture.root);
  }
});

test('condux: a manifest using the other host root variable is broken', () => {
  const fixture = conduxFixture();
  try {
    host(fixture, 'claude');
    const manifest = path.join(fixture.plugin, 'hooks', 'hooks.json');
    fs.writeFileSync(manifest, fs.readFileSync(manifest, 'utf8').replaceAll('${CLAUDE_PLUGIN_ROOT}', '${PLUGIN_ROOT}'));

    const result = runDoctor(fixture, ['--host', 'claude']);

    assert.equal(rowFor(result, 'claude').status, 'broken');
    assert.match(rowFor(result, 'claude').detail, /never expands/);
  } finally {
    cleanup(fixture.root);
  }
});

test('condux: a resolvable SessionStart with a dangling Stop target still fails Codex', () => {
  const fixture = conduxFixture();
  try {
    host(fixture, 'claude');
    host(fixture, 'codex');
    fs.rmSync(path.join(fixture.plugin, 'skills', 'condux', 'plan-review'), { recursive: true, force: true });

    const result = runDoctor(fixture);

    assert.equal(rowFor(result, 'claude').status, 'done', 'Claude Code has no Stop hook to break');
    assert.equal(rowFor(result, 'codex').status, 'broken');
    assert.match(rowFor(result, 'codex').detail, /annotate-server\.js/);
  } finally {
    cleanup(fixture.root);
  }
});

test('condux: a missing specialist agent is reported — that mirror has drifted before', () => {
  const fixture = conduxFixture();
  try {
    host(fixture, 'claude');
    fs.rmSync(path.join(fixture.plugin, 'agents', 'explorer.md'));

    const result = runDoctor(fixture);
    const agents = result.rows.filter((row) => row.host === 'all')[0];

    assert.equal(agents.status, 'broken');
    assert.match(agents.detail, /explorer/);
  } finally {
    cleanup(fixture.root);
  }
});

test('condux: registered on OpenCode with no local copy is absent, not broken', () => {
  const fixture = conduxFixture();
  try {
    const opencode = host(fixture, 'opencode');
    writeJson(path.join(opencode, 'opencode.json'), { plugin: ['@jabworks/condux'] });

    const result = runDoctor(fixture, ['--host', 'opencode']);

    assert.equal(rowFor(result, 'opencode').status, 'absent');
    assert.match(rowFor(result, 'opencode').detail, /fetches plugins at startup/);
    assert.equal(result.status, 0);
  } finally {
    cleanup(fixture.root);
  }
});

test('condux: an installed package missing its bundled skills is broken', () => {
  const fixture = conduxFixture();
  try {
    const opencode = host(fixture, 'opencode');
    writeJson(path.join(opencode, 'opencode.json'), { plugin: ['@jabworks/condux'] });

    const pkg = path.join(opencode, 'node_modules', '@jabworks', 'condux');
    fs.mkdirSync(path.join(pkg, 'agents'), { recursive: true });
    fs.writeFileSync(path.join(pkg, 'agents', 'coder.md'), '---\n---\n');
    fs.writeFileSync(path.join(pkg, 'index.js'), 'export const ConduxPlugin = async () => ({});\n');

    const result = runDoctor(fixture, ['--host', 'opencode']);

    assert.equal(rowFor(result, 'opencode').status, 'broken');
    assert.match(rowFor(result, 'opencode').detail, /ships no skills\//);
  } finally {
    cleanup(fixture.root);
  }
});

test('condux: probes mutate nothing', () => {
  const fixture = conduxFixture();
  try {
    host(fixture, 'claude');
    host(fixture, 'codex');
    const before = fingerprint(fixture.root);
    runDoctor(fixture);

    assert.equal(fingerprint(fixture.root), before, 'a condux run must be read-only');
  } finally {
    cleanup(fixture.root);
  }
});

// --- concord ---------------------------------------------------------------
const CONCORD_SKILL = path.join(REPO_ROOT, 'skills', 'remember');
const CONCORD_DOCTOR = path.join(REPO_ROOT, 'skills', 'concord-doctor', 'doctor.mjs');

function concordFixture({ version = '0.3.0', manifestHooks = false } = {}) {
  const root = scratch();
  const plugin = path.join(root, 'plugin');
  const skill = path.join(plugin, 'skills', 'concord', 'concord-doctor');

  fs.mkdirSync(skill, { recursive: true });
  fs.cpSync(CONCORD_SKILL, path.join(plugin, 'skills', 'concord', 'remember'), { recursive: true });
  fs.copyFileSync(CONCORD_DOCTOR, path.join(skill, 'doctor.mjs'));
  writeJson(path.join(plugin, '.claude-plugin', 'plugin.json'), { name: 'concord', version });
  writeJson(path.join(plugin, '.codex-plugin', 'plugin.json'), {
    name: 'concord',
    version,
    ...(manifestHooks ? { hooks: './skills/concord/remember/hooks/codex-hooks.json' } : {}),
  });

  const home = path.join(root, 'home');
  fs.mkdirSync(home, { recursive: true });

  return {
    root,
    plugin,
    home,
    doctor: path.join(skill, 'doctor.mjs'),
    bin: path.join(plugin, 'skills', 'concord', 'remember', 'bin'),
  };
}

// The installer writes absolute command paths into <CODEX_HOME>/hooks.json.
function installHooks(codex, bin, { events = ['SessionStart', 'UserPromptSubmit', 'SessionEnd'] } = {}) {
  const command = {
    SessionStart: `"node" "${path.join(bin, 'recall.mjs')}"`,
    UserPromptSubmit: `"node" "${path.join(bin, 'capture.mjs')}" --prompt`,
    SessionEnd: `"node" "${path.join(bin, 'capture.mjs')}" --session-end`,
  };
  const hooks = {};
  for (const event of events) hooks[event] = [{ hooks: [{ type: 'command', command: command[event] }] }];

  writeJson(path.join(codex, 'hooks.json'), { hooks });
  fs.writeFileSync(path.join(codex, 'config.toml'), '[features]\nhooks = true\n');
}

test('concord: installer-wired hooks with resolvable paths are healthy', () => {
  const fixture = concordFixture();
  try {
    const codex = host(fixture, 'codex');
    installHooks(codex, fixture.bin);
    const result = runDoctor(fixture);

    assert.equal(rowFor(result, 'codex').status, 'done');
    assert.equal(result.status, 0);
  } finally {
    cleanup(fixture.root);
  }
});

test('concord: Claude Code and OpenCode are skipped, not absent, when installed', () => {
  const fixture = concordFixture();
  try {
    host(fixture, 'claude');
    host(fixture, 'opencode');
    const result = runDoctor(fixture);

    assert.equal(rowFor(result, 'claude').status, 'skipped');
    assert.equal(rowFor(result, 'opencode').status, 'skipped');
    assert.match(rowFor(result, 'claude').detail, /Codex-only/);
    assert.equal(result.status, 0);
  } finally {
    cleanup(fixture.root);
  }
});

test('concord: a registration pointing into a moved install is broken', () => {
  const fixture = concordFixture();
  try {
    const codex = host(fixture, 'codex');
    installHooks(codex, path.join(fixture.root, 'old-version', 'bin'));
    const result = runDoctor(fixture, ['--host', 'codex']);

    assert.equal(rowFor(result, 'codex').status, 'broken');
    assert.match(rowFor(result, 'codex').detail, /no longer exists/);
    assert.equal(result.status, 1);
  } finally {
    cleanup(fixture.root);
  }
});

test('concord: partial registration is broken — exactly-once capture needs all three', () => {
  const fixture = concordFixture();
  try {
    const codex = host(fixture, 'codex');
    installHooks(codex, fixture.bin, { events: ['SessionStart'] });
    const result = runDoctor(fixture, ['--host', 'codex']);

    assert.equal(rowFor(result, 'codex').status, 'broken');
    assert.match(rowFor(result, 'codex').detail, /missing UserPromptSubmit, SessionEnd/);
  } finally {
    cleanup(fixture.root);
  }
});

test('concord: registered hooks with the feature switched off are broken', () => {
  const fixture = concordFixture();
  try {
    const codex = host(fixture, 'codex');
    installHooks(codex, fixture.bin);
    fs.writeFileSync(path.join(codex, 'config.toml'), '[features]\nhooks = false\n');
    const result = runDoctor(fixture, ['--host', 'codex']);

    assert.equal(rowFor(result, 'codex').status, 'broken');
    assert.match(rowFor(result, 'codex').detail, /hooks feature is off/);
  } finally {
    cleanup(fixture.root);
  }
});

test('concord: a plugin-manifest install needs no hooks.json', () => {
  const fixture = concordFixture({ manifestHooks: true });
  try {
    host(fixture, 'codex');
    const result = runDoctor(fixture, ['--host', 'codex']);

    assert.equal(rowFor(result, 'codex').status, 'done');
    assert.match(rowFor(result, 'codex').detail, /registered by the plugin manifest/);
  } finally {
    cleanup(fixture.root);
  }
});

test('concord: probes never touch the memory store', () => {
  const fixture = concordFixture();
  try {
    const codex = host(fixture, 'codex');
    installHooks(codex, fixture.bin);
    const store = path.join(codex, 'concord', 'global');
    fs.mkdirSync(store, { recursive: true });
    fs.writeFileSync(path.join(store, 'notes.md'), '# pinned\n');

    const before = fingerprint(fixture.root);
    const result = runDoctor(fixture);

    assert.equal(fingerprint(fixture.root), before, 'no hook may run — both of them write');
    assert.match(result.stdout, /neither hook is executed/);
  } finally {
    cleanup(fixture.root);
  }
});

test('a hanging server is broken within the probe timeout, not a hung doctor', () => {
  const fixture = docketFixture();
  try {
    host(fixture, 'claude');
    // Never answers, never exits — the shape a wedged MCP server takes.
    const hang = path.join(fixture.plugin, 'server', 'hang.mjs');
    fs.writeFileSync(hang, 'setInterval(() => {}, 1000);\n');
    writeJson(path.join(fixture.plugin, '.mcp.json'), {
      mcpServers: { docket: { command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/server/hang.mjs'] } },
    });

    const started = process.hrtime.bigint();
    const result = runDoctor(fixture, ['--host', 'claude']);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    assert.equal(rowFor(result, 'claude').status, 'broken');
    assert.match(rowFor(result, 'claude').detail, /no answer within/);
    assert.ok(elapsedMs < 20000, `the doctor must not hang with the server (took ${Math.round(elapsedMs)}ms)`);
  } finally {
    cleanup(fixture.root);
  }
});
