// The condux mod's state contract: what its features draw from, held in $.state so a hot reload keeps it.
// Types only: `claude plugin validate` rejects a contract that exports a value.

// What the parsers produce and the board draws. Meaning lives here; how each field reaches the screen is in the spec.
export interface PlanTask {
  // The N in "Task N:"; unique within a plan (the first heading wins a duplicate).
  number: number;
  // Heading text after the colon, trimmed.
  name: string;
  // Task numbers after stripping parentheticals and expanding ranges; numbers naming no task in the plan are dropped.
  dependsOn: number[];
  // The card's text up to the next heading of its own level or higher, fence-aware; shown when the task is expanded.
  body: string;
}

export interface Plan {
  // File name without its directory, e.g. "2026-08-26-slug.md".
  file: string;
  // File name minus the date prefix and the extension.
  slug: string;
  // First "# Plan:" heading's text, or the slug when the plan has none.
  title: string;
  // YYYY-MM-DD from the file name; null when the name carries no date.
  date: string | null;
  // Only when the plan says "<TIER> tier" near its top; null otherwise.
  tier: 'SMALL' | 'MEDIUM' | 'LARGE' | null;
  // Empty for a plan with no parseable task cards.
  tasks: PlanTask[];
}

export interface LedgerLine {
  // N for a "- [x] Task N: ..." line; null for a wrap-up line (code-review, preflight, committed, ...).
  taskNumber: number | null;
  // "[x]" (either case) versus "[ ]"; only a checked Task line makes a task done.
  isChecked: boolean;
  // The line after the checkbox, verbatim.
  text: string;
}

export interface Ledger {
  // File name without its directory.
  file: string;
  // Basename from the "Plan:" header line; null when the header is missing.
  planFile: string | null;
  // The "BASE:" header value; null when absent.
  baseSha: string | null;
  // In file order, which is completion order, not task order.
  lines: LedgerLine[];
  // Last modification time of the file; drives the quiet and stalled advice.
  mtimeMs: number;
}

// next-ready is the lowest-numbered ready task: a derived guess at what is next, never a claim that work is in progress.
export type TaskState = 'done' | 'next-ready' | 'ready' | 'blocked';

// no-ledger: no ledger file, state unknown. not-started: a ledger with no lines. tasks-done: every task ticked, no
// commit or PR line yet. complete: tasks done and a commit or PR line. stale: unfinished, ledger untouched for 14 days.
export type PlanStatus = 'no-ledger' | 'not-started' | 'in-progress' | 'tasks-done' | 'complete' | 'stale';

export interface BoardTask {
  task: PlanTask;
  state: TaskState;
  // Dependencies not yet done; empty for a done or ready task.
  waitsOn: number[];
  // True when the task's unmet dependencies lead back to itself.
  inCycle: boolean;
}

export interface BoardPlan {
  plan: Plan;
  // The ledger linked to the plan; null for a plan with none.
  ledger: Ledger | null;
  status: PlanStatus;
  tasks: BoardTask[];
  // Ledger lines that are not tasks, in file order.
  wrapUp: LedgerLine[];
  // Tasks the ledger ticks, counted only against the plan's own task numbers.
  doneCount: number;
  // Whole minutes since the ledger last changed, for an unfinished plan with a ledger; null otherwise.
  idleMinutes: number | null;
  // True for a ledger that names no plan on disk: a synthetic plan stands in for it.
  isOrphan: boolean;
}

declare module 'claude-code' {
  interface PluginState {
    condux: {
      // Filled in as features land; the board's snapshot arrives with the pane.
      board: null;
    };
  }
}
