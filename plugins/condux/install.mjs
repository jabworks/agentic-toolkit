#!/usr/bin/env node
'use strict';
// condux's install front door.
//
// Follows the toolkit ease-of-install convention: detect -> register -> verify
// -> report, one row per host as `host status detail`.
//
// This installer composes rather than reimplements. condux's registration
// machinery already exists in two places, each of which resolves its own
// payload relative to itself:
//
//   skills/plan-review/references/install-codex-hook.sh
//       -> $SCRIPT_DIR/annotate-server.js
//   skills/subagent-execution/references/install-codex-agents.mjs
//       -> ../agents
//
// Both are therefore located and run IN PLACE, never copied or moved. They also
// have to stay inside their skills for a second reason: `npx skills add`
// installs from the top-level skills/ tree and never sees plugins/, so moving
// them here would delete them from the one channel where they are the only
// mechanism that exists.
//
// Usage:
//   node install.mjs [--host claude|codex|opencode] [--dry-run] [--uninstall]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PLUGIN_ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOME = os.homedir();
const PACKAGE = '@jabworks/condux';
const EXEC_TIMEOUT = 60000;

const USAGE = `usage: install [options]

  --host <claude|codex|opencode>   act on one host only
  --dry-run                        report what would change, write nothing
  --uninstall                      reverse what this installer registered
`;

// A plugin install carries its own manifest, and that manifest is what
// registers condux's Codex hooks. Running from the source tree, nothing has
// registered them, so the Stop hook has to be installed by hand. This is the
// discriminator, not a guess about which host is in use.
const IS_PLUGIN = fs.existsSync(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'));

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

// Plugin-root first, then the source tree — the ordered-candidate shape
// doctor.mjs uses, and for the same reason: the documented path is probed
// first, so what answers is what a user would actually run.
function findSibling(...segments) {
  return firstExisting([
    path.join(PLUGIN_ROOT, 'skills', 'condux', ...segments),
    path.join(PLUGIN_ROOT, '..', '..', 'skills', ...segments),
  ]);
}

const AGENT_INSTALLER = findSibling('subagent-execution', 'references', 'install-codex-agents.mjs');
const HOOK_INSTALLER = findSibling('plan-review', 'references', 'install-codex-hook.sh');
const DOCTOR = findSibling('condux-doctor', 'doctor.mjs');
const CONFLICT_REGISTRY = findSibling('condux-doctor', 'conflicts.json');
const CONFLICT_MODULE = findSibling('condux-doctor', 'conflicts.mjs');

// The registry and the code that reads it are the doctor's, borrowed rather
// than copied. Two installers of the same warning drift, and the table naming
// another project's skills is exactly the thing that must not go stale in one
// of two places.
let conflicts = null;
if (CONFLICT_MODULE) {
  try {
    conflicts = await import(pathToFileURL(CONFLICT_MODULE).href);
  } catch {
    conflicts = null;
  }
}

function detectHosts() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(HOME, '.config');
  const dirs = {
    claude: path.join(HOME, '.claude'),
    codex: process.env.CODEX_HOME || path.join(HOME, '.codex'),
    opencode: path.join(configHome, 'opencode'),
  };

  return Object.fromEntries(Object.entries(dirs).map(([host, dir]) => [host, fs.existsSync(dir) ? dir : null]));
}

// Write beside the target and rename, preserving the existing mode. Config
// files belong to the user; a half-written one is worse than an unchanged one.
function writeAtomic(file, contents) {
  const tmp = `${file}.tmp-${process.pid}`;
  let mode = 0o600;

  try {
    mode = fs.statSync(file).mode & 0o777;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  fs.writeFileSync(tmp, contents, { mode });
  fs.chmodSync(tmp, mode);
  fs.renameSync(tmp, file);
}

// Run a sub-installer and say how it failed. `running ...` followed by silence
// reads as a repair that happened, which is the failure mode both doctors were
// changed to avoid.
function runSub(command, args, label) {
  const result = spawnSync(command, args, { timeout: EXEC_TIMEOUT, encoding: 'utf8' });

  if (result.error) return { ok: false, why: `${label} could not be run: ${result.error.message}` };
  if (result.signal) return { ok: false, why: `${label} was killed by ${result.signal}` };
  if (result.status !== 0) {
    const stderr = String(result.stderr || result.stdout || '').trim().split('\n').pop();

    return { ok: false, why: `${label} exited ${result.status}${stderr ? `: ${stderr}` : ''}` };
  }

  return { ok: true };
}

// --- codex: the experimental hooks feature flag ---------------------------------
// Nothing in a plugin can enable this — a manifest may declare hooks, but only a
// config edit makes any of them fire. It is also shared state: concord and
// plan-review ride the same flag, which is why uninstall never clears it.
function readFeatureHooks(text) {
  const lines = text.split('\n');
  const headers = lines.filter((line) => /^\s*\[features\]\s*(#.*)?$/.test(line));

  if (headers.length > 1) return { error: 'config.toml declares [features] more than once' };

  const start = lines.findIndex((line) => /^\s*\[features\]\s*(#.*)?$/.test(line));
  if (start === -1) return { section: null, enabled: false, lines };

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const at = lines.slice(start + 1, end).findIndex((line) => /^\s*hooks\s*=/.test(line));
  const enabled = at !== -1 && /^\s*hooks\s*=\s*true\s*(#.*)?$/.test(lines[start + 1 + at]);

  return { section: { start, end, at: at === -1 ? -1 : start + 1 + at }, enabled, lines };
}

// Read-only twin of registerFeatureFlag, for the uninstall path. Deliberately
// cannot write: the only correct action on the way out is to look and report.
// A config it cannot read or parse reports not-enabled rather than throwing —
// this is a report line, and refusing to uninstall over an unreadable flag
// would be a worse outcome than saying nothing about it.
function readFeatureFlagState(codexHome) {
  const config = path.join(codexHome, 'config.toml');
  if (!fs.existsSync(config)) return { enabled: false };

  try {
    const parsed = readFeatureHooks(fs.readFileSync(config, 'utf8'));

    return { enabled: parsed.error ? false : parsed.enabled };
  } catch {
    return { enabled: false };
  }
}

function registerFeatureFlag(codexHome, dry) {
  const config = path.join(codexHome, 'config.toml');
  let text = '';

  if (fs.existsSync(config)) {
    try {
      text = fs.readFileSync(config, 'utf8');
    } catch (err) {
      return { status: 'broken', detail: `cannot read ${config}: ${err.message}` };
    }
  }

  const parsed = readFeatureHooks(text);
  if (parsed.error) {
    return { status: 'broken', detail: parsed.error, fix: `resolve the duplicate [features] table in ${config} by hand` };
  }

  if (parsed.enabled) return { status: 'done', detail: 'features.hooks is already true' };
  if (dry) return { status: 'done', detail: `would set [features] hooks = true in ${config}` };

  const lines = parsed.lines;
  if (!parsed.section) {
    const prefix = text.length > 0 && !text.endsWith('\n') ? '\n' : '';
    writeAtomic(config, `${text}${prefix}\n[features]\nhooks = true\n`);
  } else if (parsed.section.at !== -1) {
    lines[parsed.section.at] = 'hooks = true';
    writeAtomic(config, lines.join('\n'));
  } else {
    lines.splice(parsed.section.start + 1, 0, 'hooks = true');
    writeAtomic(config, lines.join('\n'));
  }

  return { status: 'done', detail: `set [features] hooks = true in ${config} — restart Codex for it to take effect` };
}

function registerCodex(codexHome, dry) {
  const steps = [];
  const flag = registerFeatureFlag(codexHome, dry);
  steps.push(flag.detail);
  if (flag.status === 'broken') return { host: 'codex', ...flag };

  // Codex plugins cannot bundle agents — the plugin format has no agents/
  // component — so the four specialist agents are standalone TOMLs either way.
  if (!AGENT_INSTALLER) {
    return { host: 'codex', status: 'broken', detail: 'install-codex-agents.mjs not found beside this plugin', fix: 'reinstall the plugin' };
  }

  const agentArgs = [AGENT_INSTALLER, '--codex-home', codexHome];
  if (dry) agentArgs.push('--dry-run');
  const agents = runSub(process.execPath, agentArgs, 'the Codex agent installer');
  if (!agents.ok) return { host: 'codex', status: 'broken', detail: agents.why };
  steps.push(dry ? 'would install the four specialist agents' : 'installed the four specialist agents');

  // The Stop hook ships in hooks/codex-hooks.json for a plugin install, so the
  // script is redundant there and load-bearing only without a manifest.
  if (IS_PLUGIN) {
    steps.push('the Stop hook comes from the plugin manifest');
  } else if (!HOOK_INSTALLER) {
    return { host: 'codex', status: 'broken', detail: 'install-codex-hook.sh not found beside this plugin', fix: 'reinstall the plugin' };
  } else if (dry) {
    // The hook installer has no --dry-run, so it is not invoked at all here.
    steps.push(`would run ${HOOK_INSTALLER} for the plan-review Stop hook`);
  } else {
    const hook = runSub('bash', [HOOK_INSTALLER], 'the Codex hook installer');
    if (!hook.ok) return { host: 'codex', status: 'broken', detail: hook.why };
    steps.push('registered the plan-review Stop hook');
  }

  return { host: 'codex', status: 'done', detail: steps.join('; ') };
}

// The mirror of registerCodex, and deliberately the same shape: this installer
// delegates on the way in, so it delegates on the way out. Reversing the writes
// here instead would mean re-deriving the agent TOML names and the Stop hook's
// entry shape — knowledge that lives in exactly one place each today, and the
// scattering of that knowledge is what made this plugin's install story wrong
// until it got a front door.
function unregisterCodex(codexHome, dry) {
  const steps = [];

  // Never the feature flag. Three plugins write it, none owns it, and clearing
  // it silently breaks whichever of the other two is still installed. Reported
  // rather than omitted, so a user does not read a correct result as a leak.
  const flag = readFeatureFlagState(codexHome);

  if (AGENT_INSTALLER) {
    const args = [AGENT_INSTALLER, '--codex-home', codexHome, '--uninstall'];
    if (dry) args.push('--dry-run');
    const agents = runSub(process.execPath, args, 'the Codex agent installer');
    if (!agents.ok) return { host: 'codex', status: 'broken', detail: agents.why };
    steps.push(dry ? 'would remove the four specialist agents' : 'removed the four specialist agents');
  } else {
    // `npx skills add` ships bare skill trees, so a missing delegate is an
    // install shape, not a failure.
    steps.push('no agent installer beside this plugin — nothing to remove');
  }

  // Symmetric with the install path: a plugin install never registered the Stop
  // hook by hand, so there is nothing here to take back.
  if (IS_PLUGIN) {
    steps.push('the Stop hook came from the plugin manifest — removing the plugin removes it');
  } else if (!HOOK_INSTALLER) {
    steps.push('no hook installer beside this plugin — nothing to remove');
  } else if (dry) {
    steps.push(`would run ${HOOK_INSTALLER} --uninstall for the plan-review Stop hook`);
  } else {
    const hook = runSub('bash', [HOOK_INSTALLER, '--uninstall'], 'the Codex hook installer');
    if (!hook.ok) return { host: 'codex', status: 'broken', detail: hook.why };
    steps.push('removed the plan-review Stop hook');
  }

  if (flag.enabled) {
    steps.push('[features] hooks = true left set — concord and plan-review ride the same flag');
    return { host: 'codex', status: 'warn', detail: steps.join('; ') };
  }

  return { host: 'codex', status: 'done', detail: steps.join('; ') };
}

// --- opencode: one key -----------------------------------------------------------
function registerOpencode(dir, dry, remove) {
  const config = path.join(dir, 'opencode.json');
  let value = {};

  if (fs.existsSync(config)) {
    try {
      value = JSON.parse(fs.readFileSync(config, 'utf8'));
    } catch (err) {
      return {
        host: 'opencode',
        status: 'broken',
        detail: `opencode.json does not parse: ${err.message}`,
        fix: `fix ${config} by hand — refusing to overwrite it`,
      };
    }
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { host: 'opencode', status: 'broken', detail: 'opencode.json is not a JSON object', fix: `fix ${config} by hand` };
  }

  const plugins = Array.isArray(value.plugin) ? value.plugin : [];
  const registered = plugins.some((entry) => String(entry).startsWith(PACKAGE));

  if (remove) {
    if (!registered) return { host: 'opencode', status: 'skipped', detail: `${PACKAGE} was not registered` };
    if (dry) return { host: 'opencode', status: 'done', detail: `would remove ${PACKAGE} from ${config}` };

    value.plugin = plugins.filter((entry) => !String(entry).startsWith(PACKAGE));
    writeAtomic(config, `${JSON.stringify(value, null, 2)}\n`);

    return { host: 'opencode', status: 'done', detail: `removed ${PACKAGE} from ${config}` };
  }

  if (registered) return { host: 'opencode', status: 'done', detail: `${PACKAGE} is already in the plugin array` };
  if (dry) return { host: 'opencode', status: 'done', detail: `would add ${PACKAGE} to ${config}` };

  value.plugin = [...plugins, PACKAGE];
  writeAtomic(config, `${JSON.stringify(value, null, 2)}\n`);

  return { host: 'opencode', status: 'done', detail: `added ${PACKAGE} to ${config}` };
}

// --- verify ----------------------------------------------------------------------
// Delegates to the doctor rather than re-probing: it already implements every
// probe. It is never passed --fix, so the two cannot ping-pong.
function verify(host) {
  if (!DOCTOR) return { host, status: 'skipped', detail: 'no condux-doctor beside this plugin to verify with' };

  const result = spawnSync(process.execPath, [DOCTOR, '--host', host, '--quiet'], {
    timeout: EXEC_TIMEOUT,
    encoding: 'utf8',
  });

  if (result.error) return { host, status: 'broken', detail: `verify could not run condux-doctor: ${result.error.message}` };
  if (result.status === 0) return { host, status: 'done', detail: 'condux-doctor confirms the registration resolves' };

  const detail = String(result.stdout || '').trim().split('\n').filter(Boolean).pop();

  return { host, status: 'broken', detail: `condux-doctor still reports a problem${detail ? `: ${detail}` : ''}` };
}

const WIDTH_HOST = 10;
const WIDTH_STATUS = 8;

function report(rows) {
  for (const row of rows) {
    process.stdout.write(row.host.padEnd(WIDTH_HOST) + ' ' + row.status.padEnd(WIDTH_STATUS) + ' ' + row.detail + '\n');
    if (row.fix) {
      process.stdout.write(' '.repeat(WIDTH_HOST + WIDTH_STATUS + 2) + '↳ ' + row.fix + '\n');
    }
  }
}

function main(argv) {
  const flags = parseFlags(argv);
  if (flags.help) {
    process.stdout.write(USAGE);

    return 0;
  }

  const dry = flags['dry-run'] === true;
  const remove = flags.uninstall === true;
  const only = typeof flags.host === 'string' ? flags.host : null;

  if (only && !['claude', 'codex', 'opencode'].includes(only)) {
    process.stdout.write(`unknown host: ${only}\n\n${USAGE}`);

    return 2;
  }

  const hosts = detectHosts();
  const rows = [];

  for (const [host, dir] of Object.entries(hosts)) {
    if (only && host !== only) continue;

    if (!dir) {
      rows.push({ host, status: 'absent', detail: `no ${host} config directory on this machine` });
      continue;
    }

    if (host === 'claude') {
      // A host that needs nothing is named with its reason, never omitted.
      rows.push({ host, status: 'skipped', detail: 'the plugin manifest registers the SessionStart hook — nothing to do' });
      continue;
    }

    if (host === 'codex') {
      rows.push(remove ? unregisterCodex(dir, dry) : registerCodex(dir, dry));
      continue;
    }

    rows.push(registerOpencode(dir, dry, remove));
  }

  // No verify on the way out: the correct end state is that nothing answers.
  if (!dry && !remove) {
    for (const row of [...rows]) {
      if (row.status === 'done' && row.host !== 'claude') rows.push(verify(row.host));
    }
  }

  // Read-only, so it runs under --dry-run too, and unlike the doctor it runs
  // under --host as well: this is the front door, and installing next to a
  // library that competes for the same routing is worth saying at the moment
  // of installation rather than only on a later full probe. Never on the way
  // out — what else is installed stops being condux's business there.
  if (!remove) {
    rows.push(
      conflicts
        ? { host: 'conflicts', ...conflicts.probe(CONFLICT_REGISTRY, hosts, HOME) }
        : { host: 'conflicts', status: 'skipped', detail: 'conflicts.mjs is not reachable from this installer' },
    );
  }

  report(rows);

  const broken = rows.filter((row) => row.status === 'broken').length;
  const warned = rows.filter((row) => row.status === 'warn').length;
  // The hedge this line used to carry ("where this installer could reverse it")
  // was true when the Codex branch printed paths to delete by hand. It now
  // delegates to each sub-installer's own --uninstall, so the only thing left
  // behind is shared state, and that is a warn row rather than a caveat here.
  const verdict = remove
    ? `condux is unregistered on every host present${warned > 0 ? `, with ${warned} warning(s) above` : ''}`
    : `condux is registered on every host present${warned > 0 ? `, with ${warned} warning(s) above` : ''}`;
  process.stdout.write(
    broken === 0 ? `\n${verdict}${dry ? ' (dry run — nothing was written)' : ''}.\n` : `\n${broken} step(s) failed.\n`,
  );

  return broken === 0 ? 0 : 1;
}

process.exit(main(process.argv.slice(2)));
