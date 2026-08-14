// Guards the Cursor-facing skill distribution: dist/cursor/skills/ must match
// scripts/build-cursor.mjs output exactly — same transform as the OpenCode
// tree (fold when_to_use into description), separate tree so the channels can
// drift deliberately, never accidentally.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SKILLS_DIR, splitFrontmatter, decodeScalar, transformSkill } from '../scripts/build-opencode.mjs';
import { CURSOR_SKILLS_DIR } from '../scripts/build-cursor.mjs';

const skillNames = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

function listFilesRelative(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFilesRelative(full, base, out);
    else out.push(path.relative(base, full));
  }
  return out.sort();
}

test('dist/cursor/skills matches the generator output for every skill', () => {
  const mismatches = [];
  for (const name of skillNames) {
    const src = path.join(SKILLS_DIR, name);
    const dst = path.join(CURSOR_SKILLS_DIR, name);
    if (!fs.existsSync(dst)) {
      mismatches.push(`${name}: missing from dist/cursor/skills`);
      continue;
    }
    const srcFiles = listFilesRelative(src);
    const dstFiles = listFilesRelative(dst);
    if (JSON.stringify(srcFiles) !== JSON.stringify(dstFiles)) {
      mismatches.push(`${name}: file lists differ`);
      continue;
    }
    for (const rel of srcFiles) {
      const srcContent = fs.readFileSync(path.join(src, rel));
      const dstContent = fs.readFileSync(path.join(dst, rel));
      if (rel === 'SKILL.md') {
        const expected = transformSkill(srcContent.toString('utf8'), `skills/${name}`);
        if (dstContent.toString('utf8') !== expected) {
          mismatches.push(`${name}: ${rel} differs from transform output`);
        }
      } else if (!srcContent.equals(dstContent)) {
        mismatches.push(`${name}: ${rel} not byte-identical`);
      }
    }
  }
  assert.deepEqual(mismatches, [], 'dist/cursor has drifted — run scripts/build-cursor.mjs:\n' + mismatches.join('\n'));
});

test('no orphaned skill dirs in dist/cursor/skills', () => {
  const orphans = fs.readdirSync(CURSOR_SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !skillNames.includes(e.name))
    .map((e) => e.name);
  assert.deepEqual(orphans, [], 'orphaned dirs in dist/cursor/skills: ' + orphans.join(', '));
});

test('transformed frontmatter fits the Cursor contract', () => {
  const problems = [];
  for (const name of skillNames) {
    const skillPath = path.join(CURSOR_SKILLS_DIR, name, 'SKILL.md');
    const { entries } = splitFrontmatter(fs.readFileSync(skillPath, 'utf8'), name);
    if (entries.some((e) => e.key === 'when_to_use')) {
      problems.push(`${name}: when_to_use survived the transform — Cursor never reads it`);
    }
    // Cursor requires frontmatter name == folder name; the transform must not
    // have disturbed it.
    const nameEntry = entries.find((e) => e.key === 'name');
    if (!nameEntry || decodeScalar(nameEntry.raw) !== name) {
      problems.push(`${name}: frontmatter name ${nameEntry ? decodeScalar(nameEntry.raw) : '(missing)'} does not match folder`);
    }
    const description = entries.find((e) => e.key === 'description');
    if (!description) {
      problems.push(`${name}: no description`);
      continue;
    }
    const value = decodeScalar(description.raw);
    // Cursor documents no cap; keep OpenCode's 1024 as a conservative shared
    // ceiling so a description legal on one variant tree is legal on both.
    if (value.length < 1 || value.length > 1024) {
      problems.push(`${name}: description length ${value.length} outside 1–1024`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});
