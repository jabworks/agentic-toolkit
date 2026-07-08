---
name: toolkit-plugin-reference
description: Use when writing or editing plugin.json or marketplace.json in jabworks/agentic-toolkit and the exact schema matters — required fields, the .claude-plugin/.codex-plugin pairing and where the two diverge (interface, hooks), the skills-path form, how npx skills add vs /plugin install consume the repo, and which SKILL.md frontmatter fields are real. Triggers include "what fields does plugin.json need", "claude vs codex manifest", "marketplace entry format".
---

# Toolkit Plugin Reference

## Purpose

The verified schema and mechanics of Claude Code / Codex plugins **as used in this
repo** — nothing generic, nothing unverified.

## When to use

- Writing or editing any `plugin.json` (either variant) or `marketplace.json`.
- Deciding whether a field difference between the two manifests is a bug or by design.
- Explaining how the two install channels consume this repo.

## When not to use

- The end-to-end authoring sequence → `plugin-foundry`.
- Gating whether a change is shippable → `toolkit-change-control`.
- Host-tool features beyond what this repo uses (MCP servers, commands dirs) —
  unverified here; consult official plugin docs instead.

## Inputs required

The plugin/manifest in question, plus `tests/plugin-manifests.test.mjs` and
`tests/manifest-parity.test.mjs` as the executable source of truth.

## Procedure — the schema facts

### plugin.json (both `.claude-plugin/` and `.codex-plugin/` variants)

| Field | Status in this repo |
|---|---|
| `name` | required (test-enforced), == plugin dir name |
| `version` | required (test-enforced); the pair must match — bump policy (which bump when, cache rationale) has its home in `toolkit-change-control` |
| `description` | required (test-enforced); may carry platform wording ("Claude Code skill for…" / "Codex skill for…"), as may `interface` content — identity fields `name`/`version`/`skills` must match across the pair |
| `author.name` | required (test-enforced) |
| `repository`, `license`, `keywords` | convention — present in every manifest (18 at the 2026-07-08 audit) |
| `skills` | required (test-enforced), must be `"./skills/<plugin-dir-name>"` — same rule for standalone AND bundle plugins |
| `interface` | required in BOTH variants by house doctrine (parity-test-enforced). Codex-native install-surface block (displayName, shortDescription ≤125 chars per Codex docs, longDescription, developerName, category, defaultPrompt; optionally capabilities/websiteURL/logo/screenshots — 4 of 9 codex manifests carry capabilities). **Verified 2026-07-08: unknown to Claude Code** — ignored at load, validator warns (see host-support matrix below) |
| `hooks` | **codex manifest only** (condux carries `"hooks": "./hooks/codex-hooks.json"`). BOTH hosts default to loading `hooks/hooks.json` when no manifest field exists (verified in both hosts' docs); the codex-side field overrides that default so Codex loads the Stop-only file instead of Claude's PreToolUse file (commit 95425c8). A missing claude-side `hooks` field is BY DESIGN, not a parity bug |

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

Consequence of the parity doctrine: every claude manifest carries one known validator
warning (`interface`). Do NOT wire `claude plugin validate --strict` into CI without
flipping the doctrine first (campaign B3 records the flip recipe).

### marketplace.json (`.claude-plugin/marketplace.json`, repo root)

Top level: `$schema`, `name`, `description`, `owner{name,email}`, `plugins[]`.
Per entry — exactly: `name`, `description`, `author{name}`, `source`
(`./dist/plugins/<name>`, `./`-prefixed, test-enforced), `category`. **No version
field.** Fields like `strict`/`skills`/`keywords` appear in upstream examples but in
none of this repo's entries. Note: `author` is `{ "name": "Hieu Vi" }` in marketplace
entries but `{ "name": "jabworks" }` in plugin.json manifests — historical convention,
consistent within each file kind.

### The two install channels

- `npx skills add jabworks/agentic-toolkit` (vercel-labs/skills) reads **top-level
  `skills/<name>/SKILL.md`** and ignores `dist/` and all manifests.
- `/plugin install <name>@jabworks-agentic-toolkit` reads `marketplace.json` →
  `source` → the dist plugin dir → its manifest → its `skills` path.
- Consequence: a broken manifest is invisible to `npx skills add` users and vice
  versa — test both channels' inputs, don't infer one from the other.

### SKILL.md frontmatter

Parsed by every host: `name`, `description`. House convention fields observed in this
repo: `when_to_use` (second half of the trigger contract), `argument-hint`, `effort`,
`disable-model-invocation`, `user-invocable`. Budgets: description ≤ 500 chars,
frontmatter ≤ 1024 (test-enforced).

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

## Bad behavior this prevents

The pre-2026-07-08 state this table replaced: 7 of 8 plugin pairs disagreed on the
`skills` path form and 5 Claude manifests lacked `interface` entirely — each new
plugin copied a different wrong example. The table + parity test pin one shape.

## Related skills

`plugin-foundry` (uses these schemas in its templates), `toolkit-change-control`
(version-bump rules), `toolkit-debugging-playbook` (manifest-caused symptoms).

## Provenance and maintenance

Re-verify volatile claims with:
- `node --test tests/plugin-manifests.test.mjs tests/manifest-parity.test.mjs`
- `for m in dist/plugins/*/.{claude,codex}-plugin/plugin.json; do jq -r '.skills' "$m"; done`
- `claude plugin validate dist/plugins/<p>` — official validator (expect exactly one
  warning per plugin: the Codex-native `interface` field)

Last generated: 2026-07-08 (host-support matrix verified same day)
Known uncertainty:
- Codex's tolerance of fields IT doesn't recognize is untested — this repo's manifests
  contain only Codex-documented fields, so it's never exercised. No codex-side
  validator found (codex 0.142.5 `plugin` has only add/list/marketplace/remove).
- `interface.shortDescription` ≤125 chars is docs-stated, not validator-verified
  (this repo's max is 55).
- The `$schema` URL in marketplace.json is not fetched/validated by anything here.
