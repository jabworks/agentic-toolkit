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

declare module 'claude-code' {
  interface PluginState {
    condux: {
      // Filled in as features land; the board's snapshot arrives with the pane.
      board: null;
    };
  }
}
