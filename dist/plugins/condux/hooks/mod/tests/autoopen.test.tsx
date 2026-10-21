import { expect, test } from 'claude-code/testing';

import { answerBeneath, PROGRESS, sampleFiles } from './harness';

const LEDGER = `${PROGRESS}/active.md`;

// The hook opens the board beside the tool call, not before it returns: let those awaits run out.
const settle = async (): Promise<void> => {
  for (let tick = 0; tick < 100; tick += 1) {
    await Promise.resolve();
  }
};

const write = (file: string) => ({ tool: 'Write', file_path: file, content: 'x' }) as const;
const shell = (command: string) => ({ tool: 'Bash', command }) as const;

test('the first write to a progress ledger opens the board without taking the keyboard', async ($, on) => {
  const { world } = answerBeneath(on, sampleFiles);

  world.isPaneUp = false;

  await $.tool.call(write(LEDGER));
  await settle();

  expect(world.opens).toEqual([{ isFocused: false }]);
});

test('it opens once: a second write, or a pane the person closed, is left alone', async ($, on) => {
  const { world } = answerBeneath(on, sampleFiles);

  world.isPaneUp = false;

  await $.tool.call(write(LEDGER));
  await $.tool.call(write(LEDGER));
  await $.tool.call({ tool: 'Edit', file_path: LEDGER, old_string: 'a', new_string: 'b' });
  await settle();

  expect(world.opens).toHaveLength(1);
});

test('a Write elsewhere, a plan file, or a read of the ledger opens nothing', async ($, on) => {
  const { world } = answerBeneath(on, sampleFiles);

  world.isPaneUp = false;

  await $.tool.call(write('/repo/src/app.ts'));
  await $.tool.call(write('/repo/.condux/plans/2026-10-10-active.md'));
  await $.tool.call(write('/repo/.condux/progress/notes.txt'));
  await $.tool.call(shell('cat .condux/progress/active.md'));
  await settle();

  expect(world.opens).toEqual([]);
});

test('a shell redirect or tee into the ledger opens the board', async ($, on) => {
  const { world } = answerBeneath(on, sampleFiles);

  world.isPaneUp = false;

  await $.tool.call(shell("echo '- [x] Task 2: step 2 — commit abc1234' >> .condux/progress/active.md"));
  await settle();

  expect(world.opens).toEqual([{ isFocused: false }]);
});

test('CONDUX_AUTO_OPEN=0 turns it off', async ($, on) => {
  const { world } = answerBeneath(on, sampleFiles);

  world.isPaneUp = false;
  world.env.CONDUX_AUTO_OPEN = '0';

  await $.tool.call(write(LEDGER));
  await settle();

  expect(world.opens).toEqual([]);
});

test('a board that is already open is not opened again', async ($, on) => {
  const { world } = answerBeneath(on, sampleFiles);

  await $.tool.call(write(LEDGER));
  await settle();

  expect(world.opens).toEqual([]);
});

test('the call always goes on: the watch never changes the tool result, even where the surface never answers', async ($, on) => {
  const { world } = answerBeneath(on, sampleFiles);

  world.isPaneUp = false;
  world.open = 'silent';

  const result = await $.tool.call(write(LEDGER));

  expect(result.text).toBe('ok');
});
