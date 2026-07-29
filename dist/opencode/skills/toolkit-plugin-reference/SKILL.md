---
name: toolkit-plugin-reference
description: Use when writing or editing plugin.json, marketplace.json, or package manifests in jabworks/agentic-toolkit and the exact schema matters — required fields, the .claude-plugin/.codex-plugin pairing and where it diverges (interface, hooks), the skills-path form, how the three install channels consume the repo, and which SKILL.md frontmatter fields are real. Triggers include "what fields does plugin.json need", "claude vs codex manifest", "marketplace entry format", "how opencode loads skills".
---

# Toolkit Plugin Reference

## Purpose

The verified schema and mechanics of Claude Code / Codex plugins **as used in this
repo** — nothing generic, nothing unverified.

## When to use

- Writing or editing any `plugin.json` (either variant), `marketplace.json`, or
  `packages/condux-opencode/package.json`.
- Deciding whether a field difference between the two manifests is a bug or by design.
- Explaining how the three install channels consume this repo.

## When not to use

- The end-to-end authoring sequence → `toolkit-foundry`.
- Gating whether a change is shippable → `toolkit-change-control`.
- Host-tool features beyond what this repo uses (MCP servers, commands dirs) —
  unverified here; consult official plugin docs instead.

## Inputs required

The plugin/manifest in question, plus `tests/plugin-manifests.test.mjs`,
`tests/manifest-parity.test.mjs`, and — for the OpenCode channel and the npm
package — `tests/opencode-dist.test.mjs` as the executable source of truth.

## Procedure — the schema facts

### plugin.json (both `.claude-plugin/` and `.codex-plugin/` variants)

| Field | Status in this repo |
|---|---|
| `name` | required (test-enforced), == plugin dir name |
| `version` | required (test-enforced); the pair must match — bump policy (which bump when, cache rationale) has its home in `toolkit-change-control` |
| `description` | required (test-enforced); may carry platform wording ("Claude Code skill for…" / "Codex skill for…") — identity fields `name`/`version`/`skills` must match across the pair |
| `author.name` | required (test-enforced) |
| `repository`, `license`, `keywords` | convention — present in every manifest (18 at the 2026-07-08 audit) |
| `skills` | required (test-enforced), must be `"./skills/<plugin-dir-name>"` — same rule for standalone AND bundle plugins |
| `interface` | **codex manifest only** since 2026-07-29 (parity-test-enforced: present in codex, absent in claude). Codex-native install-surface block (displayName, shortDescription ≤125 chars per Codex docs, longDescription, developerName, category, defaultPrompt; optionally capabilities/websiteURL/logo/screenshots). **Verified 2026-07-08: unknown to Claude Code** — ignored at load, validator warns, `--strict` errors. Previously duplicated into the claude manifest for parity; dropped so `claude plugin validate --strict` passes clean, since Claude Code never read the field anyway |
| `hooks` | **codex manifest only** (condux carries `"hooks": "./hooks/codex-hooks.json"`). BOTH hosts default to loading `hooks/hooks.json` when no manifest field exists (verified in both hosts' docs); the codex-side field overrides that default so Codex loads the Stop-only file instead of Claude's PreToolUse file (commit 95425c8). A missing claude-side `hooks` field is BY DESIGN, not a parity bug. **Hook commands use the host's own plugin-root variable** — Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}`, Codex substitutes `${PLUGIN_ROOT}` and does NOT set Claude's (verified 2026-07-10, Codex 0.144.1: the unexpanded variable made condux's Stop hook exit 1 on every turn; parity-test-enforced) |

### Verified host field support (2026-07-08)

Method: `claude plugin validate [--strict]` (Claude Code 2.1.204) run on this repo's
real manifests, plus both official schema docs
(code.claude.com/docs/en/plugins-reference, developers.openai.com/codex/plugins/build).

| Field | Claude Code | Codex |
|---|---|---|
| `name` | required — the ONLY required field | required |
| `version`/`description`/`author`/`homepage`/`repository`/`license`/`keywords` | recognized | recognized (documented publisher/discovery metadata) |
| `skills`/`hooks`/`mcpServers` | recognized (plus: `commands`, `agents`, `outputStyles`, `lspServers`, `dependencies`, `userConfig`, `channels`, `defaultEnabled`) | recognized (plus: `apps`) |
| `interface` | **unknown — ignored at load**; `claude plugin validate` warns; docs bless foreign-ecosystem metadata (warning, not error); `--strict` FAILS on it | recognized — native install-surface block |
| `displayName` (top-level) | recognized (v2.1.143+; names the plugin in the `/plugin` picker) | not documented top-level — Codex uses `interface.displayName` |
| unknown fields generally | ignored at runtime; validate warns; `--strict` errors | tolerance undocumented/untested |

The doctrine was flipped on 2026-07-29: `interface` now lives only in the codex
manifest, so every claude manifest validates clean under `--strict`. The trigger was
the official plugin directory — submissions are reviewed against unstated "quality and
security standards", and a `--strict` failure is the most visible thing a reviewer can
run. Wiring `claude plugin validate --strict` into CI is now safe; it is not wired yet
(it would add a `claude` CLI dependency to the test job).

### marketplace.json (`.claude-plugin/marketplace.json`, repo root)

Top level: `$schema`, `name`, `description`, `owner{name,email}`, `plugins[]`.
Per entry — exactly: `name`, `description`, `author{name}`, `source`
(`./dist/plugins/<name>`, `./`-prefixed, test-enforced), `category`. **No version
field.** Fields like `strict`/`skills`/`keywords` appear in upstream examples but in
none of this repo's entries. Note: `author` is `{ "name": "Hieu Vi" }` in marketplace
entries but `{ "name": "jabworks" }` in plugin.json manifests — historical convention,
consistent within each file kind.

### The three install channels

| Channel | Reads | Ignores |
|---|---|---|
| `npx skills add jabworks/agentic-toolkit` (vercel-labs/skills) | top-level `skills/<name>/SKILL.md` | `dist/`, all manifests |
| `/plugin install <name>@jabworks-agentic-toolkit` | `marketplace.json` → `source` → the dist plugin dir → its manifest → its `skills` path | `skills/`, `dist/opencode/` |
| OpenCode | `dist/opencode/skills/<name>/SKILL.md` | every manifest in the repo |

Consequence: a broken manifest is invisible to two of the three channels — test each
channel's own inputs, never infer one from another.

### OpenCode (`dist/opencode/`, generated)

No manifest exists or is read. The host surfaces **`description` only** in its
`<available_skills>` listing and ignores unknown frontmatter, so
`scripts/build-opencode.mjs` folds `when_to_use` into `description` and drops the
field; everything else copies byte-for-byte. Two hard limits follow:

- The **merged** `description` must fit OpenCode's 1024-char cap
  (`tests/opencode-dist.test.mjs` enforces it). A skill can pass the 500-char
  source budget and still blow this — check both after editing either field.
- Only the skill's own top-level `SKILL.md` is transformed. A nested `SKILL.md`
  (eval fixture under `references/` or `evals/`) is data and copies verbatim.

### The npm package (`packages/condux-opencode/` → `@jabworks/condux`)

A fourth surface, not a skills channel — it ships the OpenCode *plugin* (agent
injection via the config hook, opt-in `CONDUX_PLAN_REVIEW=1` session.idle
listener), not skills. Standard npm manifest; the repo-specific constraints are:

| Constraint | Why |
|---|---|
| `index.js` exports the plugin **named only** — no default re-export | OpenCode calls every export as a plugin function; a default doubles hook registration (`08cc554`) |
| `agents/` is generated, listed in `files` | built from `skills/subagent-execution/agents/*.md`; `tests/opencode-dist.test.mjs` fails on drift |
| root `package.json` has no `"type": "module"` | it would break the CommonJS reference scripts under `skills/*/references/`; those self-protect with their own `references/package.json` since `f1e4b53` |
| version bumps go through changesets, not by hand | `pnpm changeset` → release.yml opens the version PR → publishes via npm OIDC trusted publishing (no `NPM_TOKEN`) |

### SKILL.md frontmatter

Parsed by every host: `name`, `description`. House convention fields observed in this
repo: `when_to_use` (second half of the trigger contract), `argument-hint`, `effort`,
`disable-model-invocation`, `user-invocable`. Budgets: description ≤ 500 chars,
frontmatter ≤ 1024 (test-enforced) — plus the merged-description cap above for the
OpenCode channel.

### Cache behavior

Installed plugin copies refresh only on a version change — see the stale-1.3.4
incident (`a4f4aa8`). Shipping a fix without a bump ships nothing.

## Evidence required

For any schema claim beyond this table: point at a real manifest in `dist/plugins/`
or a test assertion. For claims about host-tool internals: mark unverified.

## Output artifact

A correct manifest (or a field-level diff of what to change), pair-consistent.

## Common traps

- "Fixing" the missing claude-side `hooks` field on condux — it's by design.
- Copying `strict`/`skills` arrays into marketplace entries from upstream examples.
- Editing one manifest of the pair (`ba69d2b` precedent).
- Looking for a manifest to register a skill with OpenCode — there isn't one;
  the skill appears the moment `dist/opencode/skills/<name>/` is generated.
- Hand-editing `version` in `packages/condux-opencode/package.json` — changesets
  owns that field; a manual bump collides with the version PR.

## Bad behavior this prevents

The pre-2026-07-08 state this table replaced: 7 of 8 plugin pairs disagreed on the
`skills` path form and the Claude manifests carried `interface` inconsistently — each
new plugin copied a different wrong example. The table + parity test pin one shape.
Since 2026-07-29 that shape is: `interface` in the codex manifest, never the claude
one, so `--strict` stays clean for directory submissions.

## Related skills

`toolkit-foundry` (uses these schemas in its templates), `toolkit-change-control`
(version-bump rules), `toolkit-debugging-playbook` (manifest-caused symptoms).

## Provenance and maintenance

Re-verify volatile claims with:
- `node --test tests/plugin-manifests.test.mjs tests/manifest-parity.test.mjs tests/opencode-dist.test.mjs`
- `for m in dist/plugins/*/.{claude,codex}-plugin/plugin.json; do jq -r '.skills' "$m"; done`
- `claude plugin validate dist/plugins/<p> --strict` — official validator (expect a
  clean pass, no warnings, since `interface` moved to the codex manifest on 2026-07-29)
- `node scripts/build-opencode.mjs && git status --short` — clean tree means the
  OpenCode channel and the package's `agents/` are in sync with source

Last generated: 2026-07-08 (host-support matrix verified same day; OpenCode +
npm-package sections added 2026-07-23)
Known uncertainty:
- Codex's tolerance of fields IT doesn't recognize is untested — this repo's manifests
  contain only Codex-documented fields, so it's never exercised. No codex-side
  validator found (codex 0.142.5 `plugin` has only add/list/marketplace/remove).
- `interface.shortDescription` ≤125 chars is docs-stated, not validator-verified
  (this repo's max is 55).
- The `$schema` URL in marketplace.json is not fetched/validated by anything here.
- OpenCode's 1024-char description cap is enforced locally by
  `tests/opencode-dist.test.mjs`; the host's own behaviour past that limit
  (truncate vs reject) was never observed — the repo has stayed under it.
- No OpenCode-side manifest validator exists to check against, and the
  description-only routing claim comes from the host's `<available_skills>`
  listing, not from a schema.
