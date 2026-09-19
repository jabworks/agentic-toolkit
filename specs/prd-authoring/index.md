# prd-authoring — Tech Spec

> Where a product requirements document lives in condux: a `prd.md` concern
> file in the technical-spec tree, authored by discovery's goal round and read
> by the router and the drift check. The recommendation docket #83 asked for.

**Last updated:** 2026-09-19
**Commit:** PR #162
**Status:** draft

Shipped in condux 2.32.0 (docket #84). The design was signed off under docket
#83; `decisions.md` marks the two places the build departs from it.

## Contents

| File | Answers |
|---|---|
| [Design](design.md) | the signed-off design as it was agreed, section by section |
| [Decisions](decisions.md) | which shape carries the PRD, how it enters the flow, what the file looks like, how it rolls out — and what was rejected |
| [Implementation](implementation.md) | which skill files carry the feature, the data flow, the guard test, and why the scaffold stays untouched |
| [Quirks](quirks.md) | five edge cases and the rule that answers each, with where the rule is written |

## Changelog
- 2026-09-19 (PR #162): Built — four skills wired, `tests/prd-authoring.test.mjs` added, quirks Q1–Q5 mitigated; two departures from the design recorded in `decisions.md` (the goals comparison, the requirements-only path)
- 2026-09-17 (PR #161): Initial spec — discovery signed off; closes docket #83, files #84 for the build
