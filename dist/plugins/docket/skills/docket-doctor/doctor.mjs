#!/usr/bin/env node
// docket's health check — "is docket actually working on this host?"
//
// Reference implementation of the toolkit health-check convention:
// detect → probe → report → fix. Probes are static parse PLUS execution (a
// manifest that parses while its server is dead is the failure this exists to
// catch), read-only unless --fix, and never touch the network.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SKILL_BASE = path.dirname(fileURLToPath(import.meta.url));
const HOME = os.homedir();
const INITIALIZE = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}\n';
const EXEC_TIMEOUT = 5000;

const USAGE = `usage: doctor [options]

  --host <claude|codex|opencode|cursor>   probe one host only
  --fix                                   run the installer for anything broken
  --quiet                                 print only broken and absent rows
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

// Sibling machinery sits at more than one depth: beside the record skill in
// every tree, and again at the plugin root in a marketplace install (sync
// copies it twice). The record-relative copy goes first because that is the
// path record's SKILL.md documents — probe what agents are told to run.
function findMachinery(file) {
  return firstExisting([
    path.join(SKILL_BASE, '..', 'record', 'server', file),
    path.join(SKILL_BASE, '..', '..', 'server', file),
    path.join(SKILL_BASE, 'server', file),
  ]);
}

const PLUGIN_ROOT = path.resolve(SKILL_BASE, '..', '..');

function detectHosts() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(HOME, '.config');
  const dirs = {
    claude: path.join(HOME, '.claude'),
    codex: path.join(HOME, '.codex'),
    opencode: path.join(configHome, 'opencode'),
    cursor: path.join(HOME, '.cursor'),
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

// One initialize round-trip. Mutates nothing — the same check install.sh runs,
// and the reason registration-without-verification is not a success.
function verifyServer(server) {
  const res = spawnSync(process.execPath, [server], {
    input: INITIALIZE,
    timeout: EXEC_TIMEOUT,
    encoding: 'utf8',
  });

  if (res.error) {
    const why = res.error.code === 'ETIMEDOUT' ? 'no answer within 5s' : String(res.error.message);

    return { ok: false, why };
  }

  const first = (res.stdout ?? '').split('\n')[0];
  if (!first.includes('"docket"')) {
    return { ok: false, why: 'initialize response did not name docket' };
  }

  return { ok: true, why: 'initialize round-trip answered' };
}

// A registered path is the host's own copy, which may point somewhere else
// entirely (an older install, a moved checkout) — so verify what is registered,
// never what is shipped beside this file.
function probeRegisteredServer(host, registered, fixCommand) {
  if (!fs.existsSync(registered)) {
    return {
      host,
      status: 'broken',
      detail: `registered path does not exist: ${registered}`,
      fix: fixCommand,
    };
  }

  const verdict = verifyServer(registered);

  return verdict.ok
    ? { host, status: 'done', detail: verdict.why }
    : { host, status: 'broken', detail: verdict.why, fix: fixCommand };
}

function probeClaude(hosts, installer) {
  if (!hosts.claude) return { host: 'claude', status: 'absent', detail: 'no ~/.claude on this machine' };

  const server = findMachinery('mcp-server.mjs');
  const manual = server ? `claude mcp add docket -- node ${server}` : undefined;
  const mcpJson = path.join(PLUGIN_ROOT, '.mcp.json');

  if (!fs.existsSync(mcpJson)) {
    return {
      host: 'claude',
      status: 'absent',
      detail: 'not a plugin install — no .mcp.json to register the server',
      fix: manual,
    };
  }

  const { value, error } = readJson(mcpJson);
  if (error) return { host: 'claude', status: 'broken', detail: `.mcp.json is unparseable: ${error}`, fix: manual };

  const entry = value?.mcpServers?.docket;
  if (!entry) return { host: 'claude', status: 'broken', detail: '.mcp.json has no docket entry', fix: manual };

  const registered = String(entry.args?.[0] ?? '').replace('${CLAUDE_PLUGIN_ROOT}', PLUGIN_ROOT);
  if (!registered) return { host: 'claude', status: 'broken', detail: '.mcp.json docket entry has no server path', fix: manual };

  return probeRegisteredServer('claude', registered, installer);
}

// Enough TOML to read one table we wrote ourselves — the installer appends a
// fixed three-line block, so a full parser would be dead weight here.
function codexServerPath(configText) {
  const table = configText.split(/^\[/m).find((chunk) => chunk.startsWith('mcp_servers.docket]'));
  if (!table) return null;

  const args = table.match(/^args\s*=\s*(\[[^\]]*\])/m);
  if (!args) return null;

  try {
    const parsed = JSON.parse(args[1]);

    return typeof parsed[0] === 'string' ? parsed[0] : null;
  } catch {
    return null;
  }
}

function probeCodex(hosts, installer) {
  if (!hosts.codex) return { host: 'codex', status: 'absent', detail: 'no ~/.codex on this machine' };

  const config = path.join(hosts.codex, 'config.toml');
  const unregistered = {
    host: 'codex',
    status: 'absent',
    detail: 'not registered — the skills fall back to the bundled CLI',
    fix: installer,
  };

  if (!fs.existsSync(config)) return unregistered;

  const text = fs.readFileSync(config, 'utf8');
  if (!/^\[mcp_servers\.docket\]/m.test(text)) return unregistered;

  const registered = codexServerPath(text);
  if (!registered) {
    return {
      host: 'codex',
      status: 'broken',
      detail: '[mcp_servers.docket] present but its args are unreadable',
      fix: installer,
    };
  }

  return probeRegisteredServer('codex', registered, installer);
}

function probeOpencode(hosts, installer) {
  if (!hosts.opencode) return { host: 'opencode', status: 'absent', detail: 'no opencode config dir on this machine' };

  const config = path.join(hosts.opencode, 'opencode.json');
  const unregistered = {
    host: 'opencode',
    status: 'absent',
    detail: 'not registered — the skills fall back to the bundled CLI',
    fix: installer,
  };

  if (!fs.existsSync(config)) return unregistered;

  const { value, error } = readJson(config);
  if (error) return { host: 'opencode', status: 'broken', detail: `opencode.json is unparseable: ${error}`, fix: installer };

  const entry = value?.mcp?.docket;
  if (!entry) return unregistered;

  if (entry.enabled === false) {
    return { host: 'opencode', status: 'broken', detail: 'mcp.docket is registered but disabled', fix: 'set mcp.docket.enabled to true in opencode.json' };
  }

  const registered = Array.isArray(entry.command) ? entry.command[1] : null;
  if (!registered) return { host: 'opencode', status: 'broken', detail: 'mcp.docket has no server path in its command', fix: installer };

  return probeRegisteredServer('opencode', registered, installer);
}

// Cursor reads ~/.cursor/mcp.json with the standard mcpServers shape — the same
// file and key install.sh writes. A project-level .cursor/mcp.json wins on name
// collision but stays hand-written, so it is deliberately not probed here.
//
// On WSL the Windows-side Cursor has its own home, so a ~/.cursor in THIS
// filesystem may simply not exist while Cursor works fine. That is why the
// no-dir case reports `absent` with the reason rather than `broken` — same
// judgement install.sh makes, and guessing Windows paths would be worse.
function probeCursor(hosts, installer) {
  if (!hosts.cursor) {
    return {
      host: 'cursor',
      status: 'absent',
      detail: 'no ~/.cursor in this filesystem (expected on WSL — Cursor runs Windows-side with its own home)',
    };
  }

  const config = path.join(hosts.cursor, 'mcp.json');
  const unregistered = {
    host: 'cursor',
    status: 'absent',
    detail: 'not registered — the skills fall back to the bundled CLI',
    fix: installer,
  };

  if (!fs.existsSync(config)) return unregistered;

  const { value, error } = readJson(config);
  if (error) return { host: 'cursor', status: 'broken', detail: `mcp.json is unparseable: ${error}`, fix: installer };

  const entry = value?.mcpServers?.docket;
  if (!entry) return unregistered;

  // No `enabled === false` check here, unlike probeOpencode — deliberate.
  // Cursor's McpServerConfig has no such field (verified against
  // cursor.com/docs/reference/plugins + /sdk/typescript, 2026-08-14): disabling
  // is out-of-band, via the Customize sidebar toggle or `agent mcp disable`,
  // which edits a local approved list rather than mcp.json. So a server
  // disabled in the UI still reads as registered here. Stated in SKILL.md
  // under "What it cannot prove" rather than guessed at.
  const registered = Array.isArray(entry.args) ? entry.args[0] : null;
  if (!registered) return { host: 'cursor', status: 'broken', detail: 'mcpServers.docket has no server path in its args', fix: installer };

  return probeRegisteredServer('cursor', registered, installer);
}

// Rung 2 of the dependency ladder. It has to hold even when every MCP
// registration above is absent, because that is the fallback the skills
// document — and the documented path does not resolve in every install tree.
function probeCli() {
  const cli = findMachinery('docket.mjs');
  if (!cli) {
    return {
      host: 'all',
      status: 'broken',
      detail: `bundled CLI not found from the skill base (${SKILL_BASE})`,
      fix: 'reinstall the plugin — the skill and its server/ directory have been separated',
    };
  }

  // The CLI prints its usage banner on stderr, so probe both streams — reading
  // only stdout reported a working CLI as broken.
  const res = spawnSync(process.execPath, [cli], { timeout: EXEC_TIMEOUT, encoding: 'utf8' });
  if (!((res.stdout ?? '') + (res.stderr ?? '')).includes('usage: docket')) {
    return { host: 'all', status: 'broken', detail: `bundled CLI at ${cli} did not run`, fix: 'reinstall the plugin' };
  }

  return { host: 'all', status: 'done', detail: `bundled CLI resolves (${path.relative(PLUGIN_ROOT, cli) || cli})` };
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

// Offline by design: the marketplace clone the host already fetched is the
// only reference, and its own age is reported so a stale answer reads stale.
function marketplaceVersion() {
  const root = path.join(HOME, '.claude', 'plugins', 'marketplaces');
  if (!fs.existsSync(root)) return null;

  for (const entry of fs.readdirSync(root)) {
    const manifest = path.join(root, entry, '.claude-plugin', 'marketplace.json');
    if (!fs.existsSync(manifest)) continue;

    const { value } = readJson(manifest);
    const plugin = (value?.plugins ?? []).find((candidate) => candidate.name === 'docket');
    if (!plugin) continue;

    const clone = path.join(root, entry);
    const log = spawnSync('git', ['-C', clone, 'log', '-1', '--format=%cs'], { timeout: EXEC_TIMEOUT, encoding: 'utf8' });
    const fetched = log.status === 0 && log.stdout.trim()
      ? log.stdout.trim()
      : fs.statSync(manifest).mtime.toISOString().slice(0, 10);

    // marketplace.json carries no versions — each entry points at a plugin
    // directory whose own manifest does. Anything but a relative source is a
    // remote we are not allowed to reach.
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
  const market = marketplaceVersion();

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
      fix: '/plugin update docket@jabworks-agentic-toolkit',
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
  const verdict = broken === 0 ? 'docket is healthy on every host present' : `${broken} probe(s) broken`;

  return `\n${verdict} — probes are static-parse plus execution; they cannot prove the host invoked anything.\n`;
}

// null when the installer ran and succeeded; otherwise how it failed.
function installerFailure(run) {
  if (run.error) return `could not be run: ${run.error.message}`;
  if (run.signal) return `was killed by ${run.signal}`;

  return run.status === 0 ? null : `exited ${run.status}`;
}

function collect(flags) {
  const hosts = detectHosts();
  const installerPath = findMachinery('install.sh');
  const installer = installerPath ? `bash ${installerPath}` : undefined;
  const only = typeof flags.host === 'string' ? flags.host : null;

  const perHost = [
    ['claude', () => probeClaude(hosts, installer)],
    ['codex', () => probeCodex(hosts, installer)],
    ['opencode', () => probeOpencode(hosts, installer)],
    ['cursor', () => probeCursor(hosts, installer)],
  ];

  const rows = perHost.filter(([host]) => !only || host === only).map(([, probe]) => probe());
  if (!only) rows.push(probeCli(), probeVersion());

  return { rows, installerPath };
}

function main(argv) {
  const flags = parseFlags(argv);
  if (flags.help) {
    process.stdout.write(USAGE);

    return 0;
  }

  if (!findMachinery('mcp-server.mjs') && !findMachinery('docket.mjs')) {
    report([{ host: 'all', status: 'broken', detail: `docket's machinery is not reachable from ${SKILL_BASE}` }], false);

    return 2;
  }

  let { rows, installerPath } = collect(flags);

  // --fix delegates to the installer rather than reimplementing registration:
  // idempotency, backups and never-touch-unrelated-config already live there.
  if (flags.fix && rows.some((row) => row.status === 'broken' || (row.status === 'absent' && row.fix))) {
    if (!installerPath) {
      process.stdout.write('no installer found beside this skill — nothing to run for --fix\n');
    } else {
      process.stdout.write(`running ${installerPath}\n`);
      const run = spawnSync('bash', [installerPath], { stdio: 'inherit', timeout: 60000 });
      const failure = installerFailure(run);
      // "running …" followed by silence reads as success. It is not: bash can be
      // missing entirely, and install.sh exits 1 when the server fails its
      // initialize round-trip.
      if (failure) process.stdout.write(`the installer ${failure} — the re-probe below is what holds\n`);
      rows = collect(flags).rows;
    }
  }

  report(rows, flags.quiet === true);
  process.stdout.write(summarize(rows));

  return rows.some((row) => row.status === 'broken') ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
