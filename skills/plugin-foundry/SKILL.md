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
mkdir -p dist/plugins/<name>/.claude-plugin
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

### 3. Write plugin manifests

Both agents read from the same plugin root (`dist/plugins/<name>/`) but look in different subdirectories.

**Codex** — `dist/plugins/<name>/.codex-plugin/plugin.json`:

```json
{
  "name": "<name>",
  "version": "1.0.0",
  "description": "<short description>",
  "author": { "name": "jabworks" },
  "repository": "https://github.com/jabworks/agentic-toolkit",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "skills": "./skills/<name>",
  "interface": {
    "displayName": "<Display Name>",
    "shortDescription": "<one line>",
    "longDescription": "<two sentences>",
    "developerName": "jabworks",
    "category": "Productivity",
    "capabilities": ["Skills"],
    "defaultPrompt": ["<prompt 1>", "<prompt 2>"]
  }
}
```

**Claude Code** — `dist/plugins/<name>/.claude-plugin/plugin.json`: identical structure; change only the `description` prefix to "Claude Code skill for...".

The `skills` path is relative to the plugin root and must start with `./`.

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
bash scripts/sync.sh <name>
```

The script auto-detects whether the skill belongs to the condux bundle or a standalone plugin and copies to the right target. Run without arguments to sync everything.

### 7. Commit and push

```bash
git add skills/<name>/ dist/plugins/<name>/ .claude-plugin/marketplace.json
git commit -s -m "feat: add <name> skill"
git push origin main
```

## Updating an Existing Skill

```bash
# 1. Edit skills/<name>/ files
# 2. Sync (or just commit — the pre-commit hook syncs automatically)
bash scripts/sync.sh <name>
# 3. Commit
git add skills/<name>/
git commit -s -m "fix: update <name> skill"
# dist/ is staged automatically by the pre-commit hook
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
| Editing `dist/` directly | Edit `skills/`, then `bash scripts/sync.sh <name>` |
| Forgetting to sync after edits | The pre-commit hook syncs automatically — or run `bash scripts/sync.sh` manually |
| Co-author trailer in commit | Use `-s` (`--signoff`) — no `Co-Authored-By:` |
| Workflow summary in description | Description = triggering conditions only |
| Leaving `[FILL]` placeholders in SKILL.md | Run quality check before committing |
| Missing `.codex-plugin/plugin.json` | `codex plugin add` will fail with "missing plugin.json" |
| Missing `.claude-plugin/plugin.json` | Claude Code `/plugin install` won't find plugin metadata |
| Wrong `skills` path in plugin.json | Must be `"./skills/<name>"` starting with `./` |
