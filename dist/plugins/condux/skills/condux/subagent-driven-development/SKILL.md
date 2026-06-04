---
name: subagent-driven-development
description: Execute a plan using named specialist agents. Use when implementing a LARGE plan with tasks that benefit from agent specialization or parallel exploration. Default is to implement yourself — only spawn when there is a concrete justification. Agents must be pre-defined; never create generic subagents with injected system prompts.
argument-hint: "<plan file path>"
---

# /subagent-driven-development

Execute a plan using specialist agents. Default is to do the work yourself. Spawn only when justified.

## Usage

```
/subagent-driven-development docs/plans/YYYY-MM-DD-<feature>.md
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

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                           SDD                                   │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: READ THE PLAN                                          │
│  Load the plan file. Map out task dependencies.                 │
│  Identify which tasks can run in parallel (no shared deps).     │
│                                                                  │
│  Step 2: FOR EACH TASK                                          │
│  Ask: can I implement this myself?                              │
│    YES → implement directly                                     │
│    NO  → consult spawn-rules.md, pick the right agent,         │
│           construct the delegation prompt, spawn                │
│                                                                  │
│  Step 3: PARALLEL ONLY WHEN INDEPENDENT                        │
│  Tasks are parallel-safe if:                                    │
│    - They share no file writes                                  │
│    - Neither depends on the other's output                      │
│    - They won't conflict on the same codebase state            │
│                                                                  │
│  Step 4: NO SPAWNING WHILE CODE WORKER IS ACTIVE               │
│  Do not spawn explore, research, or review agents while         │
│  a coder agent is still working. Wait for it to complete.      │
│                                                                  │
│  Step 5: RETRIEVE AND INTEGRATE                                 │
│  Read agent output. Integrate into the codebase.               │
│  You are responsible for coherence — agents don't see each     │
│  other's work.                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Parallel Spawning Rules

```
✓ Spawn parallel when:
  - Tasks are genuinely independent (no shared file writes, no deps)
  - Each task has a clear justification for being a separate agent
  - Example: "explore auth patterns" + "research date library options"
    can run simultaneously — both read-only, no shared state

✗ Do NOT spawn parallel when:
  - A code worker (coder) is still active
  - Tasks write to the same files
  - One task needs the output of another
  - You'd be spawning just to "fill time" while waiting
```

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

## Non-Blocking Research Pattern

For research/exploration tasks, prefer non-blocking delegation:

1. Spawn the `researcher` or `explore` agent with a clear question
2. Continue implementing other tasks while it runs
3. Retrieve the result when you need it

Don't block the main session waiting for research that isn't on the critical path.

## See Also

- `references/spawn-rules.md` — agent cost tiers, capability boundaries, decision tree
