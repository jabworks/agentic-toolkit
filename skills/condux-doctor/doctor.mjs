#!/usr/bin/env node
// condux's health check — "is condux actually working on this host?"
//
// Follows the toolkit health-check convention (toolkit-skill-standards):
// detect → probe → report → fix. Probes are static parse PLUS execution, and
// condux is the case that needs it — session-start.mjs fails open by design,
// so a hook whose payload has gone missing exits 0 and says nothing. Static
// checks call that healthy; running it does not.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SKILL_BASE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(SKILL_BASE, '..', '..', '..');
const HOME = os.homedir();
const EXEC_TIMEOUT = 5000;
const PACKAGE = '@jabworks/condux';

const USAGE = `usage: doctor [options]

  --host <claude|codex|opencode>   probe one host only
  --quiet                          print only broken and absent rows
  --fix                            run condux's installer, then re-probe
`;

function parseFlags(argv) {
  const flags = {};

  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];

    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }

  return flags;
}

function firstExisting(candidates) {
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) ?? null;
}

// The hooks directory is plugin-level in an install and skill-level in the
// source tree (workflow owns the canonical copy), so search both.
function findHook(file) {
  return firstExisting([
    path.join(PLUGIN_ROOT, 'hooks', file),
    path.join(SKILL_BASE, '..', 'workflow', 'hooks', file),
  ]);
}

function detectHosts() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(HOME, '.config');
  const dirs = {
    claude: path.join(HOME, '.claude'),
    // CODEX_HOME is honoured by both sub-installers and by install.mjs. Without
    // it here, the installer's verify beat would probe a different directory
    // than the one it just wrote to, and report a pass for the wrong config.
    codex: process.env.CODEX_HOME || path.join(HOME, '.codex'),
    opencode: path.join(configHome, 'opencode'),
  };

  return Object.fromEntries(
    Object.entries(dirs).map(([host, dir]) => [host, fs.existsSync(dir) ? dir : null]),
  );
}

function readJson(file) {
  try {
    return { value: JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (err) {
    return { error: String(err?.message ?? err) };
  }
}

// Pulls the first hook command for an event out of either host's manifest —
// the two dialects differ only in the root variable they interpolate.
function hookCommand(manifest, event) {
  const entries = manifest?.hooks?.[event] ?? [];

  for (const entry of entries) {
    for (const hook of entry.hooks ?? []) {
      if (typeof hook.command === 'string') return hook.command;
    }
  }

  return null;
}

function resolveCommandPath(command, rootVariable) {
  const match = command.match(/"([^"]+)"/);
  const raw = match ? match[1] : command.split(/\s+/).slice(1)[0] ?? '';

  return raw.replace(rootVariable, PLUGIN_ROOT);
}

function runSessionStart(script, hostFlag) {
  const res = spawnSync(process.execPath, [script, hostFlag], {
    timeout: EXEC_TIMEOUT,
    encoding: 'utf8',
  });

  if (res.error) {
    const why = res.error.code === 'ETIMEDOUT' ? 'no answer within 5s' : String(res.error.message);

    return { ok: false, why };
  }

  const stdout = (res.stdout ?? '').trim();
  if (stdout === '') {
    // The documented fail-open path: routing.md missing or empty. Harmless to
    // the session and invisible without this probe.
    return { ok: false, why: 'hook produced no output — it is failing open, so routing.md is missing or empty' };
  }

  if (hostFlag === '--codex') {
    return stdout.includes('/condux:workflow')
      ? { ok: true, why: 'SessionStart emits the routing payload' }
      : { ok: false, why: 'hook output does not carry the routing rule' };
  }

  try {
    const payload = JSON.parse(stdout);
    const context = payload?.hookSpecificOutput?.additionalContext ?? '';

    if (payload?.hookSpecificOutput?.hookEventName !== 'SessionStart') {
      return { ok: false, why: 'hook output is JSON but not a SessionStart envelope' };
    }

    return context.trim() === ''
      ? { ok: false, why: 'SessionStart envelope carries an empty context' }
      : { ok: true, why: 'SessionStart emits a valid envelope with the routing payload' };
  } catch {
    return { ok: false, why: 'hook output is not the JSON envelope Claude Code expects' };
  }
}

// Hooks are registered by the plugin manifest, so outside a plugin install
// there is nothing registered to probe — and the root variables the manifest
// interpolates have no meaning there either.
const IS_PLUGIN = fs.existsSync(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'));

function probeHookManifest(host, { file, event, rootVariable, foreignVariable, hostFlag }) {
  if (!IS_PLUGIN) {
    return { host, status: 'absent', detail: 'not a plugin install — this tree registers no hooks' };
  }

  const manifest = findHook(file);
  if (!manifest) {
    return { host, status: 'absent', detail: `not a plugin install — no hooks/${file}` };
  }

  const { value, error } = readJson(manifest);
  if (error) {
    return { host, status: 'broken', detail: `${file} is unparseable: ${error}`, fix: 'reinstall the plugin' };
  }

  const command = hookCommand(value, event);
  if (!command) return { host, status: 'broken', detail: `${file} declares no ${event} hook`, fix: 'reinstall the plugin' };

  if (command.includes(foreignVariable)) {
    return {
      host,
      status: 'broken',
      detail: `${event} uses ${foreignVariable}, which this host never expands`,
      fix: `the manifest must use ${rootVariable} — reinstall the plugin`,
    };
  }

  const script = resolveCommandPath(command, rootVariable);
  if (!fs.existsSync(script)) {
    return { host, status: 'broken', detail: `${event} points at a missing script: ${script}`, fix: 'reinstall the plugin' };
  }

  const verdict = runSessionStart(script, hostFlag);

  return verdict.ok
    ? { host, status: 'done', detail: verdict.why }
    : { host, status: 'broken', detail: verdict.why, fix: 'reinstall the plugin — its routing payload did not ship' };
}

function probeClaude(hosts) {
  if (!hosts.claude) return { host: 'claude', status: 'absent', detail: 'no ~/.claude on this machine' };

  return probeHookManifest('claude', {
    file: 'hooks.json',
    event: 'SessionStart',
    rootVariable: '${CLAUDE_PLUGIN_ROOT}',
    foreignVariable: '${PLUGIN_ROOT}',
    hostFlag: '--claude',
  });
}

// Codex's hook support sits behind an experimental feature flag. A plugin
// manifest can declare hooks; nothing in a plugin can enable them. With the
// flag off, the manifest parses, every path resolves, and no hook fires — which
// this doctor scored `done` until docket #9. It is the static-parse blind spot
// the probe-depth decision names, applied to an input rather than to a path.
//
// The claim is narrow on purpose: the flag is set. Nothing on disk records
// whether Codex has restarted since, and a running Codex does not re-read it.
function probeCodexFeatureFlag(codexHome) {
  const config = path.join(codexHome, 'config.toml');
  const fix = `run condux's install.mjs, or add [features] hooks = true to ${config}`;

  if (!fs.existsSync(config)) {
    return { host: 'codex', status: 'broken', detail: 'no config.toml — the hooks feature is not enabled', fix };
  }

  let text = '';
  try {
    text = fs.readFileSync(config, 'utf8');
  } catch (err) {
    return { host: 'codex', status: 'broken', detail: `cannot read config.toml: ${err.message}`, fix };
  }

  const lines = text.split('\n');
  const start = lines.findIndex((line) => /^\s*\[features\]\s*(#.*)?$/.test(line));
  if (start === -1) {
    return { host: 'codex', status: 'broken', detail: 'config.toml declares no [features] table — hooks cannot fire', fix };
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const enabled = lines.slice(start + 1, end).some((line) => /^\s*hooks\s*=\s*true\s*(#.*)?$/.test(line));

  return enabled
    ? null
    : { host: 'codex', status: 'broken', detail: 'features.hooks is not true — the manifest resolves but no hook fires', fix };
}

function probeCodex(hosts) {
  if (!hosts.codex) return { host: 'codex', status: 'absent', detail: 'no ~/.codex on this machine' };

  // Runs first: with the flag off, how well the manifest parses is moot.
  const flag = probeCodexFeatureFlag(hosts.codex);
  if (flag) return flag;

  const row = probeHookManifest('codex', {
    file: 'codex-hooks.json',
    event: 'SessionStart',
    rootVariable: '${PLUGIN_ROOT}',
    foreignVariable: '${CLAUDE_PLUGIN_ROOT}',
    hostFlag: '--codex',
  });

  if (row.status !== 'done') return row;

  // plan-review's Stop hook blocks a turn for up to four days waiting on a
  // human, so it is resolved and never executed.
  const manifest = findHook('codex-hooks.json');
  const stop = hookCommand(readJson(manifest).value, 'Stop');
  if (!stop) return { ...row, detail: `${row.detail}; no Stop hook for plan-review` };

  const server = resolveCommandPath(stop, '${PLUGIN_ROOT}');

  return fs.existsSync(server)
    ? { ...row, detail: `${row.detail}; plan-review Stop hook resolves` }
    : {
        host: 'codex',
        status: 'broken',
        detail: `SessionStart is fine but the Stop hook points at a missing annotate-server.js: ${server}`,
        fix: 'reinstall the plugin',
      };
}

function findPackage(configDir) {
  return firstExisting([
    path.join(configDir, 'node_modules', ...PACKAGE.split('/')),
    path.join(HOME, '.local', 'share', 'opencode', 'node_modules', ...PACKAGE.split('/')),
    path.join(HOME, '.cache', 'opencode', 'node_modules', ...PACKAGE.split('/')),
  ]);
}

function probeOpencode(hosts) {
  if (!hosts.opencode) return { host: 'opencode', status: 'absent', detail: 'no opencode config dir on this machine' };

  const config = path.join(hosts.opencode, 'opencode.json');
  const fix = `add ${PACKAGE} to the plugin array in ${config}`;
  if (!fs.existsSync(config)) return { host: 'opencode', status: 'absent', detail: 'no opencode.json — condux is not registered', fix };

  const { value, error } = readJson(config);
  if (error) return { host: 'opencode', status: 'broken', detail: `opencode.json is unparseable: ${error}`, fix };

  const registered = (value?.plugin ?? []).some((entry) => String(entry).startsWith(PACKAGE));
  if (!registered) return { host: 'opencode', status: 'absent', detail: `${PACKAGE} is not in the plugin array`, fix };

  const pkg = findPackage(hosts.opencode);
  if (!pkg) {
    return {
      host: 'opencode',
      status: 'absent',
      detail: 'registered, but no local copy to verify — OpenCode fetches plugins at startup',
    };
  }

  for (const dir of ['agents', 'skills']) {
    const bundled = path.join(pkg, dir);
    if (!fs.existsSync(bundled) || fs.readdirSync(bundled).length === 0) {
      return { host: 'opencode', status: 'broken', detail: `the installed package ships no ${dir}/`, fix: `reinstall ${PACKAGE}` };
    }
  }

  const check = spawnSync(process.execPath, ['--check', path.join(pkg, 'index.js')], { timeout: EXEC_TIMEOUT, encoding: 'utf8' });
  if (check.status !== 0) {
    return { host: 'opencode', status: 'broken', detail: 'the installed package entry point does not parse', fix: `reinstall ${PACKAGE}` };
  }

  return { host: 'opencode', status: 'done', detail: 'registered, and the installed package ships its agents and skills' };
}

// The four specialist agents are plugin-level and reached by their own sync
// step, not by the skill copy — the mirror that drifted in 6ba6572.
function probeAgents() {
  const dir = firstExisting([
    path.join(PLUGIN_ROOT, 'agents'),
    path.join(SKILL_BASE, '..', 'subagent-execution', 'agents'),
  ]);

  if (!dir) return { host: 'all', status: 'absent', detail: 'no agents/ directory — not a plugin install' };

  const agents = fs.readdirSync(dir).filter((entry) => entry.endsWith('.md'));
  const expected = ['coder', 'explorer', 'planner', 'researcher'];
  const missing = expected.filter((name) => !agents.includes(`${name}.md`));

  return missing.length === 0
    ? { host: 'all', status: 'done', detail: `all four specialist agents present (${dir === path.join(PLUGIN_ROOT, 'agents') ? 'plugin-level' : 'source tree'})` }
    : { host: 'all', status: 'broken', detail: `missing agent definitions: ${missing.join(', ')}`, fix: 'reinstall the plugin' };
}

function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }

  return 0;
}

// Offline by design: the clone the host already fetched is the only reference,
// and its age is printed so a stale answer reads as stale.
function marketplaceVersion(name) {
  const root = path.join(HOME, '.claude', 'plugins', 'marketplaces');
  if (!fs.existsSync(root)) return null;

  for (const entry of fs.readdirSync(root)) {
    const manifest = path.join(root, entry, '.claude-plugin', 'marketplace.json');
    if (!fs.existsSync(manifest)) continue;

    const { value } = readJson(manifest);
    const plugin = (value?.plugins ?? []).find((candidate) => candidate.name === name);
    if (!plugin) continue;

    const clone = path.join(root, entry);
    const log = spawnSync('git', ['-C', clone, 'log', '-1', '--format=%cs'], { timeout: EXEC_TIMEOUT, encoding: 'utf8' });
    const fetched = log.status === 0 && log.stdout.trim()
      ? log.stdout.trim()
      : fs.statSync(manifest).mtime.toISOString().slice(0, 10);

    const source = String(plugin.source ?? '');
    const offered = source.startsWith('.')
      ? readJson(path.join(clone, source, '.claude-plugin', 'plugin.json')).value?.version ?? null
      : null;

    return { version: offered, clone: entry, fetched, remote: !source.startsWith('.') };
  }

  return null;
}

function probeVersion() {
  const manifest = path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(manifest)) {
    return { host: 'all', status: 'absent', detail: 'not a plugin install — nothing to compare a version against' };
  }

  const installed = readJson(manifest).value?.version ?? null;
  const market = marketplaceVersion('condux');

  if (!installed) return { host: 'all', status: 'broken', detail: 'plugin.json carries no version', fix: 'reinstall the plugin' };
  if (!market) return { host: 'all', status: 'absent', detail: `installed ${installed}; no local marketplace clone to compare against` };
  if (!market.version) {
    const why = market.remote ? 'its source is remote and this check never fetches' : 'its manifest carries no version';

    return { host: 'all', status: 'absent', detail: `installed ${installed}; marketplace clone ${market.clone} offers no comparable version — ${why}` };
  }

  const order = compareVersions(installed, market.version);
  const stamp = `marketplace clone ${market.clone} as of ${market.fetched}`;

  if (order < 0) {
    return {
      host: 'all',
      status: 'broken',
      detail: `installed ${installed}, marketplace offers ${market.version} (${stamp})`,
      fix: '/plugin update condux@jabworks-agentic-toolkit',
    };
  }

  const lead = order > 0 ? ` (ahead of marketplace ${market.version} — local build)` : '';

  return { host: 'all', status: 'done', detail: `installed ${installed}${lead}; ${stamp}` };
}

const WIDTH_HOST = 10;
const WIDTH_STATUS = 8;

function report(rows, quiet) {
  for (const row of rows) {
    if (quiet && row.status === 'done') continue;
    process.stdout.write(
      row.host.padEnd(WIDTH_HOST) + ' ' + row.status.padEnd(WIDTH_STATUS) + ' ' + row.detail + '\n',
    );
    if (row.fix) {
      process.stdout.write(' '.repeat(WIDTH_HOST + WIDTH_STATUS + 2) + '↳ ' + row.fix + '\n');
    }
  }
}

function summarize(rows) {
  const broken = rows.filter((row) => row.status === 'broken').length;
  const verdict = broken === 0 ? 'condux is healthy on every host present' : `${broken} probe(s) broken`;

  return `\n${verdict} — probes are static-parse plus execution; they cannot prove the host invoked anything.\n`;
}

// --fix performs no registration itself: it runs condux's installer and probes
// again, so idempotency, backups and atomic writes stay in one place. The
// installer's own verify beat calls this doctor back with --host <h> --quiet
// and never --fix, so the two cannot ping-pong.
function findInstaller() {
  return firstExisting([
    path.join(PLUGIN_ROOT, 'install.mjs'),
    path.join(SKILL_BASE, '..', '..', 'plugins', 'condux', 'install.mjs'),
  ]);
}

function runInstaller(only) {
  const installer = findInstaller();
  if (!installer) {
    process.stdout.write('no install.mjs found beside this plugin — nothing to run for --fix\n\n');

    return;
  }

  const args = [installer];
  if (only) args.push('--host', only);

  process.stdout.write(`running ${installer}${only ? ` --host ${only}` : ''}\n`);
  const result = spawnSync(process.execPath, args, { timeout: 60000, encoding: 'utf8' });

  // Report the delegate's failure rather than re-probing in silence: `running …`
  // followed by nothing reads as a repair that happened.
  if (result.error) process.stdout.write(`the installer could not be run: ${result.error.message}\n`);
  else if (result.signal) process.stdout.write(`the installer was killed by ${result.signal}\n`);
  else if (result.status !== 0) process.stdout.write(`the installer exited ${result.status}\n`);

  process.stdout.write('\n');
}

function main(argv) {
  const flags = parseFlags(argv);
  if (flags.help) {
    process.stdout.write(USAGE);

    return 0;
  }

  if (!findHook('session-start.mjs')) {
    report([{ host: 'all', status: 'broken', detail: `condux's hooks are not reachable from ${SKILL_BASE}` }], false);

    return 2;
  }

  const only = typeof flags.host === 'string' ? flags.host : null;
  if (flags.fix === true) runInstaller(only);

  // Detected after the installer runs — it may have created a host directory
  // that was not there when this process started.
  const hosts = detectHosts();
  const perHost = [
    ['claude', () => probeClaude(hosts)],
    ['codex', () => probeCodex(hosts)],
    ['opencode', () => probeOpencode(hosts)],
  ];

  const rows = perHost.filter(([host]) => !only || host === only).map(([, probe]) => probe());
  if (!only) rows.push(probeAgents(), probeVersion());

  report(rows, flags.quiet === true);
  process.stdout.write(summarize(rows));

  return rows.some((row) => row.status === 'broken') ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
