import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PLUGIN_SRC = path.join(REPO_ROOT, 'plugins');
const DIST = path.join(REPO_ROOT, 'dist', 'plugins');

const marketplace = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'),
);
const plugins = marketplace.plugins.map((entry) => entry.name);

// Plugin-level files are outside every skill tree, so the skill copy never
// reaches them. That is the shape that drifted twice already: condux's README
// was hand-written into dist/ with no source, and docket shipped with no
// LICENSE because nothing checked.
test('every marketplace plugin has a README source', () => {
  const missing = plugins.filter((plugin) => !fs.existsSync(path.join(PLUGIN_SRC, plugin, 'README.md')));

  assert.deepEqual(missing, [], 'add plugins/<name>/README.md — it is the plugin homepage');
});

test('each plugin README in dist is a verbatim copy of its source', () => {
  for (const plugin of plugins) {
    const source = path.join(PLUGIN_SRC, plugin, 'README.md');
    const mirror = path.join(DIST, plugin, 'README.md');

    assert.ok(fs.existsSync(mirror), `${plugin}: dist README missing — run scripts/sync.sh`);
    assert.equal(
      fs.readFileSync(mirror, 'utf8'),
      fs.readFileSync(source, 'utf8'),
      `${plugin}: dist README differs from its source — never hand-edit dist/`,
    );
  }
});

test('every plugin ships the repo LICENSE, byte for byte', () => {
  const license = fs.readFileSync(path.join(REPO_ROOT, 'LICENSE'), 'utf8');

  for (const plugin of plugins) {
    const shipped = path.join(DIST, plugin, 'LICENSE');

    assert.ok(fs.existsSync(shipped), `${plugin}: no LICENSE — run scripts/sync.sh`);
    assert.equal(fs.readFileSync(shipped, 'utf8'), license, `${plugin}: LICENSE differs from the repo root`);
  }
});

// The hand-written skills table is the part that goes stale: condux's README
// claimed 12 skills while the plugin shipped 14, and the npm package README
// said 12 while bundling 13. A README that omits a skill is a homepage that
// undersells the plugin.
test('a bundle README names every skill the bundle ships', () => {
  const stale = [];

  for (const plugin of plugins) {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(DIST, plugin, '.claude-plugin', 'plugin.json'), 'utf8'),
    );
    const skillsRoot = path.join(DIST, plugin, manifest.skills.replace(/^\.\//, ''));
    if (!fs.existsSync(skillsRoot)) continue;

    const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
    // A standalone plugin has SKILL.md directly in that directory; a bundle has
    // one subdirectory per skill.
    if (entries.some((entry) => entry.name === 'SKILL.md')) continue;

    const readme = fs.readFileSync(path.join(PLUGIN_SRC, plugin, 'README.md'), 'utf8');
    for (const skill of entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {
      if (!readme.includes(skill)) stale.push(`${plugin}: README does not mention ${skill}`);
    }
  }

  assert.deepEqual(stale, []);
});
