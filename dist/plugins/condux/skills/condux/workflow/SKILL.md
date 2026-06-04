---
name: workflow
description: Route any dev task into the right execution tier before touching code. Trigger with any implementation request — feature, bug fix, refactor, new endpoint, UI change. Infers Small/Medium/Large tier from description, confirms with user, then executes the appropriate flow. Do NOT load brainstorm, write-plan, tdd, sdd, or finalize upfront — load them only when the tier flow requires them.
argument-hint: "<task description>"
---

# /workflow

Pick the right tier, confirm it, execute. No over-engineering for a button change. No under-planning for a cross-cutting feature.

## Usage

```
/workflow $ARGUMENTS
```

## Tiers at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│  SMALL — isolated change, 1-3 files, clear requirements         │
│  e.g. add a button, fix a label, wire a prop, patch a typo      │
│                                                                  │
│  implement → /verification → /finalize                          │
├──────────────────────────────────────────────────────────────────┤
│  MEDIUM — multi-file, some design needed, known boundaries      │
│  e.g. new form + API route, new procedure, new UI feature       │
│                                                                  │
│  quick plan (inline) → implement → /verification → /finalize    │
├──────────────────────────────────────────────────────────────────┤
│  LARGE — cross-cutting, unclear scope, multiple subsystems      │
│  e.g. new module, auth flow, data model change, new service     │
│                                                                  │
│  /brainstorm → /write-plan → implement → /verification →        │
│  /finalize                                                       │
└──────────────────────────────────────────────────────────────────┘
```

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                        WORKFLOW ROUTER                          │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: INFER TIER                                             │
│  Read the task. Ask yourself:                                   │
│    - How many files will this touch?                            │
│    - Is the requirement clear or does it need design?           │
│    - Does it cross service/package boundaries?                  │
│    - Are there unknowns that need exploration first?            │
│                                                                  │
│  Step 2: CONFIRM WITH USER                                      │
│  State the inferred tier + one-sentence reason.                 │
│  Wait for explicit confirmation before proceeding.              │
│  e.g. "Looks like SMALL — one component, no API change.         │
│  Confirm, or should I treat this differently?"                  │
│                                                                  │
│  Step 3: EXECUTE TIER FLOW                                      │
│  Load only the skills the tier needs, when needed.             │
│                                                                  │
│  Step 4: /verification → /finalize                              │
│  Every tier ends here — no exceptions.                          │
└──────────────────────────────────────────────────────────────────┘
```

## Tier Flows

### SMALL

```
1. Implement directly — no plan doc, no brainstorm
2. /verification
3. /finalize
```

### MEDIUM

```
1. Write a short inline plan covering:
   - Files to touch and what changes in each
   - New types, interfaces, or procedures needed
   - Edge cases to handle
2. Confirm plan if any assumption is non-obvious
3. Implement top-to-bottom
4. /verification
5. /finalize
```

### LARGE

```
1. Load brainstorm → run it fully, get sign-off
2. Load write-plan → produce plan doc, get sign-off
3. Implement task by task (use sdd if needed)
4. /verification
5. /finalize
```

## Escalating Mid-Task

If mid-task you find the scope is bigger than the confirmed tier:

- Stop immediately
- Report what you found ("this touches auth middleware, not just the UI")
- Re-confirm tier before continuing
- Do not silently expand scope

## What Does NOT Happen

```
✗ Loading all skills upfront
✗ Running tests mid-implementation
✗ Lint/format/typecheck during implementation
✗ Code review unless explicitly requested (/code-review)
✗ Plan docs for SMALL or MEDIUM tasks
✗ Brainstorming for SMALL or MEDIUM tasks
✗ Spawning agents unless /sdd is loaded and justified
```

## Tips

1. Be specific: "add export button to invoice table that calls exportInvoices" → SMALL.
   "improve the invoice flow" → needs clarification before tier can be inferred.
2. Override anytime: "treat this as LARGE" is always valid.
3. TDD is opt-in: if you want tests, say so — /tdd will be loaded at the right moment.
4. Review is separate: after /finalize, run /code-review if you want a review before merging.
