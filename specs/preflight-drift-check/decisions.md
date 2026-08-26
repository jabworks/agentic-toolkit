# Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Checklist item + structured Drift Check section, not a bare line or a new skill | a bare line invites rubber-stamping; a 12th condux skill for ~40 lines collides with preflight's trigger space | accepted |
| 2 | Drift is bidirectional | code violating the spec and a spec gone stale are findings of equal standing | accepted |
| 3 | Findings are a soft gate — fix code / update spec / accept knowingly | preflight never blocks finalize, and spec files are never silently updated | accepted |

## 1. Approach: checklist item + structured Drift Check section (B)

**Decided:** one new checklist item plus a **Drift Check** section in `skills/preflight/SKILL.md` defining the full procedure.
**Because:** the method has to live where the check runs, and preflight already owns the moment.

| Alternative | Why not |
|---|---|
| A — bare checklist line | "Check for drift" without a method invites rubber-stamping — the exact failure preflight exists to prevent |
| C — separate drift-check skill | New trigger surface colliding with preflight's (2026-07-11 eval: trigger space is the fragile part); a 12th condux skill for ~40 lines of prose |

## 2. Drift is bidirectional

**Decided:** both directions are findings of equal standing — implementation violating a spec'd contract / mapping / edge case, and a spec gone stale because the implementation legitimately evolved.
**Because:** either direction leaves the spec and the code disagreeing, which is the condition the check exists to surface.

## 3. Findings are a soft gate

**Decided:** report + user decides per finding: **fix code / update spec / accept knowingly**.
**Because:** preflight never blocks `/finalize`, and spec files are never silently updated — consistent with condux doctrine (soft gates, user in control, and technical-spec's "never silently modify spec files").

## Kept out of scope

*(assumed at design time — not-goals question went unanswered; confirm before revisiting)*

- No new scripts/tooling — prose-only, dependency-free
- No CI integration — interactive preflight step only
- No full `specs/` tree audit — current task's spec dir only
