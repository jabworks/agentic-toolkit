# Release Skill — Design

> Date: 2026-07-08 · Discovery sign-off pending browser review · Owner: Hiếu

## What & Why

A standalone `release` skill that cuts releases safely: detect the repo's release
machinery, always dry-run, execute on one confirm. Closes the SDLC release gap
condux deliberately stops short of (git-commit halts before push; CP-3 has no
release route). Demand evidence: the toolkit's own release flow was executed by
hand ~8 times on 2026-07-08, once shipping a broken commit for lack of a gate.

## Approach Chosen

**Detection-first runbook** (pure SKILL.md router, zero scripts — the git-family
precedent set by git-commit and git-operations). Rejected: script-driven
(`release.sh`) — more deterministic but rigid exactly where release flows vary
most, and heavier than the family precedent warrants.

## Owner Decisions (discovery Q&A, 2026-07-08)

1. **v1 scope**: both toolkit and generic GitHub projects, via router.
2. **Placement**: standalone plugin in the git family (not a condux member).
3. **Autonomy**: dry-run first, then ONE confirm executes the whole sequence.
4. **Notes**: generated from conventional commits — AND detect changesets: where
   `.changeset/` exists, changesets owns versioning + CHANGELOG; never hand-tag
   on top of it.

## Section 1 — Identity & Placement

- `skills/release/` + `dist/plugins/release/skills/release/`; both manifests
  (`interface` in both, v1.0.0); marketplace entry; README + CLAUDE.md rows.
- Cross-links: `git-commit` (stops before push by design) points forward to
  `/release`; condux `workflow` CP-3 gains a "Cut a release" row (condux minor
  bump in the same changeset).

## Section 2 — Trigger Contract

- description: "Use when cutting a release — tagging a version, pushing tags,
  publishing a GitHub release, or shipping this toolkit's plugins…" Triggers:
  "cut a release", "release v1.2.3", "tag and publish", "ship a new version".
- When NOT: committing → `git-commit`; undo/recovery → `git-operations`;
  publish-READINESS gating → `toolkit-change-control` (it gates, release
  executes); deploys → out of scope.

## Section 3 — The Router (first match wins)

1. **AGENTS.md `release:` section** → follow verbatim (project override wins —
   the finalize pattern).
2. **Changesets** (`.changeset/` present) → changesets owns versions/CHANGELOG.
   `changeset status` first; if a changesets GitHub action manages
   Version-Packages PRs, the release IS merging that PR — guide, never
   hand-tag. Otherwise `changeset version` → confirm → `changeset publish`.
3. **This toolkit** (`.claude-plugin/marketplace.json` present) → suite green →
   `claude plugin tag dist/plugins/<name>` (natively validates version vs
   marketplace) → push tag → `gh release create --generate-notes` → remind the
   installed-cache doctrine (a4f4aa8).
4. **Generic GitHub project** → semver proposal from conventional commits since
   `git describe --tags` → annotated tag → push → `gh release create
   --generate-notes`. npm publish does NOT happen on this branch — only via
   changesets or explicit AGENTS.md instruction.

## Section 4 — Dry-Run → One Confirm

Before touching anything, present the release plan: detected machinery, current
→ proposed version + commit-derived reasoning, commit list since last release,
real notes preview (`gh api …/releases/generate-notes` — renders without
creating), exact command sequence, per-step rollback path. One yes executes the
sequence; any failure stops with a state report (what happened, what's
reversible).

## Section 5 — Guards (adopted from claude-sdlc-wizard's post-mortems)

Refuse to proceed unless ALL hold, each failure naming its fix:
- working tree clean
- HEAD is ancestor of origin/main (`git merge-base --is-ancestor`)
- project test gate green (AGENTS.md command, or `node --test` here)
- tag matches manifest/package version; tag does not already exist
- `--force` is banned everywhere; no history rewrites

## Section 6 — Evidence & Structure

Every step prints its verification; final output = release URL + rollback
commands. Load-bearing constraints documented inline with their reasons.
Files: `SKILL.md` (runbook + router), `references/rollback.md` if the rollback
matrix outgrows one scan, `evals/trigger_eval.json` (≥20 queries incl.
collisions vs git-commit / git-operations / toolkit-change-control).

## Out of Scope (v1)

Deploys (servers/k8s), GitLab/Bitbucket (router branch reserved), CHANGELOG.md
curation outside changesets, monorepo multi-package orchestration beyond
changesets, npm publish outside changesets/AGENTS.md.

## Open Questions

None blocking. Deferred: whether CP-3's "Cut a release" row should detect the
skill's absence gracefully (plugin may not be installed everywhere).
