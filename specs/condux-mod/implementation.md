# Implementation — condux-mod

Built in PR 1 (condux 2.38.0). Everything lives under `skills/workflow/hooks/mod/`.

| File | Role |
|------|------|
| `register.tsx` | The single `register`: the one `session.start` hook (registers `/condux`, resumes the pane, arms the status line), `session.end`, and `registerBoard(on)` |
| `board/board.tsx` | The pane, `/condux`, the poll, the status line's publisher and its arm and disarm. Every helper that takes `$` is a function declaration (Q14). |
| `board/parse-plan.ts` | Fence-aware task and dependency parser (Q2, Q3) |
| `board/parse-ledger.ts` | Ledger header and line parser, in file order |
| `board/state.ts` | `deriveBoard`: task state, plan status, ordering, stale and idle advice with an injected clock; `statusText` |
| `board/text.ts` | Glyphs, labels, grouping, and the text a surface without the pane gets |
| `kit/paths.ts` | Docket's path helpers, copied (plugins share no code) |
| `kit/locate.ts` | Git-root locator that stops at `.git` |
| `types/index.d.ts` | The parsed and derived types, and the state contract; types only |
| `tests/*.test.tsx`, `tests/harness.tsx`, `tests/fixtures.ts` | Unit and pane tests (`.test.tsx` only, Q7), a fake host with a virtual filesystem and a `ui.status` recorder, and fixtures taken from the real plans and ledger |

Differences from the plan: the poll and the status line share module state, so they sit in `board/board.tsx` instead of
a `kit/poll.ts` and a `board/status.ts`; `kit/charts.ts` arrives with the desktop chrome in PR 2.

## Data flow

1. `session.start` registers `/condux`, resumes a pane that survived a hot reload, and arms the status timer when the working-state directory exists. `/condux` arms it too.
2. The poll lists the plans and progress directories; each entry carries its own modification time, and an unchanged set skips the work.
3. `parse-plan` and `parse-ledger` read the changed files; `state` derives task state and plan status.
4. The pane and the status entry draw from `$.state`; a surface check keeps `Svg` and the filter off the terminal.
5. `/condux all` prints the finished plans past the five the pane shows.

## Patterns

| Pattern | Where | Why not the obvious thing |
|---|---|---|
| One `registerX(on)` per feature | `register.tsx` | A single large register would make each later slice a rewrite |
| One un-matchered hook per event | `register.tsx` | The validator rejects two hooks on one event without a matcher; features are called through plain functions instead (Q13) |
| `$` helpers as function declarations | `board/board.tsx`, `kit/locate.ts` | Past an import the validator follows `$` only into declarations, not arrow constants (Q14) |
| Surface keyed on `e.surface` | desktop chrome (PR 2) | The engine's resolved element table answers `in` for every name, so feature detection put the filter on the terminal |
| Explicit height on every `Svg` | `board.tsx` | The desktop ignores the markup's own size and boxes an unsized `Svg` far taller than it is |
| Hints under the header | `board.tsx` | A pane has no fixed footer; its whole body scrolls |
| Copy, not import, for `charts.ts` | `kit/charts.ts` | Plugins install independently and the sync model cannot share a file |

## Dependencies

- The Claude Code mod API (early access), and docket's pane module as the reference implementation.
- No packages: the module runs in an environment with no Node and no DOM.
