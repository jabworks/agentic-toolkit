# Plugin doctor — Probe matrix

What each probe reads, what it executes, and what maps to which status.

## condux (`condux-doctor`)

| Host | Reads | Executes | `done` when | `broken` when |
|---|---|---|---|---|
| claude | `hooks/hooks.json` | `node hooks/session-start.mjs --claude` | JSON parses, a `SessionStart` command is declared, script emits Claude's `hookSpecificOutput` wire format with non-empty context | JSON unparseable, `${CLAUDE_PLUGIN_ROOT}` path unresolvable, the manifest uses the other host's root variable, script errors or emits nothing |
| codex | `hooks/codex-hooks.json` | `node hooks/session-start.mjs --codex` | JSON parses, both hook entries present, script emits Codex's wire format, `annotate-server.js` resolves on disk | either hook path unresolvable, wrong root variable, script errors |
| opencode | `opencode.json`, a local copy of `@jabworks/condux` if present | `node --check` on the package entry point — the `config` hook is never invoked | registered in the plugin array, and any local copy ships its `agents/` and `skills/` and parses | a local copy missing either bundled directory, or an entry point that does not parse. Registered with no local copy is `absent`: OpenCode fetches at startup |
| all | `plugin.json`, `installed_plugins.json`, marketplace clone | — | installed version ≥ marketplace version | installed version older than marketplace |

## concord (`concord-doctor`)

| Host | Reads | Executes | `done` when | `broken` when |
|---|---|---|---|---|
| claude | `plugin.json` | — | plugin installed (`skipped` in practice — concord registers no Claude hooks) | manifest missing or unparseable |
| codex | `~/.codex/hooks.json` (what the installer writes), `~/.codex/config.toml`, the plugin's `codex-hooks.json` | no hook is ever run — `node --check` on both bin scripts and a module load of `lib/paths.mjs` (see quirks.md) | all three events registered at resolvable paths, `features.hooks` enabled, both scripts parse, the library loads | an event missing or pointing at a stale path, hooks disabled in config, a script that does not parse |
| opencode | — | — | `skipped` — concord is Codex-only by design | never |
| all | as condux | — | as condux | as condux |

## docket (`docket-doctor`)

| Host | Reads | Executes | `done` when | `broken` when |
|---|---|---|---|---|
| claude | `.mcp.json` | `initialize` round-trip into `server/mcp-server.mjs` | `${CLAUDE_PLUGIN_ROOT}` resolves and the response contains `"name":"docket"` | file missing, path unresolvable, or the round-trip returns anything else |
| codex | `~/.codex/config.toml` → `[mcp_servers.docket]` | same round-trip against the registered `args` path | table present and its path answers | table present but path stale or non-answering |
| opencode | `opencode.json` → `mcp.docket` | same round-trip against the registered command path | key present, `enabled: true`, path answers | key present but disabled or non-answering |
| all | as condux, plus `server/docket.mjs` | `node server/docket.mjs --help` | the rung-2 CLI fallback resolves from the skill base *in this tree* (see quirks.md) | it does not |

## One row per probe

Each host probe returns exactly one row, so there is no precedence rule to
apply — a probe that finds several things wrong reports the first thing that
would stop the plugin working, with the fix for it. Shared probes (the CLI
fallback, the agents mirror, the memory store, version) report under `all`.

Superseded: an earlier draft specified a worst-status-wins combiner across
multiple rows per host. Nothing produces multiple rows per host, so the rule
had nothing to combine.
