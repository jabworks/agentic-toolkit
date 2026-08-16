---
name: subagent-deployment
description: "Fan out 2+ independent tasks across named agents (explorer/researcher/planner/coder) in a single message when they share no files and no dependencies. For ad-hoc independent work discovered outside a formal plan. Trigger when the fan-out is already the ask — \"in parallel\", \"fan out\", \"dispatch these together\", \"kick off explorer and researcher\" — over two or more genuinely independent tasks, nothing shared, no ordering. Independence alone is not the signal: a plain implementation request goes to workflow first, which loads this when the tier warrants it. Also owns which agent gets dispatched: asking to spawn a generic or custom-prompt subagent routes here, where the answer is one of the four named agents instead. Not for executing an ordered plan task-by-task (that's subagent-execution)."
argument-hint: "<list of independent tasks>"
---

# /subagent-deployment

Deploy independent agents at once, not one at a time. For genuinely unrelated work — not for executing an ordered plan.

**This runs inside `/workflow`, not instead of it.** Independent work is a
precondition, not a trigger: "fix these three unrelated tests" is an
implementation request and goes to the router, which loads this skill if the
tier warrants it. What reaches here directly is a request that already names
the fan-out — parallel, dispatch, fan out, these agents at once.

## Usage

```
/subagent-deployment $ARGUMENTS
```

## Core Principle

**Deploy together only when genuinely independent.** Two tasks are independent when neither needs the other's output, they touch no shared files, and integrating both outcomes afterward is unambiguous. Check `references/safety-checklist.md` before every deployment — it's the one place this logic lives; nothing else in condux restates it.

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                     SUBAGENT DEPLOYMENT                         │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: IDENTIFY INDEPENDENT DOMAINS                           │
│  Group the tasks in front of you by what's actually             │
│  independent — different files, different subsystems,           │
│  different unrelated bugs. Related tasks (fixing one might      │
│  fix another) stay together as ONE task, not split.             │
│                                                                  │
│  Step 2: RUN THE CHECKLIST                                      │
│  For each candidate pair/group, check                           │
│  references/safety-checklist.md. Any box unchecked → that       │
│  group runs sequentially, not together.                         │
│                                                                  │
│  Step 3: PICK THE AGENT PER TASK                                │
│  Read-only lookup → explorer or researcher.                     │
│  Isolated implementation/fix → coder.                           │
│  Never a generic subagent with an injected prompt — only        │
│  condux's four named agents.                                    │
│                                                                  │
│  Step 4: DISPATCH TOGETHER                                      │
│  Issue every checklist-cleared dispatch in the SAME message —   │
│  that's what makes them run concurrently. One dispatch per      │
│  response = sequential, regardless of intent.                   │
│                                                                  │
│  Step 5: RETRIEVE AND INTEGRATE                                 │
│  Read every result. Confirm no unexpected overlap or            │
│  conflict before treating the batch as done. You are            │
│  responsible for coherence — agents don't see each other's      │
│  work.                                                          │
└──────────────────────────────────────────────────────────────────┘
```

## Constructing Deployment Prompts

Each prompt in the batch needs the same rigor as any single dispatch:

```
Good prompt:
  ✓ One clearly scoped problem/task, self-contained
  ✓ All context needed to understand it (no shared session history)
  ✓ Constraints (which files it may touch, what NOT to do)
  ✓ Expected output format

Bad prompt:
  ✗ "Look into the failing tests" (too broad, not scoped to one domain)
  ✗ Assumes the agent has seen the other tasks in the batch
  ✗ No stated output format
```

## Example

```
Three unrelated test files failing after a refactor:
  - agent-tool-abort.test.ts (timing issue)
  - batch-completion-behavior.test.ts (event structure bug)
  - tool-approval-race-conditions.test.ts (execution count wrong)

Checklist: different files, nothing shared, no dependency between them → clear.

Dispatch all three condux:coder agents in the same message:
  Agent 1 (coder): "Fix the 3 failures in agent-tool-abort.test.ts: ..."
  Agent 2 (coder): "Fix the 2 failures in batch-completion-behavior.test.ts: ..."
  Agent 3 (coder): "Fix the 1 failure in tool-approval-race-conditions.test.ts: ..."
```

## What Does NOT Happen

```
✗ Splitting related tasks apart just to parallelize them
✗ Dispatching a generic subagent instead of a named one
✗ Issuing dispatches one response at a time and calling it "parallel"
✗ Skipping the safety checklist because the tasks "look independent"
✗ Using this to execute an ordered plan task-by-task (use
  /subagent-execution instead — this skill is for ad-hoc,
  not-yet-planned independent work)
```

## See Also

- `references/safety-checklist.md` — the canonical parallel-dispatch safety checklist (also referenced by `subagent-execution` and `spawn-rules.md` — this is the one place it lives)
- `subagent-execution` — for executing an ordered plan task-by-task; also uses this checklist internally when a plan's tasks are independent
