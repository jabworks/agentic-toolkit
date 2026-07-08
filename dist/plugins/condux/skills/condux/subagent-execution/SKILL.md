---
name: subagent-execution
description: Execute a plan using named specialist agents. Default is to implement yourself — only spawn when there is a concrete justification. Agents must be pre-defined; never create generic subagents with injected system prompts.
when_to_use: Trigger when implementing a LARGE plan with tasks that benefit from agent specialization or parallel exploration. Not for ad-hoc independent tasks outside a plan (that's subagent-deployment).
argument-hint: "<plan file path>"
---

# /subagent-execution

Execute a plan using specialist agents. Default is to do the work yourself. Spawn only when justified.

## Usage

```
/subagent-execution docs/plans/YYYY-MM-DD-<feature>.md
```

## Core Principle

**You implement by default.** Spawning is an explicit decision with a stated reason — not the default mode of operation.

```
Before spawning any agent, answer:
  1. Why can't I do this task myself?
  2. Which named agent is right for this task?
  3. Is this task independent enough to parallelize?
  4. What exactly will I pass to the agent?
```

If you can't answer all four, don't spawn.

## Progress Ledger

Conversation memory does not survive compaction. Track task completion in a
ledger file, not only in todos.

- At skill start, check for a ledger: `.condux/progress/<feature-slug>.md`
  (slug inferred kebab-case from the plan's feature name — the same
  convention `draft-plan` uses for its own filename). Tasks listed there as
  complete are DONE — do not re-dispatch them; resume at the first task not
  marked complete.
- If no ledger exists, create it with a header naming the plan file:
  ```
  # Subagent Execution Progress: <feature-slug>

  Plan: docs/plans/<plan-file>.md

  ```
- When a task's review comes back clean, append one line in the same
  message as other bookkeeping: `- [x] Task N: <name> — commits
  <base7>..<head7>, review clean`.
- The ledger is a recovery aid, not the source of truth — the commits it
  names exist in git even if context no longer remembers creating them.
  After compaction or a new session, trust the ledger and `git log` over
  your own recollection.
- `.condux/` is gitignored scratch. If it's ever deleted, recover progress
  from `git log` against the plan's task list.

## How It Works

Before Step 1, check the **Progress Ledger** (above) for already-completed tasks and resume there if any exist.

```
┌──────────────────────────────────────────────────────────────────┐
│                    SUBAGENT EXECUTION                           │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: READ THE PLAN                                          │
│  Load the plan file. Map out task dependencies.                 │
│  Identify which tasks are unblocked (all dependencies complete).│
│                                                                  │
│  Step 2: FOR EACH TASK                                          │
│  Ask: can I implement this myself?                              │
│    YES → implement directly                                     │
│    NO  → consult spawn-rules.md, pick the right agent,         │
│           construct the delegation prompt, spawn                │
│                                                                  │
│  Step 3: GROUP INTO A WAVE                                      │
│  Among this round's unblocked tasks needing an agent, check     │
│  references/safety-checklist.md (subagent-deployment skill);    │
│  tasks that clear it form one wave.                             │
│                                                                  │
│  Step 4: DISPATCH THE WAVE                                      │
│  Checklist-cleared tasks get dispatched together in one message;│
│  otherwise dispatch one at a time. Either way, don't mix in     │
│  unrelated off-plan work until the current wave finishes.       │
│                                                                  │
│  Step 5: RETRIEVE AND INTEGRATE                                 │
│  Read agent output. Integrate into the codebase.               │
│  You are responsible for coherence — agents don't see each     │
│  other's work.                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Step 5's "mark task complete" also means appending the ledger line described in **Progress Ledger** — do this in the same message as marking the todo complete.

## Parallel Spawning Rules

For the full safety checklist (which combinations are safe, why, and how
to construct the batch), see
`subagent-deployment/references/safety-checklist.md` — the one place
this logic lives. Do not restate it here.

## Model Selection

Before dispatching any `coder` subagent, choose its model explicitly based
on task complexity — see `references/spawn-rules.md` → Model Selection for
the tiering table. Never omit the model on a dispatch call; an omitted
model inherits the session's own model, which defeats the point of
tiering.

## Delegation Prompt Quality

When spawning, construct the delegation prompt carefully. The agent gets only what you give it.

```
Good delegation prompt includes:
  ✓ The specific task from the plan (full text, not a reference)
  ✓ Relevant file paths and their current state
  ✓ Constraints ("read-only", "no bash", "don't touch auth middleware")
  ✓ Expected output format ("return a summary of findings + file paths")
  ✓ What NOT to do

Bad delegation prompt:
  ✗ "Look into the auth stuff"
  ✗ A file reference without the content
  ✗ No stated output format
  ✗ No constraints
```

## File Handoffs

Pasted plan content and diffs stay resident in context for the rest of the
session and get re-read on every later turn. Hand them over as files
instead:

- **Task brief:** before dispatching an implementer, run
  `references/task-brief.sh <plan-file> <task-number>` — it extracts the
  task's full text to a scratch file and prints the path. Reference that
  path in the dispatch prompt ("read this first — it is your
  requirements"), plus any interfaces/decisions from earlier tasks the
  brief can't know.
- **Review package:** record the commit SHA before dispatching the
  implementer (this is BASE — never `HEAD~1`, which silently drops all
  but the last commit of a multi-commit task). After the implementer
  reports DONE, run `references/review-package.sh <BASE> <HEAD>` and pass
  the printed path to the task reviewer instead of pasting the diff.
- For the final whole-branch review, BASE is the branch's merge-base with
  its parent (e.g. `git merge-base main HEAD`), not the per-task BASE.

## Non-Blocking Research Pattern

For research/exploration tasks, prefer non-blocking delegation:

1. Spawn the `researcher` or `explorer` agent with a clear question
2. Continue implementing other tasks while it runs
3. Retrieve the result when you need it

Don't block the main session waiting for research that isn't on the critical path.

## See Also

- `references/spawn-rules.md` — agent cost tiers, capability boundaries, decision tree
- `references/task-brief.sh`, `references/review-package.sh` — file-handoff scripts (see File Handoffs above)
