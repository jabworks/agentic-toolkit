import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedBytes } from '../scripts/fold-plugins.mjs';
import { splitFrontmatter, decodeScalar } from '../scripts/build-opencode.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const DIST_DIR = path.join(REPO_ROOT, 'dist', 'plugins');

function listFilesRelative(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFilesRelative(full, base, out);
    else out.push(path.relative(base, full));
  }
  return out.sort();
}

// dist/ mirrors skills/ through the fold: the top-level SKILL.md has when_to_use
// folded into description (docket #115), every other file is byte-identical.
test('every skill with a dist target mirrors its skills/ source through the fold', () => {
  const names = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const mismatches = [];
  let checked = 0;

  for (const name of names) {
    const src = path.join(SKILLS_DIR, name);
    // Bundle target: dist/plugins/<p>/skills/<p>/<name> for any bundle plugin <p>
    // (condux, toolkit-ops, …); standalone target: dist/plugins/<name>/skills/<name>.
    const bundleDst = fs.readdirSync(DIST_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(DIST_DIR, e.name, 'skills', e.name, name))
      .find((p) => fs.existsSync(p));
    const standaloneDst = path.join(DIST_DIR, name, 'skills', name);
    const dst = bundleDst ?? (fs.existsSync(standaloneDst) ? standaloneDst : null);

    if (!dst) continue; // matches scripts/sync.sh's own SKIP behavior for un-scaffolded skills

    checked++;
    const srcFiles = listFilesRelative(src);
    const dstFiles = listFilesRelative(dst);

    if (JSON.stringify(srcFiles) !== JSON.stringify(dstFiles)) {
      mismatches.push(name + ': file lists differ\n  src: ' + srcFiles.join(', ') + '\n  dst: ' + dstFiles.join(', '));
      continue;
    }
    for (const rel of srcFiles) {
      const a = expectedBytes(path.join(src, rel), rel);
      const b = fs.readFileSync(path.join(dst, rel));
      if (!a.equals(b)) mismatches.push(name + ': ' + rel + ' differs from its dist mirror');
    }
  }

  assert.ok(checked > 0, 'expected at least one skill with a dist target to check');
  assert.deepEqual(mismatches, [], 'dist/ has drifted from skills/ — run scripts/sync.sh:\n' + mismatches.join('\n'));
});

// Reverse direction: sync.sh and the mirror check above only walk skills/ sources,
// so a skill deleted from skills/ would leave a live orphan in dist/ that still
// ships to marketplace installs. Assert every dist skill dir has a skills/ source.
test('every dist skill dir has a skills/ source (no orphans after a retirement)', () => {
  const sourceNames = new Set(
    fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name),
  );

  const orphans = [];
  for (const plugin of fs.readdirSync(DIST_DIR, { withFileTypes: true })) {
    if (!plugin.isDirectory()) continue;
    const skillsRoot = path.join(DIST_DIR, plugin.name, 'skills');
    if (!fs.existsSync(skillsRoot)) continue;
    // Bundle layout nests skill dirs under skills/<plugin>/; standalone layout has
    // the single skill dir directly under skills/.
    const bundleRoot = path.join(skillsRoot, plugin.name);
    const isBundle = fs.existsSync(bundleRoot) && !fs.existsSync(path.join(bundleRoot, 'SKILL.md'));
    const dirsToCheck = isBundle
      ? fs.readdirSync(bundleRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(plugin.name, e.name))
      : fs.readdirSync(skillsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    for (const rel of dirsToCheck) {
      const skillName = path.basename(rel);
      if (!sourceNames.has(skillName)) {
        orphans.push(`dist/plugins/${plugin.name}/skills/${rel} — no skills/${skillName} source`);
      }
    }
  }
  assert.deepEqual(orphans, [], 'orphaned dist skill dirs (delete them or restore the source):\n' + orphans.join('\n'));
});

// Codex reads only `description` (docket #115), so a when_to_use that survives
// into dist/plugins is trigger text Codex never sees. 1024 is the cap the
// OpenCode and Cursor folds already hold.
const MAX_FOLDED_DESCRIPTION = 1024;

test('every dist/plugins SKILL.md is folded: no when_to_use, description within the cap', () => {
  const problems = [];
  let checked = 0;
  for (const plugin of fs.readdirSync(DIST_DIR, { withFileTypes: true })) {
    if (!plugin.isDirectory()) continue;
    const skillsDir = path.join(DIST_DIR, plugin.name, 'skills');
    if (!fs.existsSync(skillsDir)) continue;
    for (const skill of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      const file = path.join(skillsDir, skill.name, 'SKILL.md');
      if (!skill.isDirectory() || !fs.existsSync(file)) continue;
      checked++;
      const rel = path.relative(REPO_ROOT, file);
      const { entries } = splitFrontmatter(fs.readFileSync(file, 'utf8'), rel);
      if (entries.some((e) => e.key === 'when_to_use')) problems.push(`${rel}: when_to_use survived the fold`);
      const description = entries.find((e) => e.key === 'description');
      const length = description ? decodeScalar(description.raw).length : 0;
      if (length > MAX_FOLDED_DESCRIPTION) problems.push(`${rel}: folded description ${length} chars (> ${MAX_FOLDED_DESCRIPTION})`);
    }
  }
  assert.ok(checked > 0, 'expected dist/plugins skills to check');
  assert.deepEqual(problems, [], 'unfolded or oversized dist skills — run scripts/sync.sh:\n' + problems.join('\n'));
});
