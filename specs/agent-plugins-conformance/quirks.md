# Quirks

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Skill discovery never recurses — nesting fails silently | a bundle with skills below depth one | high | yes — bundles flattened; depth-one asserted by test |
| Q2 | Closed schemas, two severities | an unknown field vs any other schema violation | medium | yes — the generator emits only the closed field set |
| Q3 | Two MCP dialects in one plugin | a docket server path change | medium | no — kept in lockstep by hand |
| Q4 | A root plugin.json silently kills every Codex hook | shipping a root manifest beside `hooks` | high | yes — the or-invariant, generator-derived and test-asserted |
| Q5 | Cursor detects format by manifest | adding both root and `.cursor-plugin` manifests | medium | yes — never add both |

## Q1 — Immediate-children-only skill discovery

**Symptom:** a plugin that validates and loads with zero skills.
**Trigger:** a bundle keeping skills below `skills/<child>/` depth one.
**Cause:** spec clients never recurse below the immediate children of `skills/`, and there is no manifest override — the failure is silent.
**Mitigation:** yes — this is why the bundles had to flatten; any future bundle must keep its skills at depth one (asserted by `tests/agent-plugins.test.mjs`).

## Q2 — Closed schemas, two severities

**Symptom:** a whole plugin rejected without loading components.
**Trigger:** any schema violation other than an unknown top-level field (which is merely reported-and-ignored).
**Cause:** the spec's schema is closed, and violations beyond unknown fields are fatal to the client.
**Mitigation:** yes — the generator emits only the closed field set, so there is nothing to reject.

## Q3 — Two MCP dialects in one plugin

**Symptom:** one of the two MCP files silently stale after a server path change.
**Trigger:** changing docket's server path.
**Cause:** Claude's `.mcp.json` (no `type`, `${CLAUDE_PLUGIN_ROOT}`) and the spec's `mcp.json` (`type` required, `${PLUGIN_ROOT}`) ship side by side, and neither host reads the other's file.
**Mitigation:** no — keep them in lockstep by hand when the server path changes; both live in `plugins/docket/`.

## Q4 — Stray root plugin.json is inert on Claude — NOT on Codex

**Symptom:** every Codex hook of the plugin silently dead, while nothing looks wrong: the session still prints `hook: SessionStart Completed` lines for *other* plugins, and `~/.codex/config.toml`'s `[hooks.state]` keeps the stale trusted-hash entries. This shipped broken for a week.
**Trigger:** a plugin shipping both a root `plugin.json` and `hooks` in `.codex-plugin/plugin.json`.
**Cause:** Codex picks its plugin loader by root-manifest *presence*. With the file on disk the Agent Plugins loader takes the plugin, and that loader has no hooks support at all — the Codex manifest's `hooks` field is never read. Claude Code is the opposite: it reads `.claude-plugin/plugin.json` and ignores the root manifest (`claude plugin validate --strict` passed with it present; checked during implementation, re-check on Claude CLI updates).
**Mitigation:** yes — the invariant: a plugin ships a root `plugin.json` **or** declares `hooks`, never both. `scripts/generate-agent-manifests.mjs` derives the exclusion from the Codex manifest; `tests/agent-plugins.test.mjs` asserts the coupling so a fourteenth plugin gaining hooks fails the build instead of the field.
**Upstream:** [openai/codex#39895](https://github.com/openai/codex/issues/39895), filed 2026-08-21. Still open and unfixed as of 2026-10-28 (codex-cli 0.165.0): no linked Codex PR or commit, no release note between 0.147 and 0.165, and the latest comment reproduces it on 0.154. The other cross-references are plugin authors dropping their root manifests. Re-check here before relaxing the invariant.

Every workaround is closed (Codex 0.149.0):

| Attempt | Result |
|---|---|
| `hooks` on the root manifest | *"ignoring unknown Agent Plugins manifest field"* |
| `extensions` | reads namespace `com.openai` only — keys `default_tools_approval_mode`, `enabled_tools`, `disabled_tools`, `tools`. No hooks slot |
| conventional `hooks/hooks.json` | also suppressed — condux ships one and it stayed dark |
| move manifest to `.cursor-plugin/plugin.json` | hooks return (Codex prefers `.codex-plugin/`), but it is a Cursor Plugin manifest, a different format |

Debugging note: `[hooks.state]` entries prove only what was last *approved*. Editing a hook's command string invalidates the hash and makes Codex prompt — under `codex exec` that prompt hangs the run. Instrument the hook's **script body** instead; that preserves the trusted command identity.

## Q5 — Cursor detects format by manifest

**Symptom:** a plugin read as the wrong format.
**Trigger:** adding both a root `plugin.json` and a `.cursor-plugin/plugin.json`.
**Cause:** Cursor detects the format from the plugin manifest — a root plugin.json makes it an Agent Plugin; `.cursor-plugin/plugin.json` would make it a Cursor Plugin.
**Mitigation:** yes — never add both.

## Q6 — Codex ignores `when_to_use`

**Symptom:** a skill whose trigger phrases live in `when_to_use` never fires on Codex, though it routes fine on Claude Code.
**Trigger:** any SKILL.md that splits its trigger contract between `description` and `when_to_use`, as 28 toolkit skills do.
**Cause:** Codex builds its skill list from `description` alone. Probed on codex-cli 0.163 (docket #115) with a scratch skill carrying a separate marker in each field: the description's marker was quoted word for word, and the `when_to_use` marker was reported not present. Claude Code is the opposite: its docs say `when_to_use` is "Appended to `description` in the skill listing and counts toward the 1,536-character cap" (code.claude.com/docs/en/skills).
**Mitigation:** yes. Decision 6: sync folds `when_to_use` into `description` in every `dist/plugins` tree, for every host. `tests/dist-mirror.test.mjs` fails if a `when_to_use` survives into dist. The `npx skills add` channel still serves `skills/` raw.

## Q7 — Codex cuts each skill entry to a shared budget

**Symptom:** the tail of a skill's description, often its "Not for…" boundary or its trigger phrases, missing on Codex with no ellipsis.
**Trigger:** many skills installed. The cut scales with the count.
**Cause:** Codex divides a listing budget across all installed skills. On codex-cli 0.163 a lone skill kept a 1000-char description whole; with the 38 toolkit skills installed alongside Harvey's plugins, every entry was cut mid-word at 372–374 chars (verbatim quotes of toolkit-foundry 450 → 372, finalize 467 → 374, remember 965 → 374).
**Mitigation:** partial. Folding (Q6) still adds `when_to_use` text up to the cut, so 17 of the 28 skills gain 100+ chars of trigger text. A skill whose `description` alone reaches about 374 chars gains nothing. The lever left is wording: put the trigger first, within the first ~370 chars. That is a separate docket item, because it changes trigger text the evals measured.
