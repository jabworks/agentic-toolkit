# prd-authoring — Tech Spec

> Where a product requirements document lives in condux: a `prd.md` concern
> file in the technical-spec tree, authored by discovery's goal round and read
> by the router and the drift check. The recommendation docket #83 asked for.

**Last updated:** 2026-11-25
**Commit:** PR #216
**Status:** draft

Shipped in condux 2.32.0 (docket #84). The design was signed off under docket
#83; `decisions.md` marks the three places the build departs from it.

## Contents

| File | Answers |
|---|---|
| [Design](design.md) | the signed-off design as it was agreed, section by section |
| [Decisions](decisions.md) | which shape carries the PRD, how it enters the flow, what the file looks like, how it rolls out — and what was rejected |
| [Implementation](implementation.md) | which skill files carry the feature, the data flow, the guard test, and why the scaffold stays untouched |
| [Quirks](quirks.md) | five edge cases and the rule that answers each, with where the rule is written |

## Changelog
- 2026-11-25 (PR #216): Decision 5. Scope's In rows gain Priority (P0/P1) and Done when, Out becomes its own table, and open questions gain Blocking? and Who answers. discovery gets three §0 rules (done-check or `?`, scope-swap, blocking read-back) and preflight's drift row reads P0 done-checks on feature-completing tasks. The guard test pins the new headers
- 2026-09-20 (PR #164): Corrected five stale lines left by the build — the departure count (two → three) here and in the 2026-09-19 entry, the §0 lifecycle stamp in `implementation.md` and `decisions.md`, and the drift row's wording in `implementation.md`. Docs only; no skill, version, or behaviour change
- 2026-09-19 (PR #162): Built — four skills wired, `tests/prd-authoring.test.mjs` added, quirks Q1–Q5 mitigated; three departures from the design recorded in `decisions.md` (the requirements-only path, the goals comparison, the Out-column reading of scope)
- 2026-09-17 (PR #161): Initial spec — discovery signed off; closes docket #83, files #84 for the build
