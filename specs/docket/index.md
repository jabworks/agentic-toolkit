# Docket — Tech Spec

**Last updated:** 2026-08-05
**Commit:** cd70976 (design stage — pre-implementation)
**Status:** draft

File-based project backlog as a plugin bundle: two skills (`docket:record`,
`docket:groom`), a dependency-free CLI (`docket.mjs`) as the single source of
truth for mechanical ops, a thin stdio MCP wrapper, an HTML browser view, and
an agent-followable installer (`INSTALL.md` + `install.sh`) that doubles as
the toolkit's ease-of-install convention. Generalizes the terminus
BACKLOG.md conventions.

## Contents

- [decisions.md](decisions.md) — bundle-vs-skill, layout choice, MCP-vs-hook, naming, rejected alternatives
- [api.md](api.md) — CLI subcommand contract, MCP tools, installer contract
- [fields.md](fields.md) — the docket/ file grammar: item syntax, sections, docket.json schema
- [quirks.md](quirks.md) — id-space rules, legacy BACKLOG.md detection, ghost-work lesson, edge cases
- [implementation.md](implementation.md) — repo layout, sync/mirror surface, tests, phasing

## Changelog
- 2026-08-05 (0.1.1): trigger eval cases for record/groom landed
  (near-miss boundary prompts, quirks) — the preflight drift item is closed
- 2026-08-05 (preflight): drift decisions — no automated next_id repair flag
  (quirks), installer verifies the server once (api), trigger eval cases
  deferred to a follow-up (quirks)
- 2026-08-05: Initial spec from signed-off design (.condux/designs/2026-08-05-docket.md)
