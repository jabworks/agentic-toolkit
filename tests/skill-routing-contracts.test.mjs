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
    ['live-verification', 'finalize'],
    ['live-verification', 'preflight'],
    ['release', 'toolkit-change-control'],
    ['root-cause-analysis', 'toolkit-debugging-playbook'],
    ['plan-review', 'spec-browser'],
    ['subagent-deployment', 'subagent-execution'],
    ['remember', 'toolkit-failure-archaeology'],
    ['remember', 'session-handoff'],
    ['session-handoff', 'session-report'],
    ['session-handoff', 'subagent-execution'],
    ['git-operations', 'release'],
    ['toolkit-foundry', 'toolkit-skill-standards'],
    ['code-review', 'plan-review'],
    ['code-review', 'live-verification'],
    ['discovery', 'technical-spec'],
  ];

  for (const [a, b] of pairs) {
    assert.ok(triggerContract(a).includes(b), `${a} trigger contract must name ${b}`);
    assert.ok(triggerContract(b).includes(a), `${b} trigger contract must name ${a}`);
  }
});
