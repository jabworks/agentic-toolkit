# Frontmatter field policy

What each host's skill loader reads, and what the variant builder does about
it.

| Field | Claude Code | Codex | OpenCode | Cursor |
|---|---|---|---|---|
| `name` | read | read (strict YAML) | read | read (must match folder) |
| `description` | read (≤500 chars) | read | surfaced for triggering | surfaced for triggering |
| `when_to_use` | read (trigger contract) | read | **ignored** | **ignored** |
| `paths` | — | — | — | read (glob scoping) |
| `disable-model-invocation` | — | — | — | read (manual-only) |
| `metadata` | — | — | — | read (arbitrary k/v) |

Sources: cursor.com/docs/skills (fetched 2026-08-14); OpenCode behavior per
`scripts/build-opencode.mjs` header.

## Transform (both variant trees)

`description' = description + " " + when_to_use`, `when_to_use` dropped,
everything else byte-for-byte. Skills without `when_to_use` pass through
byte-identical. OpenCode caps merged descriptions at 1024 chars (asserted in
`opencode-dist.test.mjs`); Cursor documents no cap — the same 1024 assertion
is kept for the cursor tree as a conservative shared ceiling.

## Marketplace descriptions

Never sourced from SKILL.md (divergence ratified 2026-08-04, PR #16) and not
involved in this channel — Cursor reads SKILL.md `description` only.
