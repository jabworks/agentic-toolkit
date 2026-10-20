# Implementation — condux-mod

Planned layout; nothing is built yet. Everything lives under `skills/workflow/hooks/mod/`.

| File | Role |
|------|------|
| `mod/register.tsx` | The single `register`: registers the `/condux` command and calls each feature's `registerX(on)` |
| `mod/board/parse-plan.ts` | Fence-aware task and dependency parser (Q2, Q3) |
| `mod/board/parse-ledger.ts` | Ledger header and line parser, in file order |
| `mod/board/state.ts` | Task state, plan status, stale and idle advice with an injected clock |
| `mod/board/board.tsx` | The pane: header, hints under it, plans, tasks, wrap-up, desktop chrome |
| `mod/board/status.ts` | The status-line entry and its session-long timer (Q12) |
| `mod/kit/locate.ts` | Git-root locator that stops at `.git` |
| `mod/kit/poll.ts` | Poll helper that stats each file (Q6) and never throws |
| `mod/kit/charts.ts` | A copy of docket's palette, `allot`, ring and bar; a test pins it byte-identical |
| `mod/types/index.d.ts` | The state contract; types only |
| `mod/tests/*.test.tsx` | Unit and pane tests; `.test.tsx` only (Q7) |

## Data flow

1. `session.start` registers `/condux` and, when the working-state directory exists, arms the status timer.
2. The poll stats each plan and ledger file; an unchanged set of modification times skips the work.
3. `parse-plan` and `parse-ledger` read the changed files; `state` derives task state and plan status.
4. The pane and the status entry draw from `$.state`; a surface check keeps `Svg` and the filter off the terminal.
5. `/condux all` prints the finished plans past the five the pane shows.

## Patterns

| Pattern | Where | Why not the obvious thing |
|---|---|---|
| One `registerX(on)` per feature | `register.tsx` | A single large register would make each later slice a rewrite |
| Surface keyed on `e.surface` | `board.tsx` | The engine's resolved element table answers `in` for every name, so feature detection put the filter on the terminal |
| Explicit height on every `Svg` | `board.tsx` | The desktop ignores the markup's own size and boxes an unsized `Svg` far taller than it is |
| Hints under the header | `board.tsx` | A pane has no fixed footer; its whole body scrolls |
| Copy, not import, for `charts.ts` | `kit/charts.ts` | Plugins install independently and the sync model cannot share a file |

## Dependencies

- The Claude Code mod API (early access), and docket's pane module as the reference implementation.
- No packages: the module runs in an environment with no Node and no DOM.
