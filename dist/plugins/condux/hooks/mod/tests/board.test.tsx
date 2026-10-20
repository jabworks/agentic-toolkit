import { type CommandRunInput, type On, type RenderSurface } from 'claude-code';
import { type Engine, expect, mock, test } from 'claude-code/testing';

const SURFACES = ['terminal', 'desktop'] as const;
const ROOT = '/repo';
const PLANS = `${ROOT}/.condux/plans`;
const PROGRESS = `${ROOT}/.condux/progress`;
const MINUTE = 60_000;
const DAY = 86_400_000;

const run = (args: string): CommandRunInput => ({
  command: 'condux',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 160 },
});

type VFile = { text: string; mtimeMs: number };

// A plan whose tasks form a chain: each waits on the one before it.
const planText = (title: string, count: number): string =>
  [
    `# Plan: ${title}`,
    '',
    ...Array.from({ length: count }, (_, i) => [
      `## Task ${i + 1}: step ${i + 1}`,
      '',
      `Card text for step ${i + 1}.`,
      '',
      `**Dependencies:** ${i === 0 ? 'None' : `Task ${i}`}`,
      '',
    ]).flat(),
  ].join('\n');

const ledgerText = (planFile: string, lines: string[]): string =>
  ['# Progress', '', `Plan: .condux/plans/${planFile}`, '', ...lines, ''].join('\n');

type World = {
  files: Record<string, VFile>;
  hasCondux: boolean;
  open: 'placed' | 'silent';
  isPaneUp: boolean;
  lists: number;
};

// The kit runs with no fs, so the test answers every `$` call the module makes from beneath it.
const answerBeneath = (on: On, build: (now: number) => Record<string, VFile>) => {
  const clock = mock.clock(on);
  const now = clock.now();
  const world: World = { files: build(now), hasCondux: true, open: 'placed', isPaneUp: true, lists: 0 };
  const children = (dir: string) =>
    Object.entries(world.files).filter(([path]) => path.startsWith(`${dir}/`) && !path.slice(dir.length + 1).includes('/'));

  on('session.start', (_$, e) => ({ cwd: e.cwd }));
  on('session.cwd', () => ({ value: ROOT }));
  on('command.register', (_$, e) => ({ value: { command: e.name } }));
  on('ui.panes', () => ({
    value: world.isPaneUp ? [{ id: 'condux', title: 'condux', isShown: true, isFocused: true, isPlaced: true }] : [],
  }));
  on('ui.toast', () => ({ value: undefined }));
  on('ui.open', () => {
    if (world.open === 'silent') {
      return new Promise(() => undefined);
    }

    return { value: { isPlaced: true } };
  });
  on('fs.exists', (_$, e) => ({
    value: (world.hasCondux && e.path === `${ROOT}/.condux`) || e.path === `${ROOT}/.git`,
  }));
  on('fs.list', (_$, e) => {
    world.lists += 1;

    if (e.path !== PLANS && e.path !== PROGRESS) {
      return { deny: 'ENOENT' };
    }

    return {
      value: children(e.path).map(([path, file]) => ({
        name: path.slice(e.path.length + 1),
        kind: 'file',
        size: file.text.length,
        mtimeMs: file.mtimeMs,
        isLink: false,
      })),
    };
  });
  on('fs.read', (_$, e) => {
    const file = world.files[e.path];

    return file ? { value: file.text } : { deny: 'ENOENT' };
  });

  return { world, clock, now };
};

const mountPane = <S extends RenderSurface>(surface: S, $: Engine) =>
  $.ui.mount({
    plugin: 'condux',
    surface,
    component: 'Pane',
    requestId: 'condux',
    props: {
      title: 'condux',
      isFocused: true,
      bodyColumns: 100,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 40 },
      view: {},
    },
  });

// An active plan, a finished one, one with no ledger and an abandoned one.
const sampleFiles = (now: number): Record<string, VFile> => ({
  [`${PLANS}/2026-10-10-active.md`]: { text: planText('Active work', 3), mtimeMs: now - DAY },
  [`${PROGRESS}/active.md`]: {
    text: ledgerText('2026-10-10-active.md', ['- [x] Task 1: step 1 — done']),
    mtimeMs: now - 2 * MINUTE,
  },
  [`${PLANS}/2026-09-01-shipped.md`]: { text: planText('Shipped work', 1), mtimeMs: now - 30 * DAY },
  [`${PROGRESS}/shipped.md`]: {
    text: ledgerText('2026-09-01-shipped.md', ['- [x] Task 1: step 1 — done', '- [x] committed abc1234; PR #7 open']),
    mtimeMs: now - 20 * DAY,
  },
  [`${PLANS}/2026-08-01-quiet.md`]: { text: planText('Never ledgered', 2), mtimeMs: now - 60 * DAY },
  [`${PLANS}/2026-07-01-abandoned.md`]: { text: planText('Abandoned work', 2), mtimeMs: now - 90 * DAY },
  [`${PROGRESS}/abandoned.md`]: {
    text: ledgerText('2026-07-01-abandoned.md', ['- [x] Task 1: step 1 — done']),
    mtimeMs: now - 40 * DAY,
  },
});

for (const surface of SURFACES) {
  test(`lists active plans with glyph rows, and the key hints sit above the list on ${surface}`, async ($, on) => {
    answerBeneath(on, sampleFiles);
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    expect((await ui.find({ key: 'plan:2026-10-10-active.md' }))?.text).toContain('Active work');
    expect((await ui.find({ key: 'plan:2026-10-10-active.md' }))?.text).toContain('1/3 done');
    expect((await ui.find({ key: 'task:2026-10-10-active.md:1' }))?.text).toContain('✓');
    expect((await ui.find({ key: 'task:2026-10-10-active.md:2' }))?.text).toContain('▶');
    expect((await ui.find({ key: 'task:2026-10-10-active.md:3' }))?.text).toContain('waits on 2');

    // Document order. A container's `text` holds all its descendants', so only the hint's own Text node counts.
    const tree = await ui.findAll({});
    const hintsAt = tree.findIndex(node => node.type === 'Text' && /tab move/.test(node.text));
    const firstPlanAt = tree.findIndex(node => node.key === 'plan:2026-10-10-active.md');

    expect(hintsAt).toBeGreaterThanOrEqual(0);
    expect(hintsAt).toBeLessThan(firstPlanAt);
  });

  test(`expanding a task shows its card, and collapsing an active plan hides its tasks on ${surface}`, async ($, on) => {
    answerBeneath(on, sampleFiles);
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    expect(await ui.find({ text: /Card text for step 2/ })).toBe(undefined);

    await ui.press({ key: 'task:2026-10-10-active.md:2' });

    expect(await ui.find({ text: /Card text for step 2/ })).toBeDefined();

    await ui.press({ key: 'plan:2026-10-10-active.md' });

    expect(await ui.find({ key: 'task:2026-10-10-active.md:2' })).toBe(undefined);
  });

  test(`finished, stale and no-ledger plans are collapsed groups that open on press on ${surface}`, async ($, on) => {
    answerBeneath(on, sampleFiles);
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    expect((await ui.find({ key: 'plan:2026-09-01-shipped.md' }))?.text).toContain('complete');
    expect((await ui.find({ key: 'plan:2026-08-01-quiet.md' }))?.text).toContain('no ledger, state unknown');
    // No ledger means no recorded progress: the row reports a task count, never "0/2 done".
    expect((await ui.find({ key: 'plan:2026-08-01-quiet.md' }))?.text).toContain('2 tasks');
    expect((await ui.find({ key: 'plan:2026-08-01-quiet.md' }))?.text).not.toContain('done');
    expect((await ui.find({ key: 'plan:2026-07-01-abandoned.md' }))?.text).toContain('stale');
    expect(await ui.find({ key: 'task:2026-09-01-shipped.md:1' })).toBe(undefined);

    await ui.press({ key: 'plan:2026-09-01-shipped.md' });

    expect(await ui.find({ key: 'task:2026-09-01-shipped.md:1' })).toBeDefined();

    // A plan with no ledger shows neutral marks: no "next ready" glyph and no "waits on" for progress nobody recorded.
    await ui.press({ key: 'plan:2026-08-01-quiet.md' });

    expect((await ui.find({ key: 'task:2026-08-01-quiet.md:1' }))?.text).toContain('·');
    expect((await ui.find({ key: 'task:2026-08-01-quiet.md:1' }))?.text).not.toContain('▶');
    expect((await ui.find({ key: 'task:2026-08-01-quiet.md:2' }))?.text).not.toContain('waits on');
  });

  test(`only the five newest finished plans are listed, with a count and /condux all for the rest on ${surface}`, async ($, on) => {
    answerBeneath(on, now => {
      const files: Record<string, VFile> = {};

      for (let i = 1; i <= 7; i += 1) {
        const file = `2026-09-0${i}-done${i}.md`;

        files[`${PLANS}/${file}`] = { text: planText(`Done ${i}`, 1), mtimeMs: now - 30 * DAY };
        files[`${PROGRESS}/done${i}.md`] = {
          text: ledgerText(file, ['- [x] Task 1: step 1', '- [x] committed abc1234']),
          mtimeMs: now - i * DAY,
        };
      }

      return files;
    });
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    expect(await ui.find({ text: /\+2 older finished plans/ })).toBeDefined();
    expect(await ui.find({ key: 'plan:2026-09-01-done1.md' })).toBeDefined();
    expect(await ui.find({ key: 'plan:2026-09-07-done7.md' })).toBe(undefined);

    const all = await $.command.run(run('all'));

    expect(all.text).toContain('Done 7');
  });

  test(`explains a missing working-state directory instead of showing an empty board on ${surface}`, async ($, on) => {
    const { world } = answerBeneath(on, () => ({}));

    world.hasCondux = false;
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    expect(await ui.find({ text: /No condux working state found/ })).toBeDefined();
  });
}

test('the board redraws as the agent appends to a ledger: a ticked task appears within a poll', async ($, on) => {
  const { world, clock, now } = answerBeneath(on, sampleFiles);

  await $.command.run(run(''));

  const ui = await mountPane('terminal', $);

  expect((await ui.find({ key: 'task:2026-10-10-active.md:2' }))?.text).toContain('▶');

  world.files[`${PROGRESS}/active.md`] = {
    text: ledgerText('2026-10-10-active.md', ['- [x] Task 1: step 1', '- [x] Task 2: step 2']),
    mtimeMs: now + 3 * MINUTE,
  };
  await clock.advance(3000);

  expect((await ui.find({ key: 'task:2026-10-10-active.md:2' }))?.text).toContain('✓');
  expect((await ui.find({ key: 'task:2026-10-10-active.md:3' }))?.text).toContain('▶');
});

test('polling stops once the pane is gone, even when no ui.close hook ran', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  await $.command.run(run(''));

  // Control: with the pane up, every tick lists both directories.
  const before = world.lists;

  await clock.advance(6000);

  expect(world.lists).toBe(before + 4);

  world.isPaneUp = false;
  await clock.advance(3000);

  const after = world.lists;

  await clock.advance(9000);

  expect(world.lists).toBe(after);
});

test('a surface that never answers ui.open gets the board as text instead of a hang', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  world.open = 'silent';

  const running = $.command.run(run(''));

  await clock.advance(2000);

  const result = await running;

  expect(result.text).toContain('this surface did not answer');
  expect(result.text).toContain('Active work');
  expect(result.text).toContain('▶ Task 2');
});

test('an unknown argument lists the subcommands', async ($, on) => {
  answerBeneath(on, () => ({}));

  const result = await $.command.run(run('nonsense'));

  expect(result.text).toContain('/condux all');
});

test('a pane that survived a hot reload loads and polls again on session start', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true });
  await clock.settle();

  const ui = await mountPane('terminal', $);

  expect(await ui.find({ key: 'plan:2026-10-10-active.md' })).toBeDefined();

  const before = world.lists;

  await clock.advance(3000);

  expect(world.lists).toBeGreaterThan(before);
});
