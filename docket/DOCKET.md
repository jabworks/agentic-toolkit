# AGENTIC-TOOLKIT DOCKET

**Open items only.** Closed items move to `archive/<year>.md` with their
verification records. The id space is shared across open and archive and ids
are never reused — a "#N" in a commit subject refers to these numbers (this
docket is the tracker). When an item ships: stamp it ✅ with the date and
verification status, then move the entry to the archive in the same action.
Stale open markers cost real sessions — closing means moving.

## Committed

## Someday

### 1. Plugin doctor — verify condux/concord/docket work on the installed harness (2026-08-05)

Per-harness health check for the shipped plugins (condux, concord, docket): does the condux SessionStart hook actually fire on this host, are concord rollout-sync hooks wired, does the docket MCP server answer an initialize round-trip, do the manifests the installed host reads parse, do installed versions match the marketplace. Shape: detect host, probe each registration, report done/broken/absent per plugin — the standing version of the INSTALL.md verify step. Precedents: ctx doctor, remember:doctor. Origin: idea recalled 2026-08-05 after shipping docket.

### 2. UNINSTALL.md — the removal half of the ease-of-install convention (2026-08-05)

Reverse path for the ease-of-install convention: agent-followable removal — drop the Codex config.toml table, remove the OpenCode json key (or restore the .bak backups), verify the registration is gone, report per host. Docket as reference implementation; generalizes to condux/concord alongside INSTALL.md.

### 4. Board cosmetic: hide the count chip on zero-count sections (2026-08-05)

Zero-count sections render an empty chip pill after the heading (`count || empty-string` still emits the span). One-line fix in docket-render.mjs. Seen at live verification 2026-08-05.

### 5. INSTALL.md adoption for condux and concord (2026-08-05)

Adopt the INSTALL.md ease-of-install convention (detect, register, verify, report) for the other complex plugins: condux (OpenCode npm story) and concord (Codex hooks). Docket server/INSTALL.md is the reference implementation.

## Loose threads
