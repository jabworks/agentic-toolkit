---
"@jabworks/condux": minor
---

OpenCode now enforces `/workflow` as the entry point, matching Claude Code and Codex.

Both other hosts get this from a `SessionStart` hook that injects
`skills/workflow/hooks/routing.md`. OpenCode has no equivalent hook, so until
now routing there fell back to catalog inference alone — the ~80% path the
hook exists to replace (docket #38).

The plugin's `config` hook now pushes `routing.md` onto `config.instructions`
instead. Verified empirically against a live OpenCode install (`opencode
debug config`, v1.14.48): a config-hook mutation to `instructions` reaches
the fully resolved config, the same mechanism already proven by this
package's `skills.paths` registration — unlike `tools`, which is folded into
`permission` before the hook runs and silently drops any hook-side mutation.

This is a deliberate cost tradeoff, not a free win: `SessionStart` fires once
per session start/clear/compact, but `instructions` is ambient — re-injected
every turn, permanently, in the same channel as the user's own AGENTS.md
(~390 tokens/turn for `routing.md`). Chosen anyway for routing-enforcement
parity with the other two hosts.

`condux-doctor`'s OpenCode probe now also checks that the installed package
ships `skills/workflow/hooks/routing.md`, so a broken install is reported as
broken instead of silently missing the enforcement.
