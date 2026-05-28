---
name: plugin-foundry
description: Use when creating a new skill for jabworks/agentic-toolkit, registering it in the marketplace, syncing the dist mirror, or bumping the toolkit version.
---

# Plugin Foundry

> Adapted from [softaworks/agent-toolkit `plugin-forge`](https://github.com/softaworks/agent-toolkit/tree/main/skills/plugin-forge)

## Purpose

Create and maintain skills in `jabworks/agentic-toolkit`. Covers scaffolding, marketplace registration, dist mirroring, and publishing.

## When to Use

- Adding a new skill to the toolkit
- Updating an existing skill and syncing `dist/`
- Registering or modifying a marketplace entry
- Bumping the toolkit version

## Skill Structure

Source tree (editable):
```
skills/<name>/
  SKILL.md              # Required — agent instruction file
  README.md             # Optional — human docs
  references/           # Optional — templates, checklists
    <file>.md
```

Install source (what `npx skills add` copies — must mirror `skills/<name>/`):
```
dist/plugins/<name>/skills/<name>/
  SKILL.md
  references/
```

**Never edit `dist/` directly.** Edit `skills/`, then sync.

## Creating a New Skill

### 1. Scaffold

```bash
mkdir -p skills/<name>/references
mkdir -p dist/plugins/<name>/.codex-plugin
mkdir -p dist/plugins/<name>/skills/<name>/references
```

### 2. Write SKILL.md

Required frontmatter:
```yaml
---
name: <name>
description: Use when [triggering conditions only — no workflow summary]
---
```

- `name`: kebab-case, letters/numbers/hyphens only
- `description`: third-person, max ~500 chars, starts with "Use when..."
- Frontmatter total ≤ 1024 chars

### 3. Write Codex plugin.json

Create `dist/plugins/<name>/.codex-plugin/plugin.json` (required for `codex plugin add`):

```json
{
  "name": "<name>",
  "version": "1.0.0",
  "description": "<short description>",
  "keywords": ["keyword1", "keyword2"],
  "skills": "./skills/<name>"
}
```

The `skills` path is relative to the plugin root (`dist/plugins/<name>/`) and must start with `./`.

### 5. Register in marketplace.json

Add an entry to `.claude-plugin/marketplace.json`:

```json
{
  "name": "<name>",
  "description": "<short description>",
  "source": "./dist/plugins/<name>",
  "strict": false,
  "skills": ["./skills/<name>"],
  "category": "development",
  "keywords": ["keyword1", "keyword2"]
}
```

### 6. Sync to dist/

```bash
cp -r skills/<name>/. dist/plugins/<name>/skills/<name>/
```

### 7. Commit and push

```bash
git add skills/<name>/ dist/plugins/<name>/ .claude-plugin/marketplace.json
git commit -s -m "feat: add <name> skill"
git push origin main
```

## Updating an Existing Skill

```bash
# 1. Edit skills/<name>/ files
# 2. Sync
cp -r skills/<name>/. dist/plugins/<name>/skills/<name>/
# 3. Commit
git add skills/<name>/ dist/plugins/<name>/
git commit -s -m "fix: update <name> skill"
git push origin main
```

## Version Bump

Update `version` in `.claude-plugin/marketplace.json` manually:

| Change | Bump |
|---|---|
| Breaking (incompatible install path) | major |
| New skill added | minor |
| Bug fix / doc update | patch |

## Marketplace Entry Fields

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | Matches `skills/<name>/` directory name |
| `description` | Yes | Short — shown in `npx skills add` listing |
| `source` | Yes | Always `./dist/plugins/<name>` |
| `strict` | No | Default `false` |
| `skills` | Yes | `["./skills/<name>"]` |
| `category` | No | e.g. `"development"` |
| `keywords` | No | Improves discoverability |

## Component Types

| Component | Location | When to add |
|---|---|---|
| Skill instructions | `skills/<name>/SKILL.md` | Always |
| Human docs | `skills/<name>/README.md` | Non-trivial setup |
| Templates / checklists | `skills/<name>/references/*.md` | Agent needs reusable scaffolds |

## Common Mistakes

| Mistake | Fix |
|---|---|
| Editing `dist/` directly | Edit `skills/`, then `cp -r` to sync |
| Forgetting to sync after edits | Always run `cp -r` before committing |
| Co-author trailer in commit | Use `-s` (`--signoff`) — no `Co-Authored-By:` |
| Workflow summary in description | Description = triggering conditions only |
| Leaving `[FILL]` placeholders in SKILL.md | Run quality check before committing |
| Missing `.codex-plugin/plugin.json` | `codex plugin add` will fail with "missing plugin.json" |
| Wrong `skills` path in plugin.json | Must be `"./skills/<name>"` starting with `./` |
