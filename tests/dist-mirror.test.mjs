import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

test('every skill with a dist target is a verbatim mirror of its skills/ source', () => {
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
      const a = fs.readFileSync(path.join(src, rel));
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
