import { expect, test } from 'claude-code/testing';

import { answerBeneath, ledgerText, MINUTE, PROGRESS, ROOT, run, sampleFiles } from './harness';

const START = { cwd: ROOT, surface: 'terminal', isInteractive: true } as const;
const END = (reason: 'clear' | 'other') => ({ reason, sessionId: 's1', resume: { id: 's1' } }) as const;

const last = (statuses: (string | undefined)[]): string | undefined => statuses[statuses.length - 1];

test('the status line shows the open plan with its progress and next task as soon as a session starts', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  await $.session.start(START);
  await clock.settle();

  expect(last(world.statuses)).toBe('plan: active · 1/3 · next: Task 2');
});

test('the line follows the ledger within a poll, and an unchanged line is not sent again', async ($, on) => {
  const { world, clock, now } = answerBeneath(on, sampleFiles);

  await $.session.start(START);
  await clock.settle();
  await clock.advance(9000);

  expect(world.statuses).toEqual(['plan: active · 1/3 · next: Task 2']);

  world.files[`${PROGRESS}/active.md`] = {
    text: ledgerText('2026-10-10-active.md', ['- [x] Task 1: step 1', '- [x] Task 2: step 2']),
    mtimeMs: now + 3 * MINUTE,
  };
  await clock.advance(3000);

  expect(last(world.statuses)).toBe('plan: active · 2/3 · next: Task 3');
  expect(world.statuses.length).toBe(2);
});

test('a repository with no working-state directory never starts a timer or pins a line', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  world.hasCondux = false;
  await $.session.start(START);
  await clock.advance(30_000);

  expect(world.lists).toBe(0);
  expect(world.statuses).toEqual([]);
});

test('with no open plan the line is cleared, never "0 plans"', async ($, on) => {
  const { world, clock } = answerBeneath(on, now => ({
    [`${ROOT}/.condux/plans/2026-09-01-shipped.md`]: {
      text: '# Plan: shipped\n\n## Task 1: only\n\n**Dependencies:** None\n',
      mtimeMs: now,
    },
    [`${PROGRESS}/shipped.md`]: {
      text: ledgerText('2026-09-01-shipped.md', ['- [x] Task 1: only', '- [x] committed abc1234']),
      mtimeMs: now - MINUTE,
    },
  }));

  await $.session.start(START);
  await clock.settle();

  expect(world.statuses).toEqual([undefined]);
});

test('the line keeps updating after the pane is closed: the timer outlives the pane while the status needs it', async ($, on) => {
  const { world, clock, now } = answerBeneath(on, sampleFiles);

  await $.session.start(START);
  await $.command.run(run(''));
  await clock.settle();

  world.isPaneUp = false;
  await clock.advance(3000);

  const before = world.lists;

  world.files[`${PROGRESS}/active.md`] = {
    text: ledgerText('2026-10-10-active.md', ['- [x] Task 1: step 1', '- [x] Task 2: step 2']),
    mtimeMs: now + 4 * MINUTE,
  };
  await clock.advance(6000);

  expect(world.lists).toBeGreaterThan(before);
  expect(last(world.statuses)).toBe('plan: active · 2/3 · next: Task 3');
});

test('a session that ends stops the timer and clears the line; a /clear keeps both', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  await $.session.start(START);
  await clock.settle();
  await $.session.end(END('clear'));
  await clock.advance(3000);

  const afterClear = world.lists;

  expect(last(world.statuses)).toBe('plan: active · 1/3 · next: Task 2');

  await clock.advance(3000);

  expect(world.lists).toBeGreaterThan(afterClear);

  await $.session.end(END('other'));

  expect(last(world.statuses)).toBe(undefined);

  const afterEnd = world.lists;

  await clock.advance(9000);

  expect(world.lists).toBe(afterEnd);
});

test('running /condux arms the line when the working-state directory appeared after the session started', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  world.hasCondux = false;
  await $.session.start(START);
  await clock.advance(6000);

  expect(world.statuses).toEqual([]);

  world.hasCondux = true;
  await $.command.run(run(''));
  await clock.settle();

  expect(last(world.statuses)).toBe('plan: active · 1/3 · next: Task 2');
});
