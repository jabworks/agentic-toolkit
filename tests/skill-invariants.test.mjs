import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');

// Budgets from CLAUDE.md → Key invariants.
const MAX_DESCRIPTION = 500;
const MAX_FRONTMATTER = 1024;

// A floor as well as a ceiling. A one-word description passes every other check
// here while being useless for the thing we measure hardest — routing. Set at
// roughly half the observed minimum (86 chars, session-handoff) so a genuinely
// terse trigger for a narrow skill still fits, but a stub does not.
const MIN_DESCRIPTION = 40;

// Bundled assets ship to every install channel. 5 MB is far above anything here
// (the largest file is an 88 KB eval corpus) — the point is to fail loudly if a
// binary, a screenshot dump, or a vendored dependency ever lands in a skill.
const MAX_ASSET_BYTES = 5 * 1024 * 1024;

// Every subdirectory kind a skill is allowed to contain.
//
// This is a change detector, not a tidiness rule. A new kind of directory under
// a skill is how the recurring blind spot starts: `hooks/` and `server/` are
// loaded from the PLUGIN root, so the skill-tree copy in sync.sh never reaches
// them and each needed its own sync step and its own mirror test. That was
// `6ba6572`, and `hooks/` stayed hand-maintained in dist/ until 2026-08-05
// regardless. When this list needs a new entry, ask whether the new directory
// is also a new out-of-tree mirror target before adding it.
const ALLOWED_SKILL_DIRS = new Set(['references', 'evals', 'hooks', 'server', 'lib', 'bin', 'agents']);

// Returns the raw frontmatter block (between the leading `---` fences, excluding
// them) or null if the file has none.
function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

// Extract a scalar `key: value` from a frontmatter block, unquoted. Skills here
// keep name/description on a single line, which is all this needs to handle.
function field(block, key) {
  const m = block.match(new RegExp('^' + key + ':[ \\t]*(.*)$', 'm'));
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}

function skillDirs() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

test('every skill has SKILL.md frontmatter within the name/description/size budgets', () => {
  const problems = [];
  for (const name of skillDirs()) {
    const file = path.join(SKILLS_DIR, name, 'SKILL.md');
    if (!fs.existsSync(file)) { problems.push(name + ': missing SKILL.md'); continue; }

    const block = frontmatter(fs.readFileSync(file, 'utf8'));
    if (block === null) { problems.push(name + ': no frontmatter block'); continue; }

    if (block.length > MAX_FRONTMATTER) {
      problems.push(`${name}: frontmatter ${block.length} chars (> ${MAX_FRONTMATTER})`);
    }

    const fmName = field(block, 'name');
    if (!fmName) problems.push(name + ': frontmatter missing "name"');
    else if (!/^[a-z0-9-]+$/.test(fmName)) problems.push(`${name}: name "${fmName}" is not kebab-case`);
    else if (fmName !== name) problems.push(`${name}: dir name != frontmatter name "${fmName}"`);

    const desc = field(block, 'description');
    if (!desc) problems.push(name + ': frontmatter missing "description"');
    else if (desc.length > MAX_DESCRIPTION) problems.push(`${name}: description ${desc.length} chars (> ${MAX_DESCRIPTION})`);
    else if (desc.length < MIN_DESCRIPTION) problems.push(`${name}: description ${desc.length} chars (< ${MIN_DESCRIPTION}) — too thin to route on`);
  }
  assert.deepEqual(problems, [], 'skill frontmatter invariant violations:\n' + problems.join('\n'));
});

test('no bundled asset is large enough to bloat every install channel', () => {
  const problems = [];

  const walk = (dir, skill) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(abs, skill); continue; }

      const { size } = fs.statSync(abs);
      if (size > MAX_ASSET_BYTES) {
        const rel = path.relative(SKILLS_DIR, abs);
        problems.push(`${rel}: ${(size / 1024 / 1024).toFixed(1)} MB (> ${MAX_ASSET_BYTES / 1024 / 1024} MB)`);
      }
    }
  };

  for (const name of skillDirs()) walk(path.join(SKILLS_DIR, name), name);

  assert.deepEqual(problems, [], 'oversized bundled assets:\n' + problems.join('\n'));
});

test('skills contain only known directory kinds', () => {
  const problems = [];

  for (const name of skillDirs()) {
    const entries = fs.readdirSync(path.join(SKILLS_DIR, name), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (ALLOWED_SKILL_DIRS.has(entry.name)) continue;

      problems.push(
        `${name}/${entry.name}/ is a directory kind no skill has used before — if it is loaded from the `
        + 'plugin root rather than the skill tree, it needs its own sync.sh step and its own mirror test '
        + '(see ALLOWED_SKILL_DIRS above). Add it to the set once you have checked.',
      );
    }
  }

  assert.deepEqual(problems, [], 'unknown skill directory kinds:\n' + problems.join('\n'));
});

test('marketplace.json source paths and plugin.json skills paths resolve on disk', () => {
  const problems = [];
  const marketplace = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'),
  );

  for (const plugin of marketplace.plugins) {
    const srcDir = path.join(REPO_ROOT, plugin.source);
    if (!fs.existsSync(srcDir)) {
      problems.push(`marketplace source missing: ${plugin.name} -> ${plugin.source}`);
      continue;
    }
    // Claude uses .claude-plugin/plugin.json; Codex uses .codex-plugin/plugin.json.
    for (const manifestRel of ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json']) {
      const manifest = path.join(srcDir, manifestRel);
      if (!fs.existsSync(manifest)) continue; // not every plugin ships both
      const json = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      const skillsDir = path.join(srcDir, json.skills);
      if (!fs.existsSync(skillsDir)) {
        problems.push(`${plugin.name} ${manifestRel}: skills path "${json.skills}" does not exist`);
      }
    }
  }
  assert.deepEqual(problems, [], 'unresolved install paths:\n' + problems.join('\n'));
});

// The condux plugin-level agents/ verbatim-mirror check lived here until
// 2026-08-13. The pair is declared in composition.json and guarded
// generically by tests/composition.test.mjs — retired rather than duplicated.

// The plan-review no-egress test lived here until 2026-08-09. It was
// EXTERNAL-DOMAIN hand-scoped to one file, and tests/skill-supply-chain.test.mjs
// now runs that rule over every skill — including the two templates that had
// been quietly fetching Google Fonts the whole time, which a one-file grep
// could never have found. Retired rather than duplicated.
