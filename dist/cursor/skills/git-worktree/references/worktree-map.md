# Worktree routing map

Full situation → action table. The SKILL.md carries the high-value forks; this
is the exhaustive version.

## Before anything — the guards

| Check | Command | Non-empty / true means |
|---|---|---|
| In a submodule? | `git rev-parse --show-superproject-working-tree` | Not a worktree. This skill does not apply |
| Already in a linked worktree? | `git rev-parse --git-dir` ≠ `git rev-parse --git-common-dir` | You already have isolation — skip creation |
| What exists? | `git worktree list` | The truth, whoever created the trees |
| Bare repo? | `git rev-parse --is-bare-repository` | Every worktree is linked; there is no "main" one |

## Situation → action

| Situation | Action |
|---|---|
| Host has native worktree tooling | Use it. Never `git worktree add` alongside it |
| Already inside a linked worktree | Skip creation — you are isolated |
| Inside a submodule | Treat as a normal repo |
| `.worktrees/` exists and is ignored | Use it |
| `.worktrees/` exists, **not** ignored | Add to `.gitignore` and commit *before* creating a tree |
| Neither dir exists | Default `.worktrees/<name>`, or a sibling `../<repo>-<branch>` |
| Branch exists already | `git worktree add <path> <branch>` — no `-b` |
| Branch is new | `git worktree add -b <branch> <path>` |
| Branch checked out in another tree | Go to that tree, or pick another branch. Do not force |
| Need someone else's branch | `git fetch` first, then add on the remote-tracking ref |
| Detached HEAD wanted (spike) | `git worktree add --detach <path>` |
| Permission error creating the dir | Fall back to a sibling path, or work in place and say so |
| Tree is dirty and you want it gone | Commit or stash first; `remove` refuses dirty trees for a reason |
| Directory deleted by hand | `git worktree prune` to clear the metadata |
| Tree on a network/removable path | `git worktree list` may show it as prunable when unmounted — do not prune blind |

## What is shared vs isolated

The single most common wrong assumption is that a worktree isolates everything.

| Per worktree (isolated) | Shared across all worktrees |
|---|---|
| Working files | The object database (`.git/objects`) |
| Index / staging area | Refs and branches |
| `HEAD` and current branch | **The stash** |
| `git worktree`-local config (`--worktree`) | Config, hooks, remotes |
| Untracked files, build output, `node_modules` | Reflog for shared refs |

Consequences worth internalising:

- A commit made in one tree is **immediately visible** to every other tree. No push, no fetch.
- `git stash` in tree A can be popped in tree B. Convenient, and a real footgun when two agents both stash.
- Hooks are shared, so a pre-commit hook runs the same in every tree — including one an agent is driving.
- `node_modules` is **not** shared. A fresh worktree needs its own dependency install before its tests mean anything.

## Cleanup contract

Removal order matters when you want the branch gone too:

```bash
git worktree remove .worktrees/<name>   # 1. tree first — refuses if dirty
git branch -d <branch>                  # 2. then the branch, if merged
git branch -D <branch>                  # ...or force, if abandoning it
```

Reversed, `git branch -d` fails: the branch is still checked out in the tree.

Leaving a tree behind is cheap in disk but not free in confusion — a stale tree
keeps its branch checked out, so a later `git switch` to that branch fails from
the main tree with no obvious cause.
