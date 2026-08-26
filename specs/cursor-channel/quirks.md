# Quirks

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Global installs may not load (vercel-labs/skills #421, open upstream) | installing globally via the CLI | medium | partial — live-verify on a real install, caveat the README |
| Q2 | Skills misfiled as Rules | the #421 path mismatch | low | yes — check the Skills panel specifically during verification |
| Q3 | `when_to_use` silently ignored | pointing Cursor at raw `skills/` | high | yes — the merged tree exists precisely for this |
| Q4 | `name` must match folder name | a rename that slips past | low | yes — guaranteed by `skill-invariants.test.mjs` |
| Q5 | WSL split-brain on "global" dirs | Cursor on Windows opening a WSL filesystem | medium | yes — project-level `.cursor/skills/` is the reliable path |
| Q6 | Cursor imports the Claude Code plugin ecosystem — including stale clones | the Customize panel's one-click Add | medium | partial — refresh the clone; prefer `dist/cursor/skills/` for triggering |
| Q7 | Host-feature gaps (absent by design) | expecting hooks or named agents on Cursor | low | yes — documented in the README compat row |

## Q1 — vercel-labs/skills #421 — global installs may not load (open upstream)

**Symptom:** a globally installed skill that Cursor never loads.
**Trigger:** installing globally via the CLI.
**Cause:** the CLI's README documents Cursor global installs to `~/.cursor/skills/`, but the shipped behavior writes `~/.agents/skills/` — and whether Cursor loads global skills from there is disputed (issue #421 says no; Cursor docs list the dir; a lone forum reply claims fixed by Cursor 2.6.19). Fix PR #464 unmerged as of 2026-08-14.
**Mitigation:** partial — live-verify on a real install and caveat the README row with whatever is observed. Do not build a workaround.

## Q2 — Skills misfiled as Rules

**Symptom:** skills surfacing in Cursor's Rules panel instead of Skills (community report, forum.cursor.com/t/152793; acknowledged by Cursor staff).
**Trigger:** skills installed to the wrong dir — a symptom of the #421 path mismatch.
**Cause:** the same path mismatch as Q1.
**Mitigation:** yes — check the Skills panel, not just "some panel", during verification.

## Q3 — `when_to_use` silently ignored

**Symptom:** a condux-style skill that looks loaded but only triggers on its (thin) `description` — invisible breakage: nothing errors.
**Trigger:** installing from raw top-level `skills/`.
**Cause:** Cursor's trigger logic never sees `when_to_use`.
**Mitigation:** yes — the merged tree (`dist/cursor/skills/`) exists precisely for this; never point Cursor docs at top-level `skills/`.

## Q4 — `name` must match folder name

**Symptom:** a skill Cursor refuses that every other host accepts.
**Trigger:** a rename that slips past review.
**Cause:** Cursor requires frontmatter `name` == skill folder name.
**Mitigation:** yes — already guaranteed by `skill-invariants.test.mjs` (name equals its dir); noted here because a violation would fail only on Cursor.

## Q5 — WSL split-brain

**Symptom:** a global install inside WSL invisible to Cursor.
**Trigger:** Cursor running on Windows while opening this WSL filesystem.
**Cause:** "global" dirs (`~/.cursor/`, `~/.agents/`) may resolve to the Windows home, not the WSL home.
**Mitigation:** yes — project-level `.cursor/skills/` in the repo is the reliable path here; verified live.

## Q6 — Cursor imports the Claude Code plugin ecosystem — including stale clones

**Symptom:** Cursor listing a marketplace pinned at a stale commit — observed 2026-08-14 at a 2026-06-30 commit still carrying the retired `plugin-foundry`.
**Trigger:** the Customize panel's one-click Add over the machine's Claude Code plugin installs (verified 2026-08-14: skills + MCP servers, run through the WSL environment).
**Cause:** Cursor reads the marketplace clone on its own side of a WSL split, and that clone updates only when that side's Claude Code fetches.
**Mitigation:** partial — refresh with `/plugin marketplace update jabworks-agentic-toolkit` in that side's Claude Code. And marketplace installs ship raw SKILL.md, so `when_to_use` triggers are invisible — fine for MCP-bearing plugins (docket), but `dist/cursor/skills/` stays the recommended path for skill triggering.

## Q7 — Host-feature gaps (absent by design)

**Symptom:** hooks or named agents expected and not found.
**Trigger:** bringing condux/plan-review expectations to Cursor.
**Cause:** no SessionStart hooks (condux routing falls back to catalog inference, ~80% in evals), no ExitPlanMode/Stop hooks (plan-review's capture is manual), no named agents.
**Mitigation:** yes — documented in the README compat row.
