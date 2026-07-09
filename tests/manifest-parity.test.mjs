import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const DIST_DIR = path.join(REPO_ROOT, 'dist', 'plugins');

function pluginDirs() {
  return fs.readdirSync(DIST_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

// Doctrine (see skills/toolkit-plugin-reference/SKILL.md): the two manifests of a
// plugin are a PAIR. Identity fields must match; `description` and `interface`
// content may carry platform wording; `hooks` is codex-only (both hosts default to
// hooks/hooks.json; the codex manifest field overrides that default — commit 95425c8).
// `interface` is Codex-native; Claude Code ignores it at load time (verified via
// `claude plugin validate`, 2026-07-08) — kept in both for parity. If strict
// validation ever lands in CI, flip to codex-only first (campaign B3 has the recipe).
test('every dist plugin ships a Claude/Codex manifest pair with matching identity fields', () => {
  const problems = [];
  for (const p of pluginDirs()) {
    const claudeFile = path.join(DIST_DIR, p, '.claude-plugin', 'plugin.json');
    const codexFile = path.join(DIST_DIR, p, '.codex-plugin', 'plugin.json');
    if (!fs.existsSync(claudeFile)) { problems.push(p + ': missing .claude-plugin/plugin.json'); continue; }
    if (!fs.existsSync(codexFile)) { problems.push(p + ': missing .codex-plugin/plugin.json'); continue; }

    const claude = JSON.parse(fs.readFileSync(claudeFile, 'utf8'));
    const codex = JSON.parse(fs.readFileSync(codexFile, 'utf8'));

    for (const field of ['name', 'version', 'skills']) {
      if (claude[field] !== codex[field]) {
        problems.push(`${p}: "${field}" differs — claude ${JSON.stringify(claude[field])} vs codex ${JSON.stringify(codex[field])}`);
      }
    }

    // One skills-path shape for standalone AND bundle plugins.
    const expectedSkills = './skills/' + p;
    if (claude.skills !== expectedSkills) {
      problems.push(`${p}: skills path ${JSON.stringify(claude.skills)} — must be ${JSON.stringify(expectedSkills)}`);
    }

    if (!claude.interface) problems.push(p + ': .claude-plugin manifest missing "interface" (required in both variants by house doctrine)');
    if (!codex.interface) problems.push(p + ': .codex-plugin manifest missing "interface"');

    if ('hooks' in claude) {
      problems.push(p + ': "hooks" belongs only in the codex manifest — Claude Code auto-discovers hooks/hooks.json');
    }
  }
  assert.deepEqual(problems, [], 'manifest pair parity violations:\n' + problems.join('\n'));
});

// Trigger contract (owner-ratified 2026-07-08): a skill is triggerable only if its
// description starts with "Use when" OR it carries a when_to_use field. Three skills
// once shipped with neither and were invisible to trigger matching.
test('every skill has a machine-visible trigger contract (Use-when description or when_to_use)', () => {
  const problems = [];
  const names = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const name of names) {
    const file = path.join(SKILLS_DIR, name, 'SKILL.md');
    if (!fs.existsSync(file)) continue; // missing SKILL.md is skill-invariants' finding
    const m = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue; // ditto
    const block = m[1];
    const descMatch = block.match(/^description:[ \t]*(.*)$/m);
    const desc = descMatch ? descMatch[1].trim().replace(/^['"]|['"]$/g, '') : null;
    const hasWhenToUse = /^when_to_use:/m.test(block);
    if (!desc) continue; // skill-invariants' finding
    if (!desc.startsWith('Use when') && !hasWhenToUse) {
      problems.push(`${name}: description does not start with "Use when" and no when_to_use field — no trigger contract`);
    }
  }
  assert.deepEqual(problems, [], 'skills without a trigger contract:\n' + problems.join('\n'));
});

// YAML plain scalars cannot contain ": " — an unquoted frontmatter value with
// one fails to parse, and the host then loads the skill with EMPTY metadata
// (every field silently dropped). This shipped twice: a13e094, and
// session-handoff's when_to_use (caught by scripts/validate-plugins.sh on its
// first run, 2026-07-09). Full YAML validation stays with `claude plugin
// validate` (CI release-dry-run job); this catches the known lethal class
// without adding a YAML dependency.
test('unquoted single-line frontmatter values must not contain ": "', () => {
  const problems = [];
  const names = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const name of names) {
    const file = path.join(SKILLS_DIR, name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const m = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^([A-Za-z][\w-]*):[ \t]+(.*)$/);
      if (!kv) continue;
      const value = kv[2];
      if (/^['"]/.test(value)) continue; // quoted — safe
      if (value.includes(': ')) {
        problems.push(`${name}: unquoted "${kv[1]}" contains ": " — quote the whole value or YAML drops ALL frontmatter at load`);
      }
    }
  }
  assert.deepEqual(problems, [], 'frontmatter values that break YAML parsing:\n' + problems.join('\n'));
});
