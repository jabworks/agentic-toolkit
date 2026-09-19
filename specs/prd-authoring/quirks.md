# Quirks — prd-authoring

Every mitigation below is a rule the design decided, not shipped behaviour.
`Mitigated` reads `no` until the follow-up build lands; flip each one then.

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Every spec on disk predates `prd.md`, so the new readers find nothing | the router or the drift check runs against an older spec | low | no |
| Q2 | A PRD section has no answer and the agent is tempted to fill it | the goal round leaves a section empty | medium | no |
| Q3 | The design contradicts an in-tree PRD | a design section changes scope, goals, or users mid-discovery | medium | no |
| Q4 | An external PRD does not fit the six sections | the user brings a ticket or product doc with its own structure | low | no |
| Q5 | A PRD is asked for on a task that never reaches discovery | a SMALL or MEDIUM task, or a bare "write a PRD" with no feature | low | no |

## Q1 — Specs with no prd.md

**Discovered:** 2026-09-17, design

**Symptom:** the router's new-feature load and preflight's drift row look for a file that the sixteen specs already in the tree do not have.
**Trigger:** any task against a spec written before this design shipped.
**Cause:** `prd.md` is new; nothing backfills it.
**Mitigation:** a missing `prd.md` makes no claim — skip it silently, the rule preflight already applies to every missing concern file. No backfill, no warning.

## Q2 — Empty sections invite invention

**Discovered:** 2026-09-17, design

**Symptom:** a PRD whose success metrics or users were never stated by anyone, written as if they were.
**Trigger:** the user answers part of the goal round and the agent completes the rest.
**Cause:** a fixed six-section shape creates pressure to fill all six.
**Mitigation:** ask once, in the goal round. A section still empty is recorded under Open questions and named at sign-off — discovery's self-review rule that unanswered questions surface and are never silently dropped.

## Q3 — Design and PRD disagree

**Discovered:** 2026-09-17, design

**Symptom:** `prd.md` says one scope, `decisions.md` records a design built for another.
**Trigger:** a design section legitimately changes what is being built after §0 was agreed, or after an in-tree PRD was loaded.
**Cause:** two files now describe the same feature at different altitudes.
**Mitigation:** the PRD is updated visibly, with a changelog line in `index.md` — technical-spec's standing rule to announce before editing a spec file. Never silently, and never by leaving the PRD stale: preflight's drift check reads it.

## Q4 — External PRD with its own structure

**Discovered:** 2026-09-17, design

**Symptom:** content from the user's document has no section to land in.
**Trigger:** a ticket or product doc with sections such as timelines, stakeholders, or pricing.
**Cause:** the `prd.md` shape is fixed at six sections.
**Mitigation:** map what fits; keep the rest under Open questions with its original wording. Losing the user's content to fit the shape is worse than an untidy list.

## Q5 — A PRD ask that never reaches discovery

**Discovered:** 2026-09-17, design

**Symptom:** "write a PRD for this" on a small change either drags the task into a full discovery or gets no PRD at all.
**Trigger:** authoring rides on discovery, and only the LARGE tier loads discovery.
**Cause:** decision 2 accepted this as proportional.
**Mitigation:** two explicit exits — "treat as LARGE", or `/technical-spec` to save a PRD directly. The follow-up's trigger evals carry a negative case so a PRD ask on a trivial change stays out of discovery.
