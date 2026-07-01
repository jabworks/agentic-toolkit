# Plan: subagent-deployment

> Date: 2026-07-01
> Design: docs/plans/2026-07-01-subagent-deployment-design.md

## Goal

Add a standalone skill for deploying 2+ independent tasks across condux's
named agents in a single message, backed by one canonical safety checklist —
and fix `subagent-driven-development`'s own internal inconsistency (Step 1
promises identifying parallel-safe tasks; Step 4 has always unconditionally
forbidden acting on it).

## Approach

New skill `subagent-deployment` + its canonical
`references/safety-checklist.md`. `subagent-driven-development` and
`spawn-rules.md` both get trimmed to point at that one file instead of
duplicating parallel-safety logic. `subagent-driven-development`'s `## How
It Works` diagram gets a genuine Step 3/4 rewrite: dependency-graph waves,
dispatched together when they clear the checklist. Small registration edits
round it out (`/workflow` CP-1, `systematic-debugging`, `using-condux.md`,
`README.md`).

## Files Affected

- `skills/subagent-deployment/SKILL.md` — new
- `skills/subagent-deployment/references/safety-checklist.md` — new
- `skills/subagent-driven-development/SKILL.md` — Step 3/4 rewrite, Parallel
  Spawning Rules trimmed to a pointer
- `skills/subagent-driven-development/references/spawn-rules.md` — new
  Spawn Decision Tree branch, Parallel Safety Checklist trimmed to a pointer
- `skills/workflow/SKILL.md` — new CP-1 option, corrected "Spawn specialist
  agents" wording
- `skills/systematic-debugging/SKILL.md` — one-line pointer
- `skills/using-condux/SKILL.md` — new skill table row
- `README.md` — new condux table row
- `dist/plugins/condux/.claude-plugin/plugin.json`,
  `dist/plugins/condux/.codex-plugin/plugin.json` — version bump

## Tasks

- [ ] Task 1: Create `subagent-deployment` skill + canonical checklist
- [ ] Task 2: Rewrite `subagent-driven-development`'s Step 3/4 + trim Parallel Spawning Rules
- [ ] Task 3: Trim `spawn-rules.md`, add Spawn Decision Tree branch
- [ ] Task 4: `/workflow` CP-1 update
- [ ] Task 5: `systematic-debugging` pointer
- [ ] Task 6: Register in `using-condux.md` + `README.md`
- [ ] Task 7: Sync, version bump

---

### Task 1: Create `subagent-deployment` skill + canonical checklist

**What:** Create `skills/subagent-deployment/SKILL.md`:

```markdown
---
name: subagent-deployment
description: Fan out 2+ independent tasks across named agents (explorer/researcher/planner/coder) in a single message when they share no files and no dependencies. Use for ad-hoc independent work discovered outside a formal plan — unrelated bug fixes, parallel lookups, independent small tasks.
when_to_use: Use when facing 2+ independent tasks that can be worked on without shared files or sequential dependencies — any combination of named agents. Not for executing an ordered plan task-by-task (that's subagent-driven-development).
argument-hint: "<list of independent tasks>"
---

# /subagent-deployment

Deploy independent agents at once, not one at a time. For genuinely unrelated work — not for executing an ordered plan.

## Usage

\`\`\`
/subagent-deployment $ARGUMENTS
\`\`\`

## Core Principle

**Deploy together only when genuinely independent.** Two tasks are independent when neither needs the other's output, they touch no shared files, and integrating both outcomes afterward is unambiguous. Check `references/safety-checklist.md` before every deployment — it's the one place this logic lives; nothing else in condux restates it.

## How It Works

\`\`\`
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
\`\`\`

## Constructing Deployment Prompts

Each prompt in the batch needs the same rigor as any single dispatch:

\`\`\`
Good prompt:
  ✓ One clearly scoped problem/task, self-contained
  ✓ All context needed to understand it (no shared session history)
  ✓ Constraints (which files it may touch, what NOT to do)
  ✓ Expected output format

Bad prompt:
  ✗ "Look into the failing tests" (too broad, not scoped to one domain)
  ✗ Assumes the agent has seen the other tasks in the batch
  ✗ No stated output format
\`\`\`

## Example

\`\`\`
Three unrelated test files failing after a refactor:
  - agent-tool-abort.test.ts (timing issue)
  - batch-completion-behavior.test.ts (event structure bug)
  - tool-approval-race-conditions.test.ts (execution count wrong)

Checklist: different files, no shared state, no dependency between them → clear.

Dispatch all three condux:coder agents in the same message:
  Agent 1 (coder): "Fix the 3 failures in agent-tool-abort.test.ts: ..."
  Agent 2 (coder): "Fix the 2 failures in batch-completion-behavior.test.ts: ..."
  Agent 3 (coder): "Fix the 1 failure in tool-approval-race-conditions.test.ts: ..."
\`\`\`

## What Does NOT Happen

\`\`\`
✗ Splitting related tasks apart just to parallelize them
✗ Dispatching a generic subagent instead of a named one
✗ Issuing dispatches one response at a time and calling it "parallel"
✗ Skipping the safety checklist because the tasks "look independent"
✗ Using this to execute an ordered plan task-by-task (use
  /subagent-driven-development instead — this skill is for ad-hoc,
  not-yet-planned independent work)
\`\`\`

## See Also

- `references/safety-checklist.md` — the canonical parallel-dispatch safety checklist (also referenced by `subagent-driven-development` and `spawn-rules.md` — this is the one place it lives)
- `subagent-driven-development` — for executing an ordered plan task-by-task; also uses this checklist internally when a plan's tasks are independent
```

Create `skills/subagent-deployment/references/safety-checklist.md`:

```markdown
# Parallel Dispatch Safety Checklist

The one place this logic lives. `subagent-deployment`,
`subagent-driven-development`, and `spawn-rules.md` all point here instead
of restating it.

## Is it safe to dispatch these together?

\`\`\`
□ Read-only combination? (explorer + explorer, researcher + researcher, or
  explorer + researcher)
  → Always safe. Nothing writes, nothing to conflict. Skip the rest of
    this checklist.

□ Any task in the group uses coder (or planner writing a doc)?
  → All of the following must hold:
    □ Every write-capable task in the group writes to different files
      than every other task in the group
    □ No task depends on another task's output
    □ No task needs another task's file to exist first
    □ You (the controller) can integrate every result without conflicts

If any box is unchecked → that group runs sequentially, not together.
\`\`\`

## Constructing the batch

- Issue every cleared dispatch in the **same message** — one Agent tool call
  per task, all in one response. Multiple calls in one message run
  concurrently; one call per response runs sequentially, regardless of
  intent.
- Each dispatch prompt is self-contained — no dispatch should assume the
  agent has seen any other task in the batch, or your session's history.
- Never dispatch two tasks together just because they're both quick — the
  checklist is about safety (file/dependency conflicts), not speed.

## Known limitation

No filesystem isolation (no git worktrees) backs this — safety rests
entirely on the disjoint-files check above, not on the environment
enforcing it. This is a deliberate, accepted tradeoff, not an oversight: two
agents genuinely writing to different files carries no real conflict risk
at the filesystem level; the residual risk is agents running overlapping
git commands against the same `.git` concurrently, which none of condux's
current dispatch prompts do (no task is asked to commit — committing is
always a separate, explicit, controller-only step per this repo's own
convention).

## Model selection

Same tiering as sequential dispatch — see
`subagent-driven-development/references/spawn-rules.md` → Model Selection.
Parallelizing doesn't change which model tier a given task needs; it only
changes how many run at once.
```

**Why:** This is the new capability itself — everything else in this plan
just wires existing skills to point at it instead of duplicating its logic.

**Files:**
- Create: `skills/subagent-deployment/SKILL.md`
- Create: `skills/subagent-deployment/references/safety-checklist.md`

**Gotchas:**
- The backtick-fence escaping above (`\`\`\``) is a plan-document artifact —
  write the actual files with normal triple-backtick fences, not escaped
  ones.
- `subagent-deployment` is a brand-new skill with no existing `dist/`
  target — `scripts/sync.sh` will just print `SKIP` for it until the target
  directory exists (see Task 7).

**Dependencies:** None

---

### Task 2: Rewrite `subagent-driven-development`'s Step 3/4 + trim Parallel Spawning Rules

**What:** Modify `skills/subagent-driven-development/SKILL.md` (read it
first — it currently has a `## Progress Ledger` section, then `## How It
Works` with an ASCII diagram, then `## Parallel Spawning Rules`, from
earlier work this session):

1. Inside the `## How It Works` ASCII diagram, replace Steps 1, 3, and 4's
   text (Step 2 and Step 5 stay as they are) with:

   - Step 1 gains one word change: "Identify which tasks can run in
     parallel (no shared deps)" → "Identify which tasks are unblocked (all
     dependencies complete)".
   - Step 3 becomes **GROUP INTO A WAVE**: among this round's unblocked
     tasks needing an agent, check `references/safety-checklist.md` in the
     `subagent-deployment` skill; tasks that clear it form one wave.
   - Step 4 becomes **DISPATCH THE WAVE**: checklist-cleared tasks get
     dispatched together in one message; otherwise dispatch one at a time.
     Either way, don't mix in unrelated off-plan work until the current wave
     finishes.

   Preserve the box's exact border/width style (same `┌─...─┐` /`│`/`└─...─┘`
   characters, same interior width as the rest of the diagram) — only the
   step text inside changes.

2. Replace the `## Parallel Spawning Rules` section's body entirely with:

   ```markdown
   ## Parallel Spawning Rules

   For the full safety checklist (which combinations are safe, why, and how
   to construct the batch), see
   `subagent-deployment/references/safety-checklist.md` — the one place
   this logic lives. Do not restate it here.
   ```

Constraints:
- Do not touch `## Progress Ledger`, `## Model Selection`, `## Delegation
  Prompt Quality`, `## File Handoffs`, `## Non-Blocking Research Pattern`,
  or `## See Also` — those are unrelated to this task.
- The box-art alignment matters — after editing, every line between the
  `│` characters must be the same total width as the unedited lines. This
  will be checked and corrected after the edit if needed.

**Why:** This is the actual behavior change — `subagent-driven-development`
gains real wave-based parallel dispatch instead of the old unconditional
"never spawn while a coder is active" rule, using the same checklist as the
new ad-hoc skill instead of its own separate copy.

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`

**Gotchas:**
- `write-plan`'s Task Card Format already has a `Dependencies:` field per
  task — this rewrite assumes that field is what "unblocked" and "wave"
  mean; it doesn't require any change to `write-plan` itself.

**Dependencies:** Task 1 (references `subagent-deployment` by name/path)

---

### Task 3: Trim `spawn-rules.md`, add Spawn Decision Tree branch

**What:** Modify
`skills/subagent-driven-development/references/spawn-rules.md` (read it
first) in two places:

1. At the very top of the `## Spawn Decision Tree` ASCII tree, before the
   existing "Do I need to do something?" line, insert:

   ```
   Do I have 2+ independent tasks to handle right now (any agent mix)?
   │   YES → See subagent-deployment — check its safety checklist,
   │         dispatch the cleared ones together in one message.
   │   NO  → continue below for the single task in front of you
   │
   ```

   (Then the existing tree continues unchanged from "Do I need to do
   something?" onward.)

2. Replace the entire `## Parallel Safety Checklist` section's body with:

   ```markdown
   ## Parallel Safety Checklist

   See `subagent-deployment/references/safety-checklist.md` — the one
   place this logic lives. Do not restate it here.
   ```

Constraints:
- Do not touch `## Agent Cost Tiers`, `### Model Selection for coder
  Dispatch`, `## Agent Capability Boundaries`, or `## Common Mistakes` —
  unrelated to this task, and the existing Common Mistakes row about
  spawning explorer while coder is running is still accurate as-is (it's
  about unrelated off-wave work, not this change).

**Why:** Same consolidation as Task 2, applied to `spawn-rules.md`'s own
copy of the same logic — one canonical checklist, not three.

**Files:**
- Modify: `skills/subagent-driven-development/references/spawn-rules.md`

**Gotchas:** None beyond preserving the rest of the file untouched.

**Dependencies:** Task 1

---

### Task 4: `/workflow` CP-1 update

**What:** Modify `skills/workflow/SKILL.md`'s `### CP-1 — Plan ready`
table. Replace it with:

```markdown
| Option | What it does |
| --- | --- |
| **Start implementing** *(recommended)* | Implement the plan top-to-bottom yourself |
| **Spawn specialist agents** | Load `subagent-driven-development`; execute the plan task-by-task with named specialist agents |
| **Dispatch independent tasks in parallel** | Load `subagent-deployment`; fan out N independent tasks across named agents at once |
| **Revise the plan** | Loop back to `write-plan` with the new direction |
```

Constraints:
- Only this table changes. Do not touch the sentence above it ("Plan
  review already happened...") or anything in `### CP-2`/`### CP-3`/`##
  Tips`.
- The old "Spawn specialist agents" row said "...deploy
  explorer/researcher/coder for parallel exploration or a large plan" —
  that phrasing was inaccurate (SDD is sequential-by-wave, not a general
  parallel-exploration tool) and is corrected above.

**Why:** Surfaces the new skill at the one place condux already asks "what
next" after a plan is ready, and fixes a pre-existing inaccuracy in the
option it's replacing text next to.

**Files:**
- Modify: `skills/workflow/SKILL.md`

**Gotchas:** None.

**Dependencies:** Task 1

---

### Task 5: `systematic-debugging` pointer

**What:** Modify `skills/systematic-debugging/SKILL.md`'s `## Integration
with Condux` section — add one new bullet after the existing three:

```markdown
- **Multiple unrelated failures**: if 2+ failures are independent (different
  files, no shared cause), use `subagent-deployment` to fix them
  concurrently instead of one at a time
```

**Why:** This is the natural trigger site for the ad-hoc case — "I have
several unrelated bugs" is exactly when a debugging session should reach
for the new skill.

**Files:**
- Modify: `skills/systematic-debugging/SKILL.md`

**Gotchas:** Add as a new bullet in the existing list — don't reformat the
other three.

**Dependencies:** Task 1

---

### Task 6: Register in `using-condux.md` + `README.md`

**What:**

1. Modify `skills/using-condux/SKILL.md`'s skill table (the one with
   columns Skill/When/Gate type) — add a new row after
   `subagent-driven-development`'s row:

   ```markdown
   | `subagent-deployment` | 2+ independent tasks (any agent mix), no shared files/deps | ad-hoc, not tied to a formal plan |
   ```

2. Modify the root `README.md`'s condux table (in the "### Condux"
   section) — add a new row after the `/subagent-driven-development` row:

   ```markdown
   | [/subagent-deployment](./skills/subagent-deployment/) | Fan out independent tasks across named agents in one message — ad-hoc, not a formal plan |
   ```

Constraints:
- Only add the new rows — don't reformat or reorder the existing tables.

**Why:** Without this, the new skill exists on disk but isn't discoverable
through either of condux's two "what skills exist" references.

**Files:**
- Modify: `skills/using-condux/SKILL.md`
- Modify: `README.md`

**Gotchas:** None.

**Dependencies:** Task 1

---

### Task 7: Sync, version bump

**What:**

1. `subagent-deployment` is brand new — `scripts/sync.sh` only mirrors
   *existing* dist targets (it prints `SKIP` otherwise). First create the
   target directory so it's recognized:
   ```bash
   mkdir -p dist/plugins/condux/skills/condux/subagent-deployment
   ```
   Then run `scripts/sync.sh subagent-deployment` to actually populate it.

2. Run `scripts/sync.sh subagent-driven-development`, `scripts/sync.sh
   workflow`, `scripts/sync.sh systematic-debugging`, and `scripts/sync.sh
   using-condux` — these five already have dist targets from earlier
   sessions, so plain sync works directly.

3. Read the current `version` field in
   `dist/plugins/condux/.claude-plugin/plugin.json` and
   `dist/plugins/condux/.codex-plugin/plugin.json`. Bump the minor version
   by one from whatever that current value is (this is a new capability
   addition).

Constraints:
- Never hand-edit anything under `dist/plugins/condux/skills/` — only via
  `scripts/sync.sh` (after the one-time `mkdir` for the new skill).
- `README.md` lives at the repo root, not under `dist/` — it needs no sync
  step, Task 6 already edited the real file.

**Why:** Ties every prior task's source edits into the actual installed
plugin mirror, and records the capability bump.

**Files:**
- Sync (via `scripts/sync.sh`, never hand-edited):
  `dist/plugins/condux/skills/condux/{subagent-deployment,subagent-driven-development,workflow,systematic-debugging,using-condux}/`
- Modify: `dist/plugins/condux/.claude-plugin/plugin.json`,
  `dist/plugins/condux/.codex-plugin/plugin.json` (`version` field)

**Gotchas:**
- Do the `mkdir` step for `subagent-deployment` before its first sync, or
  the sync will silently no-op with a `SKIP` message.

**Dependencies:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6
