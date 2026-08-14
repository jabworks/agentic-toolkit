#!/usr/bin/env node
// concord's health check — "is concord actually working on this host?"
//
// Follows the toolkit health-check convention (toolkit-skill-standards):
// detect → probe → report → fix. concord is the case that proves the
// must-not-mutate rule: BOTH of its entry points write. capture.mjs appends to
// the memory store, and recall.mjs runs catch-up and writes state before it
// emits anything — so neither hook is ever invoked here. The execution step is
// a module load, which exercises the real code without touching the store.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKILL_BASE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(SKILL_BASE, '..', '..');
const HOME = os.homedir();
const EXEC_TIMEOUT = 5000;
const EVENTS = ['SessionStart', 'UserPromptSubmit', 'SessionEnd'];

// One candidate covers every tree: the memory skill is always this doctor's
// sibling — skills/remember/ in the source tree and in a plugin install alike
// (bundle skills ship flat since the Agent Plugins conformance change).
const SKILL_DIR = path.resolve(SKILL_BASE, '..', 'remember');

const USAGE = `usage: doctor [options]

  --host <claude|codex|opencode>   probe one host only
  --quiet                          print only broken and absent rows
  --fix                            run the installer for anything broken
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

function codexHome() {
  return process.env.CODEX_HOME || path.join(HOME, '.codex');
}

function detectHosts() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(HOME, '.config');
  const dirs = {
    claude: path.join(HOME, '.claude'),
    codex: codexHome(),
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

function installerPath() {
  const installer = path.join(SKILL_DIR, 'references', 'install-codex-hook.sh');

  return fs.existsSync(installer) ? installer : null;
}

function installerFix() {
  const installer = installerPath();

  return installer ? `bash ${installer}` : 'run the memory skill’s references/install-codex-hook.sh';
}

// Claude Code loads no concord hooks by design — the plugin is Codex-only, so
// "present and deliberately needs nothing" is the honest verdict, not absent.
function probeClaude(hosts) {
  if (!hosts.claude) return { host: 'claude', status: 'absent', detail: 'no ~/.claude on this machine' };

  return { host: 'claude', status: 'skipped', detail: 'concord is Codex-only — nothing is registered here by design' };
}

function probeOpencode(hosts) {
  if (!hosts.opencode) return { host: 'opencode', status: 'absent', detail: 'no opencode config dir on this machine' };

  return { host: 'opencode', status: 'skipped', detail: 'concord is Codex-only — nothing is registered here by design' };
}

// The installed command strings carry absolute paths, which is what makes them
// worth probing: a plugin update moves the scripts and leaves the registration
// pointing at a version directory that no longer exists.
function registeredCommands(hooks) {
  const found = {};

  for (const event of EVENTS) {
    for (const entry of hooks?.[event] ?? []) {
      for (const hook of entry.hooks ?? []) {
        const command = String(hook.command ?? '');
        if (command.includes('recall.mjs') || command.includes('capture.mjs')) {
          found[event] = command;
        }
      }
    }
  }

  return found;
}

function scriptPathOf(command) {
  const quoted = [...command.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const candidate = quoted.find((value) => value.endsWith('.mjs'));
  if (candidate) return candidate;

  return command.split(/\s+/).find((token) => token.endsWith('.mjs')) ?? null;
}

function hooksEnabled(configFile) {
  if (!fs.existsSync(configFile)) return false;
  const text = fs.readFileSync(configFile, 'utf8');
  const features = text.split(/^\[/m).find((chunk) => chunk.startsWith('features]'));

  return features ? /^hooks\s*=\s*true/m.test(features) : false;
}

// Second registration path: a Codex *plugin* install wires the hooks from the
// manifest instead of ~/.codex/hooks.json. Reporting only the installer's route
// would call a working plugin install unregistered.
function manifestRegistration() {
  const manifest = path.join(PLUGIN_ROOT, '.codex-plugin', 'plugin.json');
  if (!fs.existsSync(manifest)) return null;

  const hooksField = readJson(manifest).value?.hooks;
  if (!hooksField) return null;

  const hooksFile = path.resolve(PLUGIN_ROOT, hooksField);
  if (!fs.existsSync(hooksFile)) {
    return { ok: false, detail: `the manifest declares hooks at ${hooksField}, which does not exist` };
  }

  const { value, error } = readJson(hooksFile);
  if (error) return { ok: false, detail: `the manifest's hooks file is unparseable: ${error}` };

  const commands = registeredCommands(value?.hooks);
  const missing = EVENTS.filter((event) => !commands[event]);
  if (missing.length > 0) return { ok: false, detail: `the manifest's hooks file is missing ${missing.join(', ')}` };

  for (const command of Object.values(commands)) {
    const script = path.resolve(PLUGIN_ROOT, (scriptPathOf(command) ?? '').replace('${PLUGIN_ROOT}/', ''));
    if (!fs.existsSync(script)) {
      return { ok: false, detail: `the manifest's hooks point at a missing script: ${script}` };
    }
  }

  return { ok: true, detail: 'registered by the plugin manifest' };
}

function probeCodex(hosts) {
  if (!hosts.codex) return { host: 'codex', status: 'absent', detail: 'no Codex home on this machine' };

  const fix = installerFix();
  const manifest = manifestRegistration();
  if (manifest && !manifest.ok) return { host: 'codex', status: 'broken', detail: manifest.detail, fix: 'reinstall the plugin' };

  const hooksFile = path.join(hosts.codex, 'hooks.json');
  if (!fs.existsSync(hooksFile)) {
    return manifest?.ok
      ? { host: 'codex', status: 'done', detail: `${manifest.detail}; no hooks.json, which a plugin install does not need` }
      : { host: 'codex', status: 'absent', detail: 'no hooks.json — concord captures nothing until its hooks are installed', fix };
  }

  const { value, error } = readJson(hooksFile);
  if (error) return { host: 'codex', status: 'broken', detail: `hooks.json is unparseable: ${error}`, fix };

  const commands = registeredCommands(value?.hooks);
  const missing = EVENTS.filter((event) => !commands[event]);
  if (missing.length === EVENTS.length) {
    return manifest?.ok
      ? { host: 'codex', status: 'done', detail: `${manifest.detail}; hooks.json registers none, which a plugin install does not need` }
      : { host: 'codex', status: 'absent', detail: 'hooks.json exists but registers none of concord’s hooks', fix };
  }

  if (missing.length > 0) {
    return {
      host: 'codex',
      status: 'broken',
      detail: `only ${EVENTS.length - missing.length} of ${EVENTS.length} hooks registered — missing ${missing.join(', ')}`,
      fix,
    };
  }

  for (const [event, command] of Object.entries(commands)) {
    const script = scriptPathOf(command);
    if (!script || !fs.existsSync(script)) {
      return {
        host: 'codex',
        status: 'broken',
        detail: `${event} points at a script that no longer exists: ${script ?? command}`,
        fix,
      };
    }
  }

  if (!hooksEnabled(path.join(hosts.codex, 'config.toml'))) {
    return {
      host: 'codex',
      status: 'broken',
      detail: 'all three hooks are registered but the experimental hooks feature is off',
      fix: `set hooks = true under [features] in ${path.join(hosts.codex, 'config.toml')}`,
    };
  }

  return { host: 'codex', status: 'done', detail: 'all three hooks registered at resolvable paths, and the hooks feature is on' };
}

// The execution step, chosen so nothing writes: both entry points are parsed,
// and the library they share is actually imported.
function probeScripts() {
  const scripts = ['bin/recall.mjs', 'bin/capture.mjs'].map((relative) => path.join(SKILL_DIR, relative));
  const missing = scripts.filter((script) => !fs.existsSync(script));
  if (missing.length > 0) {
    return { host: 'all', status: 'broken', detail: `the memory skill is missing ${missing.map((script) => path.basename(script)).join(', ')}`, fix: 'reinstall the plugin' };
  }

  for (const script of scripts) {
    const check = spawnSync(process.execPath, ['--check', script], { timeout: EXEC_TIMEOUT, encoding: 'utf8' });
    if (check.status !== 0) {
      return { host: 'all', status: 'broken', detail: `${path.basename(script)} does not parse`, fix: 'reinstall the plugin' };
    }
  }

  const paths = path.join(SKILL_DIR, 'lib', 'paths.mjs');
  const load = spawnSync(
    process.execPath,
    ['-e', `import(${JSON.stringify(pathToFileURL(paths).href)}).then((m) => process.exit(typeof m.tierPathsFor === "function" ? 0 : 3), () => process.exit(4))`],
    { timeout: EXEC_TIMEOUT, encoding: 'utf8' },
  );

  if (load.status !== 0) {
    return { host: 'all', status: 'broken', detail: 'lib/paths.mjs does not load or no longer exports tierPathsFor', fix: 'reinstall the plugin' };
  }

  return { host: 'all', status: 'done', detail: 'both hook scripts parse and the shared library loads (neither hook is executed)' };
}

function probeStore() {
  const store = path.join(codexHome(), 'concord');
  if (!fs.existsSync(store)) {
    return { host: 'all', status: 'absent', detail: 'no memory store yet — it appears after the first captured session' };
  }

  try {
    fs.accessSync(store, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    return { host: 'all', status: 'broken', detail: `memory store is not readable and writable: ${store}`, fix: `check the permissions on ${store}` };
  }

  const tiers = fs.readdirSync(store);

  return { host: 'all', status: 'done', detail: `memory store readable at ${store} (${tiers.length} entr${tiers.length === 1 ? 'y' : 'ies'})` };
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
  const market = marketplaceVersion('concord');

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
      fix: '/plugin update concord@jabworks-agentic-toolkit',
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
  const verdict = broken === 0 ? 'concord is healthy on every host present' : `${broken} probe(s) broken`;

  return `\n${verdict} — probes are static-parse plus a module load; no hook is ever executed, so nothing here proves the host invoked one.\n`;
}

// null when the installer ran and succeeded; otherwise how it failed.
function installerFailure(run) {
  if (run.error) return `could not be run: ${run.error.message}`;
  if (run.signal) return `was killed by ${run.signal}`;

  return run.status === 0 ? null : `exited ${run.status}`;
}

function collect(flags) {
  const hosts = detectHosts();
  const only = typeof flags.host === 'string' ? flags.host : null;
  const perHost = [
    ['claude', () => probeClaude(hosts)],
    ['codex', () => probeCodex(hosts)],
    ['opencode', () => probeOpencode(hosts)],
  ];

  const rows = perHost.filter(([host]) => !only || host === only).map(([, probe]) => probe());
  if (!only) rows.push(probeScripts(), probeStore(), probeVersion());

  return rows;
}

function main(argv) {
  const flags = parseFlags(argv);
  if (flags.help) {
    process.stdout.write(USAGE);

    return 0;
  }

  if (!fs.existsSync(SKILL_DIR)) {
    report([{ host: 'all', status: 'broken', detail: `the memory skill is not beside this doctor (${SKILL_DIR})` }], false);

    return 2;
  }

  let rows = collect(flags);

  // --fix delegates to the installer rather than reimplementing registration:
  // idempotency, the malformed-JSON refusal and the never-touch-another-plugin's
  // -hooks matcher already live there. The installer's own verify step calls
  // this doctor back without --fix, so the two cannot ping-pong.
  if (flags.fix && rows.some((row) => row.status === 'broken' || (row.status === 'absent' && row.fix))) {
    const installer = installerPath();
    if (!installer) {
      process.stdout.write('no installer found beside this skill — nothing to run for --fix\n');
    } else {
      process.stdout.write(`running ${installer}\n`);
      const run = spawnSync('bash', [installer], { stdio: 'inherit', timeout: 60000 });
      const failure = installerFailure(run);
      // "running …" followed by silence reads as success. It is not: bash can be
      // missing entirely, and concord's installer exits 1 when its own verify
      // step says the registration it just wrote does not answer.
      if (failure) process.stdout.write(`the installer ${failure} — the re-probe below is what holds\n`);
      rows = collect(flags);
    }
  }

  report(rows, flags.quiet === true);
  process.stdout.write(summarize(rows));

  return rows.some((row) => row.status === 'broken') ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
