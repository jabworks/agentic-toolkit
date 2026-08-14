#!/usr/bin/env node
'use strict';
// Generate Codex custom-agent TOML files from condux's canonical agent
// definitions (the .md files in ../agents/).
//
// Codex plugins cannot bundle agents (the plugin format has no agents/
// component) — custom agents are standalone TOML files under
// $CODEX_HOME/agents/ (personal) or <repo>/.codex/agents/ (project). This
// script keeps those TOMLs in sync with the condux source of truth.
//
// Usage:
//   node install-codex-agents.mjs [--codex-home <dir>] [--dry-run]
//   node install-codex-agents.mjs --uninstall [--codex-home <dir>] [--dry-run]
//
// Behavior:
//   - description = the .md frontmatter description prose (Claude-style
//     <example> blocks stripped — they are not part of the Codex schema)
//   - developer_instructions = the .md body, verbatim
//   - tuning keys on an existing TOML (model, model_reasoning_effort,
//     sandbox_mode, nickname_candidates) are preserved; otherwise
//     sandbox_mode defaults to read-only for explorer/researcher and
//     workspace-write for planner/coder
//   - existing files are backed up to <name>.toml.bak first
//
// --uninstall removes exactly the .toml files this installer would have
// written — the names are derived from the same ../agents/*.md frontmatter,
// never hardcoded, since the agent set has already changed once. It never
// touches unrelated files a user placed in agents/ by hand, and it removes
// the agents/ directory itself only if that leaves it empty (plain rmdir,
// never recursive). It does not read or write config.toml — the
// [features] hooks flag is shared host state this script does not own.
//
// Schema per https://developers.openai.com/codex/subagents (verified
// 2026-07-08): required name/description/developer_instructions; a custom
// agent named like a built-in (e.g. explorer) takes precedence over it.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const UNINSTALL = args.includes('--uninstall');
const homeIdx = args.indexOf('--codex-home');
const CODEX_HOME = homeIdx >= 0 ? args[homeIdx + 1] : (process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
const DEST = path.join(CODEX_HOME, 'agents');

const AGENTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'agents');
const SANDBOX_DEFAULTS = {
  explorer: 'read-only',
  researcher: 'read-only',
  planner: 'workspace-write',
  coder: 'workspace-write',
};
const PRESERVE_KEYS = ['model', 'model_reasoning_effort', 'sandbox_mode', 'nickname_candidates'];

function fmField(block, key) {
  const m = block.match(new RegExp('^' + key + ':[ \\t]*(.*)$', 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

// --uninstall must never create the directory it is trying to remove.
if (!DRY && !UNINSTALL) fs.mkdirSync(DEST, { recursive: true });

for (const file of fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'))) {
  const src = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
  const fm = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fm) { console.error(`skip ${file}: no frontmatter`); continue; }

  const name = fmField(fm[1], 'name');

  if (UNINSTALL) {
    // Same name derivation as install, just aimed at removal — the set of
    // files this loop owns is exactly the set install would have written.
    const dest = path.join(DEST, `${name}.toml`);
    if (!fs.existsSync(dest)) {
      console.log(`skipped ${dest} (already absent)`);
      continue;
    }
    if (DRY) {
      console.log(`--- would remove ${dest}`);
      continue;
    }
    try {
      fs.unlinkSync(dest);
      console.log(`removed ${dest}`);
    } catch (err) {
      console.error(`failed ${dest}: ${err.message}`);
    }
    continue;
  }

  let description = fmField(fm[1], 'description') || '';
  // Strip Claude-style example blocks (literal \n escapes inside the YAML
  // string) and unescape what remains into plain prose.
  description = description.split('\\n\\n<example>')[0].replace(/\\n/g, ' ').replace(/\\"/g, '"').trim();
  const body = src.slice(fm[0].length).trim();
  if (body.includes("'''")) { console.error(`skip ${name}: body contains ''' (TOML literal delimiter)`); continue; }

  const dest = path.join(DEST, `${name}.toml`);
  const preserved = [];
  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, 'utf8');
    for (const key of PRESERVE_KEYS) {
      const m = existing.match(new RegExp('^' + key + ' *=.*$', 'm'));
      if (m) preserved.push(m[0]);
    }
    if (!DRY) fs.copyFileSync(dest, dest + '.bak');
  }
  if (!preserved.some((l) => l.startsWith('sandbox_mode')) && SANDBOX_DEFAULTS[name]) {
    preserved.push(`sandbox_mode = "${SANDBOX_DEFAULTS[name]}"`);
  }

  const toml = [
    `name = "${name}"`,
    `description = "${description.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`,
    ...preserved,
    `developer_instructions = '''`,
    body,
    `'''`,
    '',
  ].join('\n');

  if (DRY) {
    console.log(`--- would write ${dest} (${toml.length} bytes, preserved: ${preserved.join(' | ') || 'none'})`);
  } else {
    fs.writeFileSync(dest, toml);
    console.log(`wrote ${dest}${preserved.length ? '  (preserved: ' + preserved.map((l) => l.split(' ')[0]).join(', ') + ')' : ''}`);
  }
}

if (UNINSTALL && !DRY) {
  // Non-recursive on purpose — this only succeeds when every file we didn't
  // own is also gone, i.e. never for a directory the user is still using.
  try {
    fs.rmdirSync(DEST);
    console.log(`removed ${DEST} (empty)`);
  } catch (err) {
    if (err.code === 'ENOTEMPTY') {
      console.log(`left ${DEST} in place (not empty — files not owned by this installer remain)`);
    } else if (err.code !== 'ENOENT') {
      console.error(`warn: could not remove ${DEST}: ${err.message}`);
    }
  }
}
