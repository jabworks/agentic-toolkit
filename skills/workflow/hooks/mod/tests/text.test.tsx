import { expect, test } from 'claude-code/testing';

import { deriveBoard } from '../board/state';
import { boardText, groupPlans } from '../board/text';
import { type Ledger, type Plan } from '../types';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const DAY = 86_400_000;

const plan = (slug: string, taskCount: number): Plan => ({
  file: `2026-10-01-${slug}.md`,
  slug,
  title: slug,
  date: '2026-10-01',
  tier: null,
  tasks: Array.from({ length: taskCount }, (_, i) => ({
    number: i + 1,
    name: `step ${i + 1}`,
    dependsOn: i === 0 ? [] : [i],
    body: '',
  })),
});

const finished = (p: Plan, ageDays: number): Ledger => ({
  file: `${p.slug}.md`,
  planFile: p.file,
  baseSha: null,
  lines: [
    ...p.tasks.map(t => ({ taskNumber: t.number, isChecked: true, text: `Task ${t.number}: done` })),
    { taskNumber: null, isChecked: true, text: 'committed abc1234' },
  ],
  mtimeMs: NOW - ageDays * DAY,
});

test('a plan with no ledger reports its task count and neutral marks, never "0 done" or a next-ready glyph', async () => {
  const text = boardText({ kind: 'found', root: '/r', updatedMs: NOW, plans: deriveBoard([plan('quiet', 2)], [], NOW) }, true);

  expect(text).toContain('quiet  (2 tasks · no ledger, state unknown)');
  expect(text).toContain('· Task 1  step 1');
  expect(text).not.toContain('done');
  expect(text).not.toContain('▶');
  expect(text).not.toContain('waits on');
});

test('the text and the pane cut the board into the same groups, with older finished plans counted', async () => {
  const plans = Array.from({ length: 7 }, (_, i) => plan(`done-${i + 1}`, 1));
  const board = deriveBoard(
    plans,
    plans.map((p, i) => finished(p, i + 1)),
    NOW,
  );
  const groups = groupPlans(board);

  expect(groups.complete.length).toBe(5);
  expect(groups.olderComplete.length).toBe(2);

  const short = boardText({ kind: 'found', root: '/r', updatedMs: NOW, plans: board }, false);
  const all = boardText({ kind: 'found', root: '/r', updatedMs: NOW, plans: board }, true);

  expect(short).toContain('+2 older finished plans (run /condux all)');
  expect(short).not.toContain('done-7');
  expect(all).toContain('done-7');
  expect(all).not.toContain('older finished plans');
});

test('the text explains loading, a missing working-state directory and an unreadable board', async () => {
  expect(boardText(null, false)).toContain('still loading');
  expect(boardText({ kind: 'missing', searchedFrom: '/work' }, false)).toContain('No condux working state found in /work');
  expect(boardText({ kind: 'unreadable', reason: 'EBUSY' }, false)).toContain('EBUSY');
  expect(boardText({ kind: 'found', root: '/r', updatedMs: 0, plans: [] }, false)).toBe('No plans found.');
});
