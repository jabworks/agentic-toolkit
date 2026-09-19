# Implementation — prd-authoring

Nothing here is built yet. This is the touch list the design signed off on
2026-09-17; the build is the follow-up docket item named in `index.md`.

| File | Role |
|------|------|
| `skills/technical-spec/references/templates.md` | gains the `prd.md` template — six sections, summary table first — and a Contents-row example for it |
| `skills/technical-spec/SKILL.md` | the Spec Folder Layout block lists `prd.md`; `when_to_use` gains "save this PRD", "write up the requirements" |
| `skills/discovery/SKILL.md` | Step 1's well-defined branch ingests an external PRD; the existing-design check reads an in-tree `prd.md`; Step 2 covers the six sections; Step 3 opens with the §0 requirements card; Step 7's write-back list adds `prd.md`; `when_to_use` gains three phrases |
| `skills/discovery/references/design-template.md` | a `## §0 · requirements` part with an `[at creation]` lifecycle stamp |
| `skills/discovery/references/spec-integration.md` | the sign-off write-back list adds `prd.md` beside `decisions.md` |
| `skills/workflow/SKILL.md` | The Router step 2: the new-feature load list becomes prd, decisions, api, fields |
| `skills/preflight/SKILL.md` | the Drift Check table gains a `prd.md` row — scope, non-goals, unaddressed goals |
| `skills/discovery/evals/trigger_eval.json`, `skills/technical-spec/evals/trigger_eval.json` | positives for the new phrases; a negative that a PRD ask on a trivial change stays out of discovery |
| `skills/technical-spec/references/scaffold.sh` | **untouched** — it writes only `index.md`; concern files are created on content |

## Data flow

1. A LARGE task reaches discovery. The existing-design check globs both spec scopes and finds no `prd.md`.
2. The goal round asks for the six sections in one batch. Anything unanswered is carried as an open question.
3. Discovery creates the design file with the §0 requirements part, then presents the §0 card for acknowledgment before §1 approach.
4. Design sections proceed as today. A section that contradicts §0 updates §0 visibly.
5. At sign-off the spec write-back transcribes §0 into `specs/<slug>/prd.md` beside `decisions.md`, and `index.md` gains its Contents row.
6. On a later task the router loads `prd.md` for new-feature work, and preflight's drift check compares the diff against its scope, non-goals, and goals.
7. When a `prd.md` or an external document already exists, steps 2 and 3 shrink: discovery loads it, states where from, and asks only for empty sections.

## Patterns

| Pattern | Where | Why not the obvious thing |
|---|---|---|
| Authoring inside discovery, not a new skill | discovery Step 2 and Step 3 | a dedicated skill would re-ask the goal round and add a whole plugin surface (decision 1) |
| Tables under a summary table | the `prd.md` template | free prose cannot be read as claims by the drift check (decision 3) |
| Transcription at sign-off | discovery Step 7 | writing `prd.md` at §0 would put a file in `specs/` for a discovery that may never be signed off |
| One PR for all four skills | the rollout | a split leaves a concern file nothing writes on main between the PRs (decision 4) |

## Dependencies

- technical-spec's layering rule and two-homes rule, which `prd.md` inherits.
- The `status` frontmatter gate that draft-plan reads; unchanged by this design.
- `scripts/sync.sh` and the four dist channels — every file above is a condux skill file, so the build needs a sync, a minor bump, and a minor changeset.
