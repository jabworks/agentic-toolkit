# Git Commit

Derive a conventional-commit message from the actual diff, and run the commit safely.

The safety is the point. Review before staging — never a blind `git add .`, which is how
a stray credentials file or an unrelated experiment ends up in history. Check the branch
first, because the most expensive commit is the correct one on the wrong branch. Write
multi-paragraph bodies through `-F` and a heredoc, because chained `-m` flags mangle
formatting and silently drop blank lines.

The design bet is that **the message should describe what the diff does, not what you
remember intending**. Reading the diff first produces a different — and more accurate —
message than writing from memory.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install git-commit@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add git-commit@jabworks-agentic-toolkit
```

**OpenCode / other hosts** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode`

---

## Scope

Covers the full local flow: review, stage deliberately, compose, commit, verify, and
amend if needed. It **stops before push** — publishing is a separate decision with
separate consequences, and it belongs to `release`.

Trailers are opt-in. Nothing is appended to your commits that you did not ask for.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
