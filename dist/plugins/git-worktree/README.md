# Git Worktree

A decision router for git worktrees: describe the situation, get the right move and the
command that performs it — with the undo path stated before you run it.

A worktree is the cheapest isolation git offers. It gives a task, a branch, or an agent
its own directory and its own index while sharing one object database, so creating one
costs a checkout rather than a clone. What makes worktrees go wrong is not the commands
— there are only about six — it is the assumptions: that a worktree isolates everything
(it does not), that `prune` removes a tree (it does not), and that reaching for
`git worktree add` is always the right first move (it is not).

The design bet is **native-first**. When the host already manages worktrees — Claude
Code's `EnterWorktree` and `isolation: "worktree"` agents, or an equivalent elsewhere —
creating one yourself with `git worktree add` produces phantom state the harness cannot
see, will not clean up, and may collide with. So the first question this skill asks is
never "which git command", it is "does something already own this".

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install git-worktree@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add git-worktree@jabworks-agentic-toolkit
```

**OpenCode / other hosts** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode`

**Cursor** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/cursor/skills`

---

## Covers

Creating an isolated workspace (native tool first, `git worktree` as fallback), listing
and inspecting trees, switching between them, moving committed and uncommitted work
across them, removing and pruning cleanly, and recovering the broken states — the locked
missing tree, the directory deleted by hand, the branch stuck as "already checked out
at …", and the worktree that got committed into the repo because nobody gitignored it.

It also states plainly what a worktree does **not** isolate. Files, index and HEAD are
per-tree; the object database, refs, hooks, config and **the stash** are shared. That
last one surprises people, and it is the one that bites when two agents both stash.

---

## Boundaries

Undo, discard, stash-as-workflow, merge and push are `git-operations` — this skill is
its sibling, not its replacement, and each names the other. Committing is `git-commit`.
Fanning agents out across parallel trees is `subagent-deployment`. Submodules and bisect
are covered by nothing here yet, deliberately.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
