---
status: signed-off
date: 2026-09-15
feature: prd-authoring
---

# prd-authoring — where a product requirements document lives in condux

Condux has three spec-shaped skills and none of them writes or reads a PRD.
This design decides which shape carries one, how it enters the flow (authored
on demand or brought in), and what the artifact looks like. Docket #83.

**Sections:** 4 — approach · entry points & routing · artifact contract · trigger contract & rollout

## §1 · approach — AGREED 2026-09-15

**Decided:** the PRD is a `prd.md` concern file in the technical-spec tree, authored by discovery's goal round and written at sign-off by the existing spec write-back, because discovery already collects the six PRD facts and technical-spec already owns the durable tree — wiring them is four table edits, not a new surface.

| Rejected | Why not |
|---|---|
| (a) `prd.md` in technical-spec alone | no author — technical-spec is `disable-model-invocation: true` and its `when_to_use` disclaims pre-design work ("that's discovery") |
| (b) discovery output alone | lands in `.condux/designs/`, gitignored; the Step 7 write-back maps only decisions/api/fields/quirks/implementation, so the PRD never reaches `specs/` and the drift check never sees it |
| (c) new `product-spec` skill | duplicates discovery Step 2 (goals, done, non-goals already asked); costs composition.json, both host manifests, the plugin README skill list, the `routing.md` SessionStart payload, four dist channels, a changeset — a whole plugin surface for questions discovery asks anyway |

Evidence:

| Fact | Where |
|---|---|
| Discovery Step 2 already asks goals, constraints, "done", known unknowns, explicit non-goals — then compresses them into a ≤3-line why-line | `skills/discovery/SKILL.md` Step 2; `references/design-template.md` |
| technical-spec disclaims pre-design work and is invoke-only | `skills/technical-spec/SKILL.md` frontmatter |
| The router's spec load list has no PRD slot (bug → quirks/api/fields; refactor → implementation/decisions; feature → decisions/api/fields) | `skills/workflow/SKILL.md` → The Router step 2 |
| Preflight's drift table reads only api/fields/quirks/implementation | `skills/preflight/SKILL.md` → Drift Check |
| A new condux skill touches composition.json, both manifests, README skill list (`plugin-files.test.mjs`), `skills/workflow/hooks/routing.md`, four dist channels, changeset | repo CLAUDE.md key invariants |

**Consequence:** four touch points for the follow-up — technical-spec (template + layout block; the scaffold stays untouched, see §4), discovery (Step 2 gathers six sections, Step 7 writes `prd.md`), workflow router (load list), preflight (drift table). No new skill, no composition or manifest change.

## §2 · entry points & routing — AGREED 2026-09-15

**Decided:** four entry points, each reusing a branch the skills already have — no new trigger surface — because the goal round, the existing-design check, the well-defined check, and the invoke-only save already exist and only need to know about `prd.md`.

| Entry | Trigger | What happens |
|---|---|---|
| Author | LARGE task, no `specs/<slug>/prd.md` | discovery Step 2 grows to cover the six sections and presents them as one card, **§0 · requirements**, before §1 approach; Step 7's write-back transcribes §0 into `prd.md` |
| Consume, in-tree | `specs/<slug>/prd.md` exists | discovery's existing-design check (already globs both spec scopes) reads it, states "requirements loaded from `<path>`", asks only for empty sections; the workflow router's step-2 load list gains `prd.md` for new-feature tasks |
| Consume, external | user points at a ticket, product doc, or pasted text | discovery Step 1's "already well-defined?" branch maps it onto the six sections, presents §0 with gaps marked, persists at Step 7 like the authored case |
| Standalone | "save this PRD", "write up the requirements", no design wanted | `/technical-spec` writes `prd.md` directly; `when_to_use` already covers "document this"; stays invoke-only |

| Rejected | Why not |
|---|---|
| §0 opt-in on LARGE | discovery's own precedent: the preview defaults on because gating it behind an opt-in defeats what it is for, and LARGE is the only tier that reaches it |
| Drop the standalone row | leaves the "user brings a PRD, wants no design yet" case with no home; technical-spec's contract already covers it at zero cost |
| PRD on MEDIUM too | proportional-effort rule; "treat as LARGE" and `/technical-spec` cover the exception |

**Consequence:** PRD authoring rides on discovery, so only LARGE gets it automatically — accepted as proportional, not a gap.

## §3 · artifact contract — AGREED 2026-09-17

**Decided:** `prd.md` is a six-section concern file under technical-spec's layering rule (summary table first, tables underneath), read by the router, the drift check, and discovery's design template, because every section written as a table is a claim a drift check can test, and each consumer changes by one row.

Shape:

| Section | Layer under the summary table |
|---|---|
| Problem | one paragraph, ≤3 lines |
| Users | table: who · what they do today · what changes |
| Goals and non-goals | two tables: goal · measured by / non-goal · why excluded |
| Success metrics | table: metric · target · how measured |
| Scope | table: in · out |
| Open questions | list, or "none" |

Consumers:

| Reader | Today | After |
|---|---|---|
| workflow router step-2 load list | new feature → decisions, api, fields | new feature → **prd**, decisions, api, fields |
| preflight drift table | api, fields, quirks, implementation | + `prd.md`: work inside a non-goal or outside scope is drift; a goal with nothing in the diff is a finding |
| discovery design template | why-line + § entries | a `## §0 · requirements` part written at creation — the §0 card's twin |
| spec-browser catalog | reads `index.md`'s purpose note | unchanged; `prd.md` gets a Contents row like any concern file |

| Rejected | Why not |
|---|---|
| Fold users into scope | Harvey's goal-round answer named six sections; users is the row that says *for whom*, which scope's in/out table cannot carry |
| PRD as context only, no drift row | a requirements file the drift check never reads is the (b)-alone failure again — durable but invisible |
| Free-prose PRD | technical-spec's layering rule: the table layer is what a scanning human, the drift check, and a loading agent all read |

**Consequence — two-homes rule extended:** `prd.md` owns why and for whom; `decisions.md` owns how it was chosen. The design file's why-line is derived from the PRD problem statement, never a second copy.

## §4 · trigger contract & rollout — AGREED 2026-09-17

**Decided:** two skills gain trigger phrases, two gain one table row each, and the whole change ships as one follow-up docket item in one PR, because the four edits only make sense together — a template with no author, or an author with no drift row, recreates the pure-(a) and pure-(b) failures from §1.

Trigger wording (frontmatter budget 1024 chars, measured 2026-09-17):

| Skill | Frontmatter now | Change |
|---|---|---|
| discovery | 595 | `when_to_use` gains "write a PRD", "product requirements", "what are we building and why" |
| technical-spec | 653 | `when_to_use` gains "save this PRD", "write up the requirements" |
| workflow | 766 | none — the router needs only the load-list row, and no PRD phrase should route to the router directly |
| preflight | 584 | none — drift row only |

Rollout:

| Step | Content |
|---|---|
| 1 | `prd.md` template in `skills/technical-spec/references/templates.md`, the SKILL.md layout block, a Contents-row example |
| 2 | discovery: Step 2 covers six sections, the §0 card, the design-template part, Step 7's write-back list, `references/spec-integration.md` |
| 3 | workflow router load list and preflight drift table, one row each |
| 4 | trigger eval cases in the discovery and technical-spec `evals/trigger_eval.json` — positives for the new phrases, a negative that a PRD ask on a trivial change stays out of discovery |
| 5 | condux minor bump (new capability), bump commit last, `--write-changelog`, a minor changeset for `@jabworks/condux` |

| Rejected | Why not |
|---|---|
| Split into two items (artifact first, authoring second) | ships a concern file nothing writes — the §1 pure-(a) failure, live on main between the two PRs |
| Skip the trigger evals | the repo's standing rule after the trigger-reliability programme: a new phrase with no eval case is an unmeasured claim |
| Touch `scaffold.sh` | it writes only `index.md`; concern files are created on content, so there is nothing to scaffold and no scaffold test to change |

**Consequence:** no composition.json, manifest, README skill-list, or `routing.md` change — the skill set stays at fifteen.

## Constraints & out of scope

| Constraint / exclusion | Why |
|---|---|
| Scoped to technical-spec, discovery, spec-browser, the workflow router's spec lookup, and preflight's drift table | the rest of condux is out unless widened (scope lock, 2026-09-15) |
| This session ends at a written recommendation under `specs/` | Harvey, goal round 2026-09-15: #83 as filed; building the shape is the follow-up item |
| PRD is per feature, six sections: problem · users · goals and non-goals · success metrics · scope · open questions | Harvey, goal round 2026-09-15 |
| Both entry points must work: author when none exists, consume when one does | Harvey, goal round 2026-09-15 |

| A spec with no `prd.md` makes no requirements claim — drift and the router skip it silently | preflight's existing rule for missing concern files; every spec on disk today predates the file |
| A PRD section left empty is asked about once, in the goal round, then recorded as an open question — never invented | discovery's self-review rule: unanswered questions surface, never silently dropped |
| When the design contradicts an in-tree `prd.md`, the PRD is updated visibly with a changelog line, never silently | technical-spec's standing rule — announce before editing a spec file |
| An external PRD that does not map onto the six sections keeps its unmapped content under Open questions | the file's shape is fixed; losing the user's content to fit it is worse than an untidy list |
| No PRD on SMALL or MEDIUM by default | proportional-effort rule; "treat as LARGE" and `/technical-spec` are the exceptions |
| No per-product PRD, no PRD outside `specs/<feature>/` | Harvey's goal-round answer; and the artifact-location rule bans `docs/` |

## Open questions

- none — the detail round was skipped as nothing in it was the user's to decide: the edge cases above are rules the existing skills already imply, and the touch list in §4 is the implementation detail.
