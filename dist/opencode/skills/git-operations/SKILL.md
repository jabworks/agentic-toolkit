---
name: git-operations
description: Use when deciding which git operation fits a situation and running it safely — undoing a commit, discarding or unstaging changes, parking work-in-progress, integrating upstream, or recovering from a mistake. A decision router (situation → operation → safe command + undo path) favouring modern porcelain (`switch`, `restore`) over legacy `checkout`. Cross-links to git-commit for committing. Everyday + recovery only.
---

# git-operations

A **decision router** for git: given a situation, pick the *right* operation, run it safely, and always know the undo path. Raw git offers many ways to do the same thing — several of them foot-guns. This skill encodes the judgment of which to reach for.

## When to use

- You know the *goal* ("undo that", "throw away these edits", "get upstream changes") but not the safest command.
- Something went wrong and you need to recover.
- You want the modern, canonical command instead of the legacy habit.

Start every operation by looking before you leap:

```bash
git status              # working tree + index state
git branch --show-current
git log --oneline -5    # recent history for context
```

## Modern porcelain — defaults

Prefer the modern commands; reserve `checkout` for the rare case nothing else covers (and say so when you use it).

| Goal | Use | Not |
|---|---|---|
| Switch branch | `git switch <branch>` | `git checkout <branch>` |
| Create + switch | `git switch -c <new>` | `git checkout -b <new>` |
| Discard a tracked file's changes | `git restore <path>` | `git checkout -- <path>` |
| Unstage a file | `git restore --staged <path>` | `git reset <path>` |

## Decision map

Full routing table in `references/decision-map.md`. The high-value forks:

| Situation | Choose → (not →) | Undo path |
|---|---|---|
| **Undo a commit** | `reset --soft HEAD~1` (local, keep changes staged) · `revert <sha>` (shared/pushed — safe, adds a commit) · reflog (recover a lost one) | `git reflog` → `reset --hard <sha>` |
| **Discard changes** | `restore <path>` (tracked) · `restore --staged <path>` (unstage) · `clean -nd` then `clean -fd` (untracked) | destructive — warn & dry-run first |
| **Park work-in-progress** | `stash push -m "<note>"` (quick, same branch) · `switch -c <new>` (longer-lived) | `stash pop` / `switch` back |
| **Integrate upstream** | `merge` (preserve history, shared branches) · `pull --rebase` (linear, local-only work) | `reset --merge ORIG_HEAD` |
| **Publish** | `push` — but check branch + never force to shared (see below) | — |
| **Committing** | → use the **git-commit** skill | — |
| **"I broke something"** | → `references/recovery.md` (reflog cookbook) | — |

## Operation cards

Each card: when to choose it, the safe sequence, and how to undo it.

### Undo a commit

- **Local, not pushed, keep the changes:** `git reset --soft HEAD~1` — moves HEAD back, leaves everything staged.
- **Local, drop the changes too:** `git reset --hard HEAD~1` — **destructive**; confirm the working tree has nothing else you want first.
- **Already pushed / shared branch:** `git revert <sha>` — records a new commit that inverts the change. Never rewrite shared history.
- **Undo:** `git reflog` shows where HEAD was; `git reset --hard <sha>` returns to it.

### Discard / unstage changes

- **Tracked file, unstaged edits:** `git restore <path>` — **destructive**, no undo. Confirm before running.
- **Unstage (keep the edits):** `git restore --staged <path>`.
- **Untracked files:** dry-run first — `git clean -nd` — then `git clean -fd`. **Destructive.**
- **Undo:** none for `restore`/`clean` on uncommitted work — that's why the dry-run and confirmation are mandatory.

### Park work-in-progress

- **Quick context switch:** `git stash push -m "wip: <note>"`; restore with `git stash pop`. Inspect with `git stash list` / `git stash show -p`.
- **Longer-lived divergence:** `git switch -c <new>` and commit there.
- **Undo:** `git stash pop` reapplies; a dropped stash is recoverable via `git fsck --no-reflog` (see recovery.md).

### Integrate upstream

- **Shared branch / preserve history:** `git fetch` then `git merge origin/<branch>`.
- **Local-only unpublished work / want linear history:** `git pull --rebase`.
- **On conflict:** resolve files → `git add <resolved>` → `git merge --continue` (or `git rebase --continue`). Abort with `git merge --abort` / `git rebase --abort`.
- **Undo a completed merge:** `git reset --merge ORIG_HEAD`.

### Publish (push)

Before pushing:

```bash
git branch --show-current       # right branch?
git status                      # ahead/behind, clean?
git push                        # plain push to your branch
```

**Never** force-push to a shared branch (`main`, `master`, release branches). Forcing your *own* feature branch (e.g. after amending a commit you'd already pushed) is fine — see the next card.

### Force-push safely (own feature branch only)

When your local branch has diverged from its remote because you rewrote a
commit *you already pushed* (amend, or a rebase done elsewhere), update the
remote with a **lease**, never a bare force:

```bash
git branch --show-current       # confirm it's YOUR feature branch, not shared
git fetch                       # refresh remote-tracking refs
git status                      # review the divergence before overwriting
git push --force-with-lease     # aborts if someone else pushed since your last fetch
```

- **`--force-with-lease`, never `--force` / `-f`.** The lease refuses to
  overwrite work that arrived after your last fetch; bare force clobbers it
  blindly.
- **Never on a shared branch.** If teammates track this branch, coordinate or
  don't force at all — rewriting published history they depend on is out of
  scope here.
- **Undo:** the pre-force remote tip is in your local `git reflog` (and
  collaborators' reflogs); recover with `git reset --hard <sha>` then a fresh
  `git push --force-with-lease`.

## Out of scope → future sibling skill

This skill is **everyday + recovery only**. The following belong to a future history-rewriting skill and are intentionally excluded:

- interactive rebase, amend / fixup / autosquash
- cherry-pick
- bare `git push --force` / `-f`, and forcing a **shared** branch (only the safe `--force-with-lease` on your own feature branch is covered)
- submodules, worktrees, bisect

If a task needs one of these, say so and stop — don't improvise.

## ⚙ Adjust these (defaults)

Commands above are generic. This toolkit's owner signs off commits with `-s` — drop it if you don't use signoff; nothing else changes.
