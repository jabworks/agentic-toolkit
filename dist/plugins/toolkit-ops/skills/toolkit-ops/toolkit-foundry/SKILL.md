---
name: toolkit-foundry
description: Use when creating a new skill for jabworks/agentic-toolkit, registering it in the marketplace, syncing the generated dist trees, changing the @jabworks/condux npm package, or bumping the toolkit version. Not for adapting a generic skill to Harvey's stack; use adapting-skills.
---

# Toolkit Foundry

> Adapted from [softaworks/agent-toolkit `plugin-forge`](https://github.com/softaworks/agent-toolkit/tree/main/skills/plugin-forge)

## Purpose

Create and maintain skills in `jabworks/agentic-toolkit`. Covers scaffolding, marketplace registration, generation of the dist trees, the npm package, and publishing.

## When to Use

- Adding a new skill to the toolkit
- Updating an existing skill and regenerating the dist trees
- Registering or modifying a marketplace entry
- Changing `packages/condux-opencode/` (the `@jabworks/condux` npm plugin)
- Bumping the toolkit version

## Skill Structure

Source tree (editable):
```
skills/<name>/
  SKILL.md              # Required — agent instruction file
  README.md             # Optional — human docs
  references/           # Optional — templates, checklists
    <file>.md
    package.json        # Only if references/ ships .js — see "CommonJS scripts"
```

One source, three generated distributions — `scripts/sync.sh` produces all of them:

| Generated tree | Channel | Layout |
|---|---|---|
| `dist/plugins/<name>/skills/<name>/` | `/plugin install` (marketplace) | mirrors `skills/<name>/` byte-for-byte |
| `dist/opencode/skills/<name>/` | OpenCode | same files, but `SKILL.md` has `when_to_use` folded into `description` |
| `packages/condux-opencode/agents/` | `@jabworks/condux` on npm | translated from `skills/subagent-execution/agents/*.md` |

`npx skills add` is the fourth channel and needs no generation — it installs from
top-level `skills/` directly and ignores everything above.

Bundle-member skills mirror to `dist/plugins/<bundle>/skills/<bundle>/<name>/` instead
(e.g. the condux and toolkit-ops bundles). The OpenCode tree is flat — one dir per
skill, no bundle nesting, no manifests.

**Never edit a generated tree directly.** Edit `skills/`, then sync.

### CommonJS scripts under `references/`

The root `package.json` must NOT carry `"type": "module"` — it would reinterpret
every `references/*.js` reference script as ESM and break it. Skills that ship
such scripts also self-protect with their own `references/package.json`:

```json
{ "type": "commonjs" }
```

`discovery`, `plan-review`, and `spec-browser` carry one (`f1e4b53`). Add it to any
new skill whose `references/` contains `.js`. CI syntax-checks every one with
`node --check`.

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

### 5. Sync the generated trees

```bash
bash scripts/sync.sh <name>
```

The script auto-detects whether the skill belongs to a bundle (any
`dist/plugins/<p>/skills/<p>/<name>` target, e.g. condux or toolkit-ops) or a
standalone plugin and copies to the right target. Run without arguments to sync
everything.

Either way it then runs `node scripts/build-opencode.mjs`, which regenerates
**all** of `dist/opencode/skills/` and `packages/condux-opencode/agents/` from
scratch — one command covers every generated tree, so never invoke the two
separately expecting different results.

A brand-new skill has no `dist/plugins/` target until step 1 scaffolds one; sync
prints `SKIP` and moves on. The OpenCode build has no such gate — it picks up
every dir under `skills/` unconditionally.

### 6. Verify

```bash
node --test
```

Runs the invariant suite. What each file guards:

| Test | Guards |
|---|---|
| `dist-mirror` | `dist/plugins/` skill trees match `skills/` byte-for-byte |
| `opencode-dist` | `dist/opencode/skills/` + `packages/condux-opencode/agents/` match the build script's output; merged descriptions within OpenCode's 1024-char cap; the plugin loads and never clobbers user-defined agents |
| `skill-invariants` | frontmatter budgets, kebab-case `name` == dir, marketplace/plugin paths resolve, condux `agents/` mirror, plan-review no-egress |
| `plugin-manifests` | `plugin.json` / `marketplace.json` validity, `./`-prefixed paths |
| `manifest-parity` | the `.claude-plugin`/`.codex-plugin` pair agrees on name/version/skills; `interface` in both; `hooks` codex-only; trigger contract per skill |
| `docs-catalog` | every marketplace plugin appears in README.md and CLAUDE.md |
| `local-hooks` | warn-only — tells you this clone lacks the pre-commit hook |

CI runs the same command — a red suite here is a red build there.

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
git add skills/<name>/ dist/ packages/ .claude-plugin/marketplace.json
git commit -s -m "feat: add <name> skill"
git push origin main
```

Stage `dist/` as a whole, not `dist/plugins/<name>/` — the sync regenerated
`dist/opencode/` too, and leaving it out ships a drifted tree that
`opencode-dist.test.mjs` fails on. `packages/` is usually clean for a brand-new
skill (only agent-source edits dirty it), but staging it costs nothing and keeps
this command identical to the update flow below.

## Updating an Existing Skill

```bash
# 1. Edit skills/<name>/ files
# 2. Sync (mirrors dist/plugins, regenerates dist/opencode + package agents)
bash scripts/sync.sh <name>
# 3. Verify
node --test
# 4. Commit
git add skills/<name>/ dist/ packages/
git commit -s -m "fix: update <name> skill"
git push origin main
```

Editing `skills/subagent-execution/agents/*.md` touches three generated
destinations — `dist/plugins/condux/skills/`, `dist/plugins/condux/agents/`, and
`packages/condux-opencode/agents/`. One sync produces all three; stage all three.

An optional pre-commit hook automates the sync + dist staging — install it with
`bash scripts/install-hooks.sh`. It lives in `.git/hooks/` (not version-controlled),
so every fresh clone must install it again. **Never assume the hook is present.**

## Changing the npm Package

`packages/condux-opencode/` publishes `@jabworks/condux` — the OpenCode plugin that
injects the condux specialist agents. Its `agents/` dir is generated (edit
`skills/subagent-execution/agents/` instead); `index.js` and `package.json` are
hand-edited.

```bash
# 1. Edit packages/condux-opencode/index.js (or the agent sources + sync)
# 2. Describe the release
pnpm changeset          # pick @jabworks/condux, pick the bump, write the summary
# 3. Verify
node --test
# 4. Commit the changeset alongside the change
git add packages/ .changeset/
git commit -s -m "fix(opencode): <what changed>"
git push origin main
```

Pushing to `main` triggers `.github/workflows/release.yml`: changesets opens (or
updates) a version PR; merging that PR publishes to npm via OIDC trusted
publishing — there is no `NPM_TOKEN`. **Never hand-edit `version` in
`packages/condux-opencode/package.json`** — changesets owns it.

Two constraints that are easy to break:

- `index.js` must export the plugin **named only**. OpenCode calls every export as
  a plugin function, so a default re-export registers the hooks twice (`08cc554`).
- Keep generated `agents/` in the package's `files` array, or the published
  tarball ships a plugin with no agents.

## Version Bump

Two independent version schemes — don't confuse them:

| What | Where | How |
|---|---|---|
| Plugins (`condux`, `toolkit-ops`, standalone skills) | `version` in **both** paired plugin manifests, kept identical | hand-edited |
| `@jabworks/condux` | `packages/condux-opencode/package.json` | changesets only — never by hand |

`marketplace.json` entries carry no version field, and the OpenCode skill tree has
no version at all — it refreshes with the repo.

For plugins, short form: breaking install path = major, new skill/capability =
minor, anything else that ships = patch. The full bump policy — and the
cache-refresh rationale for bumping on ANY shipped change — has one home:
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
| Reference scripts | `skills/<name>/references/*.js` + `references/package.json` | Skill ships runnable helpers (CommonJS) |
| Trigger evals | `skills/<name>/evals/trigger_eval.json` | Skill needs a measured routing baseline |

## Common Mistakes

| Mistake | Fix |
|---|---|
| Editing `dist/` directly | Edit `skills/`, then `bash scripts/sync.sh <name>` |
| Editing `packages/condux-opencode/agents/` | Generated too — edit `skills/subagent-execution/agents/`, then sync |
| Forgetting to sync after edits | Run `bash scripts/sync.sh` — the pre-commit hook does it only if installed (`bash scripts/install-hooks.sh`); never assume it's present |
| Staging only `dist/plugins/` after a sync | Stage `dist/` and `packages/` — the same sync regenerated the OpenCode tree and the package agents |
| Shipping a `packages/` change with no changeset | Run `pnpm changeset` and commit the `.changeset/*.md` with the change, or nothing publishes |
| Hand-bumping `@jabworks/condux` version | Changesets owns that field — a manual bump collides with the version PR |
| Adding `"type": "module"` to the root `package.json` | Breaks every CommonJS reference script — the package is ESM-scoped at `packages/`, not repo-wide |
| `references/*.js` with no `references/package.json` | Add `{ "type": "commonjs" }` beside it |
| Co-author trailer in commit | Use `-s` (`--signoff`) — no `Co-Authored-By:` |
| Workflow summary in description | Description = triggering conditions only |
| Leaving `[FILL]` placeholders in SKILL.md | Run quality check before committing |
| Missing `.codex-plugin/plugin.json` | `codex plugin add` will fail with "missing plugin.json" |
| Missing `.claude-plugin/plugin.json` | Claude Code `/plugin install` won't find plugin metadata |
| Wrong `skills` path in plugin.json | Must be `"./skills/<plugin-dir-name>"` starting with `./` |
| Editing only one of the two plugin manifests | Edit the pair together — name/version/skills must match (tests/manifest-parity.test.mjs) |
| Skipping `node --test` before commit | CI runs the same suite and will fail the build — run it locally first |
