import { type BoardPlan, type BoardTask, type Ledger, type LedgerLine, type Plan, type PlanStatus } from '../types';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
// A plan whose ledger has been untouched this long is abandoned, not running.
export const STALE_DAYS = 14;
const COMMIT_RE = /\bcommit(?:ted)?\b|\bPR\s*#?\d+/i;
const OPEN: PlanStatus[] = ['not-started', 'in-progress', 'tasks-done'];

const hasCommit = (wrapUp: LedgerLine[]): boolean => wrapUp.some(line => line.isChecked && COMMIT_RE.test(line.text));

const dateMs = (date: string | null): number => (date === null ? 0 : (Date.parse(`${date}T00:00:00Z`) || 0));

const ledgerSlug = (ledger: Ledger): string => ledger.file.replace(/\.md$/i, '');

// The ledger names its plan; a ledger whose header is missing or stale is still found by its own file name.
const linkLedger = (plan: Plan, ledgers: Ledger[]): Ledger | null =>
  ledgers.find(ledger => ledger.planFile === plan.file) ??
  ledgers.find(ledger => ledgerSlug(ledger) === plan.slug) ??
  null;

// Whether a not-done task's unmet dependencies lead back to itself.
const isInCycle = (start: number, unmet: Map<number, number[]>): boolean => {
  const seen = new Set<number>();
  const queue = [...(unmet.get(start) ?? [])];

  while (queue.length > 0) {
    const next = queue.shift();

    if (next === undefined || seen.has(next)) {
      continue;
    }

    if (next === start) {
      return true;
    }

    seen.add(next);
    queue.push(...(unmet.get(next) ?? []));
  }

  return false;
};

const deriveTasks = (plan: Plan, doneNumbers: Set<number>): BoardTask[] => {
  const unmet = new Map(
    plan.tasks.map(task => [task.number, task.dependsOn.filter(n => !doneNumbers.has(n))] as const),
  );
  const ready = plan.tasks.filter(
    task => !doneNumbers.has(task.number) && (unmet.get(task.number) ?? []).length === 0,
  );
  const nextReady = ready.reduce<number | null>(
    (lowest, task) => (lowest === null || task.number < lowest ? task.number : lowest),
    null,
  );

  return plan.tasks.map(task => {
    if (doneNumbers.has(task.number)) {
      return { task, state: 'done', waitsOn: [], inCycle: false };
    }

    const waitsOn = unmet.get(task.number) ?? [];

    if (waitsOn.length === 0) {
      return { task, state: task.number === nextReady ? 'next-ready' : 'ready', waitsOn, inCycle: false };
    }

    return { task, state: 'blocked', waitsOn, inCycle: isInCycle(task.number, unmet) };
  });
};

const deriveStatus = (
  plan: Plan,
  ledger: Ledger | null,
  tasks: BoardTask[],
  wrapUp: LedgerLine[],
  nowMs: number,
): PlanStatus => {
  if (ledger === null) {
    return 'no-ledger';
  }

  const doneCount = tasks.filter(t => t.state === 'done').length;
  const isFinished = plan.tasks.length > 0 && doneCount === plan.tasks.length;

  if (hasCommit(wrapUp) && (isFinished || plan.tasks.length === 0)) {
    return 'complete';
  }

  if (nowMs - ledger.mtimeMs > STALE_DAYS * DAY_MS) {
    return 'stale';
  }

  if (ledger.lines.length === 0) {
    return 'not-started';
  }

  return isFinished ? 'tasks-done' : 'in-progress';
};

const orphanPlan = (ledger: Ledger): Plan => ({
  file: ledger.planFile ?? ledger.file,
  slug: ledgerSlug(ledger),
  title: ledgerSlug(ledger),
  date: null,
  tier: null,
  tasks: [],
});

const RANK: Record<PlanStatus, number> = {
  'not-started': 0,
  'in-progress': 0,
  'tasks-done': 0,
  complete: 1,
  stale: 2,
  'no-ledger': 3,
};

const recency = (entry: BoardPlan): number => entry.ledger?.mtimeMs ?? dateMs(entry.plan.date);

const build = (plan: Plan, ledger: Ledger | null, nowMs: number, isOrphan: boolean): BoardPlan => {
  const doneNumbers = new Set(
    (ledger?.lines ?? []).flatMap(line => (line.isChecked && line.taskNumber !== null ? [line.taskNumber] : [])),
  );
  const tasks = deriveTasks(plan, doneNumbers);
  const wrapUp = (ledger?.lines ?? []).filter(line => line.taskNumber === null);
  const status = deriveStatus(plan, ledger, tasks, wrapUp, nowMs);
  const isUnfinished = OPEN.includes(status);

  return {
    plan,
    ledger,
    status,
    tasks,
    wrapUp,
    doneCount: tasks.filter(t => t.state === 'done').length,
    idleMinutes:
      ledger !== null && isUnfinished ? Math.max(0, Math.floor((nowMs - ledger.mtimeMs) / MINUTE_MS)) : null,
    isOrphan,
  };
};

// Every board rule lives here as a pure function of parsed data and a clock, so it needs no surface to be tested.
export const deriveBoard = (plans: Plan[], ledgers: Ledger[], nowMs: number): BoardPlan[] => {
  const linked = new Set<Ledger>();

  const fromPlans = plans.map(plan => {
    const ledger = linkLedger(plan, ledgers);

    if (ledger !== null) {
      linked.add(ledger);
    }

    return build(plan, ledger, nowMs, false);
  });

  const orphans = ledgers
    .filter(ledger => !linked.has(ledger))
    .map(ledger => build(orphanPlan(ledger), ledger, nowMs, true));

  return [...fromPlans, ...orphans].sort((a, b) => RANK[a.status] - RANK[b.status] || recency(b) - recency(a));
};

// One line for the always-visible status entry: the open plan whose ledger changed most recently, or nothing.
export const statusText = (board: BoardPlan[]): string | null => {
  const open = board.filter(entry => entry.ledger !== null && OPEN.includes(entry.status));
  const latest = open.reduce<BoardPlan | null>(
    (best, entry) => (best === null || recency(entry) > recency(best) ? entry : best),
    null,
  );

  if (latest === null) {
    return null;
  }

  const total = latest.plan.tasks.length;
  const next = latest.tasks.find(t => t.state === 'next-ready');
  const parts = [`plan: ${latest.plan.slug}`];

  if (total > 0) {
    parts.push(`${latest.doneCount}/${total}`);
  }

  if (latest.status === 'tasks-done') {
    parts.push('wrapping up');
  } else if (next) {
    parts.push(`next: Task ${next.task.number}`);
  }

  return parts.join(' · ');
};
