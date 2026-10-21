import { expect, test } from 'claude-code/testing';

import { parseLedger } from '../board/parse-ledger';
import { parsePlan } from '../board/parse-plan';
import { deriveBoard, statusText } from '../board/state';
import { type Ledger, type LedgerLine, type Plan } from '../types';
import { LEDGER_HEADER_ONLY, LEDGER_REAL, PLAN_THREE_LEVEL } from './fixtures';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const MINUTE = 60_000;
const DAY = 86_400_000;

const plan = (slug: string, deps: Record<number, number[]>, date: string | null = '2026-10-01'): Plan => ({
  file: `${date === null ? '' : `${date}-`}${slug}.md`,
  slug,
  title: slug,
  date,
  tier: null,
  tasks: Object.entries(deps).map(([number, dependsOn]) => ({
    number: Number(number),
    name: `t${number}`,
    dependsOn,
    body: '',
  })),
});

const done = (n: number): LedgerLine => ({ taskNumber: n, isChecked: true, text: `Task ${n}: done` });
const wrap = (text: string, isChecked = true): LedgerLine => ({ taskNumber: null, isChecked, text });

const ledger = (forPlan: Plan, lines: LedgerLine[], mtimeMs = NOW - MINUTE): Ledger => ({
  file: `${forPlan.slug}.md`,
  planFile: forPlan.file,
  baseSha: null,
  lines,
  mtimeMs,
});

const states = (entry: ReturnType<typeof deriveBoard>[number]): Record<number, string> =>
  Object.fromEntries(entry.tasks.map(t => [t.task.number, t.state]));

test('the real plan and ledger pair reads as complete, with every task done and the wrap-up kept', async () => {
  const real = parsePlan(PLAN_THREE_LEVEL, '2026-09-08-diagram-routing-gate.md');
  const [entry] = deriveBoard([real], [parseLedger(LEDGER_REAL, 'diagram-routing-gate.md', NOW - DAY)], NOW);

  expect(entry?.status).toBe('complete');
  expect(entry?.doneCount).toBe(3);
  expect(states(entry!)).toEqual({ 1: 'done', 2: 'done', 3: 'done' });
  expect(entry?.wrapUp.length).toBe(4);
  expect(entry?.idleMinutes).toBe(null);
});

test('a plan with no ledger is "no ledger, state unknown": nothing done, never idle, deps still derived', async () => {
  const p = plan('quiet', { 1: [], 2: [1], 3: [] });
  const [entry] = deriveBoard([p], [], NOW);

  expect(entry?.status).toBe('no-ledger');
  expect(entry?.ledger).toBe(null);
  expect(entry?.idleMinutes).toBe(null);
  expect(states(entry!)).toEqual({ 1: 'next-ready', 2: 'blocked', 3: 'ready' });
});

test('a ledger with a header and no lines is "not started"', async () => {
  const real = parsePlan(PLAN_THREE_LEVEL, '2026-10-01-fresh.md');
  const [entry] = deriveBoard([real], [parseLedger(LEDGER_HEADER_ONLY, 'fresh.md', NOW - 5 * MINUTE)], NOW);

  expect(entry?.status).toBe('not-started');
  expect(entry?.idleMinutes).toBe(5);
});

test('finishing a task unblocks the next, and only the lowest ready task is "next ready"', async () => {
  const p = plan('chain', { 1: [], 2: [1], 3: [2], 4: [1] });
  const [entry] = deriveBoard([p], [ledger(p, [done(1)])], NOW);

  expect(states(entry!)).toEqual({ 1: 'done', 2: 'next-ready', 3: 'blocked', 4: 'ready' });
  expect(entry?.tasks.find(t => t.task.number === 3)?.waitsOn).toEqual([2]);
  expect(entry?.status).toBe('in-progress');
});

test('work done out of order is honoured: the ledger finishing task 2 before task 1 does not confuse the states', async () => {
  const p = plan('parallel', { 1: [], 2: [], 3: [1, 2] });
  const [entry] = deriveBoard([p], [ledger(p, [done(2)])], NOW);

  expect(states(entry!)).toEqual({ 1: 'next-ready', 2: 'done', 3: 'blocked' });
  expect(entry?.tasks.find(t => t.task.number === 3)?.waitsOn).toEqual([1]);
});

test('a dependency cycle blocks both tasks and flags them; a task waiting on the cycle is blocked but not in it', async () => {
  const p = plan('loop', { 1: [2], 2: [1], 3: [1], 4: [] });
  const [entry] = deriveBoard([p], [], NOW);
  const inCycle = Object.fromEntries(entry!.tasks.map(t => [t.task.number, t.inCycle]));

  expect(states(entry!)).toEqual({ 1: 'blocked', 2: 'blocked', 3: 'blocked', 4: 'next-ready' });
  expect(inCycle).toEqual({ 1: true, 2: true, 3: false, 4: false });
});

test('all tasks ticked without a commit or PR line is "tasks done"; with one it is complete', async () => {
  const p = plan('wrapping', { 1: [], 2: [1] });
  const [pending] = deriveBoard([p], [ledger(p, [done(1), done(2), wrap('code-review: clean')])], NOW);
  const [shipped] = deriveBoard([p], [ledger(p, [done(1), done(2), wrap('committed abc1234; PR #150 open')])], NOW);
  const [unticked] = deriveBoard([p], [ledger(p, [done(1), done(2), wrap('committed abc1234', false)])], NOW);

  expect(pending?.status).toBe('tasks-done');
  expect(shipped?.status).toBe('complete');
  expect(unticked?.status).toBe('tasks-done');
});

test('an unfinished plan untouched for 14 days is stale and has no idle minutes; a finished one never goes stale', async () => {
  const p = plan('abandoned', { 1: [], 2: [1] });
  const old = NOW - 15 * DAY;
  const [abandoned] = deriveBoard([p], [ledger(p, [done(1)], old)], NOW);
  const [shipped] = deriveBoard([p], [ledger(p, [done(1), done(2), wrap('committed abc1234')], old)], NOW);

  expect(abandoned?.status).toBe('stale');
  expect(abandoned?.idleMinutes).toBe(null);
  expect(shipped?.status).toBe('complete');
});

test('idle minutes count whole minutes since the ledger last changed, for an unfinished plan only', async () => {
  const p = plan('busy', { 1: [], 2: [1] });
  const [entry] = deriveBoard([p], [ledger(p, [done(1)], NOW - 12 * MINUTE - 30_000)], NOW);

  expect(entry?.idleMinutes).toBe(12);
});

test('boards are ordered: active, then complete, then stale, then no-ledger, newest first within each', async () => {
  const active = plan('active', { 1: [] }, '2026-10-05');
  const olderActive = plan('older-active', { 1: [] }, '2026-10-01');
  const complete = plan('complete', { 1: [] }, '2026-09-01');
  const stale = plan('stale', { 1: [] }, '2026-08-01');
  const none = plan('none', { 1: [] }, '2026-07-01');
  const board = deriveBoard(
    [none, stale, complete, olderActive, active],
    [
      ledger(active, [wrap('started')], NOW - 1 * MINUTE),
      ledger(olderActive, [wrap('started')], NOW - 60 * MINUTE),
      ledger(complete, [done(1), wrap('committed abc1234')], NOW - 20 * DAY),
      ledger(stale, [wrap('started')], NOW - 30 * DAY),
    ],
    NOW,
  );

  expect(board.map(entry => entry.plan.slug)).toEqual(['active', 'older-active', 'complete', 'stale', 'none']);
});

test('a ledger finds its plan by header, by its own file name, and an unmatched ledger becomes an orphan', async () => {
  const byHeader = plan('by-header', { 1: [] });
  const byName = plan('by-name', { 1: [] });
  const board = deriveBoard(
    [byHeader, byName],
    [
      { ...ledger(byHeader, [done(1)]), file: 'whatever.md' },
      { ...ledger(byName, [done(1)]), planFile: null },
      { file: 'lost.md', planFile: 'missing.md', baseSha: null, lines: [wrap('started')], mtimeMs: NOW - MINUTE },
    ],
    NOW,
  );
  const bySlug = Object.fromEntries(board.map(entry => [entry.plan.slug, entry]));

  expect(bySlug['by-header']?.ledger?.file).toBe('whatever.md');
  expect(bySlug['by-name']?.doneCount).toBe(1);
  expect(bySlug['lost']?.isOrphan).toBe(true);
  expect(bySlug['lost']?.tasks).toEqual([]);
  expect(bySlug['lost']?.status).toBe('in-progress');
});

test('a ledger named exactly like its plan, date prefix included, links even when its header names nothing usable', async () => {
  const p = plan('pocket-haven', { 1: [] }, '2026-09-15');
  const board = deriveBoard([p], [{ ...ledger(p, [done(1)]), file: '2026-09-15-pocket-haven.md', planFile: null }], NOW);

  expect(board.length).toBe(1);
  expect(board[0]?.isOrphan).toBe(false);
  expect(board[0]?.doneCount).toBe(1);
});

test('a plan with no task cards but a ledger with a commit line is complete; without one it is in progress', async () => {
  const p = plan('prose-only', {});
  const [open] = deriveBoard([p], [ledger(p, [wrap('started')])], NOW);
  const [shipped] = deriveBoard([p], [ledger(p, [wrap('committed abc1234')])], NOW);

  expect(open?.status).toBe('in-progress');
  expect(shipped?.status).toBe('complete');
});

test('the status line names the open plan whose ledger changed most recently, with its next task', async () => {
  const older = plan('older', { 1: [], 2: [1] });
  const newer = plan('newer', { 1: [], 2: [1], 3: [2] });
  const board = deriveBoard(
    [older, newer],
    [ledger(older, [done(1)], NOW - 60 * MINUTE), ledger(newer, [done(1)], NOW - 2 * MINUTE)],
    NOW,
  );

  expect(statusText(board)).toBe('plan: newer · 1/3 · next: Task 2');
});

test('the status line says "wrapping up" when tasks are done but not shipped, and shows nothing with no open plan', async () => {
  const p = plan('wrapping', { 1: [] });
  const wrapping = deriveBoard([p], [ledger(p, [done(1)])], NOW);
  const shipped = deriveBoard([p], [ledger(p, [done(1), wrap('committed abc1234')])], NOW);
  const bare = deriveBoard([p], [], NOW);

  expect(statusText(wrapping)).toBe('plan: wrapping · 1/1 · wrapping up');
  expect(statusText(shipped)).toBe(null);
  expect(statusText(bare)).toBe(null);
  expect(statusText([])).toBe(null);
});

test('the status line never counts a no-ledger or stale plan as open', async () => {
  const quiet = plan('quiet', { 1: [] });
  const abandoned = plan('abandoned', { 1: [] });
  const board = deriveBoard([quiet, abandoned], [ledger(abandoned, [wrap('started')], NOW - 20 * DAY)], NOW);

  expect(statusText(board)).toBe(null);
});
