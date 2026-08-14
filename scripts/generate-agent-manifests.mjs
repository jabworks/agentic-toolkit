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

export function build(repoRoot = REPO_ROOT) {
  const { plugins } = loadComposition(repoRoot);
  let count = 0;
  for (const name of Object.keys(plugins)) {
    const claudeFile = path.join(repoRoot, 'dist', 'plugins', name, '.claude-plugin', 'plugin.json');
    const claude = JSON.parse(fs.readFileSync(claudeFile, 'utf8'));
    fs.writeFileSync(path.join(repoRoot, 'dist', 'plugins', name, 'plugin.json'), renderManifest(claude));
    count++;
  }
  return { count };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { count } = build();
  console.log(`generated ${count} root plugin.json manifests (Agent Plugins 1.0.0)`);
}
