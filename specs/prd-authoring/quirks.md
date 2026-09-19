# Quirks — prd-authoring

Each mitigation is a rule written into a skill's instructions, shipped in
condux 2.32.0. `yes` means the rule is on the page an agent reads, not that a
runtime enforces it — nothing here has a runtime.

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Every spec on disk predates `prd.md`, so the new readers find nothing | the router or the drift check runs against an older spec | low | yes |
| Q2 | A PRD section has no answer and the agent is tempted to fill it | the goal round leaves a section empty | medium | yes |
| Q3 | The design contradicts an in-tree PRD | a design section changes scope, goals, or users mid-discovery | medium | yes |
| Q4 | An external PRD does not fit the six sections | the user brings a ticket or product doc with its own structure | low | yes |
| Q5 | A PRD is asked for on a task that never reaches discovery | a SMALL or MEDIUM task, or a bare "write a PRD" with no feature | low | yes |

## Q1 — Specs with no prd.md

**Discovered:** 2026-09-17, design

**Symptom:** the router's new-feature load and preflight's drift row look for a file that the sixteen specs already in the tree do not have.
**Trigger:** any task against a spec written before this design shipped.
**Cause:** `prd.md` is new; nothing backfills it.
**Mitigation:** a missing `prd.md` makes no claim. Preflight's existing rule for a missing concern file covers the drift row unchanged; the router's load list says any file the spec lacks is skipped silently; discovery's on-disk check says a spec with no `prd.md` is the normal case. No backfill, no warning.

## Q2 — Empty sections invite invention

**Discovered:** 2026-09-17, design

**Symptom:** a PRD whose success metrics or users were never stated by anyone, written as if they were.
**Trigger:** the user answers part of the goal round and the agent completes the rest.
**Cause:** a fixed six-section shape creates pressure to fill all six.
**Mitigation:** ask once, in the goal round. A section still empty is recorded under Open questions — stated three times so it cannot be missed: the template's rule paragraph in technical-spec, the rules table in discovery's Requirements Card section, and a Step 5 self-review check.

## Q3 — Design and PRD disagree

**Discovered:** 2026-09-17, design

**Symptom:** `prd.md` says one scope, `decisions.md` records a design built for another.
**Trigger:** a design section legitimately changes what is being built after §0 was agreed, or after an in-tree PRD was loaded.
**Cause:** two files now describe the same feature at different altitudes.
**Mitigation:** during discovery, §0 is revised in place and the change named in the section that caused it; at sign-off an existing `prd.md` is updated with a changelog line in `index.md`, never overwritten silently (discovery's `references/spec-integration.md`, step 3). After sign-off, preflight's drift check reads the file, so a stale PRD surfaces as a finding.

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
**Mitigation:** three exits. "Treat as LARGE" reaches discovery. `/technical-spec` saves a PRD the user already has. And a request for only the requirements runs discovery as far as §0, then offers to sign off there and save `prd.md` alone — leaving the design file at `status: in-progress`, so draft-plan's gate still asks for a design. The discovery eval corpus carries the guard case: "write a PRD for fixing the footer typo" expects the router and disallows discovery.
