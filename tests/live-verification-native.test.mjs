import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

// Docket #89: on a mobile app the agent improvised its own emulator playbook,
// and 9 of 11 verification runs left no report. The native path is a reference
// loaded on app detection, a device-only verdict with a phone checklist, and a
// CP-3 row that says to load the skill on a mobile app too. Anchors are minimal
// so the prose can evolve; what they pin is that each piece stays reachable.
const SKILL = 'skills/live-verification/SKILL.md';
const NATIVE = 'skills/live-verification/references/native-app.md';
const TEMPLATE = 'skills/live-verification/references/report-template.md';
const WORKFLOW = 'skills/workflow/SKILL.md';

test(`${NATIVE} exists and ${SKILL} points at it`, () => {
  assert.ok(
    fs.existsSync(path.join(REPO_ROOT, NATIVE)),
    `${NATIVE} missing — the native recipe has no home`,
  );
  assert.ok(
    read(SKILL).includes('references/native-app.md'),
    `${SKILL} never references references/native-app.md — the recipe is unreachable`,
  );
});

test(`${TEMPLATE} carries the native report shape`, () => {
  const body = read(TEMPLATE);
  const anchors = ['device-only', 'For the phone:', '| Device |', '| Build |'];
  const missing = anchors.filter((anchor) => !body.includes(anchor));

  assert.deepEqual(
    missing,
    [],
    `${TEMPLATE} lost native anchor(s) — a device-only claim has nowhere to land`,
  );
});

test(`${WORKFLOW} CP-3 says to load live-verification on a mobile app`, () => {
  const row = read(WORKFLOW)
    .split('\n')
    .find((line) => line.startsWith('| **Verify it live**'));

  assert.ok(row, `${WORKFLOW} has no CP-3 "Verify it live" row`);
  assert.ok(
    row.includes('`live-verification`') && row.includes('including on a mobile app'),
    `${WORKFLOW} CP-3 row no longer tells the agent to load the skill on a mobile app`,
  );
});
