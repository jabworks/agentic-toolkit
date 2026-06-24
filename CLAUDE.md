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
2. Sync to dist: `cp -r skills/<name>/. dist/plugins/<name>/skills/<name>/`
3. Commit with `-s` (signoff) — no `Co-Authored-By:` trailers

## Workflow for creating a new skill

See `skills/plugin-foundry/SKILL.md` for the canonical checklist. Short version:

1. Scaffold `skills/<name>/` and `dist/plugins/<name>/` trees
2. Write `SKILL.md` with required frontmatter (`name`, `description`)
3. Write both plugin manifests (`.claude-plugin/plugin.json` + `.codex-plugin/plugin.json`)
4. Register in `.claude-plugin/marketplace.json`
5. Sync dist: `cp -r skills/<name>/. dist/plugins/<name>/skills/<name>/`
6. Commit

## Skills in this toolkit

| Skill | Purpose |
|---|---|
| `plugin-foundry` | Scaffold, register, sync, and publish new skills |
| `session-handoff` | Preserve/restore session context at context limits |
| `session-report` | Generate HTML usage report from session transcripts |
| `adapting-skills` | Adapt generic skills to Harvey's stack and conventions |
| `condux` (plugin) | 9-skill agentic workflow bundle (workflow, brainstorm, write-plan, tdd, sdd, finalize, code-review, verification, systematic-debugging) |

The `condux` bundle lives at `dist/plugins/condux/` and its sources are in the corresponding `skills/` subdirectories.

## Key invariants

- `dist/` is a verbatim mirror of `skills/` — never diverge them
- SKILL.md `description` field: triggering conditions only, starts with "Use when...", ≤ 500 chars, frontmatter total ≤ 1024 chars
- `skills` path in plugin.json must start with `./` (relative to plugin root)
- Commit style: `fix:` / `feat:` / `chore:` prefix, `-s` signoff, no Co-Authored-By

## Always look up skills from `skills/`

When the user invokes a skill from this toolkit, read it from `skills/<name>/SKILL.md`, not from the system plugin cache — the local source is authoritative.
