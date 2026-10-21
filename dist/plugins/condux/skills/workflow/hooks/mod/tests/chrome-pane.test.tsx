import { expect, test } from 'claude-code/testing';

import { answerBeneath, ledgerText, MINUTE, mountPane, PLANS, planText, PROGRESS, run, sampleFiles } from './harness';

const FILE = '2026-10-10-active.md';

// A container's `text` holds its descendants', so a line is found among the Text nodes alone.
const textLine = async (ui: { findAll: (query: { type: 'Text' }) => Promise<{ text: string; props: Record<string, unknown> }[]> }, pattern: RegExp) =>
  (await ui.findAll({ type: 'Text' })).find(node => pattern.test(node.text));

const files = (now: number) => ({
  ...sampleFiles(now),
  [`${PROGRESS}/active.md`]: {
    text: ledgerText(FILE, ['- [x] Task 1: step 1 — done', '- [x] code-review: clean']),
    mtimeMs: now - 15 * MINUTE,
  },
});

test('the desktop plan row carries a rounded mini bar, the count, a status pill and the plan age', async ($, on) => {
  answerBeneath(on, files);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const row = await ui.find({ key: `planrow:${FILE}` });

  expect(row?.text).toContain('Active work');
  expect(row?.text).toContain('1/3');
  expect(row?.text).toContain('in progress');
  expect(row?.text).toMatch(/\d+d|today/);
  expect(await ui.find({ key: `plan:${FILE}` })).toBeDefined();
});

test('every Svg the board draws has an explicit height, or the app boxes it far taller than it is', async ($, on) => {
  answerBeneath(on, files);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const svgs = await ui.findAll({ type: 'Svg' });

  expect(svgs.length).toBeGreaterThan(1);

  for (const svg of svgs) {
    expect(typeof svg.props.height).toBe('number');
    expect(typeof svg.props.width).toBe('number');
  }
});

test('the terminal draws no Svg and no filter field', async ($, on) => {
  answerBeneath(on, files);
  await $.command.run(run(''));

  const ui = await mountPane('terminal', $);

  expect(await ui.findAll({ type: 'Svg' })).toEqual([]);
  expect(await ui.find({ key: 'filter' })).toBe(undefined);
});

test('an open plan shows its heartbeat, badges, stepper and graph on the desktop, and all but the graph on the terminal', async ($, on) => {
  answerBeneath(on, files);
  await $.command.run(run(''));

  const desktop = await mountPane('desktop', $);

  expect(await textLine(desktop, /^quiet · ledger 15m ago$/)).toBeDefined();
  expect(await textLine(desktop, /1 commit/)).toBeUndefined();
  expect((await desktop.find({ key: `stepper:${FILE}` }))?.text).toContain('review');
  expect((await desktop.find({ key: `stepper:${FILE}` }))?.text).toContain('◌ commit');
  expect((await desktop.findAll({ type: 'Svg' })).some(svg => /^Task dependencies of Active work/.test(String(svg.props.alt)))).toBe(true);

  const terminal = await mountPane('terminal', $);

  expect(await terminal.find({ key: `stepper:${FILE}` })).toBeDefined();
  expect(await terminal.findAll({ type: 'Svg' })).toEqual([]);
});

test('a stalled plan says so in red', async ($, on) => {
  answerBeneath(on, now => ({
    ...files(now),
    [`${PROGRESS}/active.md`]: {
      text: ledgerText(FILE, ['- [x] Task 1: step 1 — done']),
      mtimeMs: now - 45 * MINUTE,
    },
  }));
  await $.command.run(run(''));

  const ui = await mountPane('terminal', $);
  const line = await textLine(ui, /^stalled · ledger 45m ago$/);

  expect(line).toBeDefined();
  expect(line?.props.color).toBe('error');
});

test('the filter field narrows the plans by title on the desktop', async ($, on) => {
  answerBeneath(on, now => ({
    ...files(now),
    [`${PLANS}/2026-10-11-other.md`]: { text: planText('Other thing', 2), mtimeMs: now },
  }));
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);

  expect(await ui.find({ key: `plan:${FILE}` })).toBeDefined();
  expect(await ui.find({ key: 'plan:2026-10-11-other.md' })).toBeDefined();

  await ui.input({ key: 'filter', text: 'other' });

  expect(await ui.find({ key: `plan:${FILE}` })).toBe(undefined);
  expect(await ui.find({ key: 'plan:2026-10-11-other.md' })).toBeDefined();

  await ui.input({ key: 'filter', text: 'nothing matches' });

  expect(await ui.find({ text: /No plan matches/ })).toBeDefined();
});

test('a plan with many tasks keeps its dependency graph behind a toggle, and a small one opens with it', async ($, on) => {
  answerBeneath(on, now => ({
    ...files(now),
    [`${PLANS}/2026-10-12-big.md`]: { text: planText('Big plan', 20), mtimeMs: now },
    [`${PROGRESS}/big.md`]: { text: ledgerText('2026-10-12-big.md', ['- [x] Task 1: step 1 — done']), mtimeMs: now },
  }));
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const graphs = async () =>
    (await ui.findAll({ type: 'Svg' })).filter(svg => /^Task dependencies of/.test(String(svg.props.alt)));

  expect((await graphs()).map(svg => svg.props.alt)).toEqual(['Task dependencies of Active work']);

  await ui.press({ key: 'graph:2026-10-12-big.md' });

  expect(await graphs()).toHaveLength(2);
});

test('no-ledger plans show no stepper', async ($, on) => {
  answerBeneath(on, files);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);

  await ui.press({ key: 'plan:2026-08-01-quiet.md' });

  expect(await ui.find({ key: 'stepper:2026-08-01-quiet.md' })).toBe(undefined);
});

test('a long title is clipped to leave the right-hand columns their room, so the row cannot squeeze them', async ($, on) => {
  const long = 'A very long plan title that would run into the progress bar, the count, the pill and the age';

  answerBeneath(on, now => ({
    ...files(now),
    [`${PLANS}/2026-10-12-long.md`]: { text: planText(long, 2), mtimeMs: now },
  }));
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const title = (await ui.findAll({ type: 'Text' })).find(node => node.text.startsWith('A very long'));

  expect(title?.text.endsWith('…')).toBe(true);
  expect(title?.text.length).toBeLessThan(50);
});
