import { expect, test } from 'claude-code/testing';

import { badges } from '../board/badges';
import { graphSvg, hasGraph } from '../board/graph';
import { deriveBoard } from '../board/state';
import { stepperStages } from '../board/stepper';
import { activity } from '../board/text';
import { type Ledger, type Plan } from '../types';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const MINUTE = 60_000;

const plan = (deps: number[][]): Plan => ({
  file: '2026-10-01-chrome.md',
  slug: 'chrome',
  title: 'chrome',
  date: '2026-10-01',
  tier: 'LARGE',
  tasks: deps.map((dependsOn, i) => ({ number: i + 1, name: `step ${i + 1}`, dependsOn, body: '' })),
});

const ledger = (lines: string[], idleMinutes = 1, baseSha: string | null = null): Ledger => ({
  file: 'chrome.md',
  planFile: '2026-10-01-chrome.md',
  baseSha,
  lines: lines.map(text => ({
    taskNumber: /^Task (\d+)/.exec(text)?.[1] === undefined ? null : Number(/^Task (\d+)/.exec(text)?.[1]),
    isChecked: true,
    text,
  })),
  mtimeMs: NOW - idleMinutes * MINUTE,
});

const board = (p: Plan, l: Ledger | null) => deriveBoard([p], l === null ? [] : [l], NOW)[0]!;

test('the graph puts each task one column past its deepest dependency, so a diamond has three columns', () => {
  const entry = board(plan([[], [1], [1], [2, 3]]), ledger(['Task 1: done']));
  const { svg } = graphSvg(entry);

  // Task 4 waits on 2 and 3, which wait on 1: columns 0, 1, 1, 2 (x = 4, 54, 54, 104).
  expect(svg).toContain('x="4" y="4"');
  expect(svg).toContain('x="54" y="4"');
  expect(svg).toContain('x="54" y="38"');
  expect(svg).toContain('x="104" y="4"');
});

test('a dependency loop ends the layout and is drawn red instead of looping', () => {
  const entry = board(plan([[2], [1]]), ledger([]));
  const { svg } = graphSvg(entry);

  expect(svg).toContain('#c0392b');
  expect(svg.endsWith('</svg>')).toBe(true);
});

test('a long chain is scaled into the pane width and keeps an explicit size', () => {
  const entry = board(
    plan(Array.from({ length: 30 }, (_, i) => (i === 0 ? [] : [i]))),
    ledger([]),
  );
  const { svg, width, height } = graphSvg(entry, 400);

  expect(width).toBeLessThanOrEqual(400);
  expect(height).toBeGreaterThan(0);
  expect(svg).toContain(`width="${width}" height="${height}"`);
  expect(svg).toContain('viewBox="0 0 ');
});

test('a done dependency draws a green edge, an unfinished one a neutral edge', () => {
  const entry = board(plan([[], [1], [2]]), ledger(['Task 1: done']));
  const edges = graphSvg(entry).svg.match(/<path[^>]*>/g) ?? [];

  expect(edges[0]).toContain('#3f8f5b');
  expect(edges[1]).toContain('#8a8a85');
});

test('a plan with no dependencies has no graph to draw', () => {
  expect(hasGraph(board(plan([[], []]), null))).toBe(false);
  expect(hasGraph(board(plan([[], [1]]), null))).toBe(true);
});

test('the stepper lists tasks, then the ledger wrap-up, then a ghost for each step not yet reached', () => {
  const entry = board(plan([[], [1]]), ledger(['Task 1: done', 'code-review: clean', 'something odd']));
  const stages = stepperStages(entry);

  expect(stages.map(stage => stage.label)).toEqual(['1', '2', 'review', 'something odd', 'preflight', 'verify', 'commit']);
  expect(stages.map(stage => stage.isGhost)).toEqual([false, false, false, false, true, true, true]);
  expect(stages[0]?.isDone).toBe(true);
  expect(stages[1]?.isDone).toBe(false);
});

test('"finalize" counts as the preflight step and "verification" as verify', () => {
  const entry = board(plan([[]]), ledger(['Task 1: done', 'finalize green', 'live verification ok']));
  const labels = stepperStages(entry).map(stage => stage.label);

  expect(labels).toEqual(['1', 'preflight', 'verify', 'review', 'commit']);
});

test('a plan with no ledger has no stepper: there is no progress to step through', () => {
  expect(stepperStages(board(plan([[], [1]]), null))).toEqual([]);
});

test('rows are ordered by their neighbours so a fan-in does not cross itself', () => {
  // 1 -> 2, 1 -> 3, 3 -> 4, 2 -> 5, 4 and 5 meet in 6; numbered so a plain order would cross 4 and 5.
  const entry = board(plan([[], [1], [1], [3], [2], [4, 5]]), null);
  const { svg } = graphSvg(entry);
  const y = (n: number) => Number(new RegExp(`<title>Task ${n}:[^]*?<rect x="\\d+" y="(\\d+)"`).exec(svg)?.[1]);

  // Layer 2 holds 4 and 5; 5 hangs off 2 (row 0), 4 off 3 (row 1), so 5 sits above 4.
  expect(y(5)).toBeLessThan(y(4));
});

test('badges read what the ledger says and leave out what it does not', () => {
  const full = board(
    plan([[]]),
    ledger(['Task 1: done', 'committed abc1234', 'on branch feat/x-y; PR #42 open'], 1, 'deadbeefcafe'),
  );

  expect(badges(full)).toEqual(['LARGE tier', 'feat/x-y', 'PR #42', 'BASE deadbee', '1 commit']);

  const bare = board({ ...plan([[]]), tier: null }, ledger(['Task 1: done']));

  expect(badges(bare)).toEqual([]);
  expect(badges(board({ ...plan([[]]), tier: null }, null))).toEqual([]);
});

test('the ledger heartbeat reads alive, then quiet at 10 minutes, then stalled at 30', () => {
  const at = (idle: number) => activity(board(plan([[], [1]]), ledger(['Task 1: done'], idle)));

  expect(at(3)).toEqual({ label: 'ledger updated 3m ago', tone: 'subtle' });
  expect(at(9)?.tone).toBe('subtle');
  expect(at(10)).toEqual({ label: 'quiet · ledger 10m ago', tone: 'warning' });
  expect(at(29)?.tone).toBe('warning');
  expect(at(30)).toEqual({ label: 'stalled · ledger 30m ago', tone: 'error' });
  expect(at(150)?.label).toBe('stalled · ledger 2h ago');
});

test('a finished plan or one with no ledger has no heartbeat', () => {
  expect(activity(board(plan([[]]), null))).toBe(null);
  expect(activity(board(plan([[]]), ledger(['Task 1: done', 'committed abc1234'], 500)))).toBe(null);
});
