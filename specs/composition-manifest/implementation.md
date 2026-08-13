# Implementation

## Files

| File | Change |
|---|---|
| `composition.json` (new, repo root) | the declaration — seeded verbatim from today's dist layout, marketplace.json, and doc tables |
| `scripts/composition.mjs` (new) | load + validate; exports data for tests/generator; CLI `--pairs` prints sync pairs |
| `scripts/generate-catalogs.mjs` (new) | writes marketplace.json; rewrites marker blocks in README.md / CLAUDE.md |
| `scripts/sync.sh` | probe loop + three if-arms → consume `--pairs`; hard error on undeclared skill; call generate-catalogs |
| `README.md` / `CLAUDE.md` | wrap existing catalog tables in `<!-- catalog:begin/end -->` markers |
| `tests/composition.test.mjs` (new) | mirror pairs, no-undeclared-dirs, generator-output match, schema validation |
| `tests/condux-hooks.test.mjs` | drop mirror assertion only |
| `tests/skill-invariants.test.mjs` | drop condux agents mirror check only |
| `tests/docket-server.test.mjs` | drop mirror assertion only |
| `tests/docs-catalog.test.mjs` | retire |
| `skills/toolkit-foundry/SKILL.md` | new-skill checklist gains the composition.json edit |

## Patterns to follow

- Generator-match testing: same shape as `opencode-dist.test.mjs` (regenerate
  in-memory, compare committed output byte-for-byte).
- Node scripts: dependency-free ESM like `check-frontmatter.mjs` /
  `release-plugins.mjs`; no new devDependencies.
- sync.sh keeps bash structure; node supplies the data (one `--pairs` call,
  not per-skill invocations).

## Verification

- Full sync → `git diff dist/` empty (byte-identity cutover).
- `node --test` green including the new composition test.
- Change-control gate: expected no plugin version bumps (no dist content
  change); marketplace.json byte-identical after generation.
