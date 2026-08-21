// Guards Agent Plugins spec conformance (https://agent-plugins.org, 1.0.0):
// every dist plugin's root plugin.json matches the generator byte-for-byte
// and stays within the spec's closed schema; every plugin's skills sit as
// immediate children of skills/ (spec clients never recurse — a nested skill
// fails silently, which is exactly why this is a test); docket's spec
// mcp.json keeps the dialect the spec defines, not Claude's.
//
// And the exclusion that pays for all of it: a plugin shipping Codex hooks
// gets NO root manifest, because its presence is what makes Codex load the
// plugin through a loader that has no hooks (see carriesCodexHooks).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadComposition } from '../scripts/composition.mjs';
import { SPEC_SCHEMA, renderManifest, carriesCodexHooks } from '../scripts/generate-agent-manifests.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { plugins } = loadComposition(REPO_ROOT);
const PLUGIN_NAMES = Object.keys(plugins);
const hooksPlugins = PLUGIN_NAMES.filter((name) => carriesCodexHooks(REPO_ROOT, name));
const specPlugins = PLUGIN_NAMES.filter((name) => !carriesCodexHooks(REPO_ROOT, name));

// Spec name rule: 1–64 chars of [a-z0-9.-], alnum at both ends, no -- or ..
const NAME_PATTERN = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const ALLOWED_FIELDS = new Set([
  '$schema', 'name', 'version', 'description', 'author',
  'homepage', 'repository', 'license', 'keywords', 'extensions',
]);
const AUTHOR_KEYS = new Set(['name', 'email', 'url']);

test('no plugin ships both a root plugin.json and Codex hooks', () => {
  // The coupling, asserted rather than a name list: adding hooks to a
  // fourteenth plugin must fail here, not silently kill its hooks in the
  // field the way 8688e5b did to condux and concord for a week.
  const problems = [];
  for (const name of hooksPlugins) {
    if (fs.existsSync(path.join(REPO_ROOT, 'dist', 'plugins', name, 'plugin.json'))) {
      problems.push(
        `${name}: declares hooks in .codex-plugin/plugin.json AND ships a root plugin.json — ` +
          'Codex loads a plugin with a root manifest through the Agent Plugins loader, ' +
          'which never reads hooks. Re-run scripts/generate-agent-manifests.mjs (via sync).',
      );
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('every spec plugin root plugin.json matches the generator output byte-for-byte', () => {
  const problems = [];
  for (const name of specPlugins) {
    const root = path.join(REPO_ROOT, 'dist', 'plugins', name);
    const manifestFile = path.join(root, 'plugin.json');
    if (!fs.existsSync(manifestFile)) {
      problems.push(`${name}: missing root plugin.json`);
      continue;
    }
    const claude = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
    if (fs.readFileSync(manifestFile, 'utf8') !== renderManifest(claude)) {
      problems.push(`${name}: root plugin.json differs from generator output`);
    }
  }
  assert.deepEqual(problems, [], 'run scripts/generate-agent-manifests.mjs (via sync):\n' + problems.join('\n'));
});

test('every root manifest stays inside the spec closed schema', () => {
  const problems = [];
  for (const name of specPlugins) {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'dist', 'plugins', name, 'plugin.json'), 'utf8'),
    );
    if (manifest.$schema !== SPEC_SCHEMA) problems.push(`${name}: wrong $schema`);
    if (typeof manifest.name !== 'string' || manifest.name.length > 64 || !NAME_PATTERN.test(manifest.name)) {
      problems.push(`${name}: name ${JSON.stringify(manifest.name)} violates the spec pattern`);
    }
    for (const field of Object.keys(manifest)) {
      if (!ALLOWED_FIELDS.has(field)) problems.push(`${name}: field "${field}" is outside the closed schema`);
    }
    for (const key of Object.keys(manifest.author ?? {})) {
      if (!AUTHOR_KEYS.has(key)) problems.push(`${name}: author key "${key}" — spec allows name/email/url only`);
    }
    if (manifest.keywords !== undefined && !(Array.isArray(manifest.keywords) && manifest.keywords.every((k) => typeof k === 'string'))) {
      problems.push(`${name}: keywords must be a string array`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('every plugin exposes its full skill set at skills/ depth one', () => {
  // Spec clients discover a skill only when skills/<child>/SKILL.md exists;
  // both a missing skill and an extra nested dir are conformance breaks.
  const problems = [];
  for (const [name, plugin] of Object.entries(plugins)) {
    const declared = (plugin.bundle ? plugin.skills : [name]).slice().sort();
    const skillsDir = path.join(REPO_ROOT, 'dist', 'plugins', name, 'skills');
    const children = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    if (JSON.stringify(children) !== JSON.stringify(declared)) {
      problems.push(`${name}: skills/ children [${children}] != declared [${declared}]`);
      continue;
    }
    for (const child of children) {
      if (!fs.existsSync(path.join(skillsDir, child, 'SKILL.md'))) {
        problems.push(`${name}: skills/${child}/ has no SKILL.md — invisible to spec discovery`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('docket ships a spec mcp.json in the spec dialect', () => {
  const file = path.join(REPO_ROOT, 'dist', 'plugins', 'docket', 'mcp.json');
  const mcp = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(
    Object.keys(mcp).sort(),
    ['$schema', 'mcpServers'],
    'spec mcp.json allows only $schema and mcpServers at top level',
  );
  const server = mcp.mcpServers.docket;
  assert.equal(server.type, 'stdio', 'spec dialect requires an explicit type');
  assert.equal(server.command, 'node', 'command must be one executable token');
  assert.ok(
    server.args.some((a) => a.includes('${PLUGIN_ROOT}')),
    'args must locate the server via the spec variable ${PLUGIN_ROOT}, not ${CLAUDE_PLUGIN_ROOT}',
  );
  // The Claude dialect stays untouched beside it.
  const claude = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'dist', 'plugins', 'docket', '.mcp.json'), 'utf8'));
  assert.ok(
    claude.mcpServers.docket.args.some((a) => a.includes('${CLAUDE_PLUGIN_ROOT}')),
    "Claude's .mcp.json keeps its own variable grammar",
  );
});
