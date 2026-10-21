import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// docket #109: only subagent-execution wrote a ledger, so inline execution — condux's default — left every plan
// invisible to the /condux board. /workflow now owns the contract and both executors keep it.
const workflow = read('skills/workflow/SKILL.md');
const subagent = read('skills/subagent-execution/SKILL.md');
const example = /## Progress Ledger[\s\S]*?```\n([\s\S]*?)```/.exec(workflow)?.[1] ?? '';

test('/workflow owns the ledger contract, in the shape the /condux board reads', () => {
  assert.match(example, /^# Progress: <feature-slug>$/m);
  assert.match(example, /^Plan: \.condux\/plans\/<plan-file>\.md$/m);
  assert.match(example, /^BASE: /m);
  assert.match(example, /^- \[x\] Task 1: .+ — commit /m);
  // A wrap-up line is a checked line with no task number; the board marks a plan complete on a commit or PR one.
  assert.match(example, /^- \[x\] (?!Task )preflight/m);
  assert.match(example, /^- \[x\] committed .*PR #N/m);
});

test('inline execution is told to keep the ledger, and a plan with no saved file is told not to invent one', () => {
  assert.match(workflow, /implement task by task, keeping the Progress Ledger/);
  assert.match(workflow, /No saved plan file, no ledger/);
});

test('subagent-execution defers to the shared contract instead of owning a second copy', () => {
  assert.match(subagent, /owned by\s+`\/workflow` → \*\*Progress Ledger\*\*/);
  assert.doesNotMatch(subagent, /Subagent Execution Progress/);
  assert.match(subagent, /\.condux\/progress\/<feature-slug>\.md/);
});
