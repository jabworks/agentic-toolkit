# Quirks

## Q1 — Immediate-children-only skill discovery

Spec clients never recurse below `skills/<child>/` — a nested tree fails
*silently* (plugin valid, zero skills). This is why the bundles had to
flatten; any future bundle must keep its skills at depth one.

## Q2 — Closed schemas, two severities

An unknown top-level field in plugin.json is reported-and-ignored, but any
other schema violation is **fatal** — the client rejects the whole plugin
without loading components. The generator emits only the closed field set
so there is nothing to reject.

## Q3 — Two MCP dialects in one plugin

Claude's `.mcp.json` (no `type`, `${CLAUDE_PLUGIN_ROOT}`) and the spec's
`mcp.json` (`type` required, `${PLUGIN_ROOT}`) ship side by side. Neither
host reads the other's file. Keep them in lockstep by hand when the server
path changes — both live in `plugins/docket/`.

## Q4 — Stray root plugin.json is inert on Claude — NOT on Codex

Claude Code reads `.claude-plugin/plugin.json` and ignores the root
manifest: `claude plugin validate --strict` passed with it present
(checked during implementation; re-check on Claude CLI updates).

**Codex is the opposite, and this shipped broken for a week.** Codex picks
its plugin loader by root-manifest *presence*. With the file on disk the
Agent Plugins loader takes the plugin, and that loader has no hooks support
at all — `.codex-plugin/plugin.json`'s `hooks` field is never read. So a
plugin that ships both loses every Codex hook, silently: the session still
prints `hook: SessionStart Completed` lines for *other* plugins, and
`~/.codex/config.toml`'s `[hooks.state]` keeps the stale trusted-hash
entries, so nothing looks wrong.

Every workaround is closed (Codex 0.149.0):

| Attempt | Result |
|---|---|
| `hooks` on the root manifest | *"ignoring unknown Agent Plugins manifest field"* |
| `extensions` | reads namespace `com.openai` only — keys `default_tools_approval_mode`, `enabled_tools`, `disabled_tools`, `tools`. No hooks slot |
| conventional `hooks/hooks.json` | also suppressed — condux ships one and it stayed dark |
| move manifest to `.cursor-plugin/plugin.json` | hooks return (Codex prefers `.codex-plugin/`), but it is a Cursor Plugin manifest, a different format |

Hence the invariant: a plugin ships a root `plugin.json` **or** declares
`hooks`, never both. `scripts/generate-agent-manifests.mjs` derives the
exclusion from the Codex manifest; `tests/agent-plugins.test.mjs` asserts
the coupling so a fourteenth plugin gaining hooks fails the build instead
of the field.

Debugging note: `[hooks.state]` entries prove only what was last
*approved*. Editing a hook's command string invalidates the hash and makes
Codex prompt — under `codex exec` that prompt hangs the run. Instrument the
hook's **script body** instead; that preserves the trusted command
identity.

## Q5 — Cursor detects format by manifest

"Cursor detects the format from the plugin manifest" — a root plugin.json
makes it an Agent Plugin; `.cursor-plugin/plugin.json` would make it a
Cursor Plugin. Never add both.
