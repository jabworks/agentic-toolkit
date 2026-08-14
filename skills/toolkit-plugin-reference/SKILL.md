---
name: toolkit-plugin-reference
description: Use when writing or editing plugin.json, marketplace.json, or package manifests in jabworks/agentic-toolkit and the exact schema matters — required fields, the .claude-plugin/.codex-plugin pairing and where it diverges (interface, hooks), the skills-path form, how the four install channels consume the repo, and which SKILL.md frontmatter fields are real. Triggers include "what fields does plugin.json need", "claude vs codex manifest", "marketplace entry format", "how opencode loads skills".
---

# Toolkit Plugin Reference

## Purpose

The verified schema and mechanics of Claude Code / Codex plugins **as used in this
repo** — nothing generic, nothing unverified.

## When to use

- Writing or editing any `plugin.json` (either variant), `marketplace.json`, or
  `packages/condux-opencode/package.json`.
- Deciding whether a field difference between the two manifests is a bug or by design.
- Explaining how the four install channels consume this repo.

## When not to use

- The end-to-end authoring sequence → `toolkit-foundry`.
- Gating whether a change is shippable → `toolkit-change-control`.
- Host-tool features beyond what this repo uses (MCP servers, commands dirs) —
  unverified here; consult official plugin docs instead.

## Inputs required

The plugin/manifest in question, plus `tests/plugin-manifests.test.mjs`,
`tests/manifest-parity.test.mjs`, and — for the two variant channels and the npm
package — `tests/opencode-dist.test.mjs` and `tests/cursor-dist.test.mjs` as the
executable source of truth.

## Procedure — the schema facts

### plugin.json (both `.claude-plugin/` and `.codex-plugin/` variants)

| Field | Status in this repo |
|---|---|
| `name` | required (test-enforced), == plugin dir name |
| `version` | required (test-enforced); the pair must match — bump policy (which bump when, cache rationale) has its home in `toolkit-change-control` |
| `description` | required (test-enforced); may carry platform wording ("Claude Code skill for…" / "Codex skill for…") — identity fields `name`/`version`/`skills` must match across the pair |
| `author.name` | required (test-enforced) |
| `repository`, `license`, `keywords` | convention — present in every manifest (22 at the 2026-08-04 re-eval; 11 plugin pairs) |
| `skills` | required (test-enforced), must be `"./skills/<plugin-dir-name>"` — same rule for standalone AND bundle plugins |
| `interface` | **codex manifest only** since 2026-07-29 (parity-test-enforced: present in codex, absent in claude). Codex-native install-surface block (displayName, shortDescription ≤125 chars per Codex docs, longDescription, developerName, category, defaultPrompt; optionally capabilities/websiteURL/logo/screenshots). **Verified 2026-07-08: unknown to Claude Code** — ignored at load, validator warns, `--strict` errors. Previously duplicated into the claude manifest for parity; dropped so `claude plugin validate --strict` passes clean, since Claude Code never read the field anyway |
| `hooks` | **codex manifest only** — two carriers with two path shapes: condux points at plugin root (`"hooks": "./hooks/codex-hooks.json"`), concord points into its skill dir (`"hooks": "./skills/concord/remember/hooks/codex-hooks.json"`); both resolve relative to the plugin root, so either shape is valid. BOTH hosts default to loading `hooks/hooks.json` when no manifest field exists (verified in both hosts' docs); the codex-side field overrides that default so Codex loads the Stop-only file instead of Claude's PreToolUse file (commit 95425c8). A missing claude-side `hooks` field is BY DESIGN, not a parity bug. **Hook commands use the host's own plugin-root variable** — Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}`, Codex substitutes `${PLUGIN_ROOT}` and does NOT set Claude's (verified 2026-07-10, Codex 0.144.1: the unexpanded variable made condux's Stop hook exit 1 on every turn; parity-test-enforced) |

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

**Description divergence is by design** (ratified 2026-08-04): a marketplace
entry's `description` is storefront copy for the `/plugin` picker; the
plugin.json `description` is install metadata and may carry platform wording.
They are not kept in sync and no test enforces parity — don't "fix" the drift.

### The four install channels

| Channel | Reads | Ignores |
|---|---|---|
| `npx skills add jabworks/agentic-toolkit` (vercel-labs/skills) | top-level `skills/<name>/SKILL.md` | `dist/`, all manifests |
| `/plugin install <name>@jabworks-agentic-toolkit` | `marketplace.json` → `source` → the dist plugin dir → its manifest → its `skills` path | `skills/`, `dist/opencode/`, `dist/cursor/` |
| OpenCode | `dist/opencode/skills/<name>/SKILL.md` | every manifest in the repo |
| Cursor (2.4+, native SKILL.md) | `dist/cursor/skills/<name>/SKILL.md` | every manifest in the repo |

Consequence: a broken manifest is invisible to three of the four channels — test each
channel's own inputs, never infer one from another.

### The variant trees (`dist/opencode/` and `dist/cursor/`, both generated)

No manifest exists or is read on either host. Both surface **`description` only**
and ignore unknown frontmatter, so both builds fold `when_to_use` into
`description` and drop the field; everything else copies byte-for-byte.
`scripts/build-cursor.mjs` imports the fold (`transformSkill`, `copyTransformed`)
from `scripts/build-opencode.mjs` — one transform, two output trees, so the
trees cannot drift from each other until a host deliberately diverges. Hard
limits:

- The **merged** `description` must fit the 1024-char cap on both hosts
  (`tests/opencode-dist.test.mjs` and `tests/cursor-dist.test.mjs` each enforce
  it). A skill can pass the 500-char source budget and still blow this — check
  after editing either field.
- Only the skill's own top-level `SKILL.md` is transformed. A nested `SKILL.md`
  (eval fixture under `references/` or `evals/`) is data and copies verbatim.
- **Cursor only:** frontmatter `name` must equal the skill's folder name.
  Already guaranteed repo-wide by `tests/skill-invariants.test.mjs`, but a
  rename that slipped past it would fail on Cursor alone.
- Never point Cursor at top-level `skills/` — it never reads `when_to_use`, so a
  condux-style skill would load and then trigger only on its thin `description`.
  Nothing errors; the breakage is invisible. That is what `dist/cursor/` is for.

### The npm package (`packages/condux-opencode/` → `@jabworks/condux`)

A fifth surface, not a skills channel — it ships the OpenCode *plugin* (agent
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
`disable-model-invocation`. Budgets: description ≤ 500 chars,
frontmatter ≤ 1024 (test-enforced) — plus the merged-description cap above, which
applies to both variant channels.

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
- Looking for a manifest to register a skill with OpenCode or Cursor — there
  isn't one on either host; the skill appears the moment
  `dist/opencode/skills/<name>/` or `dist/cursor/skills/<name>/` is generated.
- Pointing a Cursor install at top-level `skills/` because "that's the source" —
  Cursor never reads `when_to_use`, so the skill loads with a thin trigger and
  fails silently. `dist/cursor/skills/` exists for exactly this.
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
- `node --test tests/plugin-manifests.test.mjs tests/manifest-parity.test.mjs tests/opencode-dist.test.mjs tests/cursor-dist.test.mjs`
- `node -e 'for (const m of require("fs").globSync("dist/plugins/*/.{claude,codex}-plugin/plugin.json")) console.log(m, require("./" + m).skills)'`
- `claude plugin validate dist/plugins/<p> --strict` — official validator (expect a
  clean pass, no warnings, since `interface` moved to the codex manifest on 2026-07-29)
- `node scripts/build-opencode.mjs && node scripts/build-cursor.mjs && git status
  --short` — clean tree means both variant channels and the package's `agents/`
  are in sync with source

Last generated: 2026-07-08 (host-support matrix verified same day; OpenCode +
npm-package sections added 2026-07-23; hooks row + counts refreshed 2026-08-04;
Cursor channel folded in 2026-08-14 — three channels became four, and the OpenCode
section became the shared variant-trees section)
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
- Cursor's 1024-char cap is assumed equal to OpenCode's and enforced locally by
  `tests/cursor-dist.test.mjs`; no Cursor-side validator or documented limit was
  found to confirm it. The repo has stayed well under either way.
- Cursor global installs are unreliable upstream: vercel-labs/skills#421 (the CLI
  writes `~/.agents/skills/` where the docs say `~/.cursor/skills/`; fix PR #464
  unmerged as of 2026-08-14), compounded on WSL by `~` resolving to the Windows
  home rather than the WSL one. Project-level `.cursor/skills/` is the path
  verified to work here. Full detail: `specs/cursor-channel/quirks.md`.
