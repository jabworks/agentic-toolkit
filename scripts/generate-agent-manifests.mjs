#!/usr/bin/env node
// Generates each plugin's root plugin.json — the Agent Plugins manifest
// (https://agent-plugins.org, spec 1.0.0). Spec clients (Cursor among them)
// detect an Agent Plugin by this file and discover skills as immediate
// children of skills/, which is why the bundles ship flat.
//
// Derived from .claude-plugin/plugin.json — the richer manifest — emitting
// only the spec's CLOSED field set: an unknown top-level field is a schema
// violation the client reports, so nothing host-specific (skills path,
// interface, hooks) may leak through. Never hand-edit the output;
// tests/agent-plugins.test.mjs byte-guards it against this generator.
//
// NOT emitted for a plugin that ships Codex hooks — see carriesCodexHooks.
//
// Dependency-free: runs from scripts/sync.sh alongside generate-catalogs.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadComposition } from './composition.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SPEC_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';

// The spec's portable top-level fields, minus $schema (constant) and the ones
// we have no source for (homepage) or that carry client-specific data
// (extensions). Order fixed so output is byte-stable.
const FIELDS = ['name', 'version', 'description', 'author', 'repository', 'license', 'keywords'];

export function emitManifest(claude) {
  const out = { $schema: SPEC_SCHEMA };
  for (const field of FIELDS) {
    if (claude[field] !== undefined) out[field] = claude[field];
  }
  return out;
}

export function renderManifest(claude) {
  return JSON.stringify(emitManifest(claude), null, 2) + '\n';
}

/**
 * True when the plugin declares Codex hooks, which makes a root plugin.json
 * unshippable for it.
 *
 * Codex selects its plugin loader by root-manifest PRESENCE: with this file on
 * disk the Agent Plugins loader takes the plugin, and that loader has no hooks
 * support at all — `.codex-plugin/plugin.json`'s `hooks` field is never read,
 * a `hooks` field on the root manifest is "ignored unknown Agent Plugins
 * manifest field", `extensions` only carries the com.openai tools keys, and
 * even the conventional hooks/hooks.json path stays dark. Verified against
 * Codex 0.149.0 (2026-08-21): removing this file took condux from 0 to 2 live
 * hooks and concord from 0 to 2, restoring both. Shipping the manifest anyway
 * is what silently disabled them from 8688e5b onward.
 *
 * Derived, never declared: the fact already lives in the Codex manifest, and a
 * second flag in composition.json could disagree with it.
 */
export function carriesCodexHooks(repoRoot, name) {
  const file = path.join(repoRoot, 'dist', 'plugins', name, '.codex-plugin', 'plugin.json');
  if (!fs.existsSync(file)) return false;
  return JSON.parse(fs.readFileSync(file, 'utf8')).hooks !== undefined;
}

export function build(repoRoot = REPO_ROOT) {
  const { plugins } = loadComposition(repoRoot);
  let count = 0;
  let skipped = 0;
  for (const name of Object.keys(plugins)) {
    const manifestFile = path.join(repoRoot, 'dist', 'plugins', name, 'plugin.json');
    if (carriesCodexHooks(repoRoot, name)) {
      // Clear a manifest left behind by an earlier build or a hooks addition.
      fs.rmSync(manifestFile, { force: true });
      skipped++;
      continue;
    }
    const claudeFile = path.join(repoRoot, 'dist', 'plugins', name, '.claude-plugin', 'plugin.json');
    const claude = JSON.parse(fs.readFileSync(claudeFile, 'utf8'));
    fs.writeFileSync(manifestFile, renderManifest(claude));
    count++;
  }
  return { count, skipped };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { count, skipped } = build();
  console.log(
    `generated ${count} root plugin.json manifests (Agent Plugins 1.0.0)` +
      (skipped ? `, skipped ${skipped} carrying Codex hooks` : ''),
  );
}
