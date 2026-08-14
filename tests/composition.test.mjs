import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadComposition } from '../scripts/composition.mjs';
import { renderMarketplace, renderBlock } from '../scripts/generate-catalogs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// The generic mirror guard (docket #11). Bundle membership and the
// plugin-level dirs used to be guarded by three bespoke tests, each written
// after its own blind-spot incident (6ba6572 for agents/, 2026-08-05 for
// hooks/, docket-server for server/). composition.json now declares every
// source→dest pair, so one test guards them all — including pairs that don't
// exist yet. The bespoke tests keep their behavioral assertions (hook wire
// formats, .mcp.json registration, dependency rules); only mirroring lives
// here.

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test('composition.json is valid against the working tree', () => {
  const { plugins, syncPairs } = loadComposition(REPO_ROOT);
  assert.ok(Object.keys(plugins).length >= 12, 'expected at least the 12 shipped plugins');
  assert.ok(syncPairs.length > Object.keys(plugins).length, 'expected pairs for skills and pluginDirs');
});

test('every declared source→dest pair mirrors byte-for-byte', () => {
  const { syncPairs } = loadComposition(REPO_ROOT);
  const problems = [];
  for (const { src, dest } of syncPairs) {
    const srcDir = path.join(REPO_ROOT, src);
    const destDir = path.join(REPO_ROOT, dest);
    if (!fs.existsSync(destDir)) {
      problems.push(`${dest}: missing — run scripts/sync.sh`);
      continue;
    }
    const srcFiles = walk(srcDir).map((f) => path.relative(srcDir, f));
    const destFiles = walk(destDir).map((f) => path.relative(destDir, f));
    if (srcFiles.join('\n') !== destFiles.join('\n')) {
      problems.push(`${dest}: file list differs from ${src} — run scripts/sync.sh`);
      continue;
    }
    for (const rel of srcFiles) {
      if (!fs.readFileSync(path.join(srcDir, rel)).equals(fs.readFileSync(path.join(destDir, rel)))) {
        problems.push(`${dest}/${rel}: drifted from ${src}/${rel} — run scripts/sync.sh`);
      }
    }
  }
  assert.deepEqual(problems, [], 'declared mirrors drifted:\n' + problems.join('\n'));
});

test('nothing undeclared exists at any plugin root in dist/', () => {
  // The inverse guard: a dir that appears in dist/plugins/<p>/ without a
  // declaration is exactly the hand-maintained state the declaration exists
  // to kill. Files are legitimate only as plugin-level copies (plugins/<p>/*
  // via sync_plugin_files) or the repo LICENSE.
  const { plugins } = loadComposition(REPO_ROOT);
  const problems = [];
  for (const [name, plugin] of Object.entries(plugins)) {
    const root = path.join(REPO_ROOT, 'dist', 'plugins', name);
    const declaredDirs = new Set(['skills', '.claude-plugin', '.codex-plugin',
      ...Object.values(plugin.pluginDirs ?? {})]);
    const pluginSrc = path.join(REPO_ROOT, 'plugins', name);
    const pluginFiles = new Set(
      fs.existsSync(pluginSrc) ? fs.readdirSync(pluginSrc) : [],
    );
    pluginFiles.add('LICENSE');
    // Root plugin.json is the generated Agent Plugins manifest
    // (scripts/generate-agent-manifests.mjs, byte-guarded by
    // tests/agent-plugins.test.mjs) — the one root file with a generator,
    // not a plugins/<name>/ source.
    pluginFiles.add('plugin.json');

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!declaredDirs.has(entry.name)) {
          problems.push(`dist/plugins/${name}/${entry.name}/: undeclared plugin-level dir`);
        }
      } else if (!pluginFiles.has(entry.name)) {
        problems.push(`dist/plugins/${name}/${entry.name}: not sourced from plugins/${name}/`);
      }
    }
  }
  assert.deepEqual(problems, [], 'undeclared dist content:\n' + problems.join('\n'));
});

test('marketplace.json matches the generator output byte-for-byte', () => {
  const composition = loadComposition(REPO_ROOT);
  const committed = fs.readFileSync(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8');
  assert.equal(committed, renderMarketplace(composition),
    'marketplace.json drifted from composition.json — run scripts/sync.sh');
});

test('README.md and CLAUDE.md catalog blocks match the generator output', () => {
  const composition = loadComposition(REPO_ROOT);
  const files = {
    'README.md': ['readme-skills', 'readme-condux', 'readme-toolkit-ops'],
    'CLAUDE.md': ['claude-md-skills'],
  };
  const problems = [];
  for (const [file, ids] of Object.entries(files)) {
    const content = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
    for (const id of ids) {
      const begin = `<!-- catalog:begin ${id} -->`;
      const end = `<!-- catalog:end ${id} -->`;
      const beginAt = content.indexOf(begin);
      const endAt = content.indexOf(end);
      if (beginAt === -1 || endAt === -1 || endAt < beginAt) {
        problems.push(`${file}: missing or unpaired markers for "${id}"`);
        continue;
      }
      const interior = content.slice(beginAt + begin.length, endAt).replace(/^\n/, '').replace(/\n$/, '');
      if (interior !== renderBlock(id, composition)) {
        problems.push(`${file}: block "${id}" drifted from composition.json — run scripts/sync.sh`);
      }
    }
  }
  assert.deepEqual(problems, [], 'catalog blocks drifted:\n' + problems.join('\n'));
});

test('loadComposition rejects a broken declaration with named problems', () => {
  // Fixture carries one of each violation class; the messages are the UX of
  // the whole gate, so they are asserted, not just the throw.
  const fixture = path.join(__dirname, 'fixtures', 'composition', 'bad');
  let err;
  try {
    loadComposition(fixture);
  } catch (e) {
    err = e;
  }
  assert.ok(err, 'expected the bad fixture to be rejected');
  const all = err.problems.join('\n');
  assert.match(all, /ghost-skill: declared skill has no source dir/, 'missing source dir not reported');
  assert.match(all, /skills\/orphan: not declared/, 'undeclared on-disk skill not reported');
  assert.match(all, /no-blurb: missing marketplace.description/, 'missing description not reported');
  assert.match(all, /no-blurb: no row in any README catalog block/, 'missing catalog row not reported');
});
