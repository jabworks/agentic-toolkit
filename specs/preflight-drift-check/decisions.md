# Decisions

## Approach: checklist item + structured Drift Check section (B)

One new checklist item plus a **Drift Check** section in
`skills/preflight/SKILL.md` defining the full procedure.

- **Rejected A (bare checklist line):** "check for drift" without a method
  invites rubber-stamping — the exact failure preflight exists to prevent.
- **Rejected C (separate drift-check skill):** new trigger surface colliding
  with preflight's (2026-07-11 eval: trigger space is the fragile part);
  a 12th condux skill for ~40 lines of prose.

## Drift is bidirectional

Both directions are findings of equal standing:

- implementation violates a spec'd contract / mapping / edge case
- spec went stale because the implementation legitimately evolved

## Findings are a soft gate

Report + user decides per finding: **fix code / update spec / accept
knowingly**. Never blocks `/finalize`, never silently updates spec files
(consistent with condux doctrine: soft gates, user in control, and
technical-spec's "never silently modify spec files").

## Kept out of scope

*(assumed at design time — not-goals question went unanswered; confirm
before revisiting)*

- No new scripts/tooling — prose-only, dependency-free
- No CI integration — interactive preflight step only
- No full `specs/` tree audit — current task's spec dir only
