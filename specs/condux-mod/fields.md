# Fields — condux-mod

How each source field turns into something on screen. What a field means lives on the type in api.md.

## Response Fields — plan file

> Source: the plans directory under the git root's `.condux/`, one file per plan

| Source Field | UI Label / FE Key | Type | Nullable | Transformation |
|---|---|---|---|---|
| First `# Plan:` heading | Plan title | `string` | no | Falls back to the slug when the heading is missing |
| File name date prefix | Plan age | `string (YYYY-MM-DD)` | yes | Shown as an age; absent when the name has no date |
| Task heading (`##` or `###` `Task N: name`) | Task row | `PlanTask` | no | Headings inside code fences are not cards |
| `**Dependencies:**` line | "waits on N" | `number[]` | no | Parentheticals stripped, `Tasks a-b` and `a–b` expanded, unknown numbers dropped; `None` means none |
| Card body | Expanded card | `string (Markdown)` | no | Up to the next real task heading, rendered with the `Markdown` element |
| A leading `SMALL`, `MEDIUM` or `LARGE` tier statement | Tier badge | `string` | yes | Absent when the plan states no tier |

## Response Fields — ledger file

> Source: the progress directory, one file per plan, linked by the `Plan:` header

| Source Field | UI Label / FE Key | Type | Nullable | Transformation |
|---|---|---|---|---|
| `Plan:` header | Plan link | `string` | yes | The first Markdown file path in the line, reduced to its file name (Q15); falls back to the ledger's own file name, with or without the plan's date; a ledger with no plan shows as an orphan |
| `BASE:` header | BASE badge | `string` | yes | Shortened to seven characters |
| `- [x] Task N:` line | Task state `done` | `LedgerLine` | no | Overrides the dependency-derived state |
| Lines that are not `Task N` | Wrap-up chips | `string` | no | Shown verbatim in file order; four ghost chips (review, preflight or finalize, verify, commit) match loosely so an upcoming stage shows grey |
| `PR #N` or a branch name inside a wrap-up line | PR and branch badges | `string` | yes | Best-effort; a chip with nothing to parse is absent |
| File modification time | "ledger updated 2m ago", quiet and stalled advice | `number` | no | Clock injected so tests can advance it |

## Derived Fields — board

| Field | Rule |
|---|---|
| Task state | done when the ledger has the task; blocked when a known dependency is not done or the task is in a cycle; ready otherwise; the lowest-numbered ready task is next ready |
| Plan status | no-ledger (no ledger file), not-started (header only), in-progress, tasks-done (all ticked, no commit or PR line), complete (a commit or PR line), stale (no ledger activity for 14 days) |
| Status-line text | `plan: <slug> · <done>/<total> · next: Task N` for the open plan with the newest ledger |
