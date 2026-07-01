---
name: write-plan
description: Turns a signed-off design into an executable plan of lean task cards (what, why, gotchas, dependencies). Writes Markdown; review in the browser via plan-review.
when_to_use: Run for LARGE tasks after /brainstorm sign-off. Never writes a plan without a signed-off design — if brainstorm hasn't run, apply the soft gate first.
argument-hint: "<feature name or design summary>"
effort: high
---

# /write-plan

Turn a signed-off design into a clear, executable plan. Lean task cards, not micro-step novels.

## Usage

```
/write-plan $ARGUMENTS
```

## Before Writing

1. Confirm brainstorm has run and design is signed off. First glob
   `docs/plans/*<slug>*-design.md` and `specs/<slug>/` (slug = kebab-case
   of the feature name) for an existing signed-off design — if found,
   treat this check as satisfied without asking. Otherwise ask: "We
   haven't aligned on the design yet — run /brainstorm first, or confirm
   you want to skip it."

The plan is written as Markdown — optimized for AI agent consumption during
execution. To read it in the browser, use `plan-review` (see After Saving);
no separate HTML file is produced.

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
│  Write the file to docs/plans/ per AGENTS.md or default path.  │
│  Do NOT modify the plan file after saving.                      │
└──────────────────────────────────────────────────────────────────┘
```

## Task Card Format

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

## Plan Document Structure

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

## Save Path

Write the plan to `docs/plans/YYYY-MM-DD-<feature>.md`.

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
node /path/to/plan-review/references/annotate-server.js docs/plans/<file>.md --steer
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

This applies to the plan doc this skill produces (LARGE tier). It does
not apply to `/workflow`'s MEDIUM-tier inline quick-plan, which isn't
written via this skill.

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
