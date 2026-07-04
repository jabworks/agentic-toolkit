# Git decision map — situation → operation

The full routing table. Each row: the situation you're in, the operation to
reach for, why over the alternative, and how to reverse it. Modern porcelain
(`switch`, `restore`) is preferred over legacy `checkout` throughout.

## Moving around

| Situation | Command | Why / not | Undo |
|---|---|---|---|
| Switch to an existing branch | `git switch <branch>` | modern; `checkout` overloads too much | `git switch -` (previous) |
| Create and switch | `git switch -c <new>` | not `checkout -b` | delete: `git branch -d <new>` |
| Switch to a specific commit (detached) | `git switch --detach <sha>` | explicit intent | `git switch <branch>` |

## Undoing commits

| Situation | Command | Why / not | Undo |
|---|---|---|---|
| Uncommit, keep changes staged | `git reset --soft HEAD~1` | local only; keeps work | `git reflog` → `reset` |
| Uncommit, unstage but keep edits | `git reset HEAD~1` (mixed, default) | local only | reflog |
| Uncommit and discard edits | `git reset --hard HEAD~1` | **destructive**; confirm | `git reflog` → `reset --hard <sha>` |
| Undo a pushed/shared commit | `git revert <sha>` | never rewrite shared history | `git revert` the revert |
| Recover a "lost" commit | `git reflog` → `git reset --hard <sha>` | reflog remembers | — |

## Discarding / unstaging

| Situation | Command | Why / not | Undo |
|---|---|---|---|
| Discard unstaged edits to a tracked file | `git restore <path>` | not `checkout -- <path>` | **none — destructive** |
| Discard ALL unstaged edits | `git restore .` | confirm scope first | **none — destructive** |
| Unstage a file (keep edits) | `git restore --staged <path>` | not `reset <path>` | `git add <path>` |
| Remove untracked files | `git clean -nd` (preview) → `git clean -fd` | always dry-run first | **none — destructive** |

## Parking work

| Situation | Command | Why / not | Undo |
|---|---|---|---|
| Quick stash | `git stash push -m "<note>"` | fast, same branch | `git stash pop` |
| Stash including untracked | `git stash push -u -m "<note>"` | `-u` grabs untracked | `git stash pop` |
| Inspect a stash | `git stash show -p stash@{0}` | review before applying | — |
| Longer-lived parallel work | `git switch -c <new>` | a branch, not a stash | `git branch -d <new>` |

## Integrating upstream

| Situation | Command | Why / not | Undo |
|---|---|---|---|
| Get + merge shared branch | `git fetch` → `git merge origin/<b>` | preserves history | `git reset --merge ORIG_HEAD` |
| Linear update, local-only work | `git pull --rebase` | avoids merge bubbles | `git reset --hard ORIG_HEAD` |
| Resolve conflicts | edit → `git add <f>` → `git merge --continue` | — | `git merge --abort` |

## Publishing

| Situation | Command | Why / not | Undo |
|---|---|---|---|
| Push your branch | `git push` (after branch + status check) | plain, safe | — |
| Set upstream on first push | `git push -u origin <branch>` | wires tracking | — |
| Update your feature branch after rewriting a pushed commit | `git fetch` → `git push --force-with-lease` | lease aborts if someone else pushed; not bare `--force` | `git reset --hard <sha>` (reflog) → re-push |
| Force-push a shared branch | **DON'T** | rewrites others' history | — |

## Committing

Committing is delegated — see the **git-commit** skill for staging
discipline, message crafting, and the commit itself.

## When in doubt

- Any command marked **destructive** with no undo: run the preview/dry-run
  form first (`clean -n`, `git diff`), and confirm with the user.
- If the situation isn't in this table, check `references/recovery.md` for
  the reflog-based recovery path before improvising.
