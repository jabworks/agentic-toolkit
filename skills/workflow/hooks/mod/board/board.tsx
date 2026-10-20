import { type EngineInterface, type On, type RenderChildren, type Timer, atom, read, update } from 'claude-code';

import { locateWorkingState, type WorkingState } from '../kit/locate';
import { joinPath } from '../kit/paths';
import { type BoardPlan, type BoardSnapshot, type Ledger, type Plan } from '../types';
import { parseLedger } from './parse-ledger';
import { parsePlan } from './parse-plan';
import { deriveBoard } from './state';
import { boardText, groupPlans, isActive, planCount, statusLabel, taskGlyph, waitLabel } from './text';

const PANE = 'condux';
const POLL_MS = 3000;
// A surface that never answers `$.ui.open` must not leave /condux spinning (docket's did, in the desktop's Code tab).
const OPEN_TIMEOUT_MS = 2000;

const board = atom({ plugin: 'condux', key: 'board' } as const, null);
const toggled = atom({ plugin: 'condux', key: 'toggled' } as const, []);

type WorkingFile = { kind: 'plan' | 'ledger'; name: string; mtimeMs: number };

async function listFiles($: EngineInterface, dir: string, kind: WorkingFile['kind']): Promise<WorkingFile[]> {
  // A directory that does not exist yet is not an error: nothing has been planned.
  const entries = await $.fs.list(dir).catch(() => []);

  return entries
    .filter(entry => entry.kind === 'file' && /\.md$/i.test(entry.name))
    .map(entry => ({ kind, name: entry.name, mtimeMs: entry.mtimeMs }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Everything that touches `$` is a function declaration, not an arrow: register.tsx reaches this file through an
// import, and past an import `claude plugin validate` follows `$` only into declarations. The engine likewise follows
// `$` only into functions declared at the top of the file, so it all lives here.
let poll: Timer | undefined;
let inFlight: Promise<void> | undefined;
let located: WorkingState | null | undefined;
let lastCwd: string | undefined;
let fingerprint: string | undefined;
let cache: { plans: Plan[]; ledgers: Ledger[]; updatedMs: number } | undefined;
let failures = 0;

// Missing and unreadable boards are rewritten on every poll; skipping identical writes keeps the pane from redrawing.
async function setBoard($: EngineInterface, value: BoardSnapshot): Promise<void> {
  const current = await read($, board);

  if (JSON.stringify(current) === JSON.stringify(value)) {
    return;
  }

  await update($, board, () => value);
}

async function load($: EngineInterface, isForced: boolean): Promise<void> {
  try {
    const cwd = await $.session.cwd();

    // Walk again on a cwd change (a worktree switch) and while nothing is found, so a new `.condux` shows up.
    if (isForced || cwd !== lastCwd || !located) {
      const found = await locateWorkingState($, cwd);

      if (found?.dir !== located?.dir) {
        fingerprint = undefined;
      }

      lastCwd = cwd;
      located = found;
    }

    if (!located) {
      failures = 0;
      await setBoard($, { kind: 'missing', searchedFrom: cwd });

      return;
    }

    const plansDir = joinPath(located.dir, 'plans');
    const progressDir = joinPath(located.dir, 'progress');
    const files = [...(await listFiles($, plansDir, 'plan')), ...(await listFiles($, progressDir, 'ledger'))];
    // Each file's own time, not the directory's: appending to a ledger does not change its directory's.
    const next = files.map(file => `${file.kind}:${file.name}:${file.mtimeMs}`).join('|');

    if (isForced || next !== fingerprint || cache === undefined) {
      const plans = await Promise.all(
        files
          .filter(file => file.kind === 'plan')
          .map(async file => parsePlan(await $.fs.read(joinPath(plansDir, file.name)), file.name)),
      );
      const ledgers = await Promise.all(
        files
          .filter(file => file.kind === 'ledger')
          .map(async file =>
            parseLedger(await $.fs.read(joinPath(progressDir, file.name)), file.name, file.mtimeMs),
          ),
      );

      cache = { plans, ledgers, updatedMs: files.reduce((latest, file) => Math.max(latest, file.mtimeMs), 0) };
      fingerprint = next;
    }

    const now = await $.clock.now();

    failures = 0;
    await setBoard($, {
      kind: 'found',
      root: located.root,
      plans: deriveBoard(cache.plans, cache.ledgers, now),
      updatedMs: cache.updatedMs,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    failures += 1;
    fingerprint = undefined;
    located = undefined;

    // An agent that rewrites a file leaves it missing for a moment: one failed poll keeps the board.
    if (!isForced && failures < 2) {
      return;
    }

    await setBoard($, { kind: 'unreadable', reason }).catch(() => undefined);
  }
}

// One load at a time, so a slow filesystem cannot stack polls; a forced load waits its turn instead of being lost.
async function refresh($: EngineInterface, isForced: boolean): Promise<void> {
  if (inFlight) {
    if (!isForced) {
      return;
    }

    await inFlight;

    return refresh($, true);
  }

  inFlight = load($, isForced).finally(() => {
    inFlight = undefined;
  });

  return inFlight;
}

const stopPolling = (): void => {
  poll?.cancel();
  poll = undefined;
};

// ui.close hooks do not run when the engine unloads a pane whose drawing threw, so each tick checks the pane is up.
async function tick($: EngineInterface): Promise<void> {
  const panes = await $.ui.panes().catch(() => undefined);

  if (panes !== undefined && !panes.some(pane => pane.id === PANE)) {
    stopPolling();

    return;
  }

  await refresh($, false);
}

function startPolling($: EngineInterface): void {
  if (poll) {
    return;
  }

  poll = $.clock.every(POLL_MS, () => {
    void tick($);
  });
}

type OpenOutcome = { isPlaced: true } | { isPlaced: false; reason: string };

function openPane($: EngineInterface): Promise<OpenOutcome> {
  return Promise.race<OpenOutcome>([
    $.ui.open({ id: PANE, title: 'condux', focus: true }),
    $.clock.sleep(OPEN_TIMEOUT_MS).then(() => ({ isPlaced: false, reason: 'this surface did not answer' })),
  ]);
}

function toggle($: EngineInterface, key: string): Promise<unknown> {
  return update($, toggled, list => (list.includes(key) ? list.filter(item => item !== key) : [...list, key]));
}

const USAGE = [
  'Usage:',
  '  /condux       open the plan and progress board',
  '  /condux all   list every plan, including older finished ones',
].join('\n');

const clip = (text: string, room: number): string =>
  text.length > room ? `${text.slice(0, Math.max(1, room - 1))}…` : text;

const STATE_COLOR = { done: 'success', 'next-ready': 'claude', ready: 'text', blocked: 'subtle' } as const;

// A task's mark colour: neutral for a plan with no ledger, red for a cycle, otherwise by state.
const glyphColor = (plan: BoardPlan, boardTask: BoardPlan['tasks'][number]): string => {
  if (plan.status === 'no-ledger') {
    return 'subtle';
  }

  return boardTask.inCycle ? 'error' : STATE_COLOR[boardTask.state];
};

// Called from register.tsx's one session.start hook (the validator rejects two un-matchered hooks on one event): a pane
// that survived a hot reload resumes its polling.
// A function declaration, not an arrow: past an import the validator follows `$` only into declarations.
export async function resumeBoard($: EngineInterface): Promise<void> {
  const panes = await $.ui.panes();

  if (panes.some(pane => pane.id === PANE)) {
    void refresh($, true);
    startPolling($);
  }
}

export const registerBoard = (on: On): void => {
  on('command.run', { command: 'condux' }, async ($, e) => {
    const argument = e.args.trim();

    if (argument === 'all') {
      await refresh($, true);

      return { text: boardText(await read($, board), true) };
    }

    if (argument !== '') {
      return { text: USAGE };
    }

    const opened = await openPane($);

    await refresh($, true);

    if (!opened.isPlaced) {
      // No pane here, so nothing polls; the board goes to the transcript once.
      return {
        text: `The condux pane is not available here (${opened.reason}).\n\n${boardText(await read($, board), false)}`,
      };
    }

    startPolling($);

    // No text: the pane is the output, and a transcript line would cost the model tokens for nothing.
    return {};
  });

  on('ui.close', ($, e, next) => {
    if (e.id === PANE) {
      stopPolling();
    }

    return next(e);
  });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Markdown, Text } = $.ui.resolve(e);
    const snapshot = await read($, board);
    const open = await read($, toggled);
    // Drawn twice as wide as the pane and clipped to one row: a proportional font makes the glyph narrower or wider
    // than a cell, and an exact-width string wrapped into a second, partial line there.
    const windowWidth = Math.max(20, e.props.bodyColumns - 4);
    const rowWidth = Math.max(16, windowWidth - 4);
    const divider = (glyph: string, width: number) => (
      <Box
        height={1}
        overflow='hidden'
      >
        <Text color='subtle'>{glyph.repeat(width * 2)}</Text>
      </Box>
    );

    // The hints sit under the header: a pane has no fixed footer, its whole body scrolls as one.
    const frame = (count: string, body: RenderChildren, hints: string) => (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor='claude'
        paddingX={1}
      >
        <Box justifyContent='space-between'>
          <Box gap={1}>
            <Text
              bold
              color='claude'
            >
              condux
            </Text>
            <Text color='subtle'>{count}</Text>
          </Box>
          <Button
            key='refresh'
            hotkey='r'
            label='Refresh'
            dimColor
            onPress={() => refresh($, true)}
          />
        </Box>
        <Text color='subtle'>{hints}</Text>
        {divider('─', windowWidth)}
        {body}
      </Box>
    );

    if (snapshot === null) {
      return frame('', <Text color='subtle'>Loading the plans…</Text>, 'r refresh');
    }

    if (snapshot.kind === 'missing') {
      return frame(
        'none found',
        <Text>No condux working state found in {snapshot.searchedFrom} or above it.</Text>,
        'r refresh',
      );
    }

    if (snapshot.kind === 'unreadable') {
      return frame('unreadable', <Text color='error'>Could not read the plans: {snapshot.reason}</Text>, 'r retry');
    }

    const updated = new Date(snapshot.updatedMs);
    const updatedAt = `${String(updated.getHours()).padStart(2, '0')}:${String(updated.getMinutes()).padStart(2, '0')}`;
    const groups = groupPlans(snapshot.plans);

    const renderTask = (entry: BoardPlan, boardTask: BoardPlan['tasks'][number]) => {
      const key = `task:${entry.plan.file}:${boardTask.task.number}`;
      const isOpen = open.includes(key);
      const wait = waitLabel(entry, boardTask);
      const nameRoom = Math.max(8, rowWidth - 14 - wait.length);

      return (
        <Box flexDirection='column'>
          <Button
            key={key}
            plain
            onPress={() => toggle($, key)}
          >
            <Text color={glyphColor(entry, boardTask)}>{`${taskGlyph(entry, boardTask)} `}</Text>
            <Text bold={boardTask.state === 'next-ready'}>
              {`Task ${boardTask.task.number}  ${clip(boardTask.task.name, nameRoom)}`}
            </Text>
            <Text color='subtle'>{wait === '' ? '' : `  ${wait}`}</Text>
          </Button>
          {isOpen && (
            <Box
              marginLeft={2}
              marginY={1}
              flexDirection='column'
            >
              {boardTask.task.body === '' ? (
                <Text color='subtle'>No card text.</Text>
              ) : (
                <Markdown text={boardTask.task.body} />
              )}
            </Box>
          )}
        </Box>
      );
    };

    const renderPlan = (entry: BoardPlan) => {
      const key = `plan:${entry.plan.file}`;
      // An active plan is open by default and a finished one closed; a toggle flips whichever default applies.
      const isOpen = isActive(entry) !== open.includes(key);
      const count = planCount(entry);

      return (
        <Box flexDirection='column'>
          <Button
            key={key}
            plain
            onPress={() => toggle($, key)}
          >
            <Text color='claude'>{isOpen ? '▾ ' : '▸ '}</Text>
            <Text bold>{clip(entry.plan.title, Math.max(12, rowWidth - 36))}</Text>
            <Text color='subtle'>{`  ${count}${statusLabel(entry.status)}`}</Text>
          </Button>
          {isOpen && (
            <Box
              flexDirection='column'
              marginLeft={2}
            >
              {entry.plan.tasks.length === 0 && entry.wrapUp.length === 0 && (
                <Text
                  color='subtle'
                  italic
                >
                  no task cards
                </Text>
              )}
              {entry.tasks.map(boardTask => renderTask(entry, boardTask))}
              {entry.wrapUp.map(line => (
                <Text color='subtle'>{`${line.isChecked ? '✓' : '○'} ${clip(line.text, rowWidth - 4)}`}</Text>
              ))}
            </Box>
          )}
        </Box>
      );
    };

    const section = (title: string, plans: BoardPlan[]) =>
      plans.length === 0 ? null : (
        <Box
          flexDirection='column'
          borderStyle='round'
          borderColor='suggestion'
          paddingX={1}
        >
          <Box gap={1}>
            <Text
              bold
              color='suggestion'
            >
              {title}
            </Text>
            <Text color='subtle'>{plans.length}</Text>
          </Box>
          {plans.map(renderPlan)}
        </Box>
      );

    const body = (
      <Box
        flexDirection='column'
        marginY={1}
        gap={1}
      >
        {snapshot.plans.length === 0 && (
          <Text color='subtle'>No plans yet: /draft-plan writes them under .condux/plans.</Text>
        )}
        {section('ACTIVE', groups.active)}
        {section('COMPLETE', groups.complete)}
        {groups.olderComplete.length > 0 && (
          <Text color='subtle'>{`+${groups.olderComplete.length} older finished plans · /condux all`}</Text>
        )}
        {section('STALE', groups.stale)}
        {section('NO LEDGER · state unknown', groups.noLedger)}
      </Box>
    );

    return frame(
      `${snapshot.plans.length} ${snapshot.plans.length === 1 ? 'plan' : 'plans'} · ${groups.active.length} active`,
      body,
      `tab move · ⏎ expand · r refresh · updated ${updatedAt}`,
    );
  });
};
