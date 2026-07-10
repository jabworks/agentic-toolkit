import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS = path.resolve(__dirname, '../skills');

function triggerContract(name) {
  const source = fs.readFileSync(path.join(SKILLS, name, 'SKILL.md'), 'utf8');
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(frontmatter, name + ': missing frontmatter');
  return frontmatter[1];
}

test('known trigger-collision pairs disambiguate each other mutually', () => {
  const pairs = [
    ['adapting-skills', 'toolkit-foundry'],
    ['preflight', 'finalize'],
    ['plan-review', 'spec-browser'],
    ['subagent-deployment', 'subagent-execution'],
  ];

  for (const [a, b] of pairs) {
    assert.ok(triggerContract(a).includes(b), `${a} trigger contract must name ${b}`);
    assert.ok(triggerContract(b).includes(a), `${b} trigger contract must name ${a}`);
  }
});
