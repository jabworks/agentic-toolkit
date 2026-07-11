# Plan: Preflight Drift Check

> Date: 2026-07-11

## Overview

**Goal:** `/preflight` compares the implementation against the task's spec
concern files and reports bidirectional drift as a soft gate before
`/finalize`. **Approach:** One new checklist item + a structured Drift Check
section in preflight's SKILL.md (design approach B); one-line cross-refs in
workflow and technical-spec; eval coverage for the new vocabulary; condux
minor bump. **Tech / conventions:** prose-only SKILL.md changes, no new
scripts; `skills/` is source, `scripts/sync.sh` mirrors to dist; both plugin
manifests bump together.

Design: `docs/plans/2026-07-11-preflight-drift-check-design.md` ·
Spec: `specs/preflight-drift-check/`

## Global Constraints

- Edit `skills/<name>/`, never `dist/` directly; sync per skill;
  `node --test` (27) must stay green
- Trigger contract budgets: description ≤ 500 chars, frontmatter ≤ 1024 total
- Spec-lookup wording must match the workflow router's exactly — no second
  dialect
- Soft-gate doctrine: never block, never lecture, never silently modify
  spec files

## Files Affected

- `skills/preflight/SKILL.md` — checklist item, Drift Check section, Output
  block line + table
- `skills/workflow/SKILL.md` — one line in the spec-companion paragraph
- `skills/technical-spec/SKILL.md` — one lifecycle line
- `skills/preflight/evals/trigger_eval.json` +
  `skills/technical-spec/evals/trigger_eval.json` — new cases (collision
  case in both, per maintenance doctrine)
- `dist/plugins/condux/.claude-plugin/plugin.json` +
  `.codex-plugin/plugin.json` — 2.4.0 → 2.5.0

## Task Checklist

- [ ] Task 1: Drift Check in preflight SKILL.md
- [ ] Task 2: Cross-refs in workflow + technical-spec
- [ ] Task 3: Trigger-eval cases
- [ ] Task 4: Version bump + dist sync

---

## Task 1: Drift Check in preflight SKILL.md

**What:** Add `□ SPEC DRIFT` to the PREFLIGHT box (between EDGE CASES
HANDLED and NO REGRESSIONS) with 3 in-box lines: locate spec via the
router's lookup, compare existing concern files, no spec → N/A silently.
Add a **Drift Check** section after "How It Works": spec-dir resolution
(package scope then git root, nearest wins), the per-concern comparison map
(`api.md` → contracts touched, `fields.md` → mappings, `quirks.md` → edge
cases honored, `implementation.md` → files/patterns followed),
missing/scaffold-only concern file = no claim, bidirectional findings, and
the three-way per-finding decision (fix code / update spec / accept —
collected in one batched question, accepts recorded in output). Extend the
Output block with the `□ Spec drift ✓/✗/N/A` line and the findings-table
shape from `specs/preflight-drift-check/api.md`.

**Why:** Core of the feature — makes discovery's specs enforceable at
end-of-task.

**Files:**

- Modify: `skills/preflight/SKILL.md` (box ~line 39, new section after
  line 52, Output block ~line 66)

**Interfaces:**

- Consumes: spec-lookup wording from `skills/workflow/SKILL.md` router
  step 2 (verbatim dialect)
- Produces: the section heading `## Drift Check` and output line
  `□ Spec drift` that Tasks 2–3 reference

**Sketch:**

```markdown
│  □ SPEC DRIFT (when a spec exists)                              │
│    Locate specs/<slug>/ (same lookup as the /workflow router).  │
│    Compare the diff against each existing concern file — both   │
│    directions count. No spec → N/A, no commentary.              │
```

**Gotchas:**

- Box diagram line widths are already ragged (66–68 cols) — match
  surrounding convention, don't reformat neighbors
- Frontmatter is untouched (no description change → no re-eval needed for
  existing routing)
- "Never silently modify spec files" is technical-spec's standing rule —
  the drift section must restate it, not contradict it

**Dependencies:** None

## Task 2: Cross-refs in workflow + technical-spec

**What:** In `skills/workflow/SKILL.md`, extend the spec-companion
paragraph with one sentence: specs loaded at step 2 / written by discovery
are drift-checked at preflight. In `skills/technical-spec/SKILL.md`, add
one lifecycle line at its integration/lifecycle note saying the same from
the spec's point of view.

**Why:** Keeps the spec lifecycle discoverable from either end
(detail-round answer: "preflight + light cross-refs").

**Files:**

- Modify: `skills/workflow/SKILL.md:156-159` (spec-companion paragraph)
- Modify: `skills/technical-spec/SKILL.md` (lifecycle note — locate exact
  line at implementation)

**Interfaces:**

- Consumes: `## Drift Check` section name from Task 1
- Produces: None

**Gotchas:**

- One line each — these files are routing surface; don't grow their
  descriptions or `when_to_use` (that's what re-triggered today's eval)

**Dependencies:** Task 1

## Task 3: Trigger-eval cases

**What:** Add to `skills/preflight/evals/trigger_eval.json`: "does the code
still match the spec", "check for spec drift", "did the implementation
diverge from what we specced" (should_trigger, expected `preflight`). Add
the collision case "update the spec with what we built" with expected
`technical-spec` to **both** preflight's and technical-spec's eval files
(per the maintenance-plan doctrine for seam cases).

**Why:** New vocabulary enters preflight's trigger space; unmeasured
vocabulary is how seams rot (detail-round answer: yes, ~4 cases).

**Files:**

- Modify: `skills/preflight/evals/trigger_eval.json`
- Modify: `skills/technical-spec/evals/trigger_eval.json`

**Interfaces:**

- Consumes: existing corpus case shape
  `{query, should_trigger, expected_skill, accept?, kind?}`
- Produces: None

**Gotchas:**

- The harness dedupes by `query||expected` — duplicating the collision case
  in both files is intentional and safe
- Keep queries natural-user phrasing, not skill-internal vocabulary
  (usability-review doctrine)

**Dependencies:** Task 1

## Task 4: Version bump + dist sync

**What:** Bump condux to 2.5.0 in both
`dist/plugins/condux/.claude-plugin/plugin.json` and
`.codex-plugin/plugin.json`. Run `bash scripts/sync.sh preflight`,
`sync.sh workflow`, `sync.sh technical-spec` to mirror the three edited
skills into dist.

**Why:** Dist is a build artifact that must match `skills/` byte-for-byte;
new behavior = minor bump (both enforced by tests / user rule).

**Files:**

- Modify: `dist/plugins/condux/.claude-plugin/plugin.json`,
  `dist/plugins/condux/.codex-plugin/plugin.json`
- Mirrors: `dist/plugins/condux/skills/condux/{preflight,workflow,technical-spec}/`

**Interfaces:**

- Consumes: final state of Tasks 1–3
- Produces: None (leaf; `/finalize` runs `node --test` after)

**Gotchas:**

- Manifests are plugin-level dist files edited in place (not synced from
  skills/)
- `manifest-parity.test.mjs` requires both manifests to agree on version

**Dependencies:** Tasks 1, 2, 3
