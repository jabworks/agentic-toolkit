# Quirks — Skill Artifact Templates

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Instances are untestable — the gate covers only the templates | any design doc or report written off-shape | low | partial |
| Q2 | Pre-template artifacts don't parse against the new shapes | reading an old `.condux` design or run dir | low | yes |
| Q3 | A silent run leaves no trace unless the report is always written | verification run where nothing could be driven | medium | yes |

## Q1 — Instances are untestable — the gate covers only the templates

**Discovered:** 2026-08-27 (design time)

**Symptom:** a design doc or verification report can still be written
off-template; `node --test` stays green.
**Trigger:** any instance authored without following the skill text.
**Cause:** instances live in `.condux/`, which is gitignored working state —
CI never sees them, by design.
**Mitigation:** partial — the contract lives in the skill text (like the
section card) and the templates are the enforced surface. Instance conformance
rides on the same discipline every condux contract rides on.

## Q2 — Pre-template artifacts don't parse against the new shapes

**Discovered:** 2026-08-27 (design time)

**Symptom:** designs and run dirs created before this feature don't match the
templates (the 2026-08-24 design doc uses bold-prose status, not frontmatter).
**Trigger:** the existing-design check, or a human, reading an old artifact.
**Cause:** migration was ruled out of scope — artifacts are single-machine
working state.
**Mitigation:** yes — discovery's existing contract already handles it: a
design file with no `status` field predates the contract and reads as
`signed-off`. Nothing consumes old verification runs programmatically.

## Q3 — A silent run leaves no trace unless the report is always written

**Discovered:** 2026-08-27 (design time)

**Symptom:** without a rule, a nothing-could-be-driven run would write no
`report.md`, making it indistinguishable from a run that never happened.
**Trigger:** environmental failure — no dev server, headless, port taken.
**Cause:** evidence-per-claim naturally produces zero files when zero claims
were drivable.
**Mitigation:** yes — the template mandates `report.md` in the fallback shape
(what was attempted, what blocked it) for every run, including empty ones.
