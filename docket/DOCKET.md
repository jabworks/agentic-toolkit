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

### 7. Spec MCP server — revisit when specs gain write-side invariants (2026-08-05)

Declined for now (2026-08-05): specs are read-mostly markdown — router lookup is ls + fuzzy match, agents read files natively, and a server would duplicate the file path every skill must keep anyway. Reconsider docket-style (thin MCP over a CLI) only if specs grow mutations worth guarding: enforced changelog stamps on drift decisions, cross-spec link integrity, or a host-enforced spec-before-plan gate.

### 9. INSTALL.md front door for condux — consolidate three scattered installers (split from #5, 2026-08-06) (2026-08-06)

condux is the larger half of #5, and the reason is not obvious from the parent
item: condux has no plugin-level installer, but it already ships two, buried
inside skills where no user would find them.

| existing | does |
|---|---|
| `skills/plan-review/references/install-codex-hook.sh` | merges the Stop hook into `hooks.json`, enables `features.hooks` |
| `skills/subagent-execution/references/install-codex-agents.mjs` | installs the four specialist agents for Codex |
| *(no script)* | OpenCode: add `plugin: ["@jabworks/condux"]` to `opencode.json` |

Per host:

- Claude Code — nothing to do; the plugin manifest registers the hooks. Report
  `skipped`.
- Codex — both scripts above, plus the experimental hooks feature flag.
- OpenCode — one JSON key.

So this is a **front door over three scattered mechanisms**, not a new
installer. That carries a design decision the concord half does not: whether
those two scripts get absorbed into one installer, wrapped by it, or left in
place and merely documented by INSTALL.md. Decide that before writing code —
absorbing them moves files two skills own, wrapping them keeps the duplication
but costs nothing, and documenting alone leaves the discovery problem half
solved.

Unblocks `condux-doctor --fix`, which today prints a repair it cannot perform.

## Loose threads
