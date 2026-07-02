---
name: workflow
description: Routes any dev task into the right execution tier (Small/Medium/Large). Confirms tier with user, then executes the matching flow. Only loads downstream skills (brainstorm, write-plan, finalize) when the tier flow reaches them.
when_to_use: Trigger with any implementation request — feature, bug fix, refactor, new endpoint, UI change.
argument-hint: "<task description>"
---

# /workflow

Pick the right tier, confirm it, execute. No over-engineering for a button change. No under-planning for a cross-cutting feature.

## Usage

```
/workflow $ARGUMENTS
```

## Live Context

```!
git status --short
git log --oneline -5
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
│  Step 1b: SPEC LOOKUP                                           │
│  Detect package root: walk up from CWD to git root, find       │
│  nearest package.json / Cargo.toml / go.mod / pyproject.toml.  │
│  Check both scopes (deduplicate if they're the same dir):       │
│    ls <package-root>/specs/ 2>/dev/null                        │
│    ls <git-root>/specs/ 2>/dev/null                            │
│  Match the task subject to a spec dir (fuzzy kebab-case:        │
│  "checkout flow" → specs/checkout-flow).                        │
│  If found, read index.md, then load files by task type:         │
│    Bug / debug   → quirks.md, api.md, fields.md                │
│    Refactor      → implementation.md, decisions.md              │
│    New feature   → decisions.md, api.md, fields.md             │
│  Carry this context through — don't re-read mid-task.           │
│  If no spec found, proceed without comment.                     │
│                                                                  │
│  Step 2: CONFIRM WITH USER                                      │
│  State the inferred tier + one-sentence reason.                 │
│  If a spec was loaded, mention it and offer the companion:      │
│  "Found spec for `checkout-flow` — loaded as context.           │
│   Want me to open the live HTML preview while we work? [y/n]"  │
│  If yes: load `technical-spec` and run the preview server       │
│  (see technical-spec skill — Live HTML Preview section).        │
│  Wait for explicit confirmation before proceeding.              │
│                                                                  │
│  Step 3: EXECUTE TIER FLOW                                      │
│  Load only the skills the tier needs, when needed.             │
│                                                                  │
│  Step 4: CHECKPOINTS (MEDIUM / LARGE)                           │
│  At each phase boundary, stop and present a "what next?" menu   │
│  (AskUserQuestion), recommended option first. The user drives   │
│  every transition — never auto-advance. See Checkpoints below.  │
│  SMALL runs linear: implement → /verification → /finalize.      │
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
1. Write a short inline plan — same section shape as write-plan, kept lean:
   - Overview — goal + approach in 2-3 sentences
   - Files — each file to touch and what changes
   - Interfaces — new types, signatures, or procedures
   - Sketch — a few lines of code ONLY where the logic is non-obvious
   - Edge cases to handle
2. CP-1 — "Plan ready. What next?"
3. Implement top-to-bottom
4. CP-2 — "Implementation done. What next?"
5. /verification → /finalize
6. CP-3 — "Finalized and green. What next?"
```

### LARGE

```
1. Load brainstorm → run it fully, get sign-off
2. Load write-plan → produce plan doc, get sign-off
3. CP-1 — "Plan ready. What next?"
4. Implement task by task (sdd if the user picks it)
5. CP-2 — "Implementation done. What next?"
6. /verification → /finalize
7. CP-3 — "Finalized and green. What next?"
```

See **Checkpoints** for the menu at each CP.

## Checkpoints

On **MEDIUM and LARGE** tasks, stop at each phase boundary and ask what to do
next with an `AskUserQuestion` menu. List the **recommended** option first and
label it `(recommended)`. Never auto-advance past a checkpoint — the user owns
every transition. **SMALL** tasks skip checkpoints and run straight through.

After the user picks, load **only** that skill, run it, then return to the
nearest checkpoint and re-present the menu. The loop continues until the user
chooses **Done**.

### CP-1 — Plan ready

*After write-plan sign-off (LARGE) or the inline plan (MEDIUM).*

> "Plan is ready. What next?"

Plan review already happened (or was declined) as part of `write-plan`'s own save step — this menu doesn't re-offer it.

| Option | What it does |
| --- | --- |
| **Start implementing** *(recommended)* | Implement the plan top-to-bottom yourself |
| **Spawn specialist agents** | Load `subagent-driven-development`; execute the plan task-by-task with named specialist agents |
| **Dispatch independent tasks in parallel** | Load `subagent-deployment`; fan out N independent tasks across named agents at once |
| **Revise the plan** | Loop back to `write-plan` with the new direction |

### CP-2 — Implementation done

> "Implementation is done. What next?"

| Option | What it does |
| --- | --- |
| **Verify & finalize** *(recommended)* | Run `verification`, then `finalize` (typecheck → lint → format → test) |
| **Code review first** | Load `code-review` on the diff before finalizing |
| **Keep building** | More scope remains — re-confirm the tier if it grew |

### CP-3 — Finalized and green

*After `finalize` passes.*

> "Everything's green. What next?"

| Option | What it does |
| --- | --- |
| **Code review** *(recommended)* | `/code-review` the diff before merging |
| **Commit** | Stage and commit, following the repo's commit conventions |
| **Done** | Stop here |

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
✗ Auto-running code-review, commits, or sdd — they're checkpoint
  choices; run them only when the user picks them
✗ Plan docs for SMALL or MEDIUM tasks
✗ Brainstorming for SMALL or MEDIUM tasks
✗ Auto-advancing past a checkpoint on MEDIUM / LARGE tasks
```

## Tips

1. Be specific: "add export button to invoice table that calls exportInvoices" → SMALL.
   "improve the invoice flow" → needs clarification before tier can be inferred.
2. Override anytime: "treat this as LARGE" is always valid.
3. TDD is opt-in: if you want tests, say so — /tdd will be loaded at the right moment.
4. Review is separate: after /finalize, run /code-review if you want a review before merging.
