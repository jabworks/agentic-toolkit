# Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Flatten bundle skills to `skills/<skill>/`, don't fork a parallel tree | spec discovery never recurses; one tree per plugin stays the invariant and both hosts accept `"./skills"` | accepted |
| 2 | Root `plugin.json` is generated from the Claude manifest, never hand-written | registration data has one declared source; a hand-edited third manifest would drift | accepted |
| 3 | Minor bump, all 11 plugins | a new distribution surface with no behavior change on existing hosts is a feature, not a fix | accepted |
| 4 | Hook-carrying plugins (condux, concord) get no root manifest | a root manifest routes Codex through the Agent Plugins loader, which has no hooks — conformance and Codex hooks are mutually exclusive per plugin | accepted |
| 5 | Docket ships spec `mcp.json` alongside Claude's `.mcp.json` | different consumers use different variable grammars; two small files beat one neither host fully accepts | accepted |

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

## Hook-carrying plugins get no root manifest (2026-08-21)

condux and concord are excluded from generation. Codex loads any plugin
with a root `plugin.json` through the Agent Plugins loader, which has no
hooks — so conformance and Codex hooks are mutually exclusive per plugin
(see [quirks.md](quirks.md) for the closed workarounds).

Hooks win for these two. They are condux's routing injection and the whole
of concord; Cursor still gets both through `dist/cursor/skills/`, which
this spec's own verification records as the *better* channel — the plugin
path shows raw `description` text with `when_to_use` invisible (claim 5).
What is given up is a plugin-path install in Cursor and in any
non-Cursor spec client, for two of thirteen plugins.

Rejected: swapping the root manifest for `.cursor-plugin/plugin.json`.
It restores hooks (verified) and keeps Cursor's plugin path, but needs a
second manifest format in the generator and a Windows Cursor test — cost
without a consumer asking for it. Revisit if a spec client other than
Cursor matters.

Derived, not declared: the generator reads `hooks` from the Codex manifest
rather than taking a flag in composition.json. The fact has one home, so
the two cannot disagree.

**Minor bump, mirroring the addition** — condux 2.20.0, concord 0.6.0.
"Minor bump, all 11 plugins" above rated *adding* the surface a minor;
withdrawing it for two plugins is its symmetric counterpart. Deliberately
not major: the retired-skill rule treats an install surface disappearing as
breaking, but that rule is about a *skill* vanishing from an install, and
no capability is lost here on any channel that carries users — Cursor keeps
both plugins through `dist/cursor/skills/`. What goes is one install route.
Not a patch either: `README.md` documented the plugin-path install and its
verification table claimed it worked for every plugin, so this is a change
to the published install surface, not an internal fix.

## Docket mcp.json alongside .mcp.json, not replacing it

Claude Code reads `.mcp.json` with `${CLAUDE_PLUGIN_ROOT}`; the spec reads
`mcp.json` with `${PLUGIN_ROOT}`. Different consumers, different variable
grammars — two small files beat one file that neither host fully accepts.
Both sourced from `plugins/docket/`.
