---
name: draft-plan
description: "Turns a signed-off design into an executable plan of lean task cards (what, why, gotchas, dependencies). Writes Markdown; review in the browser via plan-review. Run for LARGE tasks after /discovery sign-off, and for any request to write, create, or revise a task plan — including creating or updating the .condux/plans file, the artifact this skill owns. A plan request with no signed-off design still routes here; the skill applies the soft gate itself rather than writing a plan without one."
argument-hint: "<feature name or design summary>"
effort: high
---

# /draft-plan

Turn a signed-off design into a clear, executable plan. Lean task cards, not micro-step novels.

## Usage

```
/draft-plan $ARGUMENTS
```

## Before Writing

1. Confirm discovery has run and design is signed off. First glob
   `.condux/designs/*<slug>*.md` and both spec scopes —
   `<package-root>/specs/<slug>/` and `<git-root>/specs/<slug>/`, same
   two-scope lookup as the workflow router (slug = kebab-case of the
   feature name) — for an existing signed-off design; if found, **read
   its `status`** (see below) and treat this check as satisfied without
   asking only when it is `signed-off`. Otherwise ask: "We
   haven't aligned on the design yet — run /discovery first, or confirm
   you want to skip it."

**Reading `status`.** Discovery creates the design file at its first
section, not at sign-off, so the file existing no longer means the design
was approved. Its frontmatter carries the answer:

| `status` | Means | Gate |
|---|---|---|
| `signed-off` | discovery reached sign-off | satisfied |
| `in-progress` | discovery started and did not finish | **not** satisfied — ask |
| *absent* | written before this field existed | satisfied |

A missing `status` means `signed-off`. Every design file written before
this field existed was only ever saved at sign-off, so absence is a
positive signal, not an unknown — reading it the other way retroactively
invalidates every design already on disk.

The plan is written as Markdown — optimized for AI agent consumption during
execution. To read it in the browser, use `plan-review` (see After Saving);
no separate HTML file is produced.

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                        DRAFT-PLAN                               │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: MAP FILES                                              │
│  List every file to be created or modified.                     │
│  Assign one clear responsibility per file.                      │
│  Decomposition decisions get locked in here.                    │
│                                                                  │
│  Step 2: WRITE TASK CARDS                                       │
│  Each card = one meaningful unit of work.                       │
│  See Task Card Format below.                                    │
│                                                                  │
│  Step 3: INLINE SELF-REVIEW                                     │
│  Check against design:                                          │
│    ✓ Every requirement maps to a task                           │
│    ✓ No TBDs, TODOs, or "implement later"                       │
│    ✓ No undefined references (types, functions, methods)        │
│    ✓ No "similar to Task N" shortcuts                           │
│    ✓ Dependencies between tasks are explicit                    │
│                                                                  │
│  Step 4: PRESENT TO USER                                        │
│  Show plan in sections, get sign-off before saving.             │
│  If the sign-off prompt doubles as the what-next menu, it must  │
│  carry workflow CP-1's FULL option set — incl. both subagent    │
│  options — not just implement/tests/revise.                     │
│                                                                  │
│  Step 5: SAVE                                                   │
│  Write to .condux/plans/ per AGENTS.md or default path.        │
│  Do NOT modify the plan file after saving.                      │
└──────────────────────────────────────────────────────────────────┘
```

## Task Card Format

Each task card is a **top-level `##` heading** — this makes every task a
first-class entry in the plan-review navigation menu (the TOC is generated
from headings, and `###` renders as a greyed sub-entry).

```markdown
## Task N: <Short Name>

**What:** One paragraph — what this task builds or changes.

**Why:** One sentence — why this is needed / what it enables.

**Files:**

- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts:123-145`

**Interfaces:**

- Consumes: what this task uses from earlier tasks — exact names / signatures
- Produces: what later tasks rely on — exact function names, parameter and
  return types (or "None" for a leaf task)

**Sketch:** _(optional)_

```ts
// only the code worth annotating before it's written
```

**Gotchas:**

- Use `dayjs` for date handling, not native JS Date
- This touches the auth middleware — don't change its signature
- [Any project conventions or known quirks relevant to this task]

**Dependencies:** Task 2, Task 3 (or "None")
```

The `Interfaces` block carries the typed contract between tasks: a task's
implementer (especially a subagent) sees only their own card, so `Consumes`
/ `Produces` is how neighbouring tasks agree on exact names and types. This
is what prevents drift like `clearLayers()` in Task 3 vs `clearFullLayers()`
in Task 7.

When `blueprint` mockups exist for the feature, a card may cite the relevant
file under `.condux/designs/<feature>/mockups/` so the implementer sees the
visual target for their task (ephemeral→ephemeral citation — allowed).

## Code Sketches

Plans are reviewed by annotation before any code is written, so the cheapest
place to catch a bad approach is the plan. Include a **Sketch** whenever
seeing the code changes whether you'd approve the task:

- ✓ The non-obvious algorithm or the tricky transform
- ✓ A key data shape, schema, or type/interface definition
- ✓ A function signature whose contract other tasks depend on

Keep sketches to the code that carries a decision. They are illustrative
intent for the reviewer to tweak — not the final implementation, and not a
substitute for the implementer's judgement. Do **not** sketch:

- ✗ Boilerplate the implementer will obviously write (CRUD, wiring, imports)
- ✗ Full file bodies — show the part worth reviewing, elide the rest with `…`
- ✗ Test code (that belongs to `/test-first-development`)
- ✗ The TDD micro-step cycle (write test → run → implement → run → commit)

## Plan Document Structure

Fill in `references/plan-template.md` — it is the canonical skeleton, kept
consistent so the plan-review nav renders the same predictable TOC every
time (`Overview · Global Constraints · Files Affected · Task Checklist ·
Task 1…N`). Do not reinvent the section set or reorder it.

```markdown
# Plan: <Feature Name>

> Date: YYYY-MM-DD

## Overview

**Goal:** one sentence. **Approach:** 2-3 sentences. **Tech / conventions:** key libs and rules.

## Global Constraints

- Project-wide rules copied verbatim from the design/spec (delete if none).

## Files Affected

- `path/to/file.ts` — what it does / what changes

## Task Checklist

- [ ] Task 1: ...
- [ ] Task 2: ...

---

[Task cards follow — each a top-level ## heading]
```

## Save Path

Write the plan to `.condux/plans/YYYY-MM-DD-<feature>.md`.

`.condux/` is gitignored working state, created on demand at the git root
(see `/workflow` → Artifacts). Before the first write, make sure it's
ignored — see the bootstrap step there.

Check `AGENTS.md` for project-specific overrides.

## After Saving

Once the plan file is saved, always ask — regardless of whether this
skill was invoked via `/workflow` or standalone:

> "Plan saved to `<path>`. Want to review it in the browser before
> implementing, or go straight to implementation?"

Accept either answer, same as any other soft gate in this skill.

**If review chosen:** locate `annotate-server.js` from the installed
`plan-review` skill (`find ~/.claude ~/.codex ~/.agents -name
annotate-server.js -path '*plan-review*' 2>/dev/null | head -1`) and
launch it in `--steer` mode against the saved plan file:
```bash
node /path/to/plan-review/references/annotate-server.js .condux/plans/<file>.md --steer
```
Poll `GET http://127.0.0.1:7777/api/decision` (long-poll — blocks until a
decision is submitted) and branch on the result:
- **Approve** → proceed to implementation, using any feedback as notes.
- **Request Revisions** → revise the plan file in place per the feedback
  (the open browser tab live-reloads over SSE), then poll again.
- **Deny** → stop; report the feedback and rework the approach before
  re-planning.

**If straight to implementation chosen:** proceed directly, no server
launch.

This applies to the plan doc this skill produces (LARGE tier).
`/workflow`'s MEDIUM-tier quick-plan uses the same section shape and card
fields (Overview · Files · Interfaces · Sketch · Gotchas) inline and lean —
it is not written via this skill, but stays consistent with this structure.

## Plan Failures — Never Write These

```
✗ "TBD", "TODO", "implement later", "fill in details"
✗ "Add appropriate error handling" (be specific)
✗ "Similar to Task N" (repeat the content)
✗ Steps that describe what to do without saying what changes
✗ References to types or functions not defined anywhere in the plan
✗ Micro-steps (write test → run test → write code → run test → commit)
```

## Task Granularity

Tasks should be **meaningful units of work**, not micro-steps. A task is something a developer would recognize as a coherent piece of work — not "write one function" and not "implement the whole feature."

Ask yourself: could this task be reviewed as a standalone PR? If yes, it's the right size.

## What Does NOT Happen

```
✗ Full implementations or boilerplate (sketch decision-carrying code only — see Code Sketches)
✗ Exact commands with expected output
✗ Test code in the plan (tests are written during /test-first-development)
✗ Modifying the plan file after it's saved
✗ Writing a plan without design sign-off
```
