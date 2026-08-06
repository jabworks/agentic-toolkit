# Git Operations

A decision router for git: describe the situation, get the right operation and the
command that performs it — with the undo path stated before you run it.

Most git pain is not "I do not know the command", it is "several commands look right and
one of them loses work". `reset --hard`, `checkout .`, `stash drop`, and `push --force`
all look like the fix in the moment. This maps situations to operations, so the choice
is made on what you are trying to do rather than on which command you half-remember.

The design bet is that **an operation you cannot undo should never be the default
suggestion**. Every route names its recovery path first; where recovery is genuinely
impossible, it says so instead of pretending.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install git-operations@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add git-operations@jabworks-agentic-toolkit
```

**OpenCode / other hosts** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode`

---

## Covers

Undoing a commit, discarding or unstaging changes, parking work in progress,
integrating upstream, and recovering from a mistake that already happened — including
the cases where `reflog` is the answer.

Favours modern porcelain: `git switch` and `git restore` over overloaded `checkout`,
because the split exists precisely so that "change branch" and "throw away my work"
stop sharing a verb.

---

## Boundaries

Committing is `git-commit`. Tagging and publishing a version is `release`. This one is
everyday operations plus recovery, and it hands off rather than duplicating either.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
