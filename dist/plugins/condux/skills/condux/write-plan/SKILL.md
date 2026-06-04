---
name: write-plan
description: Write a structured implementation plan for a LARGE task after brainstorm sign-off. Produces a lean Option-C plan with task cards (what, why, gotchas, dependencies). Asks whether to generate Markdown, HTML, or both. Never writes a plan without a signed-off design — if brainstorm hasn't run, apply the soft gate first.
argument-hint: "<feature name or design summary>"
---

# /write-plan

Turn a signed-off design into a clear, executable plan. Lean task cards, not micro-step novels.

## Usage

```
/write-plan $ARGUMENTS
```

## Before Writing

1. Confirm brainstorm has run and design is signed off.
   If not: "We haven't aligned on the design yet — run /brainstorm first, or confirm you want to skip it."
2. Ask the user: **"Markdown, HTML, or both?"**
   - Markdown → optimized for AI agent consumption during execution
   - HTML → optimized for human reading in browser, static, never modified after creation
   - Both → generate both files from the same content

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                        WRITE-PLAN                               │
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
│                                                                  │
│  Step 5: SAVE                                                   │
│  Write file(s) to docs/plans/ per AGENTS.md or default paths.  │
│  Do NOT modify plan files after saving.                         │
└──────────────────────────────────────────────────────────────────┘
```

## Task Card Format (Markdown)

```markdown
### Task N: <Short Name>

**What:** One paragraph — what this task builds or changes.

**Why:** One sentence — why this is needed / what it enables.

**Files:**

- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts`

**Gotchas:**

- Use `dayjs` for date handling, not native JS Date
- This touches the auth middleware — don't change its signature
- [Any project conventions or known quirks relevant to this task]

**Dependencies:** Task 2, Task 3 (or "None")
```

## Plan Document Structure (Markdown)

```markdown
# Plan: <Feature Name>

> Date: YYYY-MM-DD

## Goal

One sentence.

## Approach

2-3 sentences on the chosen direction.

## Files Affected

- `path/to/file.ts` — what it does / what changes

## Tasks

- [ ] Task 1: ...
- [ ] Task 2: ...
- [ ] Task 3: ...

---

[Task cards follow]
```

## Plan Document Structure (HTML)

See `references/plan-template.html` for the exact template to populate.
HTML is generated once, never modified after creation. Checkboxes in the HTML are decorative — progress is tracked via the Markdown task list.

## Save Paths

| Format   | Default Path                           |
| -------- | -------------------------------------- |
| Markdown | `docs/plans/YYYY-MM-DD-<feature>.md`   |
| HTML     | `docs/plans/YYYY-MM-DD-<feature>.html` |

Check `AGENTS.md` for project-specific overrides.

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
✗ Writing code in the plan
✗ Exact commands with expected output
✗ Test code in the plan (tests are written during /tdd)
✗ Modifying the plan file after it's saved
✗ Writing a plan without design sign-off
```
