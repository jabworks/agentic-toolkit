import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  SKILLS_DIR,
  OPENCODE_SKILLS_DIR,
  AGENTS_SRC_DIR,
  AGENTS_DST_DIR,
  splitFrontmatter,
  decodeScalar,
  transformSkill,
  translateAgent,
} from '../scripts/build-opencode.mjs';

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

test('dist/opencode/skills matches the generator output for every skill', () => {
  const mismatches = [];
  for (const name of skillNames) {
    const src = path.join(SKILLS_DIR, name);
    const dst = path.join(OPENCODE_SKILLS_DIR, name);
    if (!fs.existsSync(dst)) {
      mismatches.push(`${name}: missing from dist/opencode/skills`);
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
      if (path.basename(rel) === 'SKILL.md') {
        const expected = transformSkill(srcContent.toString('utf8'), `skills/${name}`);
        if (dstContent.toString('utf8') !== expected) {
          mismatches.push(`${name}: ${rel} differs from transform output`);
        }
      } else if (!srcContent.equals(dstContent)) {
        mismatches.push(`${name}: ${rel} not byte-identical`);
      }
    }
  }
  assert.deepEqual(mismatches, [], 'dist/opencode has drifted — run scripts/build-opencode.mjs:\n' + mismatches.join('\n'));
});

test('no orphaned skill dirs in dist/opencode/skills', () => {
  const orphans = fs.readdirSync(OPENCODE_SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !skillNames.includes(e.name))
    .map((e) => e.name);
  assert.deepEqual(orphans, [], 'orphaned dirs in dist/opencode/skills: ' + orphans.join(', '));
});

test('transformed frontmatter fits the OpenCode contract', () => {
  const problems = [];
  for (const name of skillNames) {
    const skillPath = path.join(OPENCODE_SKILLS_DIR, name, 'SKILL.md');
    const { entries } = splitFrontmatter(fs.readFileSync(skillPath, 'utf8'), name);
    if (entries.some((e) => e.key === 'when_to_use')) {
      problems.push(`${name}: when_to_use survived the transform`);
    }
    const description = entries.find((e) => e.key === 'description');
    if (!description) {
      problems.push(`${name}: no description`);
      continue;
    }
    const value = decodeScalar(description.raw);
    // OpenCode's documented cap; name pattern matches the repo's existing invariant.
    if (value.length < 1 || value.length > 1024) {
      problems.push(`${name}: description length ${value.length} outside 1–1024`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('packages/condux-opencode/agents matches the generator output', () => {
  const srcFiles = fs.readdirSync(AGENTS_SRC_DIR).filter((f) => f.endsWith('.md')).sort();
  const dstFiles = fs.readdirSync(AGENTS_DST_DIR).filter((f) => f.endsWith('.md')).sort();
  assert.deepEqual(dstFiles, srcFiles, 'agent file sets differ — run scripts/build-opencode.mjs');
  for (const file of srcFiles) {
    const expected = translateAgent(fs.readFileSync(path.join(AGENTS_SRC_DIR, file), 'utf8'), file);
    const actual = fs.readFileSync(path.join(AGENTS_DST_DIR, file), 'utf8');
    assert.equal(actual, expected, `${file} differs from translation output`);
    const { entries, body } = splitFrontmatter(actual, file);
    assert.ok(decodeScalar(entries.find((e) => e.key === 'description').raw).length > 0, `${file}: empty description`);
    assert.equal(entries.find((e) => e.key === 'mode')?.raw, 'subagent', `${file}: mode must be subagent`);
    assert.ok(!body.includes('<example>'), `${file}: <example> block leaked into the prompt body`);
    assert.ok(body.trim().length > 0, `${file}: empty prompt body`);
  }
});

test('condux-opencode package is loadable and consistent', async () => {
  const pkgDir = path.dirname(AGENTS_DST_DIR);
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  assert.equal(pkg.type, 'module');
  assert.ok(fs.existsSync(path.join(pkgDir, pkg.main)), 'package.json main does not resolve');
  assert.ok(pkg.files.includes('agents/'), 'agents/ missing from package files array');

  const mod = await import(path.join(pkgDir, pkg.main));
  const hooks = await mod.ConduxPlugin({ worktree: pkgDir });
  assert.equal(typeof hooks.config, 'function');

  const cfg = { agent: { coder: { description: 'user-defined' } } };
  await hooks.config(cfg);
  assert.equal(cfg.agent.coder.description, 'user-defined', 'user-defined agent was clobbered');
  for (const name of ['explorer', 'planner', 'researcher']) {
    assert.ok(cfg.agent[name], `agent ${name} not injected`);
    assert.equal(cfg.agent[name].mode, 'subagent');
    assert.ok(cfg.agent[name].prompt.length > 0, `agent ${name} has empty prompt`);
  }
});
