---
name: toolkit-foundry
description: Use when creating a new skill for jabworks/agentic-toolkit, registering it, or shipping the generated trees — "scaffold a new skill", "register this skill", "sync dist", "bump the toolkit version" — plus changes to the @jabworks/condux npm package. Not for adapting a generic skill to the jabworks stack (adapting-skills), nor for reviewing a SKILL.md's content and trigger wording (toolkit-skill-standards).
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

One source, four generated distributions — `scripts/sync.sh` produces all of them:

| Generated tree | Channel | Layout |
|---|---|---|
| `dist/plugins/<name>/skills/<name>/` | `/plugin install` (marketplace) | mirrors `skills/<name>/` byte-for-byte |
| `dist/opencode/skills/<name>/` | OpenCode | same files, but `SKILL.md` has `when_to_use` folded into `description` |
| `dist/cursor/skills/<name>/` | Cursor (2.4+) | the same fold, emitted to its own tree by `scripts/build-cursor.mjs` |
| `packages/condux-opencode/agents/` | `@jabworks/condux` on npm | translated from `skills/subagent-execution/agents/*.md` |
| `packages/condux-opencode/skills/` | `@jabworks/condux` on npm | the 13 condux skills, byte-identical to their `dist/opencode/skills/` form |

`npx skills add` is the remaining channel and needs no generation — it installs from
top-level `skills/` directly and ignores everything above.

**Every skills tree is flat — one dir per skill, no bundle nesting.** A
bundle-member skill mirrors to `dist/plugins/<bundle>/skills/<name>/`, the same
depth as a standalone plugin's own skill. This changed on 2026-08-14 with Agent
Plugins conformance (docket #29): the spec discovers skills only as immediate
children of `skills/`, never recursively, so the old
`dist/plugins/<bundle>/skills/<bundle>/<name>/` nesting hid every bundle member
from spec-conformant clients. `tests/agent-plugins.test.mjs` now pins depth one.
The OpenCode and Cursor trees were always flat, and carry no manifests.

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
```

The dist skill tree is not in that list on purpose — `sync.sh` creates it. It
used to be listed, and creating it by hand was load-bearing: rsync cannot make
nested parents, so a new plugin whose tree was missing failed the copy while
sync still printed `0 failed` (docket #31).

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

**Claude Code** — `dist/plugins/<name>/.claude-plugin/plugin.json`: same structure **minus `interface`** — that field is codex-manifest-only (since 2026-07-29; `manifest-parity` fails if the Claude manifest carries it). `description` may carry the platform prefix ("Claude Code skill for..."), while `name`/`version`/`skills` must match the Codex manifest exactly (enforced by tests/manifest-parity.test.mjs).

The `skills` path is relative to the plugin root and must start with `./`.

### 4. Declare in composition.json

`composition.json` (repo root) is the source of truth for what every plugin is
made of. Register the skill there — never hand-edit
`.claude-plugin/marketplace.json` or the catalog tables in README.md /
CLAUDE.md; sync generates all of them from the declaration
(`scripts/generate-catalogs.mjs`).

- **Standalone plugin:** add a `plugins.<name>` entry with
  `marketplace.description` (the marketplace text — deliberately independent
  of the SKILL.md description, a ratified divergence).
- **Bundle member:** add the skill name to the bundle's `skills` array.
- **Either way:** add a catalog row — `catalogs.readme-skills` (or the
  bundle's block) and, for a new plugin, a `catalogs.claude-md-skills` row.
  A plugin with no catalog row fails validation before anything is written.
- A plugin-level dir loaded from the plugin root (like condux `agents/` /
  `hooks/` or docket `server/`) is one `pluginDirs` entry — data, not a new
  sync.sh case.

### 5. Sync the generated trees

```bash
bash scripts/sync.sh <name>
```

The script copies every pair `composition.json` declares for the skill —
bundle membership, standalone target, and any plugin-level dirs — then
regenerates `marketplace.json` and the doc catalog blocks. Run without
arguments to sync everything. A skill missing from the declaration is a hard
error, so step 4 must land first.

Either way it then runs both variant builds. `node scripts/build-opencode.mjs`
regenerates **all** of `dist/opencode/skills/`, `packages/condux-opencode/agents/`,
and `packages/condux-opencode/skills/` from scratch (the last two are `rm -rf`'d
first); `node scripts/build-cursor.mjs` regenerates `dist/cursor/skills/` the same
way, importing the fold transform from the OpenCode script rather than duplicating
it. One `sync.sh` covers every generated tree, so never invoke the pieces
separately expecting different results, and never hand-edit any of the four.

A brand-new skill that step 4 has not declared fails the sync outright (the
old behavior — a silent `SKIP` — is exactly the quiet failure the declaration
replaced). Neither variant build has such a gate — both pick up every dir under
`skills/` unconditionally.

### 6. Verify

```bash
node --test
```

Runs the invariant suite. What each file guards:

| Test | Guards |
|---|---|
| `dist-mirror` | `dist/plugins/` skill trees match `skills/` byte-for-byte |
| `opencode-dist` | `dist/opencode/skills/` + `packages/condux-opencode/agents/` match the build script's output; merged descriptions within OpenCode's 1024-char cap; the plugin loads and never clobbers user-defined agents |
| `cursor-dist` | `dist/cursor/skills/` matches `build-cursor.mjs` output; no orphaned dirs; `when_to_use` never survives; frontmatter `name` == folder (Cursor requires it); merged descriptions ≤ 1024 chars |
| `agent-plugins` | each plugin's root `plugin.json` matches the generator and stays inside the spec's closed schema; every skill sits at `skills/` depth one; docket's spec `mcp.json` keeps the spec dialect |
| `composition` | every pair `composition.json` declares mirrors byte-for-byte; nothing undeclared in any `dist/plugins/` root; marketplace.json + doc catalog blocks match the generator |
| `skill-invariants` | frontmatter budgets, kebab-case `name` == dir, marketplace/plugin paths resolve, plan-review no-egress |
| `plugin-manifests` | `plugin.json` / `marketplace.json` validity, `./`-prefixed paths |
| `manifest-parity` | the `.claude-plugin`/`.codex-plugin` pair agrees on name/version/skills; `interface` codex-only (absent from the Claude manifest); `hooks` codex-only; trigger contract per skill |
| `skill-routing-contracts` | mutually-guarded trigger pairs name each other in frontmatter |
| `scaffold` / `script-safety` / `annotate-server` / `browser-security` / `session-report` | shipped reference scripts: syntax, no-egress, server behavior |
| `concord-*` (4 files) | the concord plugin's store, rollout sync, paths, budget |
| `local-hooks` | warn-only — tells you this clone lacks the pre-commit hook |

CI runs the same command — a red suite here is a red build there.

Optionally also run the official validator:

```bash
claude plugin validate dist/plugins/<name> --strict
```

Use `--strict` — expect a clean pass, no warnings. (`interface` moved to the Codex
manifest on 2026-07-29 precisely so `--strict` passes clean; see
`toolkit-plugin-reference`.) Anything it reports is a real problem.

### 7. Commit and push

```bash
git add skills/<name>/ dist/ packages/ composition.json .claude-plugin/marketplace.json README.md CLAUDE.md
git commit -s -m "feat: add <name> skill"
git push origin main
```

Stage `dist/` as a whole, not `dist/plugins/<name>/` — the sync regenerated
`dist/opencode/` and `dist/cursor/` too, and leaving either out ships a drifted
tree that `opencode-dist.test.mjs` / `cursor-dist.test.mjs` fails on.
`packages/` is usually clean for a brand-new
skill (only agent-source edits dirty it), but staging it costs nothing and keeps
this command identical to the update flow below.

## Updating an Existing Skill

```bash
# 1. Edit skills/<name>/ files
# 2. Sync (mirrors dist/plugins, regenerates dist/opencode + dist/cursor + package agents)
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

**Condux changes go on a branch — never straight to `main`.** A push to `main` is
what arms the release, so committing there does the review and the release
trigger in one irreversible step. Branch, PR, merge.

```bash
# 1. Branch first
git switch -c <type>/condux-<what>
# 2. Edit packages/condux-opencode/index.js (or the agent sources + sync)
# 3. Describe the release
pnpm changeset          # pick @jabworks/condux, pick the bump, write the summary
# 4. Verify
node --test
# 5. Commit the changeset alongside the change
git add packages/ .changeset/
git commit -s -m "fix(opencode): <what changed>"
git push -u origin HEAD
gh pr create --fill
```

Merging that PR into `main` triggers `.github/workflows/release.yml`: changesets
opens (or updates) a **version PR** that consumes the `.changeset/*.md` files and
bumps `version`. Merging *that* second PR is what actually publishes to npm, via
OIDC trusted publishing — there is no `NPM_TOKEN`. Two merges, not one.
**Never hand-edit `version` in `packages/condux-opencode/package.json`** —
changesets owns it.

A change with no changeset still merges and still ships to the marketplace
channel — it just never reaches npm. Nothing warns you. If the change alters what
the published tarball contains, it needs a changeset.

That includes **editing `skills/subagent-execution/agents/*.md`**: those regenerate
`packages/condux-opencode/agents/`, which is inside the package's `files` array, so
an agent-wording tweak is a published change like any other.

Constraints that are easy to break:

- `index.js` must export the plugin **named only**. OpenCode calls every export as
  a plugin function, so a default re-export registers the hooks twice (`08cc554`).
- Keep generated `agents/` in the package's `files` array, or the published
  tarball ships a plugin with no agents.
- Keep `publishConfig.provenance` set to `true`. It is what makes releases carry a
  signed attestation tying the tarball to the workflow run and commit; the
  workflow's `id-token: write` permission is necessary but not sufficient on its
  own. `0.1.0` predates it and has none — verify with
  `npm view @jabworks/condux dist.attestations`.

## Version Bump

Two independent version schemes — don't confuse them:

| What | Where | How |
|---|---|---|
| Plugins (`condux`, `toolkit-ops`, standalone skills) | `version` in **both** paired plugin manifests, kept identical | hand-edited |
| `@jabworks/condux` | `packages/condux-opencode/package.json` | changesets only — never by hand |

`marketplace.json` entries carry no version field, and neither variant skill tree
(`dist/opencode/`, `dist/cursor/`) has a version at all — both refresh with the repo.

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
| Staging only `dist/plugins/` after a sync | Stage `dist/` and `packages/` — the same sync regenerated the OpenCode tree, the Cursor tree, and the package agents |
| Pointing a Cursor install at top-level `skills/` | Use `dist/cursor/skills/` — Cursor never reads `when_to_use`, so raw source skills load with a thin trigger and fail silently |
| Committing a condux change straight to `main` | Branch first — a push to `main` arms the release, so main-first collapses review and release into one irreversible step |
| Shipping a `packages/` change with no changeset | Run `pnpm changeset` and commit the `.changeset/*.md` with the change, or nothing publishes |
| Assuming an agent-wording tweak needs no changeset | It regenerates `packages/condux-opencode/agents/`, which is published — it does |
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
