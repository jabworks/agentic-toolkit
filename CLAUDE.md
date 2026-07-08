# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Personal agentic coding toolkit (`jabworks/agentic-toolkit`). It ships skills for Claude Code, Codex, and compatible agents — distributed via `npx skills add` and a Claude Code plugin marketplace.

## Directory layout

```
skills/<name>/          # Editable source — always edit here
  SKILL.md              # Required agent instruction file (frontmatter + body)
  README.md             # Optional human docs
  references/           # Optional templates or checklists for agents

dist/plugins/<name>/    # Install mirror — never edit directly; sync from skills/
  skills/<name>/        # Mirrors skills/<name>/
  .claude-plugin/
    plugin.json         # Claude Code plugin metadata
  .codex-plugin/
    plugin.json         # Codex plugin metadata

.claude-plugin/
  marketplace.json      # Plugin registry — add entries here when creating skills
```

## Workflow for editing a skill

1. Edit files under `skills/<name>/`
2. Sync to dist: `bash scripts/sync.sh <name>` (auto-detects bundle vs standalone target)
3. Verify: `node --test`
4. Commit with `-s` (signoff) — no `Co-Authored-By:` trailers

## Workflow for creating a new skill

See `skills/plugin-foundry/SKILL.md` for the canonical checklist. Short version:

1. Scaffold `skills/<name>/` and `dist/plugins/<name>/` trees
2. Write `SKILL.md` with required frontmatter (`name`, `description`)
3. Write both plugin manifests (`.claude-plugin/plugin.json` + `.codex-plugin/plugin.json`)
4. Register in `.claude-plugin/marketplace.json`
5. Sync dist: `bash scripts/sync.sh <name>`
6. Verify: `node --test`, then commit

## Skills in this toolkit

| Skill | Purpose |
|---|---|
| `plugin-foundry` | Scaffold, register, sync, and publish new skills |
| `session-handoff` | Preserve/restore session context at context limits |
| `session-report` | Generate HTML usage report from session transcripts |
| `adapting-skills` | Adapt generic skills to Harvey's stack and conventions |
| `git-commit` | Conventional-commit message from the diff, run safely |
| `git-operations` | Decision router for git operations with undo paths |
| `spec-browser` | Catalog and browse a specs/ tree as one doc site |
| `release` | Cut a release safely — machinery router (changesets/toolkit/GitHub), dry-run first |
| `condux` (plugin) | agentic workflow bundle (workflow, discovery, draft-plan, test-first-development, subagent-execution, subagent-deployment, finalize, code-review, preflight, root-cause-analysis, plan-review, technical-spec) |
| `toolkit-ops` (plugin) | repo-maintenance bundle (toolkit-orientation, toolkit-change-control, toolkit-skill-standards, toolkit-debugging-playbook, toolkit-failure-archaeology, toolkit-plugin-reference, toolkit-research-frontier) |

The `condux` and `toolkit-ops` bundles live at `dist/plugins/<bundle>/` and their sources are in the corresponding `skills/` subdirectories.

## Key invariants

- `dist/` is a verbatim mirror of `skills/` — never diverge them
- SKILL.md trigger contract: either `description` starts with "Use when..." (triggering conditions only), or a `when_to_use` field carries the trigger conditions (condux-style). `description` ≤ 500 chars, frontmatter total ≤ 1024 chars
- `skills` path in plugin.json must start with `./` (relative to plugin root)
- Commit style: `fix:` / `feat:` / `chore:` prefix, `-s` signoff, no Co-Authored-By

Most of these are enforced by `node --test` (see `tests/`), so run it before
committing — it fails the build otherwise:

- `dist-mirror.test.mjs` — `dist/` skill trees match `skills/` byte-for-byte
- `skill-invariants.test.mjs` — frontmatter budgets, `name` kebab-case and equal
  to its dir, marketplace/plugin paths resolve on disk, the condux plugin-level
  `agents/` mirror, and plan-review's no-egress guarantee
- `plugin-manifests.test.mjs` — `plugin.json` / `marketplace.json` validity and
  `./`-prefixed paths
- `manifest-parity.test.mjs` — each plugin's `.claude-plugin`/`.codex-plugin`
  manifests match on name/version/skills, both carry `interface`, `hooks` stays
  codex-only, and every skill has a trigger contract
- `local-hooks.test.mjs` — warn-only (never fails): tells you when this clone
  is missing the pre-commit sync hook (`bash scripts/install-hooks.sh`)

Two distribution channels read two different trees (don't conflate them):
`npx skills add` installs from top-level `skills/`; the plugin marketplace
(`/plugin install …@jabworks-agentic-toolkit`) installs from `dist/` via
`marketplace.json`. `dist/` is a build artifact — edit `skills/`, then
`scripts/sync.sh`. After cloning, `bash scripts/install-hooks.sh` installs the
pre-commit sync hook (optional — CI's `node --test` guards drift either way).

## Always look up skills from `skills/`

When the user invokes a skill from this toolkit, read it from `skills/<name>/SKILL.md`, not from the system plugin cache — the local source is authoritative.
