# Design: subagent-deployment

> Date: 2026-07-01

## What & Why

Comparing condux's `subagent-driven-development` against superpowers'
equivalent surfaced that superpowers ships a separate skill
(`dispatching-parallel-agents`) for genuinely independent multi-task fan-out
that condux lacks. Digging further surfaced a real, pre-existing
inconsistency in condux's own skill: Step 1 of `subagent-driven-development`
has always said "Identify which tasks can run in parallel (no shared deps)"
— but Step 4 has always unconditionally forbidden acting on that
("NO SPAWNING WHILE CODE WORKER IS ACTIVE"). This session's own 16-task
execution ran fully sequential even where tasks were file-independent,
confirming the gap concretely rather than theoretically.

## Chosen Approach

Add `subagent-deployment`, a new standalone skill generalizing parallel
dispatch across all four named agents (`explorer`/`researcher`/`planner`/
`coder`) for any independent-task scenario, backed by one canonical
`references/safety-checklist.md`. Consolidate — rather than duplicate —
parallel-safety logic: `subagent-driven-development` and `spawn-rules.md`
both get trimmed to point at the same canonical checklist instead of each
carrying their own copy.

`subagent-driven-development` itself gets a genuine behavior change: Steps 3
and 4 of its `## How It Works` diagram now use each task's own
`Dependencies:` field (already part of `write-plan`'s Task Card Format) to
group ready tasks into waves, and dispatch a wave's independent tasks
together in one message when they pass the checklist — rather than always
strictly one task at a time, forever.

## Alternatives Rejected

- **Keeping the checklist duplicated** across the new skill, `SKILL.md`, and
  `spawn-rules.md` — rejected; consolidate into one canonical file, per
  explicit instruction.
- **Naming the skill after superpowers'** `dispatching-parallel-agents`, or
  a generic `parallel-subagents`/`concurrent-subagents` — rejected in favor
  of `subagent-deployment`, which reuses condux's own existing "deploy"
  vocabulary (already present in `workflow/SKILL.md`'s CP-1: "deploy
  explorer/researcher/coder") and avoids superpowers' gerund naming style,
  per this session's explicit instruction not to copy/paste from superpowers
  (saved as a durable memory: `feedback_adapt_dont_copy_superpowers.md`).
- **A separate prompt-template file** for dispatch examples (like
  `requesting-code-review`'s `code-reviewer.md`) — rejected; the example is
  short enough to keep inline in `SKILL.md`.
- **Wiring parallel dispatch into every `/workflow` checkpoint** (CP-1, CP-2,
  CP-3) — rejected; only CP-1 gets the new option, keeping menu surface area
  proportional instead of sprinkling it everywhere.
- **Leaving `subagent-driven-development`'s Step 4 as an unconditional ban**
  — rejected once the internal inconsistency (Step 1 promises identifying
  parallel-safe tasks; Step 4 forbids acting on it) was identified. Fixing
  this is a correctness fix, not scope creep.

## Key Constraints

- No new agent types — `subagent-deployment` dispatches only condux's
  existing four named agents, never a generic subagent with an injected
  prompt (matches condux's existing hard invariant).
- No worktree isolation — matches the earlier `condux-hardening` decision;
  parallel writers rely on the checklist's disjoint-files requirement, not
  filesystem isolation (the same tradeoff superpowers itself accepts for its
  equivalent skill).
- `subagent-driven-development`'s structured-plan sequencing rule is
  tightened, not removed — parallel dispatch within SDD is scoped to
  same-wave, dependency-cleared tasks that pass the checklist; it does not
  mean "always parallelize everything."
- Menu integration is scoped to `/workflow`'s CP-1 only.

## Out of Scope

- Worktree-based isolation for concurrent writers.
- Menu wiring at CP-2/CP-3.
- A separate prompt-template file.
- Any change to `/workflow`'s own sequencing model outside the CP-1 menu.

## Open Questions

None blocking — ready for `/write-plan`.

## Sign-off

Design approved — ready for `/write-plan`.
