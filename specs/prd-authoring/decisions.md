# Decisions — prd-authoring

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | The PRD is a `prd.md` concern file in the technical-spec tree, authored by discovery's goal round | discovery already collects the six PRD facts and technical-spec already owns the durable tree | accepted |
| 2 | Four entry points — author, consume in-tree, consume external, standalone save — each reusing an existing branch | no new trigger surface is needed; the branches exist and only need to know about `prd.md` | accepted |
| 3 | `prd.md` has six table-first sections and three readers: the router, the drift check, discovery's design template | a section written as a table is a claim the drift check can test | accepted |
| 4 | Two skills gain trigger phrases, two gain one table row, all shipped as one follow-up item in one PR | the four edits only make sense together | accepted |

## 1. Shape: a concern file authored by discovery — 2026-09-15

**Decided:** the PRD is a `prd.md` concern file in the technical-spec tree, authored by discovery's goal round and written at sign-off by the existing spec write-back.
**Because:** discovery already asks the PRD's questions and technical-spec already owns the durable tree; wiring them is four table edits, not a new plugin surface.

| Alternative | Why not |
|---|---|
| `prd.md` in technical-spec alone | no author — technical-spec is `disable-model-invocation: true` and its `when_to_use` disclaims pre-design work |
| A discovery output alone | the design file is gitignored working state, and the sign-off write-back maps only decisions, api, fields, quirks, implementation — the PRD would never reach `specs/` |
| A new `product-spec` skill | duplicates discovery's goal round; costs composition.json, both host manifests, the plugin README skill list, the `routing.md` SessionStart payload, four dist channels, and a changeset |

**Consequences**
- Four touch points for the build: technical-spec (template and layout block), discovery, the workflow router's load list, preflight's drift table.
- The skill set stays at fifteen; no composition, manifest, README, or routing-payload change.
- The cost: PRD authoring is only as reachable as discovery is, which decision 2 accepts.

**Context**
Docket #83 asked whether the spec-related skills could evolve to write PRDs. As of 2026-09-15 neither "PRD" nor "product requirement" appeared in technical-spec, discovery, or spec-browser. Two readers that a tree-resident PRD depends on had no slot for it: the router's load list (bug, refactor, new-feature file sets) and preflight's drift table (api, fields, quirks, implementation).

## 2. Entry points and routing — 2026-09-15

**Decided:** four entry points, each reusing a branch the skills already have.
**Because:** the goal round, the existing-design check, the well-defined check, and the invoke-only save all exist; none needs a new trigger surface.

| Entry | Trigger | What happens |
|---|---|---|
| Author | LARGE task, no `specs/<slug>/prd.md` | discovery's goal round covers the six sections and presents them as one card, §0 · requirements, before §1 approach; the sign-off write-back transcribes §0 into `prd.md` |
| Consume, in-tree | `specs/<slug>/prd.md` exists | discovery's existing-design check reads it, says so, and asks only for empty sections; the router loads it for new-feature tasks |
| Consume, external | the user points at a ticket, product doc, or pasted text | discovery's "already well-defined?" branch maps it onto the six sections, presents §0 with gaps marked, persists at sign-off |
| Standalone | "save this PRD", "write up the requirements" | `/technical-spec` writes `prd.md` directly and stays invoke-only |

| Alternative | Why not |
|---|---|
| §0 opt-in on LARGE | discovery's own precedent — the preview defaults on because an opt-in defeats its purpose, and LARGE is the only tier that reaches it |
| Drop the standalone entry | leaves "the user brings a PRD and wants no design yet" with no home, to save nothing |
| PRD on MEDIUM too | the proportional-effort rule; "treat as LARGE" and `/technical-spec` cover the exception |

**Consequences**
- Only LARGE gets a PRD automatically. Accepted as proportional, not a gap.
- **Added in the build:** "write a PRD for X" routes to discovery, so discovery needed an answer for a user who wants the requirements and no design yet. It runs as far as §0, then offers to sign off there and save `prd.md` as the only concern file. The design's four entries did not name this case; it is the author entry stopping early, not a fifth entry. The design file keeps `status: in-progress` on this path: a PRD is not a design, and a `signed-off` status would let draft-plan's gate pass against a file with no design sections.

## 3. Artifact contract — 2026-09-17

**Decided:** `prd.md` carries six sections under technical-spec's layering rule — summary table first, tables underneath — and is read by the router, the drift check, and discovery's design template.
**Because:** every section written as a table is a claim a drift check can test, and each reader changes by one row.

| Section | Layer under the summary table |
|---|---|
| Problem | one paragraph, three lines at most |
| Users | table: who · what they do today · what changes |
| Goals and non-goals | two tables: goal · measured by / non-goal · why excluded |
| Success metrics | table: metric · target · how measured |
| Scope | table: in · out |
| Open questions | list, or "none" |

| Reader | Before | After |
|---|---|---|
| workflow router load list | new feature → decisions, api, fields | new feature → prd, decisions, api, fields |
| preflight drift table | api, fields, quirks, implementation | adds `prd.md`: work in the Scope table's Out column or inside a non-goal is drift; goals only on a feature-completing task (see Consequences) |
| discovery design template | why-line and § entries | adds a `## §0 · requirements` part, written when the card is acknowledged and revised visibly after |
| spec-browser catalog | reads the purpose note in `index.md` | unchanged; `prd.md` gets a Contents row like any concern file |

| Alternative | Why not |
|---|---|
| Fold users into scope | the six sections were Harvey's goal-round answer; users says *for whom*, which an in/out table cannot carry |
| PRD as context only, no drift row | a requirements file the drift check never reads is durable but invisible — alternative 2 of decision 1 again |
| Free-prose PRD | the layering rule: the table layer is what a scanning human, the drift check, and a loading agent all read |

**Consequences**
- **As built, the goals comparison is narrower than the design said.** The design had "a goal with nothing in the diff is a finding". Written literally, every task that serves a subset of a feature's goals would fail drift, and preflight's own "Requirements met" line already covers the task's scope. The shipped row compares goals only when the task claims to complete the feature. Scope and non-goals are checked on every task, as designed.
- **As built, scope drift means the Out column.** The design said "outside scope". An In column is coarse, so tests, CI, or docs a task touches would read as outside it. The shipped row treats the *Out* column and the non-goal rows as the claims — both are explicit exclusions — and says work the In column merely does not mention is not drift. Found in code review of PR #162.
- The two-homes rule extends: `prd.md` owns why and for whom; `decisions.md` owns how it was chosen. The design file's why-line is derived from the PRD's problem statement, never a second copy.
- Per feature only, under `specs/<feature>/`. No per-product PRD.

## 4. Trigger contract and rollout — 2026-09-17

**Decided:** discovery and technical-spec gain trigger phrases, workflow and preflight gain one table row each, and the whole change ships as one follow-up docket item in one PR.
**Because:** a template with no author, or an author with no drift row, recreates the rejected alternatives of decision 1 on main between two PRs.

| Skill | Frontmatter, 2026-09-17 (budget 1024) | Change |
|---|---|---|
| discovery | 595 | `when_to_use` gains "write a PRD", "product requirements", "what are we building and why" |
| technical-spec | 653 | `when_to_use` gains "save this PRD", "write up the requirements" |
| workflow | 766 | none — load-list row only; no PRD phrase should route to the router directly |
| preflight | 584 | none — drift row only |

| Alternative | Why not |
|---|---|
| Two items, artifact first and authoring second | ships a concern file nothing writes |
| Skip the trigger evals | a new phrase with no eval case is an unmeasured claim — the standing rule after the trigger-reliability programme |
| Change `scaffold.sh` | it writes only `index.md`; concern files are created on content, so there is nothing to scaffold and no scaffold test to change |

**Consequences**
- The build is a condux minor bump (a new capability) and needs a minor changeset for `@jabworks/condux`, since any condux skill edit reaches the npm package.
- The bump commit goes last, then `--write-changelog`.
