---
name: git-worktree
description: Use when working with git worktrees — creating an isolated workspace or parallel checkout for a task or agent, listing or switching trees, moving work between them, pruning stale ones, recovering a broken one. Triggers include "create a worktree", "new worktree for this fix". Native-first — prefer the host's own worktree tooling, fall back to `git worktree` only when there is none. Not for undo/discard/stash/merge/push (git-operations). Not for fanning agents across trees (subagent-deployment).
---

# git-worktree

A **decision router** for worktrees: given a situation, pick the right move, run it safely, and know the undo path. Same shape as `git-operations`, different topology — a worktree changes *where* a checkout lives, never what history says.

## When to use

- You need an isolated workspace for a task, a branch, or an agent.
- You have worktrees already and need to list, switch, move work, or clean up.
- A worktree is in a bad state — stale lock, deleted directory, branch stuck as checked-out elsewhere.

## Native first — the rule that matters most

**Prefer your platform's native worktree tooling. Fall back to `git worktree` only when there is none.**

Claude Code has `EnterWorktree` and `isolation: "worktree"` agents; other harnesses have their own. When a host manages worktrees for you, running `git worktree add` yourself creates **phantom state the harness cannot see or manage** — it won't clean it up, won't list it, and may collide with its own tree on the same branch.

The reverse is safe: `git worktree list` always tells the truth about what exists on disk, whoever created it.

## Step 0 — guards, before any command

Run these first. Two of them mean *stop, you're done or you're somewhere else*.

```bash
git rev-parse --show-superproject-working-tree   # non-empty → submodule, NOT a worktree
git rev-parse --git-dir                          # differs from --git-common-dir → already in a linked worktree
git rev-parse --git-common-dir
git worktree list                                # what already exists
```

| Result | What it means | Do |
|---|---|---|
| Superproject path returned | You're in a submodule | Treat as a normal repo — this skill does not apply |
| `--git-dir` ≠ `--git-common-dir` | You're already in a linked worktree | **Skip creation** — you have your isolation |
| Native tool available | Host manages worktrees | Use it (below); do not `git worktree add` |
| Neither, no native tool | Plain repo, manual path | Fall back to `git worktree add` |

## Decision map

Full routing table in `references/worktree-map.md`. The high-value forks:

| Situation | Choose → (not →) | Undo path |
|---|---|---|
| **Need isolation** | native host tool → (`git worktree add` only if none) | remove the tree; branch survives |
| **Where to put it** | `.worktrees/<name>` inside the repo, **verified gitignored** → (a sibling dir, if you'd rather keep the repo clean) | — |
| **Existing branch** | `git worktree add <path> <branch>` → (not `-b`, which fails if it exists) | `git worktree remove <path>` |
| **New branch** | `git worktree add -b <new> <path>` | remove tree, then `git branch -d <new>` |
| **Switch trees** | `cd <path>` — a worktree is a directory → (never `git switch` into a branch checked out elsewhere) | `cd` back |
| **Move work between trees** | commit + `git switch`/cherry-pick, or stash (shared across trees) | normal git undo |
| **Clean up** | `git worktree remove <path>` → (`prune` only after manual deletion) | branch survives removal |
| **Broken tree** | → `references/recovery.md` | — |

## Operation cards

Each card: when to choose it, the safe sequence, how to undo it.

### Create an isolated workspace

**If a native tool exists, use it and stop reading this card.**

Manual fallback — verify the location is ignored **before** creating anything, or the first commit sweeps a whole checkout into the repo:

```bash
git check-ignore -q .worktrees || echo "NOT IGNORED — add .worktrees/ to .gitignore first"
git worktree add .worktrees/<name> -b <branch>    # new branch
git worktree add .worktrees/<name> <branch>       # existing branch
```

- **Undo:** `git worktree remove .worktrees/<name>`. The branch is untouched — removing a tree never deletes work that was committed.
- A worktree is cheap: it shares the one `.git` object database, so creation costs a checkout, not a clone.

### List and inspect

```bash
git worktree list            # path, HEAD, branch for every tree
git worktree list --porcelain
```

The main worktree is listed first and cannot be removed — only the linked ones.

### Switch between trees

A worktree is just a directory: `cd` to it. There is no `git worktree switch`.

**A branch can only be checked out in one tree at a time.** `git switch <branch>` fails with *"already checked out at …"* when another tree holds it — that's the feature working, not a bug. Go to that tree, or use a different branch.

### Move work between trees

- **Committed:** commit in the source tree, then `git switch` / `git cherry-pick <sha>` in the target — they share the object database, so nothing needs pushing.
- **Uncommitted:** `git stash push -m "<note>"` in one tree, `git stash pop` in the other. **The stash is shared across all worktrees** — the one piece of worktree state that isn't isolated, and a genuine surprise.
- **Undo:** ordinary git undo; see `git-operations`.

### Remove and prune

```bash
git worktree remove <path>          # clean removal — refuses if dirty
git worktree remove --force <path>  # discards uncommitted work. DESTRUCTIVE
git worktree prune -n               # dry-run: what stale metadata would go
git worktree prune                  # after a tree was deleted manually
```

- `remove` is the correct verb. `prune` only cleans up *metadata* for trees whose directories already vanished — it is not how you remove a worktree.
- **Undo:** none for `--force` on uncommitted work; that's why the plain form refuses. A removed tree's *branch* survives — recreate the tree and you're back.

## Common traps

- **`git worktree add` under a harness that manages worktrees** — phantom state, the headline failure.
- **An un-ignored worktree directory** — `.worktrees/` inside the repo is convenient and invisible until a commit swallows an entire second checkout.
- **`prune` expecting it to remove a tree** — it only forgets already-deleted ones.
- **Fighting "already checked out at …"** — that guard prevents two trees from diverging on one branch. Don't force past it.
- **Assuming full isolation** — the stash and the object database are shared. Files and HEAD are per-tree; those two are not.

## Out of scope

- Fanning agents out across parallel trees → `subagent-deployment`.
- Undo, discard, stash-as-workflow, merge, push → `git-operations`.
- Committing → `git-commit`.
- Submodules and bisect — still uncovered by this toolkit.

## ⚙ Adjust these (defaults)

`.worktrees/<name>` is the assumed location because it keeps trees with their repo and is trivially ignorable. A sibling directory (`../<repo>-<branch>`) works identically and needs no gitignore entry — pick one and stay consistent.
