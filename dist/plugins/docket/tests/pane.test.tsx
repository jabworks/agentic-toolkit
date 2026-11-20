import { type CommandRunInput, type On, type PromptFillMode, type RenderSurface } from 'claude-code';
import { type Engine, expect, mock, test } from 'claude-code/testing';

import { PANE_EDGE, TRAY, TRAY_EDGE } from '../hooks/charts';

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
  // The archive's text: what the desktop's close sparkline reads.
  archive: string;
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
    archive: '## 3. Shipped — ✅ DONE 2026-10-19\n',
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
  on('fs.list', () => ({ value: [{ name: '2026.md', kind: 'file', size: 1, mtimeMs: 1, isLink: false }] }));
  on('fs.read', (_$, e) => {
    if (e.path.includes('/archive/')) {
      return { value: world.archive };
    }

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

const mountPane = <S extends RenderSurface>(surface: S, $: Engine) =>
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

test('the desktop draws the ring, the close sparkline and a filter; the terminal draws none of them', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const desktop = await mountPane('desktop', $);

  expect(await desktop.find({ key: 'filter' })).toBeDefined();
  expect(await desktop.find({ text: /closed in the last 4 weeks/ })).toBeDefined();
  // The bar is a rounded vector drawing here, not the terminal's block segments.
  expect(await desktop.find({ key: 'share:Someday' })).toBe(undefined);

  const terminal = await mountPane('terminal', $);

  expect(await terminal.find({ key: 'filter' })).toBe(undefined);
  expect(await terminal.find({ key: 'share:Someday' })).toBeDefined();
  expect(await terminal.find({ text: /closed in the last 4 weeks/ })).toBe(undefined);
});

test('typing in the desktop filter hides items that do not match and says so', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('desktop', $);

  expect(await ui.find({ key: 'item:7' })).toBeDefined();

  await ui.input({ key: 'filter', text: 'zzz-nothing' });

  expect(await ui.find({ key: 'item:7' })).toBe(undefined);
  expect(await ui.find({ text: /no matches/ })).toBeDefined();

  await ui.input({ key: 'filter', text: 'fix the' });

  expect(await ui.find({ key: 'item:7' })).toBeDefined();
});

test('every Svg the desktop draws is given an explicit height, or the app boxes it far taller than it is', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('desktop', $);
  const svgs = await ui.findAll({ type: 'Svg' });
  // The bar, the ring and the sparkline, picked by their alt text: the tags, pills and rule are Svgs too.
  const charts = svgs.filter(svg => /items (done|closed)/.test(String(svg.props.alt)));

  expect(charts.length).toBe(3);

  for (const svg of svgs) {
    expect(typeof svg.props.height).toBe('number');
  }
});

for (const surface of SURFACES) {
  test(`puts the key hints above the list, where a long board does not scroll them away, on ${surface}`, async ($, on) => {
    answerBeneath(on, true);

    await $.command.run(RUN_DOCKET);

    const ui = await mountPane(surface, $);
    // Document order. A container's `text` holds all its descendants', so only the hint's own Text node counts.
    const tree = await ui.findAll({});
    const hintsAt = tree.findIndex(node => node.type === 'Text' && /tab move/.test(node.text));
    const firstItemAt = tree.findIndex(node => node.key === 'item:7');

    expect(hintsAt).toBeGreaterThanOrEqual(0);
    expect(firstItemAt).toBeGreaterThanOrEqual(0);
    expect(hintsAt).toBeLessThan(firstItemAt);
  });
}

// Motion: chart entrances in the desktop's vector drawings, and a brief flash on an item that just arrived.
const FLASH_MS = 1600;

const flashKeys = async (ui: { findAll: (q: object) => Promise<{ key?: string | null }[]> }): Promise<string[]> =>
  (await ui.findAll({}))
    .map(node => node.key ?? '')
    .filter(key => key.startsWith('flash:'));

test('every vector drawing on the desktop carries a CSS entrance that reduced motion switches off', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('desktop', $);
  const svgs = await ui.findAll({ type: 'Svg' });

  // The bar, the ring and the sparkline, picked by their alt text: the tags and the rule are Svgs too, and carry one.
  expect(svgs.filter(svg => /items (done|closed)/.test(String(svg.props.alt))).length).toBe(3);

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
    answerBeneath(on, true);

    await $.command.run(RUN_DOCKET);

    const ui = await mountPane(surface, $);

    expect(await flashKeys(ui)).toEqual([]);
  });

  test(`an item that arrives flashes briefly, then settles, on ${surface}`, async ($, on) => {
    const { world, clock } = answerBeneath(on, true);

    await $.command.run(RUN_DOCKET);

    const ui = await mountPane(surface, $);

    world.text = WITH_ITEM_8;
    world.mtimeMs = 2;
    await clock.advance(3000);

    expect(await ui.find({ key: 'flash:item:8' })).toBeDefined();
    expect(await ui.find({ key: 'flash:item:7' })).toBe(undefined);

    await clock.advance(FLASH_MS);

    expect(await flashKeys(ui)).toEqual([]);
  });

  test(`a forced refresh with nothing new flashes nothing on ${surface}`, async ($, on) => {
    const { world, clock } = answerBeneath(on, true);

    await $.command.run(RUN_DOCKET);

    const ui = await mountPane(surface, $);

    world.mtimeMs = 2;
    await clock.advance(3000);

    expect(await flashKeys(ui)).toEqual([]);
  });
}

// Chrome: each section a tinted tray with a rim in its own tone, a rounded tag, and a solid neutral rule under the
// masthead, all inside a neutral frame. The desktop draws it; the terminal keeps its plain bordered cards.
test('on the desktop each section is a tray whose border follows its fill', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('desktop', $);
  const card = await ui.find({ key: 'card:Someday' });

  expect(card?.props.backgroundColor).toBe(TRAY);
  expect(card?.props.borderColor).toBe(TRAY_EDGE);
  // The hover restyle is the surface's alone: the kit does not hand it back, so it is checked live.
});

test('on the desktop the pane frame is neutral and a tray insets its tag evenly from its corner', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('desktop', $);
  const frames = (await ui.findAll({ type: 'Box' })).filter(box => box.props.borderColor === PANE_EDGE);
  const card = await ui.find({ key: 'card:Someday' });

  expect(frames.length).toBe(1);
  // The frame insets its content by the same step down as across, like the trays inside it.
  expect(frames[0]?.props.padding).toBe('xs');
  expect(frames[0]?.props.paddingX).toBe(undefined);
  // One step on every side, so the tag's rounded end sits concentric with the tray's corner.
  expect(card?.props.padding).toBe('xs');
  expect(card?.props.paddingX).toBe(undefined);
});

test('on the desktop an item row spans the card: fixed marker and id columns, a title the surface cuts, the age flush right', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('desktop', $);
  const row = await ui.find({ key: 'row:7' });
  const title = (await ui.findAll({ type: 'Text' })).find(node => node.text === 'Fix the thing');

  expect(row).toBeDefined();
  expect(title?.props.wrap).toBe('truncate-end');
  expect((await ui.find({ key: 'item:7' }))?.text).toBe('Fix the thing');
});

test('on the desktop a section tag is solid, in its section colour from the bar and the legend', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('desktop', $);
  const svgs = await ui.findAll({ type: 'Svg' });
  const tagSource = (alt: string) => String(svgs.find(svg => svg.props.alt === alt)?.props.source);

  expect(tagSource('COMMITTED · 0')).toContain('fill="#c8643c" fill-opacity="1"');
  expect(tagSource('SOMEDAY · 1')).toContain('fill="#2f6db5" fill-opacity="1"');
});

test('the terminal keeps its plain bordered section cards', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('terminal', $);
  const card = await ui.find({ key: 'card:Someday' });

  expect(card).toBeDefined();
  expect(card?.props.backgroundColor).toBe(undefined);
  expect(await ui.find({ text: /SOMEDAY/ })).toBeDefined();
});

test('on the desktop a section name is a rounded tag carrying its count', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('desktop', $);
  const tags = (await ui.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt));

  expect(tags).toContain('SOMEDAY · 1');
  expect(tags).toContain('COMMITTED · 0');
});

test('on the desktop a solid neutral rule sits under the masthead in place of the line of dashes', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const ui = await mountPane('desktop', $);
  const rules = (await ui.findAll({ type: 'Svg' })).filter(svg => svg.props.alt === 'divider');

  expect(rules.length).toBe(1);
  expect(String(rules[0]?.props.source)).not.toContain('Gradient');
  // Height and no width, like the bar: the desktop stretches it to the slot.
  expect(rules[0]?.props.width).toBe(undefined);
  expect(await ui.find({ text: /─{8}/ })).toBe(undefined);
});


test('on the desktop the masthead count is a quiet chip; the terminal keeps it as text', async ($, on) => {
  answerBeneath(on, true);

  await $.command.run(RUN_DOCKET);

  const desktop = await mountPane('desktop', $);

  expect((await desktop.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt))).toContain('1 open');

  const terminal = await mountPane('terminal', $);

  expect(await terminal.find({ text: /· 1 open/ })).toBeDefined();
});
