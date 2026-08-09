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
  }
  assert.deepEqual(problems, [], 'skill frontmatter invariant violations:\n' + problems.join('\n'));
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

test('condux plugin-level agents/ mirrors its skills/ source verbatim', () => {
  // scripts/sync.sh copies skills/subagent-execution/agents/ into the plugin's
  // top-level agents/ dir — which the skill-tree mirror check does NOT cover.
  const src = path.join(SKILLS_DIR, 'subagent-execution', 'agents');
  const dst = path.join(REPO_ROOT, 'dist', 'plugins', 'condux', 'agents');
  assert.ok(fs.existsSync(src), 'source agents dir missing: ' + src);
  assert.ok(fs.existsSync(dst), 'plugin-level agents dir missing: ' + dst);

  const srcFiles = fs.readdirSync(src).sort();
  const dstFiles = fs.readdirSync(dst).sort();
  assert.deepEqual(dstFiles, srcFiles, 'condux/agents file list differs from source — run scripts/sync.sh');

  const drifted = srcFiles.filter(
    (f) => !fs.readFileSync(path.join(src, f)).equals(fs.readFileSync(path.join(dst, f))),
  );
  assert.deepEqual(drifted, [], 'condux/agents drifted from source — run scripts/sync.sh:\n' + drifted.join('\n'));
});

// The plan-review no-egress test lived here until 2026-08-09. It was
// EXTERNAL-DOMAIN hand-scoped to one file, and tests/skill-supply-chain.test.mjs
// now runs that rule over every skill — including the two templates that had
// been quietly fetching Google Fonts the whole time, which a one-file grep
// could never have found. Retired rather than duplicated.
