#!/usr/bin/env node
// Loader + validator for composition.json — the declared source of truth for
// what every plugin is made of (docket #11).
//
// Before this file, sync.sh inferred bundle membership by probing dist/ for an
// existing target directory (so dist/ was partly its own source of truth, and
// a new skill silently printed SKIP), and the plugin-level dirs were three
// hardcoded name checks — the `6ba6572` blind-spot shape, three times over.
// Now the declaration is data: a skill or dir missing from composition.json is
// a hard error here, not a quiet no-op there.
//
// The same file feeds scripts/generate-catalogs.mjs (docket #12), which emits
// .claude-plugin/marketplace.json and the catalog table blocks in README.md /
// CLAUDE.md — so registering a plugin and cataloguing it are one data edit.
//
// Dependency-free on purpose: gates scripts/sync.sh and the pre-commit hook,
// which must work in a fresh clone with no node_modules.
//
// Usage:
//   node scripts/composition.mjs            # validate, print a summary
//   node scripts/composition.mjs --pairs    # print "src<TAB>dest" sync pairs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Plugin-level files that sync_plugin_files copies into every plugin root —
// a pluginDir dest colliding with one of these would give the dest two writers.
const PLUGIN_FILE_NAMES = new Set(['README.md', 'LICENSE', 'INSTALL.md', 'UNINSTALL.md']);

/**
 * Load composition.json, validate it against the working tree, and expand the
 * declared sync pairs. Throws with every problem listed when invalid.
 *
 * Returns { plugins, catalogs, syncPairs } where syncPairs is
 * [{ src, dest }] of repo-relative paths, in declaration order.
 */
export function loadComposition(repoRoot = REPO_ROOT) {
  const file = path.join(repoRoot, 'composition.json');
  const composition = JSON.parse(fs.readFileSync(file, 'utf8'));
  const problems = [];
  const syncPairs = [];
  const claimedSkills = new Map(); // skill name → plugin that claims it
  const seenDests = new Set();

  const plugins = composition.plugins ?? {};
  const catalogs = composition.catalogs ?? {};

  for (const [name, plugin] of Object.entries(plugins)) {
    const skills = plugin.bundle ? plugin.skills ?? [] : [name];
    if (plugin.bundle && skills.length === 0) {
      problems.push(`${name}: bundle with no skills[]`);
    }
    if (!plugin.bundle && plugin.skills) {
      problems.push(`${name}: standalone plugins must not declare skills[] (implied [${name}])`);
    }

    for (const skill of skills) {
      if (claimedSkills.has(skill)) {
        problems.push(`skills/${skill}: claimed by both ${claimedSkills.get(skill)} and ${name}`);
      }
      claimedSkills.set(skill, name);
      const src = `skills/${skill}`;
      const dest = `dist/plugins/${name}/skills/${name}${plugin.bundle ? `/${skill}` : ''}`;
      if (!fs.existsSync(path.join(repoRoot, src))) {
        problems.push(`${name}: declared skill has no source dir: ${src}`);
      }
      syncPairs.push({ src, dest });
      seenDests.add(dest);
    }

    for (const [src, destName] of Object.entries(plugin.pluginDirs ?? {})) {
      if (PLUGIN_FILE_NAMES.has(destName)) {
        problems.push(`${name}: pluginDir dest "${destName}" collides with a plugin-level file name`);
      }
      const dest = `dist/plugins/${name}/${destName}`;
      if (!fs.existsSync(path.join(repoRoot, src))) {
        problems.push(`${name}: declared pluginDir has no source dir: ${src}`);
      }
      if (seenDests.has(dest)) {
        problems.push(`${name}: duplicate dest ${dest}`);
      }
      syncPairs.push({ src, dest });
      seenDests.add(dest);
    }

    const desc = plugin.marketplace?.description;
    if (typeof desc !== 'string' || desc.trim() === '') {
      problems.push(`${name}: missing marketplace.description`);
    }
  }

  // Every skill source dir on disk must be claimed by exactly one plugin —
  // this is what replaces sync.sh's silent SKIP for unregistered skills.
  const onDisk = fs
    .readdirSync(path.join(repoRoot, 'skills'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const skill of onDisk) {
    if (!claimedSkills.has(skill)) {
      problems.push(`skills/${skill}: not declared in composition.json — add it to a plugin`);
    }
  }

  // Every plugin must be catalogued: ≥1 row in the README-family blocks and
  // ≥1 row in the claude-md block. A bundle counts via any member skill's row
  // or a row naming the plugin itself. This is docs-catalog.test.mjs's old
  // contract, enforced at declaration time instead of after the fact.
  const readmeRowNames = new Set(
    ['readme-skills', 'readme-condux', 'readme-toolkit-ops'].flatMap(
      (id) => (catalogs[id]?.rows ?? []).map((r) => r.skill),
    ),
  );
  const claudeMdEntries = (catalogs['claude-md-skills']?.rows ?? []).map((r) => r.entry ?? '');
  for (const [name, plugin] of Object.entries(plugins)) {
    const members = plugin.bundle ? plugin.skills ?? [] : [name];
    if (!readmeRowNames.has(name) && !members.some((s) => readmeRowNames.has(s))) {
      problems.push(`${name}: no row in any README catalog block`);
    }
    if (!claudeMdEntries.some((e) => e.includes(`\`${name}\``))) {
      problems.push(`${name}: no \`${name}\` row in the claude-md-skills block`);
    }
  }

  for (const [id, block] of Object.entries(catalogs)) {
    for (const row of block.rows ?? []) {
      const label = row.skill ?? row.entry;
      if (!label || typeof row.blurb !== 'string' || row.blurb.trim() === '') {
        problems.push(`catalog ${id}: row "${label ?? '?'}" needs a non-empty blurb`);
      }
      if (row.skill && !claimedSkills.has(row.skill)) {
        problems.push(`catalog ${id}: row "${row.skill}" is not a declared skill`);
      }
    }
  }

  if (problems.length > 0) {
    const err = new Error(`composition.json is invalid:\n  ${problems.join('\n  ')}`);
    err.problems = problems;
    throw err;
  }

  return { plugins, catalogs, syncPairs };
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  let composition;
  try {
    composition = loadComposition();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  if (process.argv.includes('--pairs')) {
    for (const { src, dest } of composition.syncPairs) {
      process.stdout.write(`${src}\t${dest}\n`);
    }
  } else {
    const n = Object.keys(composition.plugins).length;
    console.log(`composition.json OK — ${n} plugins, ${composition.syncPairs.length} sync pairs`);
  }
}
