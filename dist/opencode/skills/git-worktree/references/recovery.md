# Worktree recovery cookbook

Symptom → cause → fix. Every fix here is non-destructive unless marked.

Start by getting the truth on disk:

```bash
git worktree list --porcelain
git rev-parse --git-common-dir     # where the shared .git lives
ls "$(git rev-parse --git-common-dir)/worktrees"   # one dir of metadata per linked tree
```

## "fatal: '<branch>' is already checked out at '<path>'"

**Cause:** the guard working. A branch lives in exactly one tree at a time.

**Fix:** `cd` to the path it names and work there. If that tree is stale and you
want the branch back in the main tree:

```bash
git worktree remove <path>       # or `prune` if the dir is already gone
git switch <branch>
```

Do **not** reach for `--force` or hand-edit refs to get two trees on one branch.
That is the state the guard exists to prevent, and it diverges silently.

## "fatal: '<path>' is a missing but locked working tree"

**Cause:** the directory was deleted by hand while its metadata was locked, or a
tree on a removable/network path was created and the volume went away.

```bash
git worktree list                       # shows the tree as prunable
git worktree unlock <path>
git worktree prune -n                   # dry-run FIRST
git worktree prune
```

**Never prune blind when a tree lives on a mount.** An unmounted volume looks
exactly like a deleted directory, and pruning discards the metadata for a tree
whose files come back later.

## A worktree directory was deleted, git still lists it

**Cause:** metadata under `.git/worktrees/<name>` outlives the directory.

```bash
git worktree prune -n     # what would go
git worktree prune
```

The branch is unaffected — nothing committed is lost by pruning.

## `remove` refuses: "contains modified or untracked files"

**Cause:** the guard working again. Removal would discard real work.

```bash
git -C <path> status                    # look before deciding
git -C <path> stash push -m "salvage"   # keep it (stash is shared — pop anywhere)
git worktree remove <path>
```

Only after confirming there is nothing to keep: `git worktree remove --force <path>`.
**Destructive, no undo** — uncommitted work in that tree is gone.

## Lost a commit made inside a worktree

**It is not lost.** All trees share one object database and one reflog for shared
refs, so `git-operations`' recovery path applies unchanged from any tree:

```bash
git reflog                    # find the sha
git switch -c rescue <sha>
```

## The worktree directory got committed into the repo

**Cause:** `.worktrees/` was never gitignored — the highest-cost mistake here,
because a whole second checkout enters history.

```bash
git rm -r --cached .worktrees        # untrack, keep on disk
printf '.worktrees/\n' >> .gitignore
git add .gitignore && git commit -s -m "chore: ignore .worktrees/"
```

Already pushed? The blobs are in history. Rewriting it is out of scope for this
toolkit — decide deliberately whether it is worth it, and note that history
rewriting belongs to no shipped skill here.

## A tree is on a branch that was force-updated elsewhere

**Cause:** refs are shared, so another tree (or an agent) moved the branch under
you. Files on disk still reflect the old tip.

```bash
git status              # reports the divergence
git log --oneline -3
git reflog <branch>     # the pre-force tip is here
```

Recover with `git reset --hard <sha>` from the reflog if the old tip was wanted —
same operation as `git-operations`' force-push recovery card, because it is the
same problem seen from a second checkout.

## Worktree tests fail in ways the main tree doesn't

**Cause:** `node_modules` and other build artifacts are per-tree and untracked.
A fresh worktree has none.

Install dependencies in the tree before trusting any test run, and establish a
clean baseline before starting work — a failure you didn't cause is worth
knowing about before you write code, not after.
