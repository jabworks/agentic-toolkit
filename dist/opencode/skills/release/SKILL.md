---
name: release
description: "Use when cutting a release — tagging a version, pushing tags, publishing a GitHub release, or shipping this toolkit's plugins. Detects the repo's release machinery (AGENTS.md release section, changesets, claude plugin tag, plain git tag + gh release), always shows a dry-run plan first, and executes only on one confirm. Triggers include \"cut a release\", \"release v1.2.3\", \"tag and publish\", \"ship a new version\", \"whats in the next release\". Cutting the release itself. Not for deciding a plugin or skill's semver bump beforehand — that's toolkit-change-control; in jabworks/agentic-toolkit, run that gate first and release the version it picks. Not for everyday undo/recovery git work — that's git-operations."
---

# /release

One dry-run, one confirm, one release. Never a force-push, never a guess.

## Usage

```
/release                 # detect machinery, propose the next version
/release v1.4.0          # explicit version
/release minor           # bump hint
```

## When NOT to use

- Committing the work → `git-commit` (it stops before push; this skill starts
  after the commits exist).
- Undo / discard / stash / recovery → `git-operations`.
- "Is this toolkit change *ready* to publish?" → `toolkit-change-control` gates;
  this skill executes.
- Deploying to servers or infrastructure — out of scope.

## Guards — all must pass before anything else

Each failure names its fix and ends the attempt. **`--force` is banned. History
rewrites are banned.**

```
□ Working tree clean              → commit (git-commit) or park it (git-operations)
□ HEAD is an ancestor of main    → git merge-base --is-ancestor HEAD origin/main
                                    (merge first — tags on dead branches haunt forever)
□ Test gate green                 → AGENTS.md test/finalize command; node --test here
□ Version consistent              → tag must equal the manifest/package version
                                    (claude plugin tag validates this natively)
□ Tag doesn't already exist       → git tag -l <tag>; git ls-remote --tags origin
□ gh authenticated                → gh auth status
```

## The Router — first match wins

1. **AGENTS.md `release:` / `## Release` section** → follow the project's own
   process verbatim. The project override always wins.
2. **Changesets** (`.changeset/` exists) → changesets owns versioning and the
   CHANGELOG — never hand-tag on top of it:
   - `npx changeset status` to see what's pending.
   - If a changesets GitHub Action manages "Version Packages" PRs, the release
     **is** merging that PR — guide the user there and stop.
   - Otherwise: `npx changeset version` → show the diff → confirm →
     `npx changeset publish` → `git push --follow-tags`.
3. **This toolkit** (`.claude-plugin/marketplace.json` exists) — **plugin
   releases are automated; do not hand-tag**:
   - Merging to `main` runs `.github/workflows/plugin-release.yml`, which calls
     `scripts/release-plugins.mjs --since <push-base> --execute`: every plugin
     version *introduced by that push* gets its `<name>--v<version>` tag and a
     GitHub release, with notes from the commits that touched its dist tree.
     CI never backfills — a gap stays a gap until someone runs `--initial`.
   - The release *is* merging the PR. Confirm the version bump landed and stop.
   - Before committing a bump: `node scripts/release-plugins.mjs` to see the
     plan, and `--write-changelog` to regenerate `CHANGELOG.md` — a test fails
     when a shipped version has no entry.
   - Versions on an unmerged branch are held back by design; the script refuses
     to release a commit that is not on the default branch.
   - If a tag lands but its release does not (they are two calls, and the
     second can fail alone), `--repair` creates the missing releases. A tag
     with no release is otherwise stranded forever.
   - Hand-tagging remains the fallback if the workflow is broken:
     `claude plugin tag dist/plugins/<name>` validates plugin.json against the
     marketplace entry, then `git push origin <tag>` and
     `gh release create <tag> --generate-notes --title "<name> v<version>"`.
   - Remind: installed copies refresh only on a version change — users must
     update the plugin.
4. **Generic GitHub project**:
   - Propose the version from conventional commits since
     `git describe --tags --abbrev=0` (feat → minor, fix → patch,
     BREAKING CHANGE → major).
   - Annotated tag `vX.Y.Z` → `git push origin vX.Y.Z` →
     `gh release create vX.Y.Z --generate-notes`.
   - **npm publish never happens on this branch** — only via branch 1 or 2.

GitLab/Bitbucket: no route yet — say so and stop rather than improvise.

## Dry-Run Plan — always, before touching anything

```
## Release plan: <repo> — <vX.Y.Z | "merge Version Packages PR">
Machinery   AGENTS.md | changesets | toolkit | generic-github
Version     <current> → <proposed>   (N feats, M fixes since <last tag>)
Commits     <git log --oneline <last-tag>..HEAD>
Notes       <gh api repos/{owner}/{repo}/releases/generate-notes -f tag_name=<tag>>
Will run    1. <exact command>  2. …  3. …
Rollback    per step — references/rollback.md
```

Then ask once: **"Execute this release? [y/n]"** One yes runs the whole
sequence. Any step failure → stop, report what completed and what's reversible,
with the rollback command for the completed steps. Never retry-loop.

## Evidence

Every step prints its verification (tag exists locally and on the remote,
release URL, publish output). Final line: the release URL plus the rollback
one-liner.

## Common traps

| Trap | Reality |
|---|---|
| "Just force-push the fixed tag" | Never. Delete + re-tag via the rollback path, or fix forward with the next patch version. |
| Hand-tagging in a changesets repo | Changesets owns versions — you'll fork the changelog. Use the changesets route. |
| Releasing from a feature branch | The ancestor-of-main guard exists because published tags on unmerged branches haunt forever. |
| Skipping the dry-run "because it's just a patch" | The dry-run IS the safety, and it costs one screen. |
| Toolkit release without a version bump | Installed caches keep serving the old copy (git a4f4aa8). |

## Related skills

`git-commit` (gets the work committed — stops before push by design, hands off
here), `git-operations` (undo/recovery, including tag-deletion mechanics),
`toolkit-change-control` (publish-readiness gate for this repo — it gates, this
executes), condux `workflow` CP-3 (routes here after everything is green).

## Provenance and maintenance

Re-verify volatile claims with:
- `claude plugin tag --help` — the toolkit tag+validate primitive
- `gh api repos/{owner}/{repo}/releases/generate-notes -f tag_name=<tag>` — notes preview
- `npx changeset status` — changesets detection behavior

Last generated: 2026-07-08
Known uncertainty:
- The guard set is adopted from claude-sdlc-wizard's release post-mortems
  (ancestry + version-match); not yet exercised by a real failure here.
- GitHub-only: `gh` paths assume github.com remotes; GitLab/Bitbucket routes
  are reserved, unbuilt.
