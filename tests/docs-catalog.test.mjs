import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Campaign Front D2: docs-catalog enforcement. Three marketplace plugins once
// shipped invisible to README/CLAUDE.md for weeks — this makes that state turn
// CI red. A plugin counts as catalogued in README via a skill link
// ([name](./skills/…)) or its install id (name@jabworks-agentic-toolkit), and
// in CLAUDE.md via a backticked `name` row. Bare-substring matches are not
// accepted (too easy to satisfy accidentally in prose).
test('every marketplace plugin is catalogued in README.md and CLAUDE.md', () => {
  const marketplace = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'),
  );
  const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');
  const claudeMd = fs.readFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');

  const problems = [];
  for (const { name } of marketplace.plugins) {
    const inReadme = readme.includes(`[${name}](`) || readme.includes(`[/${name}](`)
      || readme.includes(`${name}@jabworks-agentic-toolkit`);
    const inClaudeMd = claudeMd.includes('`' + name + '`');
    if (!inReadme) problems.push(`${name}: no README catalog entry (skill link or install id)`);
    if (!inClaudeMd) problems.push(`${name}: no CLAUDE.md table row (backticked name)`);
  }
  assert.deepEqual(problems, [], 'marketplace plugins missing from docs catalogs:\n' + problems.join('\n'));
});
