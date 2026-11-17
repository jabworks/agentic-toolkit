import { expect, test } from 'claude-code/testing';

import { answerBeneath, ledgerText, MINUTE, mountPane, PROGRESS, ROOT, run, sampleFiles, SURFACES } from './harness';

// Motion on the board: chart entrances in the vector drawings, a brief flash on a task whose state changed, a pulse on
// the task being worked while a turn runs, and a spinner on the status line for the same span.

const START = { cwd: ROOT, surface: 'terminal', isInteractive: true } as const;
const ACTIVE = '2026-10-10-active.md';
const FLASH_MS = 1600;

const turnStart = (agentId?: string) => ({ text: 'go', turnId: 't1', ...(agentId ? { agentId } : {}) });
const turnEnd = (agentId?: string) => ({
  answer: 'done',
  durationMs: 10,
  isAborted: false,
  reason: 'answer' as const,
  turnId: 't1',
  ...(agentId ? { agentId } : {}),
});

// The kit has nothing beneath the turn events; the test stands in for the engine's main loop.
const answerTurns = (on: Parameters<typeof answerBeneath>[0]): void => {
  on('turn.start', (_$, e) => ({ turnId: e.turnId }));
  on('turn.complete', (_$, e) => ({ text: e.answer }));
};

const flashKeys = async (ui: { findAll: (q: object) => Promise<{ key?: string | null }[]> }): Promise<string[]> =>
  (await ui.findAll({}))
    .map(node => node.key ?? '')
    .filter(key => key.startsWith('flash:'));

const tickTask2 = (files: Record<string, { text: string; mtimeMs: number }>, now: number): void => {
  files[`${PROGRESS}/active.md`] = {
    text: ledgerText(ACTIVE, ['- [x] Task 1: step 1', '- [x] Task 2: step 2']),
    mtimeMs: now + 3 * MINUTE,
  };
};

test('every vector drawing on the desktop carries a CSS entrance that reduced motion switches off', async ($, on) => {
  answerBeneath(on, sampleFiles);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);

  await ui.press({ key: `graph:${ACTIVE}` }).catch(() => undefined);

  const svgs = await ui.findAll({ type: 'Svg' });

  expect(svgs.length).toBeGreaterThan(0);

  for (const svg of svgs) {
    const source = String(svg.props.source);

    expect(source).toContain('@keyframes');
    expect(source).toContain('prefers-reduced-motion: reduce');
    // Only an interactive Svg plays an entrance once; an image replays it on every redraw.
    expect(svg.props.isInteractive).toBe(true);
  }
});

for (const surface of SURFACES) {
  test(`the first load flashes nothing on ${surface}`, async ($, on) => {
    answerBeneath(on, sampleFiles);
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    expect(await flashKeys(ui)).toEqual([]);
  });

  test(`a task whose state changes flashes briefly, then settles, on ${surface}`, async ($, on) => {
    const { world, clock, now } = answerBeneath(on, sampleFiles);

    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    tickTask2(world.files, now);
    await clock.advance(3000);

    expect(await ui.find({ key: `flash:task:${ACTIVE}:2` })).toBeDefined();
    // Task 3 became next-ready too: a state change, so it flashes as well. Task 1 did not change.
    expect(await ui.find({ key: `flash:task:${ACTIVE}:3` })).toBeDefined();
    expect(await ui.find({ key: `flash:task:${ACTIVE}:1` })).toBe(undefined);

    await clock.advance(FLASH_MS);

    expect(await flashKeys(ui)).toEqual([]);
  });

  test(`the task being worked pulses only while a main turn runs on ${surface}`, async ($, on) => {
    answerBeneath(on, sampleFiles);
    answerTurns(on);
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);
    const pulse = { key: `pulse:${ACTIVE}:2` };

    expect(await ui.find(pulse)).toBe(undefined);

    await $.turn.start(turnStart('sub-1'));

    expect(await ui.find(pulse)).toBe(undefined);

    await $.turn.start(turnStart());

    expect((await ui.find(pulse))?.type).toBe('Client');

    await $.turn.complete(turnEnd());

    expect(await ui.find(pulse)).toBe(undefined);
  });
}

test('the status line spins while a main turn runs and settles to the plain line when it ends', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  answerTurns(on);
  const plain = 'plan: active · 1/3 · next: Task 2';

  await $.session.start(START);
  await clock.settle();

  expect(world.statuses).toEqual([plain]);

  await $.turn.start(turnStart());
  await clock.advance(1000);

  const spun = world.statuses.slice(1);

  // Several frames, each the plain line behind one glyph, never two alike in a row.
  expect(spun.length).toBeGreaterThan(2);
  expect(spun.every(line => line?.endsWith(` ${plain}`))).toBe(true);
  expect(spun.every((line, index) => index === 0 || line !== spun[index - 1])).toBe(true);

  await $.turn.complete(turnEnd());

  expect(world.statuses[world.statuses.length - 1]).toBe(plain);

  const settled = world.statuses.length;

  await clock.advance(5000);

  expect(world.statuses.length).toBe(settled);
});

test("a subagent's turn does not spin the status line", async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  answerTurns(on);

  await $.session.start(START);
  await clock.settle();
  await $.turn.start(turnStart('sub-1'));
  await clock.advance(1000);

  expect(world.statuses.length).toBe(1);
});

test('the spinner stops with the session', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  answerTurns(on);

  await $.session.start(START);
  await clock.settle();
  await $.turn.start(turnStart());
  await clock.advance(500);
  await $.session.end({ reason: 'other', sessionId: 's1', resume: { id: 's1' } });

  const ended = world.statuses.length;

  await clock.advance(5000);

  expect(world.statuses.length).toBe(ended);
});
