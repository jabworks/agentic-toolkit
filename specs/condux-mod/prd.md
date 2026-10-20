# PRD — condux-mod

| Section | In one line |
|---|---|
| Problem | Condux's plan and progress state is only readable in Markdown files or a browser preview, which pulls the developer out of the terminal or the Claude app. |
| Users | The developer running condux in Claude Code; whether other condux users are in scope is open. |
| Goals | Condux's working state is visible inside the session with no context switch, starting with a live plan and progress board. |
| Scope | The `condux` plugin's Claude Code surface only; slice 1 is a read-only board plus a status line. |

## Problem

Condux keeps its working state in Markdown (the plans directory and the progress ledger directory under `.condux/`) or in a browser preview from `plan-review`. Reading it means leaving the terminal or the Claude desktop app, so the state is out of sight exactly when an agent is running a plan unattended.

## Users

| Who | Today | What changes |
|---|---|---|
| A developer running condux in Claude Code (terminal or desktop app) | Opens the plan Markdown or the browser preview to see which tasks are done | Sees task state in a pane and a status line without leaving the session |

## Goals and non-goals

| Goal | Measured by |
|---|---|
| Condux's state is visible in the session with no context switch | Not stated; see Open questions. The working default: done, ready and blocked task state is readable at a glance. |

| Non-goal | Why excluded |
|---|---|
| Action buttons (start task, resume plan, cite) | The agent usually runs a plan unattended, so prompt-fill actions are noise |
| Writing to the working-state directory | The board only watches; a `$.fs.write`, `$.process` or `$.prompt` call fails a pinned test |
| Codex, OpenCode or Cursor support | Mods are a Claude Code surface; the skills stay primary |
| Slices 2 to 6 (tier indicator, report viewer, blueprint pane, `plan-review` pane, routing via `prompt.compose`) | Each needs its own discovery |

## Success metrics

Not stated by the requester; see Open questions. Nothing is invented here.

## Scope

| In | Out |
|---|---|
| A `/condux` board pane on terminal and desktop, and one status-line entry | A button that drives the agent, or any edit to plans or ledgers |
| Reading plans and ledgers from the session's own git root | Reading another worktree's or another repository's working state |
| Desktop-only chrome: rounded bar and ring, dependency graph, filter | The same chrome on the terminal, which has no `Svg` |

## Open questions

- Non-goals and success metrics were never given by the requester; the working defaults above stand (read-only, glance-level state without leaving the session, Claude Code only).
- Are other condux users in scope, or only the requester?
- Slice 2: can the workflow tier be observed from a hook on the Skill tool call? Unverified.
- Worktrees: an agent working in a git worktree writes that worktree's working-state directory, not the one a session in the main checkout reads. Unverified.
