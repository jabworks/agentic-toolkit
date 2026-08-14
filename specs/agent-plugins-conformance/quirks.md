# Quirks

## Immediate-children-only skill discovery

Spec clients never recurse below `skills/<child>/` — a nested tree fails
*silently* (plugin valid, zero skills). This is why the bundles had to
flatten; any future bundle must keep its skills at depth one.

## Closed schemas, two severities

An unknown top-level field in plugin.json is reported-and-ignored, but any
other schema violation is **fatal** — the client rejects the whole plugin
without loading components. The generator emits only the closed field set
so there is nothing to reject.

## Two MCP dialects in one plugin

Claude's `.mcp.json` (no `type`, `${CLAUDE_PLUGIN_ROOT}`) and the spec's
`mcp.json` (`type` required, `${PLUGIN_ROOT}`) ship side by side. Neither
host reads the other's file. Keep them in lockstep by hand when the server
path changes — both live in `plugins/docket/`.

## Stray root plugin.json on Claude/Codex

Claude Code reads `.claude-plugin/plugin.json`, Codex `.codex-plugin/` —
the generated root manifest is inert on both. `claude plugin validate
--strict` passed with it present (checked during implementation; re-check
on Claude CLI updates).

## Cursor detects format by manifest

"Cursor detects the format from the plugin manifest" — a root plugin.json
makes it an Agent Plugin; `.cursor-plugin/plugin.json` would make it a
Cursor Plugin. Never add both.
