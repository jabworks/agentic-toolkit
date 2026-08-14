# Decisions

## Flatten bundle skills, don't fork a parallel tree (2026-08-14)

The spec discovers skills only as immediate children of `skills/`, with no
recursion and no manifest override. Options were: flatten the existing
`dist/plugins/<bundle>/skills/<bundle>/<skill>/` nesting to
`skills/<skill>/`, or emit a second spec-shaped tree per bundle. Flattening
wins: one tree per plugin stays the invariant, Claude/Codex both accept a
`skills` path that is a directory of skill dirs (`"./skills"`), and a
second tree would double every mirror guard. The nesting never carried
meaning — it was an artifact of the pre-composition sync routing.

## Root plugin.json is generated, never hand-written

Derived from `.claude-plugin/plugin.json` (the richer manifest), emitting
only the spec's closed field set. Same doctrine as marketplace.json and the
doc catalogs: registration data has one declared source; a hand-edited
third manifest would drift the way the pre-composition dist dirs did.

## Minor bump, all 11 plugins

Spec conformance is a new distribution surface (Cursor plugin loading, any
spec client) with no behavior change on existing hosts — feature, not fix.
Ratified at design sign-off 2026-08-14.

## Docket mcp.json alongside .mcp.json, not replacing it

Claude Code reads `.mcp.json` with `${CLAUDE_PLUGIN_ROOT}`; the spec reads
`mcp.json` with `${PLUGIN_ROOT}`. Different consumers, different variable
grammars — two small files beat one file that neither host fully accepts.
Both sourced from `plugins/docket/`.
