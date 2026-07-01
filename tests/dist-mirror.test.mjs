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
    const conduxDst = path.join(DIST_DIR, 'condux', 'skills', 'condux', name);
    const standaloneDst = path.join(DIST_DIR, name, 'skills', name);
    const dst = fs.existsSync(conduxDst) ? conduxDst : fs.existsSync(standaloneDst) ? standaloneDst : null;

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
