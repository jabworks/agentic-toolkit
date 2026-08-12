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

// The README assertion above covers the one file every plugin has. This covers
// the rest: condux ships INSTALL.md and install.mjs at plugin level, and the
// sync step copies whatever is there rather than a hardcoded list of names. A
// plugin-level file with no dist copy is a file that never reaches the
// marketplace, and nothing else in the suite would notice.
test('every plugin-level file has a byte-identical dist copy', () => {
  for (const plugin of plugins) {
    const source = path.join(PLUGIN_SRC, plugin);
    if (!fs.existsSync(source)) continue;

    const files = fs
      .readdirSync(source, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);

    for (const file of files) {
      const mirror = path.join(DIST, plugin, file);

      assert.ok(fs.existsSync(mirror), `${plugin}/${file}: no dist copy — run scripts/sync.sh`);
      assert.equal(
        fs.readFileSync(mirror, 'utf8'),
        fs.readFileSync(path.join(source, file), 'utf8'),
        `${plugin}/${file}: dist copy differs from its source — never hand-edit dist/`,
      );
    }
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

// A procedure a user cannot find is a procedure they do not run. condux got a
// plugin-level front door when its installers were scattered inside skills;
// docket's and concord's stayed four levels down, inside a skill, while the
// plugin homepage sat at the root. The rule generalises the fix rather than
// naming the plugins: if the story is written down anywhere in the shipped tree,
// the plugin root is one of the places it is written down.
//
// Both kinds of front door are covered by the same rule, because the removal
// half went missing in exactly the way the install half did. A third kind later
// costs one array entry, not a fourth test.
const FRONT_DOOR_DOCS = ['INSTALL.md', 'UNINSTALL.md'];

test('a plugin whose install or removal procedure is buried also has one at its root', () => {
  const problems = [];

  for (const plugin of plugins) {
    const root = path.join(DIST, plugin);
    if (!fs.existsSync(root)) continue;

    const tree = fs.readdirSync(root, { recursive: true }).map((entry) => entry.split(path.sep).join('/'));

    for (const doc of FRONT_DOOR_DOCS) {
      const shipped = tree.filter((entry) => path.posix.basename(entry) === doc);
      if (shipped.length === 0) continue;

      // Both halves matter, and checking dist alone covers neither properly. A
      // missing root copy is the buried-procedure bug this test is named for; a
      // root copy with no editable source is condux's hand-written README all
      // over again — sync.sh would never touch it, and the byte-identical test
      // above iterates sources, so a dist-only file is invisible to every other
      // assertion in this file.
      if (!shipped.includes(doc)) {
        problems.push(`${plugin}: ships ${shipped.join(', ')} but no ${doc} at the plugin root`);
        continue;
      }

      if (!fs.existsSync(path.join(PLUGIN_SRC, plugin, doc))) {
        problems.push(`${plugin}: dist has a root ${doc} with no source — never hand-write into dist/`);
      }
    }
  }

  assert.deepEqual(problems, [], 'add plugins/<name>/<doc> — a front door pointing at the deep procedure');
});

// The placement rule above only fires when a document of that kind exists
// somewhere in the tree, which silently exempts UNINSTALL.md: no plugin has a
// buried one (concord's removal steps live inside its deep INSTALL.md, docket's
// did not exist), so deleting all three front doors passed it. Placement was
// guarded; existence was not.
//
// The convention is that the two halves ship as a pair — a plugin that tells a
// user how to register something owes them the reverse. Keyed off the install
// front door rather than a hardcoded plugin list, so a new plugin inherits the
// obligation the moment it gains an installer.
test('a plugin with an install front door also ships a removal one', () => {
  const missing = plugins.filter(
    (plugin) =>
      fs.existsSync(path.join(PLUGIN_SRC, plugin, 'INSTALL.md')) &&
      !fs.existsSync(path.join(PLUGIN_SRC, plugin, 'UNINSTALL.md')),
  );

  assert.deepEqual(missing, [], 'add plugins/<name>/UNINSTALL.md — the removal half of the convention');
});

// The front door's whole job is naming where the real procedure lives, so a
// stale path in it is worse than no front door — it sends an agent somewhere
// that does not exist. Every repo-relative path it cites must resolve against
// the plugin root a user actually lands on, which is the dist tree, not this one.
test('every path a plugin-level front door cites resolves in its dist tree', () => {
  // Placeholders the reader substitutes, host config on the reader's machine,
  // and absolute paths are all claims about somewhere else — not about this tree.
  const PLACEHOLDER = /[<>${}*~]/;
  const PATH_TOKEN = /`([^`\s]*\/[^`\s]*\.[a-z]+)`/g;
  const INVOCATION = /\b(?:node|bash|sh)\s+([^\s`"']*\/[^\s`"']*\.(?:mjs|js|sh))/g;
  const dangling = [];

  for (const plugin of plugins) {
    for (const doc of FRONT_DOOR_DOCS) {
      const front = path.join(PLUGIN_SRC, plugin, doc);
      if (!fs.existsSync(front)) continue;

      const src = fs.readFileSync(front, 'utf8');
      const cited = new Set(
        [...src.matchAll(PATH_TOKEN), ...src.matchAll(INVOCATION)]
          .map((m) => m[1])
          .filter((token) => !PLACEHOLDER.test(token) && !token.startsWith('/')),
      );

      for (const token of cited) {
        // A front door may cite its own source location as well as the shipped
        // path — resolve against the repo root too, or every "edit the source,
        // never the mirror" note reads as a dangling link.
        if (fs.existsSync(path.join(DIST, plugin, token))) continue;
        if (fs.existsSync(path.join(REPO_ROOT, token))) continue;

        dangling.push(`${plugin}/${doc} cites ${token}, which resolves nowhere`);
      }
    }
  }

  assert.deepEqual(dangling, []);
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
