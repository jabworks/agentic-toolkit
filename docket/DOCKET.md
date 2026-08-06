# AGENTIC-TOOLKIT DOCKET

**Open items only.** Closed items move to `archive/<year>.md` with their
verification records. The id space is shared across open and archive and ids
are never reused — a "#N" in a commit subject refers to these numbers (this
docket is the tracker). When an item ships: stamp it ✅ with the date and
verification status, then move the entry to the archive in the same action.
Stale open markers cost real sessions — closing means moving.

## Committed

## Someday

### 2. UNINSTALL.md — the removal half of the ease-of-install convention (2026-08-05)

Reverse path for the ease-of-install convention: agent-followable removal — drop the Codex config.toml table, remove the OpenCode json key (or restore the .bak backups), verify the registration is gone, report per host. Docket as reference implementation; generalizes to condux/concord alongside INSTALL.md.

### 4. Board cosmetic: hide the count chip on zero-count sections (2026-08-05)

Zero-count sections render an empty chip pill after the heading (`count || empty-string` still emits the span). One-line fix in docket-render.mjs. Seen at live verification 2026-08-05.

### 5. INSTALL.md adoption for condux and concord (2026-08-05)

Adopt the INSTALL.md ease-of-install convention (detect, register, verify, report) for the other complex plugins: condux (OpenCode npm story) and concord (Codex hooks). Docket server/INSTALL.md is the reference implementation.

#### Status 2026-08-06 — second payoff: it unblocks `--fix` in the doctors

The plugin doctors shipped (#1) with repair deliberately split: every broken probe prints its fix, but only `docket-doctor` can *perform* it, because `--fix` delegates to `server/install.sh` rather than reimplementing registration. `condux-doctor` and `concord-doctor` print their fix and stop — they have no installer to delegate to. Writing those installers is exactly this item, so it now buys the ease-of-install convention and the repair half of the health-check convention in one change. `concord-doctor` already names `references/install-codex-hook.sh` as the fix for an unwired host; that script is the seed of concord's INSTALL.md.

### 7. Spec MCP server — revisit when specs gain write-side invariants (2026-08-05)

Declined for now (2026-08-05): specs are read-mostly markdown — router lookup is ls + fuzzy match, agents read files natively, and a server would duplicate the file path every skill must keep anyway. Reconsider docket-style (thin MCP over a CLI) only if specs grow mutations worth guarding: enforced changelog stamps on drift decisions, cross-spec link integrity, or a host-enforced spec-before-plan gate.

## Loose threads
