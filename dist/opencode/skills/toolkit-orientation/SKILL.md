---
name: toolkit-orientation
description: Use when landing in jabworks/agentic-toolkit with no context — mapping skills/ vs dist/plugins/ vs dist/opencode/ vs packages/, which tree is editable, how bundles (condux, toolkit-ops) nest, which docs to trust, and where NOT to write. Triggers include "how is this repo organized", "where do skills live", "what is dist for", "which files are generated", "where do I edit this skill".
---

# Toolkit Orientation

## Purpose

Give a zero-context session a fast, correct mental model of this repo: the one
editable source tree, the three generated distribution trees it feeds, the npm
workspace, the manifest pairing, bundle nesting, and the trust order of docs.

## When to use

- First contact with this repo in a session.
- Unsure which of two similar-looking paths is the editable one.
- Deciding where a new file belongs.
- A doc and the disk disagree and you need to know which wins.

## When not to use

- Actually creating/registering/publishing a skill → `toolkit-foundry`.
- Writing or reviewing the SKILL.md content itself → `toolkit-skill-standards`.
- Diagnosing a misbehaving skill or plugin → `toolkit-debugging-playbook`.
- Manifest field-level schema questions → `toolkit-plugin-reference`.

## Inputs required

A checkout of the repo. Nothing else — this skill assumes zero prior context.

## Procedure

1. **One source, three distributions.** `skills/<name>/` is the ONLY editable skill
   source. Every other tree carrying a SKILL.md is a build artifact:

   | Tree | Consumed by | Produced by |
   |---|---|---|
   | `skills/<name>/` | `npx skills add jabworks/agentic-toolkit` | hand-edited — this is the source |
   | `dist/plugins/<plugin>/skills/…` | `/plugin install …@jabworks-agentic-toolkit` | `scripts/sync.sh` (rsync `--delete`) |
   | `dist/opencode/skills/<name>/` | OpenCode | `scripts/build-opencode.mjs` |

   `scripts/sync.sh` invokes the OpenCode build itself (both the one-skill and the
   sync-everything branch), so one command refreshes every generated destination —
   the two dist trees above, `dist/plugins/condux/agents/`, and the npm package's
   `agents/` and bundled `skills/` (step 2). The only
   hand-edited files under `dist/` are the paired plugin manifests
   (`.claude-plugin/plugin.json` + `.codex-plugin/plugin.json`), which have no
   `skills/` source. The OpenCode tree has no manifests at all — that host routes
   on `description` alone, which is why the build folds `when_to_use` into it.

2. **The npm workspace.** `packages/condux-opencode/` publishes `@jabworks/condux`,
   the OpenCode plugin that injects the condux specialist agents via the config
   hook. Its `index.js` and `package.json` are hand-edited; its `agents/` dir is
   generated from `skills/subagent-execution/agents/*.md` and its `skills/` dir
   (the 13 bundled condux skills) from `skills/<name>/`, both by the same
   `scripts/build-opencode.mjs`. Publishing runs on changesets — add a
   `.changeset/*.md` with `pnpm changeset`, and `.github/workflows/release.yml`
   opens the version PR and publishes to npm via OIDC trusted publishing (no
   `NPM_TOKEN`). The root `package.json` must NOT carry `"type": "module"` — it
   would break the CommonJS reference scripts under `skills/*/references/`.

3. **Bundles vs standalone.** A standalone skill mirrors to
   `dist/plugins/<name>/skills/<name>/`. A bundle-member skill mirrors to
   `dist/plugins/<bundle>/skills/<bundle>/<name>/`. Current bundles: `condux`
   (dev-workflow skills, plus plugin-level `agents/` and `hooks/` dirs) and
   `toolkit-ops` (this bundle — repo-maintenance skills). `scripts/sync.sh`
   auto-detects the target; skills with no dist target are SKIPped, not synced.

4. **The registry.** `.claude-plugin/marketplace.json` at repo root lists every
   installable plugin. Entries carry `name/description/author/source/category` — no
   version field. Versions live in the paired plugin.json manifests. It governs the
   marketplace channel only; `npx skills add` and OpenCode never read it.

5. **Docs trust order** (highest first): the disk itself → `tests/` (executable
   doctrine, run `node --test`) → `skills/toolkit-foundry/SKILL.md` (authoring runbook)
   → CLAUDE.md → README.md. Docs here lag disk by hours-to-weeks; skills get renamed
   without warning (commit 0b88ab2 renamed two mid-session on 2026-07-08).

6. **Where not to write.** `~/.claude/` (user config), repo-root `.claude/`
   (local settings only), `.remember/` (session history), and every generated
   tree — the next `scripts/sync.sh` clobbers all five:
   `dist/plugins/*/skills/`, `dist/plugins/condux/agents/` (the plugin-level
   agent mirror — the `6ba6572` drift lived exactly here),
   `dist/opencode/skills/`, `packages/condux-opencode/agents/`, and
   `packages/condux-opencode/skills/` (the bundled condux skills —
   `rm -rf`'d and rebuilt on every run).
   `docs/plans/` holds design docs; `distillation/` holds the 2026-07-08 audit
   trail.

7. **Verify before relying.** Run: `ls skills/` (live inventory — a dir listing of
   names, but check SKILL.md exists before treating a dir as a real skill),
   `git log --oneline -5` (recent movement), `node --test` (all invariants).

## Porting this system elsewhere

Standing up another toolkit (e.g. a company fork) from this one? The bundle's
skills do NOT install elsewhere as-is (their trigger contracts and facts are
deliberately scoped to this repo) — follow `references/porting.md`: what ports
verbatim, what ports as doctrine, what must start empty.

## Evidence required

Answer repo questions from paths and command output produced this session — never from
memory of "how it looked last time." This repo demonstrably changes mid-session.

## Output artifact

None — orientation is knowledge. Route follow-up work to `toolkit-foundry` (create),
`toolkit-change-control` (ship), or `toolkit-debugging-playbook` (fix).

## Common traps

- Editing a dist/ skill tree because "that's where the plugin is" — the next
  `scripts/sync.sh` silently overwrites it (rsync `--delete`, and
  `build-opencode.mjs` `rm -rf`s its three outputs — including
  `packages/condux-opencode/skills/` — before regenerating).
- Treating a directory's existence as proof a skill exists — check for SKILL.md; git
  doesn't track empty dirs, so `git status` won't warn you.
- Assuming "skills synced = everything synced" — condux also mirrors a plugin-level
  `agents/` dir that skill-tree syncing does not reach.
- Reading `dist/opencode/skills/<name>/SKILL.md` to answer "what does this skill
  say" — its frontmatter is transformed (`when_to_use` folded into `description`
  and dropped). Read `skills/<name>/SKILL.md`.
- Treating `packages/condux-opencode/agents/` as editable because it isn't under
  `dist/` — it's generated too; the source is
  `skills/subagent-execution/agents/`.

## Bad behavior this prevents

Editing `skills/subagent-execution/agents/*.md`, running sync, and shipping — while
`dist/plugins/condux/agents/` (the copy Claude Code actually loads) stays stale. That
exact drift shipped once and needed commit `6ba6572` plus a dedicated invariant test to
fix; orientation names the special mirror so no session re-discovers it the hard way.

## Related skills

`toolkit-foundry` (create/register/sync/publish — the canonical checklist),
`toolkit-skill-standards` (content and trigger bar for what you author),
`toolkit-change-control` (is it shipped?), `toolkit-debugging-playbook` (it broke),
`toolkit-plugin-reference` (manifest schemas), `workflow` (condux router + operating rules).

## Provenance and maintenance

Re-verify volatile claims with:
- `ls skills/` — live skill inventory
- `node --test` — mirror parity + all invariants
- `jq -r '.plugins[].name' .claude-plugin/marketplace.json` — registered plugins
- `ls dist/opencode/skills/ packages/` — the generated OpenCode tree and the
  npm workspace
- `git status --short` after `bash scripts/sync.sh` — anything dirty was a tree
  someone hand-edited

Last generated: 2026-07-08 (three-channel + packages/ revision 2026-07-23; bundled
condux skills tree added to the generated list 2026-08-04)
Known uncertainty:
- `.claude/skills/` does not exist today; a future third-party plugin install could
  create it — it would be an installed-plugin mirror, still not this repo's source.
- `dist/opencode/` is named for the only host that reads it today. A second
  generated skill channel would force a host-neutral rename of that tree —
  none is planned, so the name stands.
