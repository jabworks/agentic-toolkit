# Plan: Workflow Continuity — Artifact Checks + Plan-Review Terminal Step

> Date: 2026-07-01
> Design: docs/plans/2026-07-01-condux-hardening-design.md (workstreams 3 & 4)

## Goal

Make `brainstorm`, `write-plan`, and `finalize` self-sufficient about
continuity regardless of whether `/workflow` drove them, and make
`plan-review` a standing offer after `write-plan` saves — not an easily
missed CP-1 menu item.

## Approach

Cheap artifact-existence checks (glob `docs/plans/`/`specs/` for the
inferred feature slug) instead of a new ledger or state file — same soft-gate
style condux already uses elsewhere (ask, never block). `write-plan` gains a
standing terminal step offering `plan-review` via `annotate-server.js
--steer`; `/workflow`'s CP-1 menu drops its now-redundant "review in browser"
option since the decision is resolved earlier by `write-plan` itself.

## Files Affected

- `skills/brainstorm/SKILL.md`
- `skills/write-plan/SKILL.md`
- `skills/finalize/SKILL.md`
- `skills/workflow/SKILL.md`
- `dist/plugins/condux/.claude-plugin/plugin.json`,
  `dist/plugins/condux/.codex-plugin/plugin.json` — version bump
- `README.md` (conditional)

## Tasks

- [ ] Task 1: `brainstorm` — existing-design check
- [ ] Task 2: `write-plan` — existing-plan check + plan-review terminal step
- [ ] Task 3: `finalize` — informational continuity note
- [ ] Task 4: `workflow` — CP-1 menu adjustment
- [ ] Task 5: sync, version bump, README

---

### Task 1: `brainstorm` — existing-design check

**What:** Modify `skills/brainstorm/SKILL.md` — immediately after the `##
How It Works` heading, before the diagram's opening fence, insert:

```markdown
Before Step 1, check for an existing design: glob `docs/plans/*<slug>*-design.md`
and `specs/<slug>/` (slug = kebab-case of the feature name). If either
exists, offer: "Found an existing design for this feature at `<path>` —
resume from there, or start a fresh brainstorm?" Accept either answer, same
as any other soft gate in this skill.
```

**Why:** Closes the gap where invoking `/brainstorm` directly (bypassing
`/workflow`) has no way to know a design already exists for the same
feature, other than the model's own memory of the conversation — which
doesn't survive compaction or a new session.

**Files:**
- Modify: `skills/brainstorm/SKILL.md`

**Gotchas:**
- Don't touch the ASCII-art diagram itself — insert as prose immediately
  before its opening fence, so box alignment stays intact.

**Dependencies:** None

---

### Task 2: `write-plan` — existing-plan check + plan-review terminal step

**What:** Modify `skills/write-plan/SKILL.md` in two places.

1. In `## Before Writing`, replace item 1 —

   currently:
   ```
   1. Confirm brainstorm has run and design is signed off.
      If not: "We haven't aligned on the design yet — run /brainstorm first, or confirm you want to skip it."
   ```

   with:
   ```
   1. Confirm brainstorm has run and design is signed off. First glob
      `docs/plans/*<slug>*-design.md` and `specs/<slug>/` (slug = kebab-case
      of the feature name) for an existing signed-off design — if found,
      treat this check as satisfied without asking. Otherwise ask: "We
      haven't aligned on the design yet — run /brainstorm first, or confirm
      you want to skip it."
   ```

2. Add a new `## After Saving` section immediately after the existing `##
   Save Paths` section (before `## Plan Failures — Never Write These`):

   ```markdown
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
   ```

**Why:** Item 1 closes the same continuity gap as Task 1, applied to
`write-plan`'s own precondition check. The `## After Saving` section closes
the more specific gap identified this session — `write-plan` never mentioned
`plan-review` at all, so review only ever happened by accident (native
`ExitPlanMode` hook) or by explicit request via `/workflow`'s CP-1 menu,
never as a standing offer.

**Files:**
- Modify: `skills/write-plan/SKILL.md`

**Gotchas:**
- The steer-mode server needs an absolute path to `annotate-server.js` —
  locate it the same way `plan-review`'s own `SKILL.md` documents for
  standalone use; don't hardcode a relative path that assumes a specific
  install layout.
- Default port `7777` is fixed by `annotate-server.js` itself — don't invent
  a different default in this text.
- This section governs `write-plan`'s own output specifically (LARGE tier
  docs) — it must not be duplicated or referenced from `/workflow`'s
  MEDIUM-tier inline-plan step, which stays untouched (see Task 4 for the
  corresponding `/workflow` change).

**Dependencies:** None (independent of Task 1 — different file)

---

### Task 3: `finalize` — informational continuity note

**What:** Modify `skills/finalize/SKILL.md`:

1. Add one sentence to `## Before Running` (after the existing
   `AGENTS.md`-lookup sentence): "If no `docs/plans/*<slug>*.md` exists for
   the inferred feature slug, note it in the output below — don't block.
   This is informational only, surfacing when a task ran without going
   through `/workflow` or `/write-plan`, not a gate."

2. Add one conditional line to the `## Output Format` success example
   (after the `Tests` line, before `Ready to commit.`):
   ```
   Plan       (none found for this task — treating as standalone scope)
   ```
   Note in prose immediately above the example that this line only appears
   when no matching plan doc was found — it's omitted entirely otherwise.

**Why:** The weakest, most informational tier of the continuity fix — it
doesn't block or ask anything, it just makes visible, at the one point every
tier's flow converges, when a task reached the end without an established
plan/tier context.

**Files:**
- Modify: `skills/finalize/SKILL.md`

**Gotchas:**
- Must stay purely informational — do not turn this into a question or a
  gate; `finalize`'s whole design principle is "run once, stop only on real
  failures."

**Dependencies:** None

---

### Task 4: `workflow` — CP-1 menu adjustment

**What:** Modify `skills/workflow/SKILL.md`'s `### CP-1 — Plan ready`
section:

1. Add one sentence immediately above the CP-1 table: "Plan review already
   happened (or was declined) as part of `write-plan`'s own save step —
   this menu doesn't re-offer it."

2. Remove the row `| **Review the plan in the browser** | Load plan-review;
   annotate the plan inline before any code |` from the table, leaving:

   ```markdown
   | Option | What it does |
   | --- | --- |
   | **Start implementing** *(recommended)* | Implement the plan top-to-bottom yourself |
   | **Spawn specialist agents** | Load `subagent-driven-development`; deploy explorer/researcher/coder for parallel exploration or a large plan |
   | **Revise the plan** | Loop back to `write-plan` with the new direction |
   ```

**Why:** Removes the now-redundant menu option — CP-1 previously offered
plan-review as one of four choices; now that `write-plan` always asks first
(Task 2), keeping the option here would prompt the user twice for the same
decision.

**Files:**
- Modify: `skills/workflow/SKILL.md`

**Gotchas:**
- This table is a plain markdown table under `### CP-1`, not inside the
  ASCII-art `## How It Works` diagram — this edit is a normal table-row
  removal, not a diagram edit.
- Leave `## Tips` item 4 ("Review is separate: after /finalize, run
  /code-review...") untouched — it refers to `code-review`, not
  `plan-review`, and doesn't conflict with this change.

**Dependencies:** Task 2 (this only makes sense once `write-plan` actually
offers plan-review itself)

---

### Task 5: sync, version bump, README

**What:** Run `scripts/sync.sh brainstorm`, `scripts/sync.sh write-plan`,
`scripts/sync.sh finalize`, and `scripts/sync.sh workflow` to mirror all four
updated skills into `dist/plugins/condux/skills/condux/<name>/`. Bump the
`version` field in `dist/plugins/condux/.claude-plugin/plugin.json` and
`dist/plugins/condux/.codex-plugin/plugin.json` — read the current value
first (another in-flight plan may have already incremented it) and bump the
minor version by one from whatever that current value is. Read the
`README.md` condux table rows for `/write-plan` and `/workflow` and update
their one-line descriptions only if the current wording no longer reflects
the new behavior.

**Files:**
- Sync (via `scripts/sync.sh`, never hand-edited):
  `dist/plugins/condux/skills/condux/{brainstorm,write-plan,finalize,workflow}/`
- Modify: `dist/plugins/condux/.claude-plugin/plugin.json`,
  `dist/plugins/condux/.codex-plugin/plugin.json` (`version` field)
- Modify (conditionally): `README.md`

**Gotchas:**
- Never hand-edit anything under `dist/plugins/condux/skills/`.
- Check both plugin manifests for the current version before bumping —
  don't assume it's still `1.8.0` if `sdd-mechanics` or `ci-hardening`
  already landed first.

**Dependencies:** Task 1, Task 2, Task 3, Task 4
