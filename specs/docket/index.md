# Docket — Tech Spec

**Last updated:** 2026-08-24
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
- [design.md](design.md) — the signed-off design this spec was written from (2026-08-05)
- [board-direction-a.html](board-direction-a.html) — the signed-off board render (2026-08-21, docket #45)

## Changelog
- 2026-08-25: `mdLite()` gains pipe tables (docket #43). Detection is by
  lookahead to a delimiter row, so prose containing pipes still renders as the
  paragraph it always did; escaped `\|` stays cell content; ragged rows pad
  rather than truncate. Wrapped in `.tbl` so a ~450px card scrolls the table
  instead of stretching, with the board's first table styling. docket 0.11.0.
- 2026-08-24: fix docket #47 — `displayTitle`'s trailing-date strip is anchored
  to the string end, so `close()`'s appended `— ✅ DONE <date>` stamp defeated
  it on every archived item, not only the duplicate-stamp case that surfaced
  it. Fix is positional (strip a date group only when it sits immediately
  before the close stamp), and `add` now refuses a title that already ends in
  a date stamp rather than doubling it up on write (fields, quirks)
- 2026-08-21 (preflight): drift decisions — `.board` is a div inside `<main>`,
  archive is one closed drawer, not per-year blocks (quirks)
- 2026-08-21: board redesign (docket #45) — columns, read-only, title + lede
  with fold, archive drawer (decisions, quirks, fields, implementation)
- 2026-08-05 (0.1.1): trigger eval cases for record/groom landed
  (near-miss boundary prompts, quirks) — the preflight drift item is closed
- 2026-08-05 (preflight): drift decisions — no automated next_id repair flag
  (quirks), installer verifies the server once (api), trigger eval cases
  deferred to a follow-up (quirks)
- 2026-08-05: Initial spec from signed-off design ([design.md](design.md))
