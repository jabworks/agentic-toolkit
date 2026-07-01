# Plan: SDD Mechanics — Ledger, File-Handoff, Model-Tiering

> Date: 2026-07-01
> Design: docs/plans/2026-07-01-condux-hardening-design.md (workstream 1)

## Goal

Give `subagent-driven-development` the compaction-resilience and file-handoff
mechanics identified as missing against its superpowers model, so multi-task
plan execution doesn't lose progress or bloat dispatch prompts.

## Approach

Add a per-feature progress ledger checked/updated around each task, two
stdlib bash scripts for file-based dispatch handoff, and an explicit
model-tiering table for `coder` dispatch. No worktree isolation, no new
dependencies.

## Files Affected

- `skills/subagent-driven-development/SKILL.md` — ledger, file-handoff, and
  model-selection sections
- `skills/subagent-driven-development/references/spawn-rules.md` — model
  column + selection table
- `skills/subagent-driven-development/references/task-brief.sh` — new
- `skills/subagent-driven-development/references/review-package.sh` — new
- `.gitignore` — add `.condux/`
- `dist/plugins/condux/.claude-plugin/plugin.json`,
  `dist/plugins/condux/.codex-plugin/plugin.json` — version bump

## Tasks

- [ ] Task 1: `task-brief.sh`
- [ ] Task 2: `review-package.sh`
- [ ] Task 3: Progress ledger + file-handoff wiring in `SKILL.md`
- [ ] Task 4: Model-tiering in `spawn-rules.md` + `SKILL.md`
- [ ] Task 5: gitignore, sync, version bump

---

### Task 1: `task-brief.sh`

**What:** Create `skills/subagent-driven-development/references/task-brief.sh`
— extracts one task's full markdown text from a `write-plan`-produced plan
file into a scratch file, so dispatch prompts reference a file path instead
of pasted plan content.

```bash
#!/usr/bin/env bash
# Extract one task's full text from a write-plan markdown file into a scratch
# file, so dispatch prompts can reference a path instead of pasting content.
#
# Usage: task-brief.sh <plan-file> <task-number>
# Prints the absolute path of the written brief file on stdout.
set -euo pipefail

PLAN_FILE="$1"
TASK_N="$2"

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "ERROR: plan file not found: $PLAN_FILE" >&2
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
SCRATCH_DIR="$REPO_ROOT/.condux/scratch"
mkdir -p "$SCRATCH_DIR"

SLUG=$(basename "$PLAN_FILE" .md)
BRIEF_FILE="$SCRATCH_DIR/${SLUG}-task-${TASK_N}-brief.md"

awk -v n="$TASK_N" '
  BEGIN { found = 0 }
  /^### Task [0-9]+:/ {
    if (found) exit
    if ($0 ~ ("^### Task " n ":")) { found = 1 }
  }
  found { print }
' "$PLAN_FILE" > "$BRIEF_FILE"

if [[ ! -s "$BRIEF_FILE" ]]; then
  echo "ERROR: Task $TASK_N not found in $PLAN_FILE" >&2
  rm -f "$BRIEF_FILE"
  exit 1
fi

echo "$BRIEF_FILE"
```

**Why:** Removes the "pasted plan content bloats every dispatch prompt"
failure mode superpowers documented — the controller hands the subagent a
file path instead.

**Files:**
- Create: `skills/subagent-driven-development/references/task-brief.sh`

**Gotchas:**
- Invoked as `bash references/task-brief.sh ...`, matching this repo's
  existing `scaffold.sh` convention — no `chmod +x` step assumed.
- Use `git rev-parse --show-toplevel` for the repo root (falls back to
  `pwd`), the same pattern `scaffold.sh` uses, so `.condux/scratch` always
  lands at the project root regardless of CWD.
- The awk match must exactly match `write-plan`'s Task Card Format heading —
  `### Task N: <Short Name>` — don't assume padding or an alternate
  delimiter.

**Dependencies:** None

---

### Task 2: `review-package.sh`

**What:** Create
`skills/subagent-driven-development/references/review-package.sh` — writes a
commit-range review package (`git log --oneline`, `git diff --stat`, full
`git diff -U10`) to a scratch file for a given base/head SHA pair, and prints
that file's path to stdout.

```bash
#!/usr/bin/env bash
# Write a commit-range review package (log + diffstat + full diff) to a
# scratch file for a review-subagent dispatch, instead of pasting the diff.
#
# Usage: review-package.sh <base-sha> <head-sha>
# Prints the absolute path of the written package file on stdout.
set -euo pipefail

BASE="$1"
HEAD="$2"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
SCRATCH_DIR="$REPO_ROOT/.condux/scratch"
mkdir -p "$SCRATCH_DIR"

PACKAGE_FILE="$SCRATCH_DIR/review-${BASE}-${HEAD}.diff"

{
  echo "## Commits ${BASE}..${HEAD}"
  git log --oneline "${BASE}..${HEAD}"
  echo
  echo "## Diffstat"
  git diff --stat "${BASE}..${HEAD}"
  echo
  echo "## Full diff"
  git diff -U10 "${BASE}..${HEAD}"
} > "$PACKAGE_FILE"

echo "$PACKAGE_FILE"
```

**Why:** Same rationale as Task 1, for the reviewer side — a reviewer reads
one file with the full commit list, stat summary, and diff, instead of the
diff being pasted into the dispatch prompt.

**Files:**
- Create: `skills/subagent-driven-development/references/review-package.sh`

**Gotchas:**
- BASE must be the commit recorded before dispatching the implementer —
  never `HEAD~1`, which silently drops all but the last commit of a
  multi-commit task. Task 3 must state this explicitly in the `SKILL.md`
  text too.
- For the final whole-branch review, BASE is the branch's merge-base with
  its parent (e.g. `git merge-base main HEAD`), not the per-task BASE.

**Dependencies:** None

---

### Task 3: Progress ledger + file-handoff wiring in `SKILL.md`

**What:** Modify `skills/subagent-driven-development/SKILL.md`:

1. Insert a new `## Progress Ledger` section immediately after the existing
   `## Core Principle` section (before `## How It Works`):

   ```markdown
   ## Progress Ledger

   Conversation memory does not survive compaction. Track task completion in a
   ledger file, not only in todos.

   - At skill start, check for a ledger: `.condux/progress/<feature-slug>.md`
     (slug inferred kebab-case from the plan's feature name — the same
     convention `write-plan` uses for its own filename). Tasks listed there as
     complete are DONE — do not re-dispatch them; resume at the first task not
     marked complete.
   - If no ledger exists, create it with a header naming the plan file:
     ```
     # SDD Progress: <feature-slug>

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
   ```

2. Immediately above the existing `## How It Works` ASCII diagram's opening
   fence, add one sentence (do not alter the diagram itself): `Before Step 1,
   check the **Progress Ledger** (above) for already-completed tasks and
   resume there if any exist.`

3. Immediately below the existing `## How It Works` ASCII diagram (after the
   closing fence, before `## Parallel Spawning Rules`), add: `Step 5's "mark
   task complete" also means appending the ledger line described in
   **Progress Ledger** — do this in the same message as marking the todo
   complete.`

4. Insert a new `## File Handoffs` section immediately after the existing
   `## Delegation Prompt Quality` section (before `## Non-Blocking Research
   Pattern`):

   ```markdown
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
   ```

5. Add one line to the existing `## See Also` list: `- references/task-brief.sh,
   references/review-package.sh — file-handoff scripts (see File Handoffs above)`

**Why:** Wires the two new scripts and the ledger into the skill's actual
execution steps — without this, Tasks 1 and 2 are unused scripts.

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`

**Gotchas:**
- Don't edit the ASCII-art diagram's box characters — insert the two pointer
  sentences outside the fenced block, exactly as specified above, to avoid
  breaking its alignment.
- The ledger example inside `## Progress Ledger` is itself a fenced block
  nested inside a markdown section — make sure fence delimiters don't
  collide with the surrounding section's own fences when edited.

**Dependencies:** Task 1, Task 2 (references the scripts by name)

---

### Task 4: Model-tiering in `spawn-rules.md` + `SKILL.md`

**What:** Modify `skills/subagent-driven-development/references/spawn-rules.md`:
add a `Model` column to the existing `## Agent Cost Tiers` table, and add a
new subsection immediately after it (before `## Agent Capability Boundaries`):

```markdown
| Tier          | Examples                  | Model                                  | When to Use                                                                                 |
| ------------- | ------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| **FREE**      | —                         | n/a                                        | Built-in tool calls (bash, grep, file reads) — do these yourself, no agent needed           |
| **CHEAP**     | `explorer`, `researcher`  | haiku                                      | Read-only, narrow scope, clear output. Good for lookup tasks that would bloat your context  |
| **EXPENSIVE** | `coder`, `planner`        | sonnet (default) — see Model Selection     | Write-capable or high-context output. Justify carefully                                     |

### Model Selection for `coder` Dispatch

`coder`'s baseline model is sonnet. Override per-dispatch based on task
complexity — always pass the model explicitly; an omitted model silently
inherits the session's own model, which is often the most capable and most
expensive tier.

| Task complexity                                                     | Model  |
| ------------------------------------------------------------------- | ------ |
| Mechanical, 1-2 files, complete spec/code already in the task brief  | haiku  |
| Multi-file integration, pattern-matching, moderate judgment          | sonnet |
| Architecture-level judgment; the final whole-branch review          | opus   |

Turn count costs more than token price on multi-step work — the cheapest
tier routinely takes more turns to reach the same result, which can cost
more overall. Use sonnet as the floor for reviewers and for implementers
working from prose descriptions; reserve haiku for tasks whose brief already
contains the exact code to write.
```

Also modify `skills/subagent-driven-development/SKILL.md`: insert a new
`## Model Selection` section immediately after `## Parallel Spawning Rules`
(before `## Delegation Prompt Quality`):

```markdown
## Model Selection

Before dispatching any `coder` subagent, choose its model explicitly based on
task complexity — see `references/spawn-rules.md` → Model Selection for the
tiering table. Never omit the model on a dispatch call; an omitted model
inherits the session's own model, which defeats the point of tiering.
```

**Why:** Closes the "no model-tiering guidance for spawned agents" gap —
without this, every `coder` dispatch silently defaults to whatever model the
controlling session happens to be running.

**Files:**
- Modify: `skills/subagent-driven-development/references/spawn-rules.md`
- Modify: `skills/subagent-driven-development/SKILL.md`

**Gotchas:**
- Keep the existing `## Agent Capability Boundaries` and `## Spawn Decision
  Tree` sections in `spawn-rules.md` untouched — only the cost-tier table
  gains a column, and one new subsection is inserted after it.

**Dependencies:** None (touches different sections of the same two files as
Task 3, non-overlapping edit regions — can run in parallel with it)

---

### Task 5: gitignore, sync, version bump

**What:** Add `.condux/` to the root `.gitignore` (the ledger and
script-output scratch files must never be committed). Run
`scripts/sync.sh subagent-driven-development` to mirror the updated skill
into `dist/plugins/condux/skills/condux/subagent-driven-development/`. Bump
the `version` field in both `dist/plugins/condux/.claude-plugin/plugin.json`
and `dist/plugins/condux/.codex-plugin/plugin.json` — read the current value
first (another in-flight plan may have already incremented it) and bump the
minor version by one from whatever that current value is.

**Files:**
- Modify: `.gitignore`
- Modify: `dist/plugins/condux/.claude-plugin/plugin.json` (`version` field)
- Modify: `dist/plugins/condux/.codex-plugin/plugin.json` (`version` field)
- Sync (via `scripts/sync.sh`, never hand-edited):
  `dist/plugins/condux/skills/condux/subagent-driven-development/`

**Gotchas:**
- Never hand-edit anything under `dist/plugins/condux/skills/` — always go
  through `scripts/sync.sh`.
- Both plugin manifests need the same version value — check both before
  assuming they're already in sync (they've drifted in this repo's history
  before).

**Dependencies:** Task 3, Task 4
