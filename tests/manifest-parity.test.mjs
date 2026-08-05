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
// plugin are a PAIR. Identity fields must match; `description` content may carry
// platform wording; `hooks` is codex-only (both hosts default to hooks/hooks.json;
// the codex manifest field overrides that default — commit 95425c8).
// `interface` is codex-only as of 2026-07-29. It is Codex-native and Claude Code
// ignores it at load time, but `claude plugin validate --strict` reports the
// unknown field as an error — a red X for anyone reviewing a directory submission.
// Keeping it out of the Claude manifest costs nothing (the field was never read
// there) and buys a clean strict pass.
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

    if ('interface' in claude) {
      problems.push(p + ': "interface" belongs only in the codex manifest — it fails `claude plugin validate --strict`');
    }
    if (!codex.interface) problems.push(p + ': .codex-plugin manifest missing "interface"');

    if ('hooks' in claude) {
      problems.push(p + ': "hooks" belongs only in the codex manifest — Claude Code auto-discovers hooks/hooks.json');
    }
  }
  assert.deepEqual(problems, [], 'manifest pair parity violations:\n' + problems.join('\n'));
});

// Hook commands must use the variable their host actually substitutes: Claude Code
// sets ${CLAUDE_PLUGIN_ROOT}; Codex sets ${PLUGIN_ROOT} and does NOT set Claude's
// variable — an unexpanded one made the condux Stop hook exit 1 on every Codex turn
// (diagnosed 2026-07-10 against Codex 0.144.1).
test('plugin hook files use the plugin-root variable of the host that runs them', () => {
  const problems = [];
  for (const p of pluginDirs()) {
    const claudeHooks = path.join(DIST_DIR, p, 'hooks', 'hooks.json');
    if (fs.existsSync(claudeHooks) && fs.readFileSync(claudeHooks, 'utf8').includes('${PLUGIN_ROOT}')) {
      problems.push(p + ': hooks/hooks.json runs under Claude Code — use ${CLAUDE_PLUGIN_ROOT}, not ${PLUGIN_ROOT}');
    }
    const codexFile = path.join(DIST_DIR, p, '.codex-plugin', 'plugin.json');
    if (!fs.existsSync(codexFile)) continue;
    const codex = JSON.parse(fs.readFileSync(codexFile, 'utf8'));
    if (typeof codex.hooks !== 'string') continue;
    const codexHooks = path.join(DIST_DIR, p, codex.hooks);
    if (!fs.existsSync(codexHooks)) { problems.push(p + ': codex manifest "hooks" points at missing file ' + codex.hooks); continue; }
    if (fs.readFileSync(codexHooks, 'utf8').includes('${CLAUDE_PLUGIN_ROOT}')) {
      problems.push(p + ': ' + codex.hooks + ' runs under Codex — use ${PLUGIN_ROOT}, not ${CLAUDE_PLUGIN_ROOT}');
    }
  }
  assert.deepEqual(problems, [], 'hook plugin-root variable violations:\n' + problems.join('\n'));
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

// Frontmatter YAML validity used to be checked here, by an unquoted-`": "` scan.
// It was removed on 2026-08-05 rather than extended, because its central
// assumption was false: it skipped every quoted value as "safe", so the
// single-quoted break that took condux down in Codex passed it untouched. Two
// half-guards disagreeing about what "safe" means is worse than one oracle.
//
// Frontmatter is now gated by tests/frontmatter-canonical.test.mjs (narrow
// grammar, dependency-free, also gates sync.sh and pre-commit) and
// tests/frontmatter-yaml.test.mjs (real strict parse). Both cover every tree,
// not just skills/. Do not reintroduce a partial check in this file.
