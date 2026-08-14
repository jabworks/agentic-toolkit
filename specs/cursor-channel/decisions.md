# Decisions

## Own tree over reuse (2026-08-14)

`dist/cursor/skills/` is its own emitted tree, not a pointer at
`dist/opencode/skills/`, even though the transform is identical today.
Rationale: the repo's channel philosophy is one tree per channel — coupling
breaks the moment either host needs a host-specific tweak (Cursor's `paths` /
`disable-model-invocation`, or an OpenCode-only change). Cost is duplicated
generated dirs, already the accepted pattern for `dist/`.

Rejected alternatives:
- Reuse the opencode tree (channel coupling).
- Fold triggers into `description` at source (abandons the `when_to_use`
  convention; blows Claude's 500-char description / 1024-char frontmatter
  budgets).

## Shared builder, not a forked script

The fold transform (when_to_use → description, drop the field) is extracted
from `scripts/build-opencode.mjs` and both trees are emitted from one
builder run. One transform to test; drift between trees becomes impossible
until a host deliberately diverges.

## Docket installer gains a cursor target

Scope widened at design sign-off: `install.sh` learns `cursor`, writing the
stdio server entry into `~/.cursor/mcp.json` (global; project-level
`.cursor/mcp.json` is a documented manual snippet, not an installer target).
Documented in docket INSTALL.md. Docket plugin bumped 0.5.0 → 0.6.0 (minor:
new installer target).

## Host-feature gaps are documented, not built

Condux SessionStart routing hook, plan-review ExitPlanMode/Stop hooks, and
named agents have no Cursor surface. The README compat row states what
works, what degrades (routing falls back to catalog inference, ~80% in
evals), and what is absent.
