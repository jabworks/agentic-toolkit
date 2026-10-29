# Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Flatten bundle skills to `skills/<skill>/`, don't fork a parallel tree | spec discovery never recurses; one tree per plugin stays the invariant and both hosts accept `"./skills"` | accepted |
| 2 | Root `plugin.json` is generated from the Claude manifest, never hand-written | registration data has one declared source; a hand-edited third manifest would drift | accepted |
| 3 | Minor bump, all 11 plugins | a new distribution surface with no behavior change on existing hosts is a feature, not a fix | accepted |
| 4 | Hook-carrying plugins (condux, concord) get no root manifest | a root manifest routes Codex through the Agent Plugins loader, which has no hooks — conformance and Codex hooks are mutually exclusive per plugin | accepted |
| 5 | Docket ships spec `mcp.json` alongside Claude's `.mcp.json` | different consumers use different variable grammars; two small files beat one neither host fully accepts | accepted |

## 1. Flatten bundle skills, don't fork a parallel tree — 2026-08-14

**Decided:** the existing `dist/plugins/<bundle>/skills/<bundle>/<skill>/` nesting flattens to `skills/<skill>/`.
**Because:** the spec discovers skills only as immediate children of `skills/`, with no recursion and no manifest override — and one tree per plugin stays the invariant, since Claude/Codex both accept a `skills` path that is a directory of skill dirs (`"./skills"`).

| Alternative | Why not |
|---|---|
| Emit a second spec-shaped tree per bundle | Doubles every mirror guard for a nesting that never carried meaning — it was an artifact of the pre-composition sync routing |

## 2. Root plugin.json is generated, never hand-written

**Decided:** derived from `.claude-plugin/plugin.json` (the richer manifest), emitting only the spec's closed field set.
**Because:** the same doctrine as marketplace.json and the doc catalogs — registration data has one declared source; a hand-edited third manifest would drift the way the pre-composition dist dirs did.

## 3. Minor bump, all 11 plugins

**Decided:** every conforming plugin takes a minor version bump. Ratified at design sign-off 2026-08-14.
**Because:** spec conformance is a new distribution surface (Cursor plugin loading, any spec client) with no behavior change on existing hosts — feature, not fix.

## 4. Hook-carrying plugins get no root manifest — 2026-08-21

**Decided:** condux and concord are excluded from generation. The exclusion is *derived, not declared*: the generator reads `hooks` from the Codex manifest rather than taking a flag in composition.json, so the fact has one home and the two cannot disagree.
**Because:** Codex loads any plugin with a root `plugin.json` through the Agent Plugins loader, which has no hooks — so conformance and Codex hooks are mutually exclusive per plugin (see [quirks.md](quirks.md) for the closed workarounds). Hooks win for these two: they are condux's routing injection and the whole of concord.

| Alternative | Why not |
|---|---|
| Swap the root manifest for `.cursor-plugin/plugin.json` | Restores hooks (verified) and keeps Cursor's plugin path, but needs a second manifest format in the generator and a Windows Cursor test — cost without a consumer asking for it. Revisit if a spec client other than Cursor matters |

**Consequences**
- Cursor still gets both plugins through `dist/cursor/skills/`, which this spec's own verification records as the *better* channel — the plugin path shows raw `description` text with `when_to_use` invisible (claim 5). What is given up is a plugin-path install in Cursor and in any non-Cursor spec client, for two of thirteen plugins.
- **Minor bump, mirroring the addition** — condux 2.20.0, concord 0.6.0. Decision 3 rated *adding* the surface a minor; withdrawing it for two plugins is its symmetric counterpart. Deliberately not major: the retired-skill rule treats an install surface disappearing as breaking, but that rule is about a *skill* vanishing from an install, and no capability is lost here on any channel that carries users. Not a patch either: `README.md` documented the plugin-path install and its verification table claimed it worked for every plugin, so this is a change to the published install surface, not an internal fix.

## 5. Docket mcp.json alongside .mcp.json, not replacing it

**Decided:** both files ship, sourced from `plugins/docket/`.
**Because:** Claude Code reads `.mcp.json` with `${CLAUDE_PLUGIN_ROOT}`; the spec reads `mcp.json` with `${PLUGIN_ROOT}` — different consumers, different variable grammars, and two small files beat one file that neither host fully accepts.

## 6. Fold `when_to_use` into `description` in every `dist/plugins` tree — 2026-10-29

**Decided:** `sync.sh` byte-copies each skill tree into `dist/plugins/`, then folds the top-level `SKILL.md` with the `build-opencode.mjs` transform, for every host. The byte-equality checks compare against `fold(source)`. A folded `description` stays within 1024 chars. Source `skills/` keeps the split fields and the 500-char cap.
**Because:** Codex never shows the model `when_to_use` (docket #115, probed on codex-cli 0.163), and 11 of 13 plugins load through the Agent Plugins loader, which discovers `skills/` by convention with no path override (Q1, Q2). A Codex-only tree is therefore unreachable for most plugins. Claude Code already appends `when_to_use` to `description` in its skill listing, under one combined cap, so folding changes only what Codex sees. Cursor's plugin path, which also hides `when_to_use` (decision 4's consequences), gains the trigger text for free.

| Alternative | Why not |
|---|---|
| Folded `skills/` plus an unfolded `claude-skills/` for Claude | Doubles every plugin to preserve a field split Claude Code does not use |
| Drop root `plugin.json` so Codex manifests can set a skills path | Undoes this spec's conformance, and decision 4's invariant returns the moment a plugin gains hooks |
| Fold in source `skills/` | 24 of 28 skills exceed the 500-char cap once folded, so trigger wording measured at ~93% would have to change |

**Consequences**
- `dist/` is no longer a verbatim mirror of `skills/`. It is a mirror through the fold, as the OpenCode and Cursor trees already are.
- Patch bump for every plugin whose `dist/` tree changes. Skills behave the same; only Codex's view of them is fixed.
- The `npx skills add` channel still serves `skills/` raw, so Codex users on it still lose `when_to_use`. That is a separate docket item.
