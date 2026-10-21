import { type EngineInterface, type On, type RenderChildren, type Timer, atom, read, update } from 'claude-code';

import { barSvg } from '../kit/charts';
import { locateWorkingState, type WorkingState } from '../kit/locate';
import { joinPath } from '../kit/paths';
import { type BoardPlan, type BoardSnapshot, type Ledger, type Plan, type PlanStatus } from '../types';
import { badges } from './badges';
import { graphSvg, hasGraph, STATE_HEX } from './graph';
import { parseLedger } from './parse-ledger';
import { parsePlan } from './parse-plan';
import { deriveBoard, statusText } from './state';
import { type Stage, stepperStages } from './stepper';
import {
  activity,
  boardText,
  groupPlans,
  isActive,
  planCount,
  statusLabel,
  taskGlyph,
  unledgered,
  waitLabel,
} from './text';

const PANE = 'condux';
const POLL_MS = 3000;
// A surface that never answers `$.ui.open` must not leave /condux spinning (docket's did, in the desktop's Code tab).
const OPEN_TIMEOUT_MS = 2000;

const board = atom({ plugin: 'condux', key: 'board' } as const, null);
const toggled = atom({ plugin: 'condux', key: 'toggled' } as const, []);
const filter = atom({ plugin: 'condux', key: 'filter' } as const, '');

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
// The status line rides the same poll as the pane: one timer, two reasons to keep it running.
let isStatusOn = false;
let lastStatus: string | null | undefined;

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

// Pins the one-line summary under the prompt; a repeat of what is already pinned is not sent again.
async function publishStatus($: EngineInterface): Promise<void> {
  if (!isStatusOn) {
    return;
  }

  const snapshot = await read($, board);
  const text = snapshot?.kind === 'found' ? statusText(snapshot.plans) : null;

  if (text === lastStatus) {
    return;
  }

  lastStatus = text;
  $.ui.status(text ?? undefined);
}

// ui.close hooks do not run when the engine unloads a pane whose drawing threw, so each tick checks the pane is up. The
// timer then stops only if the status line has no use for it either.
async function tick($: EngineInterface): Promise<void> {
  const panes = await $.ui.panes().catch(() => undefined);

  if (!isStatusOn && panes !== undefined && !panes.some(pane => pane.id === PANE)) {
    stopPolling();

    return;
  }

  await refresh($, false);
  await publishStatus($);
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

// `focus` is a request the surface may refuse; left out, the pane opens without taking the keyboard, which is what an
// open the person did not ask for must do.
function openPane($: EngineInterface, isFocused: boolean): Promise<OpenOutcome> {
  return Promise.race<OpenOutcome>([
    $.ui.open(isFocused ? { id: PANE, title: 'condux', focus: true } : { id: PANE, title: 'condux' }),
    $.clock.sleep(OPEN_TIMEOUT_MS).then(() => ({ isPlaced: false, reason: 'this surface did not answer' })),
  ]);
}

function toggle($: EngineInterface, key: string): Promise<unknown> {
  return update($, toggled, list => (list.includes(key) ? list.filter(item => item !== key) : [...list, key]));
}

function setFilter($: EngineInterface, value: string): Promise<unknown> {
  return update($, filter, () => value);
}

const USAGE = [
  'Usage:',
  '  /condux       open the plan and progress board',
  '  /condux all   list every plan, including older finished ones',
].join('\n');

const clip = (text: string, room: number): string =>
  text.length > room ? `${text.slice(0, Math.max(1, room - 1))}…` : text;

const STATE_COLOR = { done: 'success', 'next-ready': 'claude', ready: 'text', blocked: 'subtle' } as const;

// The status pill on the desktop's plan row: a short word on a mid-tone fill.
const PILL: Record<PlanStatus, { label: string; hex: string }> = {
  'no-ledger': { label: 'no ledger', hex: '#8a8a85' },
  'not-started': { label: 'not started', hex: '#2f6db5' },
  'in-progress': { label: 'in progress', hex: '#c8643c' },
  'tasks-done': { label: 'wrapping up', hex: '#b8860b' },
  complete: { label: 'complete', hex: '#3f8f5b' },
  stale: { label: 'stale', hex: '#8a8a85' },
};

const DAY_MS = 86_400_000;

// The desktop row's right-hand columns, in cells.
const BAR_CELLS = 12;
const COUNT_CELLS = 13;
const PILL_CELLS = 13;
const AGE_CELLS = 6;
// Those four plus the gaps between them: what the title must leave free.
const CLUSTER_CELLS = BAR_CELLS + COUNT_CELLS + PILL_CELLS + AGE_CELLS + 6;

// A graph past this many tasks is a tangle; it sits behind a toggle instead of opening with the plan.
const GRAPH_OPEN_MAX = 15;

const ageText = (days: number): string => (days === 0 ? 'today' : `${days}d`);

const stageGlyph = (stage: Stage): string => {
  if (stage.isDone) {
    return '●';
  }

  return stage.isGhost ? '◌' : '○';
};

// A task's mark colour: neutral for a plan with no ledger, red for a cycle, otherwise by state.
const glyphColor = (plan: BoardPlan, boardTask: BoardPlan['tasks'][number]): string => {
  if (plan.status === 'no-ledger') {
    return 'subtle';
  }

  return boardTask.inCycle ? 'error' : STATE_COLOR[boardTask.state];
};

// The board opens itself once, the first time an agent writes a progress ledger: that is the moment a saved plan starts
// being implemented, so a typo fix or a chat never opens anything. A person who closes it is not asked again, and
// CONDUX_AUTO_OPEN=0 turns it off. Every failure is swallowed: this runs beside a tool call and must never touch it.
let hasAutoOpened = false;

async function autoOpen($: EngineInterface): Promise<void> {
  if (hasAutoOpened) {
    return;
  }

  hasAutoOpened = true;

  try {
    if ((await $.env.get('CONDUX_AUTO_OPEN')) === '0') {
      return;
    }

    const panes = await $.ui.panes().catch(() => []);

    if (panes.some(pane => pane.id === PANE)) {
      return;
    }

    const opened = await openPane($, false);

    if (!opened.isPlaced) {
      return;
    }

    await refresh($, true);
    await armStatus($);
    startPolling($);
  } catch {
    // The board is an extra; the agent's write goes on.
  }
}

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

// Arms the status line: a session-long timer that runs only where a working-state directory exists, so a repository
// that never used condux never pays for a poll. One that gains `.condux` mid-session is picked up the next time `/condux` is
// run. After a hot reload `session.start` fires again, which re-arms this with fresh module state.
export async function armStatus($: EngineInterface): Promise<void> {
  const found = await locateWorkingState($, await $.session.cwd());

  if (found === null) {
    return;
  }

  isStatusOn = true;
  await refresh($, true);
  await publishStatus($);
  startPolling($);
}

// Called from session.end. A `/clear` ends the session without a new session.start, and the process goes on with the
// same plans, so it keeps the line; anything else is the end of the process and clears it.
export function disarmStatus($: EngineInterface, reason: string): void {
  if (reason === 'clear') {
    return;
  }

  isStatusOn = false;
  lastStatus = undefined;
  $.ui.status(undefined);
  stopPolling();
}

const LEDGER_FILE_RE = /(?:^|[\\/])\.condux[\\/]progress[\\/][^\\/]+\.md$/;
// A shell write into the ledger: a redirect or tee naming it, not a `cat` that only reads it.
const LEDGER_SHELL_RE = /(?:>>?|\btee\b)[^\n|;&]*\.condux\/progress\/\S+\.md/;

export const registerBoard = (on: On): void => {
  on('tool.call', { tool: ['Write', 'Edit'] }, ($, e, next) => {
    if (typeof e.file_path === 'string' && LEDGER_FILE_RE.test(e.file_path)) {
      void autoOpen($);
    }

    return next(e);
  });

  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    if (typeof e.command === 'string' && LEDGER_SHELL_RE.test(e.command)) {
      void autoOpen($);
    }

    return next(e);
  });

  on('command.run', { command: 'condux' }, async ($, e) => {
    const argument = e.args.trim();

    if (argument === 'all') {
      await refresh($, true);

      return { text: boardText(await read($, board), true) };
    }

    if (argument !== '') {
      return { text: USAGE };
    }

    const opened = await openPane($, true);

    await refresh($, true);
    await armStatus($);

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
    if (e.id === PANE && !isStatusOn) {
      stopPolling();
    }

    return next(e);
  });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e);
    const { Box, Button, Markdown, Text } = elements;
    // Vector drawings and a filter field are the desktop's; the terminal's cells cannot round a block, and typing in a
    // field there would swallow the hotkeys. (`in` cannot tell the tables apart: key on the surface.)
    const Svg =
      e.surface === 'terminal' ? undefined : (elements as Extract<typeof elements, { Svg: unknown }>).Svg;
    const Input =
      e.surface === 'desktop' || e.surface === 'vscode'
        ? (elements as Extract<typeof elements, { Svg: unknown; Input: unknown }>).Input
        : undefined;
    const snapshot = await read($, board);
    const open = await read($, toggled);
    const filterText = await read($, filter);
    const now = await $.clock.now();
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
    const needle = filterText.trim().toLowerCase();
    const shown =
      needle === ''
        ? snapshot.plans
        : snapshot.plans.filter(entry => `${entry.plan.title} ${entry.plan.slug}`.toLowerCase().includes(needle));
    const groups = groupPlans(shown, needle === '');

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

    // Plan chrome, shared by both surfaces: how alive the agent looks, the facts best read from the ledger, and the
    // pipeline from the first task to the commit.
    const renderChrome = (entry: BoardPlan) => {
      const alive = activity(entry);
      const facts = badges(entry);
      const stages = stepperStages(entry);
      const graphKey = `graph:${entry.plan.file}`;
      const isBig = entry.tasks.length > GRAPH_OPEN_MAX;
      const isGraphShown = !isBig || open.includes(graphKey);
      const graph = Svg !== undefined && hasGraph(entry) && isGraphShown ? graphSvg(entry, 560) : null;

      return (
        <Box
          flexDirection='column'
          gap={1}
          marginY={1}
        >
          {alive !== null && (
            <Text
              key={`activity:${entry.plan.file}`}
              color={alive.tone}
            >
              {alive.label}
            </Text>
          )}
          {facts.length > 0 && (
            <Text
              key={`badges:${entry.plan.file}`}
              color='subtle'
            >
              {facts.join(' · ')}
            </Text>
          )}
          {stages.length > 0 && (
            <Box
              key={`stepper:${entry.plan.file}`}
              gap={2}
              flexWrap='wrap'
            >
              {stages.map(stage => (
                <Text
                  key={`stage:${entry.plan.file}:${stage.label}`}
                  color={stage.isDone ? 'success' : 'subtle'}
                  dimColor={stage.isGhost}
                >
                  {`${stageGlyph(stage)} ${stage.label}`}
                </Text>
              ))}
            </Box>
          )}
          {Svg !== undefined && hasGraph(entry) && isBig && (
            <Button
              key={graphKey}
              plain
              onPress={() => toggle($, graphKey)}
            >
              <Text color='claude'>{isGraphShown ? '▾ ' : '▸ '}</Text>
              <Text color='subtle'>{`dependency graph · ${entry.tasks.length} tasks`}</Text>
            </Button>
          )}
          {graph !== null && Svg !== undefined && (
            <Svg
              source={graph.svg}
              alt={`Task dependencies of ${entry.plan.title}`}
              width={graph.width}
              height={graph.height}
              isInteractive
            />
          )}
        </Box>
      );
    };

    const renderPlanHeader = (entry: BoardPlan, key: string, isOpen: boolean) => {
      if (Svg === undefined) {
        return (
          <Button
            key={key}
            plain
            onPress={() => toggle($, key)}
          >
            <Text color='claude'>{isOpen ? '▾ ' : '▸ '}</Text>
            <Text bold>{clip(entry.plan.title, Math.max(12, rowWidth - 36))}</Text>
            <Text color='subtle'>{`  ${planCount(entry)}${statusLabel(entry.status)}`}</Text>
          </Button>
        );
      }

      // Title on the left; what you scan for on the right: progress, count, status, age.
      const total = entry.plan.tasks.length;
      const pill = PILL[entry.status];
      const dated = entry.plan.date === null ? Number.NaN : Date.parse(`${entry.plan.date}T00:00:00Z`);
      const age = Number.isNaN(dated) ? null : Math.max(0, Math.floor((now - dated) / DAY_MS));
      const shares = [
        { name: 'Done', count: entry.doneCount, color: STATE_HEX.done },
        { name: 'Left', count: Math.max(0, total - entry.doneCount), color: STATE_HEX.blocked },
      ];

      return (
        <Box
          key={`planrow:${entry.plan.file}`}
          justifyContent='space-between'
          alignItems='center'
        >
          <Button
            key={key}
            plain
            onPress={() => toggle($, key)}
          >
            <Text color='claude'>{isOpen ? '▾ ' : '▸ '}</Text>
            <Text bold>{clip(entry.plan.title, Math.max(12, rowWidth - CLUSTER_CELLS - 4))}</Text>
          </Button>
          <Box
            gap={2}
            alignItems='center'
            flexShrink={0}
          >
            {/* Fixed-width columns, so the bars, counts and pills line up from one row to the next. */}
            <Box
              width={BAR_CELLS}
              flexShrink={0}
            >
              {entry.status !== 'no-ledger' && total > 0 && (
                <Svg
                  source={barSvg(shares, 100, 10)}
                  alt={`${entry.doneCount} of ${total} tasks done`}
                  width={100}
                  height={10}
                />
              )}
            </Box>
            <Box
              width={COUNT_CELLS}
              flexShrink={0}
              justifyContent='flex-end'
            >
              <Text color='subtle'>{planCount(entry).replace(/ · $/, '')}</Text>
            </Box>
            <Box
              width={PILL_CELLS}
              flexShrink={0}
              backgroundColor={pill.hex}
              justifyContent='center'
            >
              <Text color='#ffffff'>{pill.label}</Text>
            </Box>
            <Box
              width={AGE_CELLS}
              flexShrink={0}
              justifyContent='flex-end'
            >
              <Text color='subtle'>{age === null ? '' : ageText(age)}</Text>
            </Box>
          </Box>
        </Box>
      );
    };

    const renderPlan = (entry: BoardPlan) => {
      const key = `plan:${entry.plan.file}`;
      // An active plan is open by default and a finished one closed; a toggle flips whichever default applies.
      const isOpen = isActive(entry) !== open.includes(key);

      return (
        <Box flexDirection='column'>
          {renderPlanHeader(entry, key, isOpen)}
          {isOpen && (
            <Box
              flexDirection='column'
              marginLeft={2}
            >
              {renderChrome(entry)}
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
        {Input !== undefined && snapshot.plans.length > 0 && (
          <Input
            key='filter'
            label='Filter'
            placeholder='plan title'
            value={filterText}
            onInput={value => setFilter($, value)}
            onSubmit={value => setFilter($, value)}
          />
        )}
        {shown.length === 0 && snapshot.plans.length > 0 && <Text color='subtle'>No plan matches the filter.</Text>}
        {section('ACTIVE', groups.active)}
        {section('COMPLETE', groups.complete)}
        {groups.olderComplete.length > 0 && (
          <Text color='subtle'>{`+${groups.olderComplete.length} older finished plans · /condux all`}</Text>
        )}
        {section('STALE', groups.stale)}
        {groups.olderStale.length > 0 && (
          <Text color='subtle'>{`+${groups.olderStale.length} older stale plans · /condux all`}</Text>
        )}
        {section('NO LEDGER · state unknown', groups.noLedger)}
        {groups.olderNoLedger.length > 0 && (
          <Text color='subtle'>{`+${groups.olderNoLedger.length} older plans with no ledger · /condux all`}</Text>
        )}
      </Box>
    );

    const unknown = unledgered(snapshot.plans);

    return frame(
      `${snapshot.plans.length} ${snapshot.plans.length === 1 ? 'plan' : 'plans'} · ${groups.active.length} active${
        unknown > 0 ? ` · ${unknown} unledgered` : ''
      }`,
      body,
      `tab move · ⏎ expand · r refresh · updated ${updatedAt}`,
    );
  });
};
