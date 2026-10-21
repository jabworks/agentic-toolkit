import { expect, test } from 'claude-code/testing';

import { parseDependencies, parsePlan } from '../board/parse-plan';
import {
  PLAN_FENCED_HEADINGS,
  PLAN_NONE_WITH_NOTE,
  PLAN_NO_CARDS,
  PLAN_RANGES,
  PLAN_THREE_LEVEL,
  PLAN_UNKNOWN_AND_SELF,
} from './fixtures';

const depsOf = (plan: ReturnType<typeof parsePlan>): Record<number, number[]> =>
  Object.fromEntries(plan.tasks.map(task => [task.number, task.dependsOn]));

test('reads title, slug, date and tier from a plan', async () => {
  const plan = parsePlan(PLAN_RANGES, '2026-08-26-discovery-presentation.md');

  expect(plan.title).toBe('Discovery presentation');
  expect(plan.slug).toBe('discovery-presentation');
  expect(plan.date).toBe('2026-08-26');
  expect(plan.tier).toBe('MEDIUM');
  expect(plan.tasks.map(task => task.number)).toEqual([1, 2, 3, 4, 5, 6]);
});

test('a dependency next to a parenthetical is kept, ranges expand, and an en dash is a range too', async () => {
  const plan = parsePlan(PLAN_RANGES, '2026-08-26-discovery-presentation.md');

  expect(depsOf(plan)).toEqual({ 1: [], 2: [1], 3: [1], 4: [1, 2], 5: [1, 2, 3, 4], 6: [1, 2, 3, 4, 5] });
});

test('"None" with a note naming other tasks is still no dependency', async () => {
  const plan = parsePlan(PLAN_NONE_WITH_NOTE, '2026-08-06-plugin-doctor.md');

  expect(depsOf(plan)).toEqual({ 1: [], 2: [1], 3: [2], 4: [] });
});

test('headings inside a code fence are not cards and do not cut a card short', async () => {
  const plan = parsePlan(PLAN_FENCED_HEADINGS, '2026-08-26-spec-artifact-readability.md');

  expect(plan.tasks.map(task => task.number)).toEqual([1, 2]);
  expect(plan.tasks[0]?.body).toContain('## api.md');
  expect(plan.tasks[0]?.body).toContain('## Contents');
  expect(depsOf(plan)).toEqual({ 1: [], 2: [1] });
});

test('both heading levels are cards, a deeper heading stays in the card, and no dependency line means none', async () => {
  const plan = parsePlan(PLAN_THREE_LEVEL, '2026-09-08-diagram-routing-gate.md');

  expect(plan.tasks.map(task => task.name)).toEqual([
    'diagram-check.mjs + tests',
    'routing rules in diagram-kit.md and the check step in SKILL.md',
    'ripple (controller only — not dispatched)',
  ]);
  expect(plan.tasks[0]?.body).toContain('A deeper heading stays inside the card');
  expect(plan.tasks[0]?.body).not.toContain('Body of task two');
  expect(depsOf(plan)).toEqual({ 1: [], 2: [], 3: [] });
  expect(plan.title).toBe('diagram routing gate (blueprint)');
});

test('a dependency on itself or on a task that does not exist is dropped, a list with "and" reads as a list, and a parenthetical never adds one', async () => {
  const plan = parsePlan(PLAN_UNKNOWN_AND_SELF, '2026-10-01-odd.md');

  expect(depsOf(plan)).toEqual({ 1: [], 2: [], 3: [1, 2], 4: [1] });
});

test('a plan with no task cards has no tasks and falls back to the slug for a missing title', async () => {
  const plan = parsePlan(PLAN_NO_CARDS, '2026-10-02-plain-notes.md');

  expect(plan.tasks).toEqual([]);
  expect(plan.title).toBe('plain notes');

  const untitled = parsePlan('Just text.\n', '2026-10-02-untitled.md');

  expect(untitled.title).toBe('untitled');
});

test('a file name without a date still parses, with no date', async () => {
  const plan = parsePlan(PLAN_NO_CARDS, 'notes.md');

  expect(plan.date).toBe(null);
  expect(plan.slug).toBe('notes');
});

test('Windows line endings do not leak into names or dependencies', async () => {
  const plan = parsePlan(PLAN_RANGES.replace(/\n/g, '\r\n'), '2026-08-26-discovery-presentation.md');

  expect(plan.tasks[1]?.name).toBe('Teach the reader');
  expect(depsOf(plan)[4]).toEqual([1, 2]);
});

test('parseDependencies handles a runaway range without looping', async () => {
  const known = new Set([1, 2, 3]);

  expect(parseDependencies('Tasks 1-99999999', 3, known)).toEqual([1, 2]);
});
