# API — condux-mod

The mod has no network endpoints. Its surface is one slash command, one status-line entry and one pane, all registered through the Claude Code mod API.

## Command surface

| Surface | Name | Behaviour |
|---|---|---|
| Slash command | `/condux` | No argument opens the board pane (id `condux`). |
| Slash command | `/condux all` | Lists every finished plan, including the ones past the five the pane shows (terminal has no filter). |
| Slash command | `/condux <unknown>` | Prints the list of subcommands. |
| Pane | `condux` | Read-only; Refresh is its only button. Desktop adds a filter `Input` and `Svg` charts. |
| Status line | `$.ui.status` | One entry for the open plan whose ledger changed most recently; none when no plan is open. |

## Key Types / Schemas

```typescript
// What the parsers produce and the pane draws. Exported types only: a contract file may not export values.
interface PlanTask {
  number: number;            // the N in "Task N:"; unique within a plan
  name: string;              // heading text after the colon, trimmed
  dependsOn: number[];       // task numbers after stripping parentheticals and expanding ranges; unknown numbers dropped
  body: string;              // card text up to the next task heading, fence-aware; shown on expand
}

interface Plan {
  file: string;              // plan file name without directory, e.g. "2026-08-26-slug.md"
  slug: string;              // file name minus the date prefix and extension
  title: string;             // first "# Plan:" heading text, or the slug when absent
  date: string | null;       // YYYY-MM-DD from the file name; null when the name has none
  tier: 'SMALL' | 'MEDIUM' | 'LARGE' | null;   // only when the plan states it; null otherwise
  tasks: PlanTask[];         // empty for a plan with no parseable task cards
}

interface LedgerLine {
  taskNumber: number | null; // N for a "- [x] Task N: ..." line; null for a wrap-up line
  isChecked: boolean;        // "[x]" versus "[ ]"
  text: string;              // the line after the checkbox, verbatim
}

interface Ledger {
  file: string;              // ledger file name without directory
  planFile: string | null;   // basename from the "Plan:" header line; null when the header is missing
  baseSha: string | null;    // the "BASE:" header value; null when absent
  lines: LedgerLine[];       // in file order, which is completion order, not task order
  mtimeMs: number;           // last modification time; drives the idle and stall advice
}

type TaskState = 'done' | 'next-ready' | 'ready' | 'blocked';   // next-ready is the lowest-numbered ready task

type PlanStatus = 'no-ledger' | 'not-started' | 'in-progress' | 'tasks-done' | 'complete' | 'stale';   // see quirks Q1 and Q5
```

## External APIs Consumed

| Service | Purpose | Notes |
|---|---|---|
| Claude Code mod API (`$.fs`, `$.clock`, `$.ui`, `$.command`, `$.state`) | Read files, tick the poll, draw, register the command, hold state | Early access and moves between releases; the module fails open |
| `claude plugin validate` | Pins read-only: its "calls" list must not name `$.fs.write`, `$.process` or `$.prompt` | Printed per module |
