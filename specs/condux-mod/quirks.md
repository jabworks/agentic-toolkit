# Quirks — condux-mod

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Most real plans have no ledger, so a naive board shows them "not started" | Inline execution (condux's default) writes no ledger; 6 of 7 real plans | high | yes |
| Q2 | Dependency lines are not just `Task N` | `Tasks 1-4`, `Tasks 1–5` (en dash), `Task 1 (defines …)`, `None (independent of Tasks 1–3 …)` | high | yes |
| Q3 | Headings inside code fences cut a task card short | A fenced sample containing `## ...` before the `Dependencies:` line | medium | yes |
| Q4 | Work finishes out of order, so "lowest ready" is not "in progress" | The real ledger completed Task 2 before Task 1 | medium | yes |
| Q5 | Ledger lines are appended only when a task finishes, so a long task looks stalled | One task running past ten minutes | medium | partial |
| Q6 | A directory's modification time does not change when a file in it is appended to | Watching the plans or progress directory instead of the files | medium | yes |
| Q7 | The default `node --test` glob runs `.test.ts` but not `.test.tsx` | A unit test named `.test.ts` importing `claude-code/testing` | high | yes |
| Q8 | The engine writes a `tsconfig.json` into any plugin folder it loads | Loading `dist/plugins/condux` through `CLAUDE_CODE_PLUGIN_DIRS` | low | partial |
| Q9 | A same-named folder plugin replaces the installed one wholesale | Loading a partial `condux` copy through `--plugin-dir` | low | yes |
| Q10 | An agent in a git worktree writes that worktree's working-state directory | The session runs in the main checkout | medium | no |
| Q11 | "Codex is unaffected" is only partly proven; "a broken module leaves the routing hook working" is now verified | Adding `modules` to condux's `hooks.json` | medium | partial |
| Q12 | The status line needs a session-long poll; docket polls only while its pane is open | Copying docket's `tick`, which stops when the pane is gone | medium | yes |
| Q13 | The validator rejects two hooks on one event without a matcher | Two features each registering `session.start` | medium | yes |
| Q14 | Past an import, `$` is followed only into function declarations | An exported helper that takes `$` written as an arrow constant | medium | yes |
| Q15 | A ledger's `Plan:` header is prose, and its file name may carry the plan's date | A header like ``Plan: `.condux/plans/x.md` (signed off …; do not edit). Mode chosen …`` | high | yes |

## Q1 — Plans with no ledger

**Discovered:** 2026-10-20, in the independent review of the design.

**Symptom:** a finished plan reads "not started, 0/n" and sorts to the top.
**Trigger:** only `subagent-execution` writes a ledger, and the default is to implement inline; the repository has 7 plans and 1 ledger.
**Cause:** the ledger is a recovery aid for one execution mode, not a universal record.
**Mitigation:** a plan with no ledger reads "no ledger, state unknown", is collapsed, is aged by its file-name date, and never appears in the status line. A follow-up is filed to decide whether inline execution should write a ledger.

## Q2 — Dependency lines in the wild

**Discovered:** 2026-10-20.

**Symptom:** a task shows ready before its dependencies finish, or an independent task shows blocked.
**Trigger:** ranges (`Tasks 1-4`), an en dash (`Tasks 1–5`), a real dependency inside a parenthetical (`Task 1 (defines …)`), and `None (independent of Tasks 1–3 …)`.
**Cause:** the first design said a trailing parenthetical meant no dependency.
**Mitigation:** strip parentheticals first, then expand ranges, then collect `Task N`; take the lines from the three real plans as fixtures.

## Q3 — Fenced headings

**Discovered:** 2026-10-20.

**Symptom:** the Expand view shows a truncated card and a dependency line is lost.
**Trigger:** a plan containing a fenced code sample with a `##` heading before the card's `Dependencies:` line.
**Cause:** a parser that splits on headings does not know it is inside a fence.
**Mitigation:** splitting is fence-aware.

## Q4 — Out-of-order completion

**Discovered:** 2026-10-20.

**Symptom:** the next-ready marker is not where work is happening.
**Trigger:** work runs in parallel or out of order; the real ledger completed Task 2 before Task 1.
**Cause:** "lowest ready" is a derived guess, not a recorded state.
**Mitigation:** the marker is named "next ready" and nothing claims work is in progress.

## Q5 — Stall advice without per-task signals

**Discovered:** 2026-10-20.

**Symptom:** a long task shows "stalled".
**Trigger:** a task running longer than the idle threshold with no ledger line appended.
**Cause:** ledger lines appear only on completion.
**Mitigation:** partial. Ten minutes without a change reads "quiet", thirty reads "stalled", worded as advice; a plan with no ledger is never idle; abandoned plans move to the stale group after fourteen days.

## Q6 — Directory modification time

**Discovered:** 2026-10-20.

**Symptom:** the board does not redraw when the agent appends a ledger line.
**Trigger:** polling the directory's modification time.
**Cause:** appending to a file does not change its directory's time.
**Mitigation:** stat each plan and ledger file.

## Q7 — `.test.ts` under `node --test`

**Discovered:** 2026-10-20.

**Symptom:** the repository's test run fails on an import of `claude-code/testing`.
**Trigger:** a unit test named `.test.ts` under the mod; it is copied into several mirror trees and each copy runs.
**Cause:** Node's default glob includes `.test.ts` and skips `.test.tsx`.
**Mitigation:** unit tests are `.test.tsx` only, and a guard test fails if a `.test.ts` exists under the mod.

## Q8 — Engine-written `tsconfig.json`

**Discovered:** 2026-10-20, during the docket pane work.

**Symptom:** `composition.test.mjs` fails with undeclared content in `dist/plugins/condux`.
**Trigger:** the engine loading the plugin folder through `CLAUDE_CODE_PLUGIN_DIRS`.
**Cause:** the engine lays a `tsconfig.json` and a types folder beside the module for the editor.
**Mitigation:** partial. `dist/plugins/*/tsconfig.json` is gitignored, but the file must be deleted before running the full test suite while the plugin is loaded. The `tsc` gate runs after a load and before that deletion, and not in CI.

## Q9 — Same-named plugin replaces the installed copy

**Discovered:** 2026-10-20, in a scratch test.

**Symptom:** the installed plugin's skills vanish for the session.
**Trigger:** loading a folder whose manifest name matches an installed plugin.
**Cause:** the folder copy wins wholesale.
**Mitigation:** safe for testing because the generated `dist/plugins/condux` carries every skill; never test with a partial copy named `condux`.

## Q10 — Worktrees

**Discovered:** 2026-10-20.

**Symptom:** a session in the main checkout shows no progress for an agent working in a worktree.
**Trigger:** the agent's working-state directory is the worktree's own.
**Cause:** the board reads only the session's own git root.
**Mitigation:** none; unverified and recorded as an open question in the PRD.

## Q11 — Claims that needed a live check

**Discovered:** 2026-10-20.

**Symptom:** none.
**Trigger:** adding `modules` to condux's `hooks.json`.
**Cause:** a scratch test proved a command hook and a module coexist, not that Codex ignores the key or that a throwing module leaves the routing hook working. The mod API is early access.
**Mitigation:** partial. A deliberately broken module was run and the session, the routing payload and all skills survived, with the error shown as one log line. Codex installs the plugin without error and its configuration keys condux's hooks to the override file, but the routing hook firing in an authenticated Codex session is unproven. See verification.md for the method and the one remaining step.

## Q12 — Session-long polling

**Discovered:** 2026-10-20.

**Symptom:** the status line goes stale once the pane is closed.
**Trigger:** reusing docket's `tick`, which cancels when the pane is gone.
**Cause:** docket needs polling only for its open pane.
**Mitigation:** the status timer arms at `session.start` only when the working-state directory exists, cancels at session end and re-arms after a hot reload.

## Q13 — One hook per event

**Discovered:** 2026-10-20, building the status line.

**Symptom:** `claude plugin validate` fails with `on("session.start") is registered twice without a matcher`.
**Trigger:** the board and the status line each registering `session.start`.
**Cause:** the validator treats two un-matchered hooks on one event as ambiguous.
**Mitigation:** `register.tsx` owns the one `session.start` hook and calls each feature through a plain function (`resumeBoard`, `armStatus`); `session.end` follows the same shape. A later slice adds a call, not a hook.

## Q14 — Declarations, not arrows, across an import

**Discovered:** 2026-10-20, building the board.

**Symptom:** `claude plugin validate` fails with `$ is passed to "<name>", a name bound to a function expression, outside the hook's own file`.
**Trigger:** an exported `const fn = async ($, …) => …` called from another file, or any `$`-taking helper reached through one.
**Cause:** past an import the validator follows `$` only into function declarations, which a bundle keeps as written.
**Mitigation:** every helper that takes `$` is written `function name($: EngineInterface, …)`, with a comment saying why, against the house arrow style. Pure helpers that never touch `$` stay arrows.

## Q15 — The ledger header is prose

**Discovered:** 2026-10-21, on a real board in another repository (seen in a desktop screenshot).

**Symptom:** a plan shows under "no ledger" while its own ledger shows as a stale orphan.
**Trigger:** a `Plan:` header with the path in backticks and commentary after it, in a ledger named exactly like its plan (date prefix included).
**Cause:** an agent writes the header as it likes. The first parser took everything after the last slash as the file name, and the name fallback compared the ledger to the plan's slug without the date.
**Mitigation:** the plan is the first Markdown file path in the header line (backticks, quotes and angle brackets stripped, the whole text if it names none), and the fallback also matches the plan's file name without the extension. Both are pinned by the real header as a fixture.
