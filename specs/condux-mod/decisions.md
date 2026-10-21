# Decisions — condux-mod

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Nest the mod under `skills/workflow/hooks/mod/` with no `composition.json` change, and exclude it from the OpenCode, Cursor and npm mirrors | A command hook and a nested module were verified to coexist, and mirroring dead source would force an npm release on every mod edit | accepted |
| 2 | Derive task state from the ledger plus parsed dependency lines; plans with no ledger read "state unknown" | Every rule maps to something in the real files, and 6 of 7 real plans have no ledger | accepted |
| 3 | A read-only board with no action buttons, plus a status line in slice 1 | The agent usually runs plans unattended, so a view you watch beats one you drive | accepted |
| 4 | Add four kinds of chrome: dependency graph, pipeline stepper, activity and stall, badges | Each is derivable from the real plan and ledger files | accepted |
| 5 | One module whose `register` calls one `registerX(on)` per feature, a shared `kit/`, one `/condux` command | It is docket's proven shape and keeps each slice self-contained | accepted |
| 6 | Verify in layers and ship in two PRs after the docket PR | Structure-only tests passed while the docket picture was wrong | accepted |

## 1. Home and packaging — 2026-10-20

**Decided:** the mod's module, lib, types and tests live under `skills/workflow/hooks/mod/`; `hooks.json` gains `"modules": ["./mod/register.tsx"]` and the Claude manifest gains `"types"`.
**Because:** a scratch plugin showed the command hook and a nested module both running, and `claude plugin test` finding nested tests.

| Alternative | Why not |
|---|---|
| A new `skills/workflow/mod/` dir with its own `pluginDirs` entry | Dest `hooks` is taken, so it needs a second dest dir and an untested `../mod/...` module path |
| A separate plugin | A second install, and it splits "the whole condux plugin" |

**Consequences**
- Anything under `skills/workflow/` is mirrored into the OpenCode, Cursor and npm trees. The mod is excluded from those builds (skipped in `copyTransformed`, with the dist tests following the builder), so mod edits never force an `@jabworks/condux` release. The one `hooks.json` edit still mirrors and needs a changeset once.
- A test pins that Codex never sees `modules` or `types`. The existing parity and hook tests already accept both keys on the Claude side.
- A `types` contract may only export types; a bare `export {}` fails `claude plugin validate`.

## 2. Data model — 2026-10-20

**Decided:** read the plans and progress directories under the git root's `.condux/`; state is done, next ready, ready or blocked; a plan with no ledger reads "no ledger, state unknown".
**Because:** every rule maps to the real files; the Opus review found that only `subagent-execution` writes a ledger and most plans never get one.

| Alternative | Why not |
|---|---|
| Done from the plan's own checklist | 0 of 7 real plans ever tick it |
| Done from `git log` | Needs a process per poll; the skill calls the ledger the recovery aid and git the fallback |
| An "in progress" state | Nothing records it; only *next ready* is derivable |

**Consequences**
- Dependency lines are parsed by stripping parentheticals, expanding `Tasks a-b` and `a–b`, then collecting `Task N`; headings inside code fences are not cards (Q2, Q3).
- "Complete" needs a commit or PR wrap-up line; all tasks ticked without one reads "tasks done, wrapping up".
- A follow-up is filed for inline execution to write a ledger; the board works without it.

## 3. Board UI and chrome — 2026-10-20

**Decided:** no action buttons beyond the pane's own Refresh; four chrome elements; on desktop a rounded bar, a ring and a filter `Input`.
**Because:** the agent runs plans unattended, so the board is for watching.

| Alternative | Why not |
|---|---|
| Start task, Resume plan and Cite buttons | Prompt fills are noise when the agent drives |
| A command named `/board` or `/plans` | Vague, or one letter from the built-in `/plan` |

**Consequences**
- The glyph for the lowest ready task is "next ready", not "working on this" (Q4).
- The status line shows the plan whose ledger changed most recently, and nothing when no plan is open.
- Ledger lines are appended only when a task finishes, so ≥10 minutes with no change reads "quiet" and ≥30 "stalled", as advice only (Q5).

## 4. Mod-wide conventions — 2026-10-20

**Decided:** one `register` calling one `registerX(on)` per feature, a shared `kit/`, one state contract, `/condux [subcommand]`.
**Because:** it is docket's proven shape.

| Alternative | Why not |
|---|---|
| Share `charts.ts` through `composition.json` | The sync model owns pairs per skill and plugin; cross-plugin sharing needs sync changes |
| One mod per slice | Many modules to load and no shared command |

**Consequences**
- Condux keeps its own copy of docket's `charts.ts`; a test asserts the two are byte-identical.
- The status line's timer arms at `session.start` only when the working-state directory exists, cancels at session end, and re-arms after a hot reload.

## 5. Verification and rollout — 2026-10-20

**Decided:** units, pane tests on both surfaces, mutation checks, structural tests, validate and `tsc` gates, live runs; two PRs after the docket PR.
**Because:** structure tests alone passed while the docket picture was wrong.

| Alternative | Why not |
|---|---|
| One large PR | Parsers and chrome have different risks |
| Mock-only verification | The docket work showed it misses visual defects |

**Consequences**
- Unit tests are `.test.tsx` only, with a guard test, because the default `node --test` glob runs `.test.ts` and would fail on the `claude-code/testing` import (Q7).
- Two new plan tasks: a live Codex session after adding `modules`, and a deliberately broken module to confirm skills and the routing hook survive.
- Read-only is pinned through the "calls" list that `claude plugin validate` prints.

**Context:** The design was reviewed by an independent Opus 5.5 agent before sign-off; its findings R1 to R12 are folded into the decisions above.
