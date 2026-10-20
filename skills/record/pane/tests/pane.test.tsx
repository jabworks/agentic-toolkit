import { type CommandRunInput, type On, type PromptFillMode, type RenderSurface } from 'claude-code';
import { type Engine, expect, mock, test } from 'claude-code/testing';

const FIXTURE = [
  '# TEST DOCKET',
  '',
  'Open items only.',
  '',
  '## Committed',
  '',
  '## Someday',
  '',
  '### 7. Fix the thing (2026-10-01)',
  '',
  'The thing breaks when poked.',
  '',
  '## Loose threads',
  '',
  '- a stray thought',
  '',
].join('\n');

const SURFACES = ['terminal', 'desktop'] as const;

const WITH_ITEM_8 = FIXTURE.replace('## Loose threads', '### 8. A new thing (2026-10-10)\n\n## Loose threads');

const WITHOUT_ITEM_7 = FIXTURE.replace(/### 7\.[\s\S]*?(?=## Loose threads)/, '');

// `/docket` as the person typing it raises it: the kit's `$.command.run` takes the whole input an engine call site passes.
const RUN_DOCKET: CommandRunInput = {
  command: 'docket',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 160 },
};

type Fill = { text: string; mode: PromptFillMode };

// What the fake host holds; a test changes it between clock advances to play the file changing under the pane.
type World = {
  hasDocket: boolean;
  text: string;
  // docket.json's text; `null` plays a board with none.
  config: string | null;
  mtimeMs: number;
  isPaneUp: boolean;
  // How `ui.open` answers: placed, waiting for room, or never (a surface that drops the request).
  open: 'placed' | 'waiting' | 'silent';
  isStatFailing: boolean;
  stats: number;
  fills: Fill[];
};

// The kit runs with no fs, process or prompt box, so the test answers every `$` call the plugin makes from beneath it.
// Calls on `$` answer `{ value }` or `{ deny }`; plain events (`session.start`, `prompt.fill`) answer their result.
const answerBeneath = (on: On, hasDocket: boolean) => {
  const world: World = {
    hasDocket,
    text: FIXTURE,
    config: '{ "next_id": 11 }',
    mtimeMs: 1,
    isPaneUp: true,
    open: 'placed',
    isStatFailing: false,
    stats: 0,
    fills: [],
  };
  const clock = mock.clock(on);

  on('session.start', ($, e) => ({ cwd: e.cwd }));
  on('session.cwd', () => ({ value: '/repo' }));
  on('command.register', ($, e) => ({ value: { command: e.name } }));
  on('ui.panes', () => ({
    value: world.isPaneUp ? [{ id: 'docket', title: 'Docket', isShown: true, isFocused: true, isPlaced: true }] : [],
  }));
  on('fs.exists', ($, e) => ({ value: world.hasDocket && e.path === '/repo/docket/DOCKET.md' }));
  on('fs.stat', () => {
    world.stats += 1;

    if (world.isStatFailing) {
      return { deny: 'EBUSY: the file is being replaced' };
    }

    return { value: { kind: 'file', size: world.text.length, mtimeMs: world.mtimeMs, isLink: false } };
  });
  on('fs.read', (_$, e) => {
    if (e.path.endsWith('docket.json')) {
      return world.config === null ? { deny: 'ENOENT' } : { value: world.config };
    }

    return { value: world.text };
  });
  on('ui.open', () => {
    if (world.open === 'silent') {
      return new Promise(() => undefined);
    }

    return { value: world.open === 'placed' ? { isPlaced: true } : { isPlaced: false, reason: 'no room' } };
  });
  on('ui.toast', () => ({ value: undefined }));
  on('prompt.read', () => ({ value: { text: '', cursor: 0 } }));
  on('prompt.fill', ($, e) => {
    world.fills.push({ text: e.text, mode: e.mode });

    return { isFilled: true };
  });

  return { world, clock };
};

const mountPane = (surface: RenderSurface, $: Engine) =>
  $.ui.mount({
    plugin: 'docket',
    surface,
    component: 'Pane',
    requestId: 'docket',
    props: {
      title: 'Docket',
      isFocused: true,
      bodyColumns: 60,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 40 },
      view: {},
    },
  });

for (const surface of SURFACES) {
  test(`lists open items and expands one with its actions on ${surface}`, async ($, on) => {
    const { world } = answerBeneath(on, true);

    await $.command.run(RUN_DOCKET);

    const ui = await mountPane(surface, $);

    expect((await ui.find({ key: 'item:7' }))?.text).toContain('Fix the thing');
    expect(await ui.find({ text: /a stray thought/ })).toBeDefined();
    expect(await ui.find({ key: 'cite:7' })).toBe(undefined);

    await ui.press({ key: 'item:7' });

    expect(await ui.find({ text: /The thing breaks when poked/ })).toBeDefined();
    expect(await ui.find({ text: /added Oct 1/ })).toBeDefined();
    expect(await ui.find({ key: 'work:7' })).toBeDefined();

    await ui.press({ key: 'cite:7' });
    await ui.press({ key: 'work:7' });

    expect(world.fills).toEqual([
      { text: '#7 ', mode: 'insert' },
      { text: '/condux:workflow #7 — Fix the thing', mode: 'replace' },
    ]);
  });

  test(`redraws when the docket changes while the pane is open on ${surface}`, async ($, on) => {
    const { world, clock } = answerBeneath(on, true);

    await $.command.run(RUN_DOCKET);

    const ui = await mountPane(surface, $);

    expect(await ui.find({ key: 'item:8' })).toBe(undefined);

    world.text = WITH_ITEM_8;
    world.mtimeMs = 2;
    await clock.advance(3000);

    expect((await ui.find({ key: 'item:8' }))?.text).toContain('A new thing');
  });

  test(`says where it looked when there is no docket on ${surface}`, async ($, on) => {
    answerBeneath(on, false);

    await $.command.run(RUN_DOCKET);

    const ui = await mountPane(surface, $);

    expect(await ui.find({ text: /No docket found in \/repo or above it/ })).toBeDefined();
  });
}

test('a pane that survived a hot reload loads and polls again on session start', async ($, on) => {
  const { world, clock } = answerBeneath(on, true);

  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true });
  await clock.settle();

  const ui = await mountPane('terminal', $);

  expect(await ui.find({ key: 'item:7' })).toBeDefined();

  world.text = WITH_ITEM_8;
  world.mtimeMs = 2;
  await clock.advance(3000);

  expect(await ui.find({ key: 'item:8' })).toBeDefined();
});

test('polling stops once the pane is gone, even when no ui.close hook ran', async ($, on) => {
  const { world, clock } = answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  // Control: with the pane up, every tick stats the file.
  const before = world.stats;

  await clock.advance(6000);

  expect(world.stats).toBe(before + 2);

  world.isPaneUp = false;
  await clock.advance(3000);

  const after = world.stats;

  await clock.advance(9000);

  expect(world.stats).toBe(after);
});

test('one failed poll keeps the board; a second shows the error', async ($, on) => {
  const { world, clock } = answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('terminal', $);

  world.isStatFailing = true;
  await clock.advance(3000);

  expect(await ui.find({ key: 'item:7' })).toBeDefined();

  await clock.advance(3000);

  expect(await ui.find({ text: /Could not read/ })).toBeDefined();
});

test('an expanded item that closes is forgotten, so it comes back collapsed', async ($, on) => {
  const { world, clock } = answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('terminal', $);

  await ui.press({ key: 'item:7' });

  expect(await ui.find({ key: 'cite:7' })).toBeDefined();

  world.text = WITHOUT_ITEM_7;
  world.mtimeMs = 2;
  await clock.advance(3000);

  expect(await ui.find({ key: 'item:7' })).toBe(undefined);

  world.text = FIXTURE;
  world.mtimeMs = 3;
  await clock.advance(3000);

  expect(await ui.find({ key: 'item:7' })).toBeDefined();
  expect(await ui.find({ key: 'cite:7' })).toBe(undefined);
});

test('a surface that cannot place the pane gets the board as text', async ($, on) => {
  const { world } = answerBeneath(on, true);

  world.open = 'waiting';

  const result = await $.command.run(RUN_DOCKET);

  expect(result.text).toContain('not available here (no room)');
  expect(result.text).toContain('#7 Fix the thing');
  expect(result.text).toContain('a stray thought');
});

test('a surface that never answers ui.open does not hang /docket', async ($, on) => {
  const { world, clock } = answerBeneath(on, true);

  world.open = 'silent';

  const running = $.command.run(RUN_DOCKET);

  await clock.advance(2000);

  expect((await running).text).toContain('this surface did not answer');
});

for (const surface of SURFACES) {
  test(`shows done and each section's share of everything logged on ${surface}`, async ($, on) => {
    answerBeneath(on, true);

    await $.command.run(RUN_DOCKET);

    const ui = await mountPane(surface, $);

    // FIXTURE: Committed 0, Someday 1 (#7), Loose threads 1; next_id 11 means 10 ids logged, 1 open item, so 9 done.
    expect(await ui.find({ text: /9 done/ })).toBeDefined();
    expect(await ui.find({ text: /0 committed/ })).toBeDefined();
    expect(await ui.find({ text: /1 someday/ })).toBeDefined();
    expect(await ui.find({ text: /1 loose threads/ })).toBeDefined();
    expect(await ui.find({ text: /of 11 logged/ })).toBeDefined();
  });

  test(`leaves Done out when docket.json is unreadable on ${surface}`, async ($, on) => {
    const { world } = answerBeneath(on, true);

    world.config = null;

    await $.command.run(RUN_DOCKET);

    const ui = await mountPane(surface, $);

    expect(await ui.find({ text: /done/ })).toBe(undefined);
    expect(await ui.find({ text: /of 2 logged/ })).toBeDefined();
  });
}
