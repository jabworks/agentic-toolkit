# Quirks

## Q1 — vercel-labs/skills #421 — global installs may not load (open upstream)

The CLI's README documents Cursor global installs to `~/.cursor/skills/`,
but the shipped behavior writes `~/.agents/skills/`; whether Cursor loads
global skills from there is disputed (issue #421 says no; Cursor docs list
the dir; a lone forum reply claims fixed by Cursor 2.6.19). Fix PR #464
unmerged as of 2026-08-14. Resolution: live-verify on a real install; caveat
the README row with whatever is observed. Do not build a workaround.

## Q2 — Skills misfiled as Rules

Community report (forum.cursor.com/t/152793): skills installed to the wrong
dir surfaced in Cursor's Rules panel instead of Skills. Symptom of the #421
path mismatch, acknowledged by Cursor staff. Check the Skills panel, not
just "some panel", during verification.

## Q3 — `when_to_use` silently ignored

Cursor's trigger logic never sees `when_to_use` — a condux-style skill
installed from raw `skills/` looks loaded but only triggers on its (thin)
`description`. This is invisible breakage: nothing errors. The merged tree
exists precisely for this; never point Cursor docs at top-level `skills/`.

## Q4 — `name` must match folder name

Cursor requires frontmatter `name` == skill folder name. Already guaranteed
by `skill-invariants.test.mjs` (name equals its dir) — noted here because a
rename that slips past would fail only on Cursor.

## Q5 — WSL split-brain

Cursor runs on Windows opening this WSL filesystem. "Global" dirs
(`~/.cursor/`, `~/.agents/`) may resolve to the Windows home, not the WSL
home — a global install inside WSL can be invisible to Cursor. Project-level
`.cursor/skills/` in the repo is the reliable path here; verified live.

## Q6 — Cursor imports the Claude Code plugin ecosystem — including stale clones

Verified 2026-08-14: Cursor auto-surfaces the machine's Claude Code plugin
installs (skills + MCP servers, run through the WSL environment) and lists
registered plugin *marketplaces* in its Customize panel with one-click Add.
Two catches: (1) it reads the marketplace clone on its own side of a WSL
split — observed pinned at a 2026-06-30 commit still carrying the retired
`plugin-foundry`; refresh with `/plugin marketplace update
jabworks-agentic-toolkit` in that side's Claude Code. (2) Marketplace
installs ship raw SKILL.md, so `when_to_use` triggers are invisible — fine
for MCP-bearing plugins (docket), but `dist/cursor/skills/` stays the
recommended path for skill triggering.

## Q7 — Host-feature gaps (absent by design)

No SessionStart hooks (condux routing falls back to catalog inference, ~80%
in evals), no ExitPlanMode/Stop hooks (plan-review's capture is manual), no
named agents. Documented in the README compat row.
