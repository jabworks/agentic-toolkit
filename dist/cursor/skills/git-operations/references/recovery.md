# Recovery cookbook — "I broke something"

Most git mistakes are recoverable because git rarely deletes commits
immediately — it just stops pointing at them. `git reflog` is the safety net.
Work through these calmly; don't pile on more commands blindly.

## First move, always

```bash
git reflog
```

This lists everywhere `HEAD` has been, newest first, each with a short sha:

```
a1b2c3d HEAD@{0}: reset: moving to HEAD~1
e4f5g6h HEAD@{1}: commit: the work you thought you lost
```

Find the state you want, then recover to it.

## Recover a lost commit

You reset/rebased and a commit vanished:

```bash
git reflog                       # find the sha of the good state
git reset --hard <sha>           # return HEAD + tree to it (destructive to current)
# or, to inspect without moving:
git switch --detach <sha>
```

If you only want the *changes* from a lost commit onto your current branch:

```bash
git cherry-pick <sha>            # note: cherry-pick is otherwise out of scope
```

## Undo a hard reset

`git reset --hard` moved you and you want back:

```bash
git reflog                       # the pre-reset sha is usually HEAD@{1}
git reset --hard HEAD@{1}
```

## Undo a bad merge or rebase

```bash
git reset --merge ORIG_HEAD      # ORIG_HEAD is set before merge/rebase/pull
```

If `ORIG_HEAD` was overwritten, find the pre-operation sha in `git reflog`
and `git reset --hard <sha>`.

## Recover a dropped stash

`git stash drop` or a `pop` that failed can leave a stash unreferenced:

```bash
git fsck --no-reflog | awk '/dangling commit/ {print $3}'
# inspect candidates:
git show <sha>
# restore:
git stash apply <sha>
```

## Restore a deleted branch

```bash
git reflog                       # find the tip sha the branch pointed at
git switch -c <branch> <sha>     # recreate it at that commit
```

## Recover uncommitted work after a bad `restore`/`checkout`

Uncommitted changes discarded by `git restore` / `git clean` are **not** in
the reflog — they were never committed. Recovery options are limited:

- Editor local history / IDE "Local History".
- Editor buffers still open.
- Filesystem-level undelete tools (last resort).

This is why the decision map insists on a dry-run and confirmation before any
destructive discard: prevention is the only reliable "undo" here.

## Golden rules

- **Reflog first, act second.** Read before you write.
- **Never `reset --hard` or `clean -f` to "just try it"** on work you can't
  reproduce — those are the two commands with no reflog safety net.
- **On shared branches, prefer `revert`** — recovery for *others* isn't
  possible once you've rewritten pushed history.
