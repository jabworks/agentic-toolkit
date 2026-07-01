# Design: condux hardening

> Date: 2026-07-01

## What & Why

Condux's `subagent-driven-development` and continuity story were compared against their
model, `obra/superpowers`. Two real, concrete gaps surfaced: `subagent-driven-development`
lacks the file-handoff and compaction-resilience mechanics superpowers built after
documented failures (lost progress after compaction, 42k-char pasted-history dispatch
prompts), and condux's own Node infrastructure (`annotate-server.js`, `preview-server.js`,
`scaffold.sh`) has zero automated verification — no tests, no CI. A third, smaller gap
(nothing enforces that `/workflow` is the actual entry point when a downstream skill is
invoked directly) is addressed with the cheapest fix that closes it, not a new subsystem.

## Chosen Approach

**Port superpowers' proven SDD mechanics + add CI, using existing conventions — no new
philosophy, no new dependencies.**

Four independent workstreams:

1. **`subagent-driven-development` mechanics** — progress ledger, file-based task
   handoff, explicit model-tiering.
2. **CI hardening** — GitHub Actions running stdlib-only smoke tests against the
   toolkit's own scripts/servers, plus a dist/skills mirror-drift check.
3. **Continuity soft-gate** — `brainstorm`, `write-plan`, and `finalize` check for an
   existing artifact on disk before falling back to asking conversationally.
4. **`plan-review` as `write-plan`'s standing terminal step** — after saving, always
   ask "review in the browser, or go straight to implementation?" (soft gate, either
   answer accepted). Runs identically whether `write-plan` was invoked via
   `/workflow`'s LARGE tier or standalone. Uses `annotate-server.js --steer` against
   the saved plan file, looping on Request Revisions, stopping on Deny. `/workflow`'s
   CP-1 menu drops its own "Review the plan in the browser" option, since the
   decision is now resolved by `write-plan` itself before CP-1 is reached. Scoped to
   the `write-plan`-produced doc (LARGE tier) — MEDIUM's inline quick-plan is out of
   scope.

Rationale for each is below (Alternatives Rejected).

## Alternatives Rejected

- **Worktree isolation for parallel coder agents** — out of scope for this round; a
  bigger structural addition (a new `using-git-worktrees`-style skill) than the other
  gaps justify right now.
- **A `/workflow`-level phase-resume ledger** — superpowers has no equivalent mechanism
  for this; building it now would be an unvalidated experiment, not a like-for-like port.
  Deferred until the cheaper artifact-check (workstream 3) proves insufficient in
  practice.
- **Adopting a test framework (vitest/jest) as a devDependency** — `node:test` +
  `node:assert` already cover the smoke-test needs; introducing the repo's first
  `package.json` for this isn't justified.
- **Copying superpowers' unconditional, coercive "check skills before any response"
  meta-skill framing** — this is the actual philosophical fork this comparison surfaced.
  Adopting it would quietly undo condux's own soft-gate, proportional-effort
  differentiator to patch a continuity gap. Rejected on principle, not just cost.
- **Fully reconciling `plan-review`'s two trigger paths** — workstream 4 resolves the
  `write-plan`/CP-1 overlap specifically (CP-1 no longer offers a redundant second
  ask), but the `ExitPlanMode` hook remains a separate, untouched mechanism tied to
  Claude Code's native plan mode, not to `write-plan`'s output.

## Key Constraints

- No new runtime or dev dependencies anywhere in the repo (`node:test`/`node:assert`
  only; existing scripts stay Node stdlib).
- Ledger is scoped to `subagent-driven-development` only — not extended to `/workflow`
  phase checkpoints in this round.
- `dist/` remains a verbatim mirror of `skills/` — the mirror-drift check enforces this
  invariant in CI, it doesn't change it.
- Continuity soft-gate and plan-review offer must both stay soft (ask, never block) —
  consistent with condux's existing gate philosophy.
- Workstream 4 applies only to the `write-plan`-produced doc (LARGE tier); MEDIUM's
  inline quick-plan is untouched.

## Out of Scope

- Git worktree isolation for subagent-driven-development.
- A durable ledger/state file for `/workflow`'s own phase checkpoints.
- The `ExitPlanMode` hook path — remains separate from `write-plan`'s new offer.
- Adopting a JS test framework or any new package dependency.
- Superpowers-style unconditional meta-skill enforcement.

## Open Questions

None blocking — ready for `/write-plan`.

## Sign-off

Design approved — ready for `/write-plan`.
