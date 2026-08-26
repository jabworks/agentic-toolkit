# Implementation — Spec Artifact Readability

> Written at design time, before implementation. Intended touch list, in the
> shape this spec designs.

| File | Role |
|---|---|
| `skills/technical-spec/references/templates.md` | all six concern-file templates — the change itself |
| `skills/technical-spec/references/scaffold.sh` | writes `index.md`, so the Contents table lands here |
| `skills/technical-spec/SKILL.md` | points at the templates; the layering rule and the two-homes rule are stated here |
| `scripts/spec-density.mjs` | new — non-blocking prose-density reporter |
| `tests/spec-structure.test.mjs` | new — the three structural checks |
| `specs/*/` | 12 spec dirs migrate; PR A covers what the test touches, PR B the rest |

Plus the shipping surface: a condux minor bump, a changeset, and
`bash scripts/sync.sh technical-spec` across the four channels.

## Resolved (were open questions at design time)

1. **The `api.md` annotation check is scoped to fenced blocks tagged
   `ts`/`typescript` that declare `interface` or `type`.** Measured: zero such
   blocks exist in the corpus — existing files use bare/`js`/`jsonc` fences.
   The check is vacuous on existing content and binding on everything written
   after; no heuristic parsing, no flake risk, and no `api.md` migration in
   either PR.
2. **`scaffold.sh` pre-fills the Contents table header, not rows** — the repo
   rule is "only create files that have content", and pre-filled rows would
   link files that may never exist.

## Data flow

1. `technical-spec` runs `scaffold.sh` — writes `index.md` with the Contents table pre-shaped.
2. The agent fills concern files from `templates.md` — table layer first, reasoning second.
3. `tests/spec-structure.test.mjs` asserts the three structural invariants on every spec dir.
4. `scripts/spec-density.mjs` reports prose density on demand; it never fails a build.
5. `preflight`'s Drift Check reads the table rows as checkable claims.

## Patterns

| Pattern | Where | Why not the obvious thing |
|---|---|---|
| Table layer over reasoning | every concern file | The obvious fix is "write less prose", which is advice — and advice produced the 93% |
| Conditional sections (`Context`, `Overview`) | `decisions.md`, `implementation.md` | Deleting them outright would lose genuinely non-obvious origins; making them conditional keeps the escape hatch and removes the default |
| Structural gate, not a metric gate | `tests/spec-structure.test.mjs` | A prose-% threshold is easier to write and worse to act on — "61%" names no fix |
| Mandatory alternatives table | `decisions.md` | Prose can omit alternatives invisibly; an empty table cannot |

## Overview

*(Omitted — the file table and the data flow above already tell the story. This
is the conditional-Overview rule from §6 applied to its own spec.)*
