---
name: toolkit-foundry
description: Use when creating a new skill for jabworks/agentic-toolkit, registering it in the marketplace, syncing the dist mirror, or bumping the toolkit version. Not for adapting a generic skill to Harvey's stack; use adapting-skills.
---

# Toolkit Foundry

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

Marketplace install source (what `/plugin install` reads — must mirror `skills/<name>/`;
`npx skills add` installs from top-level `skills/` directly and ignores `dist/`):
```
dist/plugins/<name>/skills/<name>/
  SKILL.md
  references/
```

Bundle-member skills mirror to `dist/plugins/<bundle>/skills/<bundle>/<name>/` instead
(e.g. the condux and toolkit-ops bundles).

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

**Claude Code** — `dist/plugins/<name>/.claude-plugin/plugin.json`: identical structure; `description` (and `interface` wording) may carry the platform prefix ("Claude Code skill for..."), while `name`/`version`/`skills` must match the Codex manifest exactly (enforced by tests/manifest-parity.test.mjs).

The `skills` path is relative to the plugin root and must start with `./`.

### 4. Register in marketplace.json

Add an entry to `.claude-plugin/marketplace.json` — this is exactly the field set every
existing entry uses, no more:

```json
{
  "name": "<name>",
  "description": "<short description>",
  "author": { "name": "Hieu Vi" },
  "source": "./dist/plugins/<name>",
  "category": "development"
}
```

### 5. Sync to dist/

```bash
bash scripts/sync.sh <name>
```

The script auto-detects whether the skill belongs to a bundle (any
`dist/plugins/<p>/skills/<p>/<name>` target, e.g. condux or toolkit-ops) or a
standalone plugin and copies to the right target. Run without arguments to sync
everything.

### 6. Verify

```bash
node --test
```

Runs the invariant suite: dist mirror byte-parity, frontmatter budgets, manifest
validity and pair parity, marketplace path resolution. CI runs the same command — a
red suite here is a red build there.

Optionally also run the official validator:

```bash
claude plugin validate dist/plugins/<name>
```

Expect exactly one warning — the Codex-native `interface` field is unknown to Claude
Code and ignored at load time (verified 2026-07-08; see `toolkit-plugin-reference`).
Anything else it reports is a real problem. Don't use `--strict` (it fails on that
known warning).

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
bash scripts/sync.sh <name>
# 3. Verify
node --test
# 4. Commit
git add skills/<name>/ dist/
git commit -s -m "fix: update <name> skill"
git push origin main
```

An optional pre-commit hook automates the sync + dist staging — install it with
`bash scripts/install-hooks.sh`. It lives in `.git/hooks/` (not version-controlled),
so every fresh clone must install it again. **Never assume the hook is present.**

## Version Bump

Update `version` in **both** plugin manifests, kept identical (`marketplace.json`
entries carry no version field). Short form: breaking install path = major, new
skill/capability = minor, anything else that ships = patch. The full bump policy —
and the cache-refresh rationale for bumping on ANY shipped change — has one home:
`toolkit-change-control`.

## Marketplace Entry Fields

The step-4 template above is the complete field set — the schema of record for
marketplace entries and both plugin.json variants is `toolkit-plugin-reference`.
Add nothing from upstream examples (`strict` / `skills` / `keywords` are not used
in this repo's marketplace.json).

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
| Forgetting to sync after edits | Run `bash scripts/sync.sh` — the pre-commit hook does it only if installed (`bash scripts/install-hooks.sh`); never assume it's present |
| Co-author trailer in commit | Use `-s` (`--signoff`) — no `Co-Authored-By:` |
| Workflow summary in description | Description = triggering conditions only |
| Leaving `[FILL]` placeholders in SKILL.md | Run quality check before committing |
| Missing `.codex-plugin/plugin.json` | `codex plugin add` will fail with "missing plugin.json" |
| Missing `.claude-plugin/plugin.json` | Claude Code `/plugin install` won't find plugin metadata |
| Wrong `skills` path in plugin.json | Must be `"./skills/<plugin-dir-name>"` starting with `./` |
| Editing only one of the two plugin manifests | Edit the pair together — name/version/skills must match (tests/manifest-parity.test.mjs) |
| Skipping `node --test` before commit | CI runs the same suite and will fail the build — run it locally first |
