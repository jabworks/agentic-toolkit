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
// Schema per https://developers.openai.com/codex/subagents (verified
// 2026-07-08): required name/description/developer_instructions; a custom
// agent named like a built-in (e.g. explorer) takes precedence over it.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
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

if (!DRY) fs.mkdirSync(DEST, { recursive: true });

for (const file of fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'))) {
  const src = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
  const fm = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fm) { console.error(`skip ${file}: no frontmatter`); continue; }

  const name = fmField(fm[1], 'name');
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
