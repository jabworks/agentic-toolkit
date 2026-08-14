---
name: git-commit
description: Use when staging changes and creating a git commit — derive a conventional-commit message from the diff and run the commit safely. Review before staging (never blind `git add .`), write multi-paragraph bodies via `-F`/heredoc (never chained `-m`), keep unwanted trailers out, and check the branch first. Covers the full local flow through verify and optional amend; stops before push — hand off to /release for tagging and publishing.
---

# git-commit

Craft a conventional-commit message from the actual diff and run the commit **safely**. The message format matters, but the real value is *how* the git commands run — the four guardrails below exist because these are where commits go wrong.

## When to use

- The user asks to commit, "save this", or "make a commit".
- You've finished a unit of work and changes are ready to record locally.
- A messy working tree needs splitting into clean, logical commits.

Not for: pushing, opening PRs, rebasing, cherry-picking. For choosing *which* git operation fits a situation, see the **git-operations** skill.

## Flow

```
1. Inspect     git status  +  git diff        (see everything before touching the index)
2. Branch chk  git branch --show-current       (on main/default? → guardrail 4)
3. Stage       git add <explicit pathspecs>    (never -A / . — guardrail 1)
4. Compose     type(scope): subject + body     (derive from the diff, confirm)
5. Commit      git commit -F <msgfile>          (multiline-safe — guardrail 2)
6. Verify      git show --stat  /  git log -1
7. Optional    amend / fixup on unpushed local commits only
```

## Guardrails

These are non-negotiable. Each is a "never / always" pair with the exact command.

### 1. Never blind-stage

**Never** `git add .`, `git add -A`, or `git add -u`. They sweep in unrelated edits, stray debug files, and secrets.

**Always** review first, then stage explicit pathspecs:

```bash
git status               # what's changed and what's untracked
git diff                 # unstaged changes, in detail
git diff --staged        # anything already staged
git add path/to/a path/to/b   # only the paths this commit is about
```

Untracked files are surfaced to the user, never auto-added. If unsure whether a file belongs, ask.

### 2. Never chain `-m` for bodies

**Never** build a body/footer from repeated `-m` flags (`-m subject -m body -m footer`) — it mangles blank lines and wrapping.

**Always** write the full message to a file and commit with `-F`:

```bash
# compose the message (subject, blank line, body, blank line, footer)
cat > "$(git rev-parse --git-dir)/COMMIT_EDIT.tmp" <<'EOF'
type(scope): short imperative subject

Body paragraph explaining what changed and why. Wrap at ~72 cols.

Refs: #123
EOF
git commit -F "$(git rev-parse --git-dir)/COMMIT_EDIT.tmp"
rm -f "$(git rev-parse --git-dir)/COMMIT_EDIT.tmp"
```

A single-line subject with no body may use `git commit -m "type(scope): subject"` — the ban is only on chaining `-m` for multi-part messages.

### 3. Never inject trailers

**Never** add `Co-Authored-By:`, tool attribution, or any trailer the user didn't ask for. Guard the footer block — only `Refs:`, `Fixes:`, `BREAKING CHANGE:`, or trailers the user explicitly requested belong there.

### 4. Check the branch first

**Always** confirm the branch before committing:

```bash
git branch --show-current
```

If it's `main`, `master`, or the default branch, **stop** and offer to branch before committing:

```bash
git switch -c <descriptive-branch-name>   # NOT: git checkout -b
```

Proceed on the protected branch only if the user explicitly confirms.

## Composing the message

Conventional-commit shape: `type(scope): subject`. See `references/commit-types.md` for the type/scope cheat-sheet and copy-paste templates.

- **Subject:** imperative mood, ≤ ~50 chars, no trailing period.
- **Body:** the *why*, not a restatement of the diff. Optional for trivial changes.
- **Footer:** issue refs / `BREAKING CHANGE:` only.

## Interaction model — derive, then confirm

Read the staged diff, derive the `type`, `scope`, and message, and **present it for confirmation** before committing:

- The diff usually reveals intent — lead with a concrete proposed message, don't interrogate.
- **Fall back to asking** when the diff spans unrelated concerns (that's a signal to split — see below) or when intent is genuinely ambiguous.

## Splitting a mixed working tree

When changes cover unrelated concerns, make several logical commits instead of one:

```bash
git add <paths for concern A> && git commit -F <msg A>
git add <paths for concern B> && git commit -F <msg B>
# same-file, different concerns → stage by hunk:
git add -p path/to/file
```

Each commit should stand on its own and pass review independently.

## ⚙ Adjust these (defaults)

The commands above are generic. This toolkit's owner uses these defaults — swap them for your own:

- **Signoff:** add `-s` to every commit (`git commit -s -F …`) for a `Signed-off-by` trailer.
- **No co-author trailers** — this is guardrail 3, kept even when adjusting.

If you don't use signoff, drop `-s`; everything else stays.

## See also

- `release` — after commits land: machinery detection, dry-run plan, then tag → push → GitHub release.
- `git-operations` — undoing, discarding, parking, and recovery.
