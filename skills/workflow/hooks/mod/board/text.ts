import { type BoardPlan, type BoardSnapshot, type PlanStatus, type TaskState } from '../types';

// How many finished plans the board keeps in view; older ones are reached with `/condux all`.
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
  noLedger: BoardPlan[];
};

// The board arrives sorted (active, complete, stale, no-ledger, newest first); this only cuts it into the groups
// the pane and the text both draw.
export const groupPlans = (board: BoardPlan[]): BoardGroups => {
  const finished = board.filter(entry => entry.status === 'complete');

  return {
    active: board.filter(isActive),
    complete: finished.slice(0, MAX_FINISHED),
    olderComplete: finished.slice(MAX_FINISHED),
    stale: board.filter(entry => entry.status === 'stale'),
    noLedger: board.filter(entry => entry.status === 'no-ledger'),
  };
};

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

  if (groups.stale.length > 0) {
    blocks.push(['STALE', ...groups.stale.flatMap(entry => describePlan(entry, isAll))].join('\n'));
  }

  if (groups.noLedger.length > 0) {
    const rows = groups.noLedger.flatMap(entry => describePlan(entry, isAll));

    blocks.push(['NO LEDGER (state unknown)', ...rows].join('\n'));
  }

  return blocks.length === 0 ? 'No plans found.' : blocks.join('\n\n');
};
