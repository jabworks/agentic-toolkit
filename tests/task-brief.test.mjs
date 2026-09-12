import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'skills', 'subagent-execution', 'references', 'task-brief.sh');
const TEMPLATE = path.join(REPO_ROOT, 'skills', 'draft-plan', 'references', 'plan-template.md');

// Docket #81: task-brief.sh extracted a card by matching `### Task N:` while
// draft-plan's template mandates `## Task N:` (so plan-review's TOC lists every
// task). Every template-compliant plan made the script print "Task N not
// found", and the file-handoff path in subagent-execution was dead — the
// controller pasted the card instead, which is the context cost the script
// exists to avoid. Two skills in one bundle disagreeing on a shape neither
// tested; this is the test.

// The script writes under `<git-root>/.condux/scratch`, falling back to the
// working directory outside a repo. Run it from a temp dir so the brief lands
// there and not in this clone's working state.
function brief(planFile, n) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'task-brief-'));
  const result = spawnSync('bash', [SCRIPT, planFile, String(n)], { cwd, encoding: 'utf8' });
  const briefPath = result.stdout.trim();
  const text = result.status === 0 ? fs.readFileSync(briefPath, 'utf8') : null;
  fs.rmSync(cwd, { recursive: true, force: true });
  return { ...result, briefPath, text, cwd };
}

test('extracts Task 1 from the plan template draft-plan ships', () => {
  const { status, text, briefPath, cwd } = brief(TEMPLATE, 1);

  assert.equal(status, 0);
  assert.ok(briefPath.startsWith(cwd), `brief was written outside the working dir: ${briefPath}`);
  assert.ok(text.startsWith('## Task 1: <Short Name>'), text.split('\n')[0]);
  assert.match(text, /^\*\*Dependencies:\*\*/m, 'the card runs to its last field');
  assert.doesNotMatch(text, /^## Task 2:/m, 'the next card is not part of the brief');
});

test('extracts the last task without running past the card', () => {
  const headings = execFileSync('grep', ['-cE', '^## Task [0-9]+:', TEMPLATE], { encoding: 'utf8' }).trim();
  const last = Number(headings);
  const { status, text } = brief(TEMPLATE, last);

  assert.equal(status, 0);
  assert.ok(text.startsWith(`## Task ${last}:`), text.split('\n')[0]);
  assert.equal((text.match(/^##+ Task /gm) ?? []).length, 1, 'exactly one card in the brief');
});

test('still reads the older `### Task N:` shape, and a trailing section ends the card', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-brief-plan-'));
  const plan = path.join(dir, 'legacy.md');
  fs.writeFileSync(
    plan,
    [
      '# Plan',
      '',
      '## Tasks',
      '',
      '### Task 1: First',
      '',
      '**What:** the first card.',
      '',
      '### Task 2: Second',
      '',
      '**What:** the second card.',
      '',
      '## Verification',
      '',
      'Not part of any card.',
      '',
    ].join('\n'),
  );

  try {
    const one = brief(plan, 1);
    assert.equal(one.status, 0);
    assert.equal(one.text, '### Task 1: First\n\n**What:** the first card.\n\n');

    const two = brief(plan, 2);
    assert.equal(two.status, 0);
    assert.equal(two.text, '### Task 2: Second\n\n**What:** the second card.\n\n');
    assert.doesNotMatch(two.text, /Verification/, 'the section after the last card leaks into its brief');

    const missing = brief(plan, 12);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /Task 12 not found/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
