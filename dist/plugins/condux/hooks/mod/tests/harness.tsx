// The fake host the module's tests stand on: a virtual filesystem under /repo, a recorder for the status line, and
// helpers that draw the pane on a named surface. Shared by the pane tests and the status tests.
import { type CommandRunInput, type On, type RenderSurface } from 'claude-code';
import { type Engine, mock } from 'claude-code/testing';

export const SURFACES = ['terminal', 'desktop'] as const;
export const ROOT = '/repo';
export const PLANS = `${ROOT}/.condux/plans`;
export const PROGRESS = `${ROOT}/.condux/progress`;
export const MINUTE = 60_000;
export const DAY = 86_400_000;

export const run = (args: string): CommandRunInput => ({
  command: 'condux',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 160 },
});

export type VFile = { text: string; mtimeMs: number };

// A plan whose tasks form a chain: each waits on the one before it.
export const planText = (title: string, count: number): string =>
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

export const ledgerText = (planFile: string, lines: string[]): string =>
  ['# Progress', '', `Plan: .condux/plans/${planFile}`, '', ...lines, ''].join('\n');

export type World = {
  files: Record<string, VFile>;
  hasCondux: boolean;
  open: 'placed' | 'silent';
  isPaneUp: boolean;
  lists: number;
  // How many times the module asked whether a path exists: the poll's cost where nothing is found.
  exists: number;
  // Every `$.ui.status` call, in order: undefined is the line being cleared.
  statuses: (string | undefined)[];
  // Every `$.ui.open`: whether it asked for the keyboard.
  opens: { isFocused: boolean }[];
  // Environment variables the module may read.
  env: Record<string, string>;
};

// The kit runs with no fs, so the test answers every `$` call the module makes from beneath it.
export const answerBeneath = (on: On, build: (now: number) => Record<string, VFile>) => {
  const clock = mock.clock(on);
  const now = clock.now();
  const world: World = {
    files: build(now),
    hasCondux: true,
    open: 'placed',
    isPaneUp: true,
    lists: 0,
    exists: 0,
    statuses: [],
    opens: [],
    env: {},
  };
  const children = (dir: string) =>
    Object.entries(world.files).filter(
      ([path]) => path.startsWith(`${dir}/`) && !path.slice(dir.length + 1).includes('/'),
    );

  on('session.start', (_$, e) => ({ cwd: e.cwd }));
  on('session.cwd', () => ({ value: ROOT }));
  on('command.register', (_$, e) => ({ value: { command: e.name } }));
  on('ui.panes', () => ({
    value: world.isPaneUp ? [{ id: 'condux', title: 'condux', isShown: true, isFocused: true, isPlaced: true }] : [],
  }));
  on('ui.toast', () => ({ value: undefined }));
  on('ui.status', (_$, e) => {
    world.statuses.push(e.text);

    return { value: undefined };
  });
  on('env.get', (_$, e) => ({ value: world.env[e.name] }));
  // A tool call that reaches the host is simply answered: the module under test only watches it go by.
  on('tool.call', () => ({ result: {}, text: 'ok' }) as never);
  on('ui.open', (_$, e) => {
    world.opens.push({ isFocused: e.focus === true });

    if (world.open === 'silent') {
      return new Promise(() => undefined);
    }

    return { value: { isPlaced: true } };
  });
  on('fs.exists', (_$, e) => {
    world.exists += 1;

    return { value: (world.hasCondux && e.path === `${ROOT}/.condux`) || e.path === `${ROOT}/.git` };
  });
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }));
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

export const mountPane = <S extends RenderSurface>(surface: S, $: Engine) =>
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
export const sampleFiles = (now: number): Record<string, VFile> => ({
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

