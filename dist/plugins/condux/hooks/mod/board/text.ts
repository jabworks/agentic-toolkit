import { type BoardPlan, type BoardSnapshot, type PlanStatus, type TaskState } from '../types';

// How many plans each finished, stale and no-ledger group keeps in view; older ones are reached with `/condux all`.
export const MAX_FINISHED = 5;

export const glyphFor = (state: TaskState): string => {
  if (state === 'done') {
    return '✓';
  }

  if (state === 'next-ready') {
    return '▶';
  }

  return state === 'ready' ? '○' : '⏸';
};

const LABELS: Record<PlanStatus, string> = {
  'no-ledger': 'no ledger, state unknown',
  'not-started': 'not started',
  'in-progress': 'in progress',
  'tasks-done': 'tasks done, wrapping up',
  complete: 'complete',
  stale: 'stale',
};

export const statusLabel = (status: PlanStatus): string => LABELS[status];

export const isActive = (entry: BoardPlan): boolean =>
  entry.status === 'not-started' || entry.status === 'in-progress' || entry.status === 'tasks-done';

export type BoardGroups = {
  active: BoardPlan[];
  complete: BoardPlan[];
  // Finished plans past the window; reachable only through `/condux all`.
  olderComplete: BoardPlan[];
  stale: BoardPlan[];
  olderStale: BoardPlan[];
  noLedger: BoardPlan[];
  olderNoLedger: BoardPlan[];
};

// The board arrives sorted (active, complete, stale, no-ledger, newest first); this only cuts it into the groups
// the pane and the text both draw. Each of the three old groups keeps its newest few in view, the rest counted: a
// repository's years of unledgered plans would otherwise bury the one running. `isCapped` false (a filter is typed)
// shows every match, since a person searching is asking for the old ones.
export const groupPlans = (board: BoardPlan[], isCapped = true): BoardGroups => {
  const room = isCapped ? MAX_FINISHED : board.length;
  const finished = board.filter(entry => entry.status === 'complete');
  const stale = board.filter(entry => entry.status === 'stale');
  const noLedger = board.filter(entry => entry.status === 'no-ledger');

  return {
    active: board.filter(isActive),
    complete: finished.slice(0, room),
    olderComplete: finished.slice(room),
    stale: stale.slice(0, room),
    olderStale: stale.slice(room),
    noLedger: noLedger.slice(0, room),
    olderNoLedger: noLedger.slice(room),
  };
};

// How many plans have no ledger at all: the pile that never moves on its own.
export const unledgered = (board: BoardPlan[]): number => board.filter(entry => entry.status === 'no-ledger').length;

// A plan with no ledger has no recorded progress, so its tasks get a neutral mark: claiming "ready" or "0 done" would
// state something the board does not know.
export const taskGlyph = (plan: BoardPlan, task: BoardPlan['tasks'][number]): string =>
  plan.status === 'no-ledger' ? '·' : glyphFor(task.state);

// What a blocked task waits on; empty for any other state, and for a plan with no ledger.
export const waitLabel = (plan: BoardPlan, entry: BoardPlan['tasks'][number]): string => {
  if (plan.status === 'no-ledger' || entry.state !== 'blocked') {
    return '';
  }

  return entry.inCycle ? '⟲ cycle' : `waits on ${entry.waitsOn.join(', ')}`;
};

export const taskLine = (plan: BoardPlan, entry: BoardPlan['tasks'][number]): string => {
  const wait = waitLabel(plan, entry);

  return `${taskGlyph(plan, entry)} Task ${entry.task.number}  ${entry.task.name}${wait === '' ? '' : `  ${wait}`}`;
};

// "3/6 done" for a plan with a ledger; just the task count for one without, which has no progress to report.
export const planCount = (entry: BoardPlan): string => {
  const total = entry.plan.tasks.length;

  if (total === 0) {
    return '';
  }

  return entry.status === 'no-ledger' ? `${total} tasks · ` : `${entry.doneCount}/${total} done · `;
};

const planLine = (entry: BoardPlan): string => `${entry.plan.title}  (${planCount(entry)}${statusLabel(entry.status)})`;

const describePlan = (entry: BoardPlan, isExpanded: boolean): string[] => {
  const lines = [planLine(entry)];

  if (isExpanded) {
    lines.push(...entry.tasks.map(task => `  ${taskLine(entry, task)}`));
    lines.push(...entry.wrapUp.map(line => `  ${line.isChecked ? '✓' : '○'} ${line.text}`));
  }

  return lines;
};

// The text a surface without the pane gets, and what `/condux all` prints. Active plans are drawn with their tasks;
// everything else is one line, unless every plan was asked for.
export const boardText = (snapshot: BoardSnapshot | null, isAll: boolean): string => {
  if (snapshot === null) {
    return 'The condux board is still loading.';
  }

  if (snapshot.kind === 'missing') {
    return `No condux working state found in ${snapshot.searchedFrom} or above it.`;
  }

  if (snapshot.kind === 'unreadable') {
    return `Could not read the condux plans: ${snapshot.reason}`;
  }

  const groups = groupPlans(snapshot.plans);
  const blocks: string[] = [];

  if (groups.active.length > 0) {
    blocks.push(['ACTIVE', ...groups.active.flatMap(entry => describePlan(entry, true))].join('\n'));
  }

  const finished = isAll ? [...groups.complete, ...groups.olderComplete] : groups.complete;

  if (finished.length > 0) {
    blocks.push(['COMPLETE', ...finished.flatMap(entry => describePlan(entry, isAll))].join('\n'));
  }

  if (!isAll && groups.olderComplete.length > 0) {
    blocks.push(`+${groups.olderComplete.length} older finished plans (run /condux all)`);
  }

  const stale = isAll ? [...groups.stale, ...groups.olderStale] : groups.stale;

  if (stale.length > 0) {
    blocks.push(['STALE', ...stale.flatMap(entry => describePlan(entry, isAll))].join('\n'));
  }

  if (!isAll && groups.olderStale.length > 0) {
    blocks.push(`+${groups.olderStale.length} older stale plans (run /condux all)`);
  }

  const noLedger = isAll ? [...groups.noLedger, ...groups.olderNoLedger] : groups.noLedger;

  if (noLedger.length > 0) {
    const rows = noLedger.flatMap(entry => describePlan(entry, isAll));

    blocks.push(['NO LEDGER (state unknown)', ...rows].join('\n'));
  }

  if (!isAll && groups.olderNoLedger.length > 0) {
    blocks.push(`+${groups.olderNoLedger.length} older plans with no ledger (run /condux all)`);
  }

  return blocks.length === 0 ? 'No plans found.' : blocks.join('\n\n');
};

// Minutes as the shortest honest age: "5m", "3h", "2d".
export const ageLabel = (minutes: number): string => {
  if (minutes < 1) {
    return '<1m';
  }

  if (minutes < 60) {
    return `${Math.floor(minutes)}m`;
  }

  return minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`;
};

// Whether an unattended agent looks alive: the ledger is the heartbeat. Only a plan with a ledger and unfinished work
// has one.
export const QUIET_MINUTES = 10;
export const STALLED_MINUTES = 30;

export type Activity = { label: string; tone: 'subtle' | 'warning' | 'error' };

export const activity = (entry: BoardPlan): Activity | null => {
  if (entry.idleMinutes === null) {
    return null;
  }

  const age = ageLabel(entry.idleMinutes);

  if (entry.idleMinutes >= STALLED_MINUTES) {
    return { label: `stalled · ledger ${age} ago`, tone: 'error' };
  }

  if (entry.idleMinutes >= QUIET_MINUTES) {
    return { label: `quiet · ledger ${age} ago`, tone: 'warning' };
  }

  return { label: `ledger updated ${age} ago`, tone: 'subtle' };
};
