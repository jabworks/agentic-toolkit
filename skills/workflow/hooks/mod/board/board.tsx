import { type EngineInterface, type On, type RenderChildren, type Timer, atom, read, update } from 'claude-code';

import {
  CHEVRON_SIZE,
  CHIP_HEX,
  PANE_EDGE,
  RULE_HEIGHT,
  TRAY,
  TRAY_EDGE,
  TRAY_HOVER,
  barSvg,
  chevronSvg,
  pillSvg,
  ruleSvg,
} from '../kit/charts';
import { locateWorkingState, type WorkingState } from '../kit/locate';
import { joinPath } from '../kit/paths';
import { type BoardFlash, type BoardPlan, type BoardSnapshot, type Ledger, type Plan, type PlanStatus } from '../types';
import { badges } from './badges';
import { GLYPH_ALT, GLYPH_SIZE, type GlyphKind, glyphSvg } from './glyph-svg';
import { graphSvg, hasGraph, STATE_HEX } from './graph';
import { parseLedger } from './parse-ledger';
import { parsePlan } from './parse-plan';
import { deriveBoard, statusText, workedPlan } from './state';
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
const NO_FLASH: BoardFlash = { keys: [], at: 0, tick: 0 };
const flash = atom({ plugin: 'condux', key: 'flash' } as const, NO_FLASH);
const working = atom({ plugin: 'condux', key: 'working' } as const, false);

// A changed task is tinted bright, eases to a dim tint at the halfway mark, then clears.
const FLASH_MS = 1600;
// The status line's spinner: one braille glyph per step while a main-loop turn runs.
const SPIN_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPIN_MS = 250;

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
// Each task's state as last drawn, by task key; undefined until the first board, which only seeds it, so opening the
// pane or a hot reload lights nothing.
let knownStates: Map<string, string> | undefined;
let spin: Timer | undefined;
let spinFrame = 0;

// Missing and unreadable boards are rewritten on every poll; skipping identical writes keeps the pane from redrawing.
async function setBoard($: EngineInterface, value: BoardSnapshot): Promise<void> {
  const current = await read($, board);

  if (JSON.stringify(current) === JSON.stringify(value)) {
    return;
  }

  await update($, board, () => value);
  await noteChanges($, value);
}

// Lights the tasks whose state moved since the last board: a tick in the ledger, or a task that became next.
async function noteChanges($: EngineInterface, value: BoardSnapshot): Promise<void> {
  if (value.kind !== 'found') {
    return;
  }

  const states = new Map(
    value.plans.flatMap(entry =>
      entry.tasks.map(boardTask => [`task:${entry.plan.file}:${boardTask.task.number}`, boardTask.state] as const),
    ),
  );
  const previous = knownStates;

  knownStates = states;

  if (previous === undefined) {
    return;
  }

  // A task the board has not shown before is new, not changed: a fresh plan arrives without a flash.
  const changed = [...states].filter(([key, state]) => previous.has(key) && previous.get(key) !== state).map(([key]) => key);

  if (changed.length === 0) {
    return;
  }

  const at = await $.clock.now();

  await update($, flash, () => ({ keys: changed, at, tick: 0 }));
  $.clock.after(FLASH_MS / 2, () => stepFlash($, at));
  $.clock.after(FLASH_MS, () => stepFlash($, at));
}

// Redraws the flash at each step of its fade, but only while it is still the latest: a newer change owns the tint.
function stepFlash($: EngineInterface, at: number): void {
  void update($, flash, current => (current.at === at ? { ...current, tick: current.tick + 1 } : current));
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
  const plain = snapshot?.kind === 'found' ? statusText(snapshot.plans) : null;
  const text = plain !== null && spin !== undefined ? `${SPIN_FRAMES[spinFrame] ?? ''} ${plain}` : plain;

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

// Rows the person has opened or closed this load: closed again, their chevron turns back instead of only fading in.
const turned = new Set<string>();

function toggle($: EngineInterface, key: string): Promise<unknown> {
  turned.add(key);

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

// The task under way is blue, as the in-progress pill is: the accent's red-orange read as trouble.
const STATE_COLOR = { done: 'success', 'next-ready': 'suggestion', ready: 'text', blocked: 'subtle' } as const;

// The status pill on the desktop's plan row: a short word on a mid-tone fill.
const PILL: Record<PlanStatus, { label: string; hex: string }> = {
  'no-ledger': { label: 'no ledger', hex: '#8a8a85' },
  'not-started': { label: 'not started', hex: '#2f6db5' },
  // Blue for work under way: the red-orange read as trouble beside the stalled line's red.
  'in-progress': { label: 'in progress', hex: '#2f6db5' },
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
  stopSpinning();
  $.ui.status(undefined);
  stopPolling();
}

function stopSpinning(): void {
  spin?.cancel();
  spin = undefined;
  spinFrame = 0;
}

// A main-loop turn began: the task being worked pulses on the pane and the status line spins, both until it ends. A
// subagent's turn carries an agentId and changes neither.
async function startWorking($: EngineInterface): Promise<void> {
  await update($, working, () => true);

  if (!isStatusOn || spin !== undefined) {
    return;
  }

  spin = $.clock.every(SPIN_MS, () => {
    spinFrame = (spinFrame + 1) % SPIN_FRAMES.length;
    void publishStatus($);
  });
  await publishStatus($);
}

async function stopWorking($: EngineInterface): Promise<void> {
  await update($, working, () => false);

  if (spin === undefined) {
    return;
  }

  stopSpinning();
  await publishStatus($);
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

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await startWorking($).catch(() => undefined);
    }

    return next(e);
  });

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await stopWorking($).catch(() => undefined);
    }

    return next(e);
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
    const lit = await read($, flash);
    const isWorking = await read($, working);
    const now = await $.clock.now();
    // The terminal and the desktop run a surface module; elsewhere the worked task keeps its still glyph.
    const Client =
      e.surface === 'terminal' || e.surface === 'desktop'
        ? (elements as Extract<typeof elements, { Client: unknown }>).Client
        : undefined;
    const flashAge = now - lit.at;
    const tint = flashAge < FLASH_MS / 2 ? 'diffAdded' : 'diffAddedDimmed';
    const isLit = (key: string): boolean => lit.keys.includes(key) && flashAge >= 0 && flashAge < FLASH_MS;
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

    // The desktop shows each figure of the count as a quiet grey chip; `· 19 open` and `25 plans · 1 active` alike.
    const countChips = (count: string) =>
      Svg === undefined
        ? null
        : count
            .split('·')
            .map(part => part.trim())
            .filter(part => part !== '')
            .map(part => {
              const chip = pillSvg(part, CHIP_HEX);

              return (
                <Svg
                  source={chip.svg}
                  alt={part}
                  width={chip.width}
                  height={chip.height}
                  isInteractive
                />
              );
            });

    // The hints sit under the header: a pane has no fixed footer, its whole body scrolls as one.
    const frame = (count: string, body: RenderChildren, hints: string) => (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={Svg === undefined ? 'claude' : PANE_EDGE}
        padding='xs'
      >
        <Box
          justifyContent='space-between'
          alignItems='center'
        >
          <Box
            gap={1}
            alignItems='center'
          >
            <Text
              bold
              color='claude'
            >
              condux
            </Text>
            {Svg === undefined ? <Text color='subtle'>{count}</Text> : countChips(count)}
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
        {/* The desktop's rule is a solid neutral hairline. Given a height and no width, like the bar, it fills its slot
            edge to edge. */}
        {Svg === undefined ? (
          divider('─', windowWidth)
        ) : (
          <Svg
            source={ruleSvg()}
            alt='divider'
            height={RULE_HEIGHT}
            isInteractive
          />
        )}
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
    const worked = isWorking ? workedPlan(snapshot.plans) : null;

    const renderTask = (entry: BoardPlan, boardTask: BoardPlan['tasks'][number]) => {
      const key = `task:${entry.plan.file}:${boardTask.task.number}`;
      const isOpen = open.includes(key);
      const wait = waitLabel(entry, boardTask);
      const nameRoom = Math.max(8, rowWidth - 14 - wait.length);
      const isWorked = worked?.plan.file === entry.plan.file && boardTask.state === 'next-ready';
      // The terminal pulses its text glyph; the desktop draws the glyph and spins it instead.
      const isPulsing = Svg === undefined && Client !== undefined && isWorked;
      const pulseKey = `pulse:${entry.plan.file}:${boardTask.task.number}`;
      const kind: GlyphKind =
        entry.status === 'no-ledger' ? 'unknown' : boardTask.inCycle ? 'cycle' : boardTask.state;
      const glyph = <Text color={glyphColor(entry, boardTask)}>{`${taskGlyph(entry, boardTask)} `}</Text>;

      return (
        // Keyed while lit: the tint sits inside a Button, whose children carry no keys of their own.
        <Box
          key={isLit(key) ? `flash:${key}` : undefined}
          flexDirection='column'
        >
          <Box>
            {/* A surface module cannot sit inside a Button, so the pulsing glyph stands just before it. On the desktop
                every glyph does, drawn in a two-cell column like the app's checklist: the task names and the detail
                under them line up past it, and the worked task's arc spins. */}
            {isPulsing && Client !== undefined && (
              <Client
                key={pulseKey}
                module='./pulse.tsx'
                props={{ glyph: taskGlyph(entry, boardTask), color: glyphColor(entry, boardTask) }}
                width={2}
              />
            )}
            {Svg !== undefined && (
              <Box
                key={isWorked ? pulseKey : `glyph:${key}`}
                width={2}
                flexShrink={0}
                alignItems='center'
              >
                <Svg
                  source={glyphSvg(kind, isWorked)}
                  // Names its task, so a reader moving down the glyphs hears whose state each is.
                  alt={`Task ${boardTask.task.number}: ${isWorked ? 'working' : GLYPH_ALT[kind]}`}
                  width={GLYPH_SIZE}
                  height={GLYPH_SIZE}
                  isInteractive
                />
              </Box>
            )}
            <Button
              key={key}
              plain
              onPress={() => toggle($, key)}
            >
              {!isPulsing && Svg === undefined && glyph}
              <Text
                bold={boardTask.state === 'next-ready'}
                backgroundColor={isLit(key) ? tint : undefined}
              >
                {`Task ${boardTask.task.number}  ${clip(boardTask.task.name, nameRoom)}`}
              </Text>
              <Text color='subtle'>{wait === '' ? '' : `  ${wait}`}</Text>
            </Button>
          </Box>
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
      const statusPill = pillSvg(pill.label, pill.hex);
      const dated = entry.plan.date === null ? Number.NaN : Date.parse(`${entry.plan.date}T00:00:00Z`);
      const age = Number.isNaN(dated) ? null : Math.max(0, Math.floor((now - dated) / DAY_MS));
      const shares = [
        { name: 'Done', count: entry.doneCount, color: STATE_HEX.done },
        { name: 'Left', count: Math.max(0, total - entry.doneCount), color: STATE_HEX.blocked },
      ];

      return (
        // The marker sits in a fixed column, the title grows into the room the cluster leaves and is cut by the surface,
        // so every row is one width and the ellipses line up.
        <Box
          key={`planrow:${entry.plan.file}`}
          alignItems='center'
        >
          <Box
            width={2}
            flexShrink={0}
            alignItems='center'
          >
            <Svg
              source={chevronSvg(isOpen, turned.has(key))}
              alt={isOpen ? 'expanded' : 'collapsed'}
              width={CHEVRON_SIZE}
              height={CHEVRON_SIZE}
              isInteractive
            />
          </Box>
          <Box
            flexGrow={1}
            flexShrink={1}
            overflow='hidden'
          >
            <Button
              key={key}
              plain
              // The one hover: a row Box's own did not draw on the desktop, and the Button's native highlight is darker.
              hover={{ backgroundColor: TRAY_HOVER }}
              onPress={() => toggle($, key)}
            >
              <Text
                bold
                wrap='truncate-end'
              >
                {entry.plan.title}
              </Text>
            </Button>
          </Box>
          <Box
            gap={2}
            alignItems='center'
            flexShrink={0}
            marginLeft={2}
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
                  // An image replays its entrance on every redraw; an interactive Svg plays it once per new source.
                  isInteractive
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
              justifyContent='center'
            >
              <Svg
                source={statusPill.svg}
                // Names the plan: a reader moving through the pills hears whose status each is.
                alt={`${entry.plan.title}: ${pill.label}`}
                width={statusPill.width}
                height={statusPill.height}
                isInteractive
              />
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
              {entry.wrapUp.map(line =>
                Svg === undefined ? (
                  <Text color='subtle'>{`${line.isChecked ? '✓' : '○'} ${clip(line.text, rowWidth - 4)}`}</Text>
                ) : (
                  <Box>
                    <Box
                      width={2}
                      flexShrink={0}
                    >
                      <Text color='subtle'>{line.isChecked ? '✓' : '○'}</Text>
                    </Box>
                    <Text
                      color='subtle'
                      wrap='truncate-end'
                    >
                      {line.text}
                    </Text>
                  </Box>
                ),
              )}
            </Box>
          )}
        </Box>
      );
    };

    // The desktop's card is a tray whose rim is its own fill a step stronger, its name a rounded tag; the terminal keeps
    // a plain border and a text heading.
    // A section's tag is solid, in the colour of the status pill its rows carry, so the heading and its rows read as one.
    const section = (title: string, plans: BoardPlan[], status: PlanStatus) => {
      if (plans.length === 0) {
        return null;
      }

      const label = `${title} · ${plans.length}`;
      const tag = pillSvg(label, PILL[status].hex, true);

      return (
        <Box
          key={`card:${title}`}
          flexDirection='column'
          borderStyle='round'
          borderColor={Svg === undefined ? 'suggestion' : TRAY_EDGE}
          backgroundColor={Svg === undefined ? undefined : TRAY}
          padding='xs'
        >
          {Svg === undefined ? (
            <Box gap={1}>
              <Text
                bold
                color='suggestion'
              >
                {title}
              </Text>
              <Text color='subtle'>{plans.length}</Text>
            </Box>
          ) : (
            <Svg
              source={tag.svg}
              alt={label}
              width={tag.width}
              height={tag.height}
              isInteractive
            />
          )}
          {plans.map(renderPlan)}
        </Box>
      );
    };

    // A margin above only: the frame's own padding is the gap below the last card, the same as at its sides.
    const body = (
      <Box
        flexDirection='column'
        marginTop={1}
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
        {section('ACTIVE', groups.active, 'in-progress')}
        {section('COMPLETE', groups.complete, 'complete')}
        {groups.olderComplete.length > 0 && (
          <Text color='subtle'>{`+${groups.olderComplete.length} older finished plans · /condux all`}</Text>
        )}
        {section('STALE', groups.stale, 'stale')}
        {groups.olderStale.length > 0 && (
          <Text color='subtle'>{`+${groups.olderStale.length} older stale plans · /condux all`}</Text>
        )}
        {section('NO LEDGER · state unknown', groups.noLedger, 'no-ledger')}
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
