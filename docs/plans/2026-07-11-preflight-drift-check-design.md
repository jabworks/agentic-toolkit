# Preflight Drift Check — design (signed off 2026-07-11)

## What we're building and why

`/preflight` gains a **spec drift-check**: before finalize, the implementation
is compared against the task's spec concern files, so the specs that
`/discovery` writes (condux 2.4.0's detail round + default-on write-back)
are enforced at the end of the task instead of rotting after sign-off.

Drift is **bidirectional** — both failure modes are findings:

- implementation that violates a spec'd contract, mapping, or edge case
- a spec gone stale because the implementation legitimately evolved

## Approach chosen

**B — checklist item + structured Drift Check section** in
`skills/preflight/SKILL.md`.

Rejected:

- **A — bare checklist line.** Under-specifies the procedure; "check for
  drift" without a method invites rubber-stamping — the exact failure
  preflight exists to prevent.
- **C — separate `drift-check` skill.** New trigger surface colliding with
  preflight's (the 2026-07-11 eval run confirmed trigger space is the
  fragile part); a 12th condux skill for ~40 lines of prose.

## Procedure (summary — detail in specs/preflight-drift-check/)

1. Locate the task's spec dir with the same lookup the `/workflow` router
   uses (package scope, then git root; nearest wins).
2. **No spec dir → silent N/A** — zero commentary, matching the router's
   "no spec → proceed without comment".
3. Compare only concern files that exist: `api.md` → contracts touched,
   `fields.md` → mappings, `quirks.md` → edge cases honored,
   `implementation.md` → files/patterns followed. Missing concern file =
   no claim = skip.
4. Findings are a **soft gate**: report + user decides per finding —
   fix code / update spec / accept knowingly. Never blocks finalize,
   never silently updates the spec.

## Output contract

Preflight's Output block gains `□ Spec drift  ✓ / ✗ / N/A`; on ✗, a compact
table: concern file · spec says · implementation does · decision.

## Blast radius

- `skills/preflight/SKILL.md` — main change (~35 lines)
- one-line cross-refs: `workflow` (spec-companion paragraph),
  `technical-spec` (lifecycle note)
- ~4 new cases in `skills/preflight/evals/trigger_eval.json`
  (incl. one should-NOT case belonging to technical-spec)
- dist sync; condux 2.4.0 → 2.5.0 (minor — new behavior)

## Out of scope

*(assumed — the not-goals question went unanswered at the goal round;
confirm before any of these are revisited)*

- No new scripts or tooling — prose-only guidance, stays dependency-free
- No CI integration — interactive preflight step only
- No full `specs/` audit — the current task's spec dir only
  (whole-tree staleness is spec-browser territory or a future skill)

## Open questions

None beyond the out-of-scope assumption above.
