# Standup

Draft a daily standup update — Yesterday / Today / Blockers — from the work recorded in the current repository.

The boundary is the point. It reads **only the git repo you invoked it in**, because other repos may be corporate and sensitive, and "I only looked" is no defence. Want several repos? Name each path and it runs once per repo. It is read-only: it never commits, comments, or posts, and you paste the result yourself.

The design bet is **outcomes, not a commit dump** — commits are grouped under their PR, noise is folded into the item it served, and Today and Blockers contain only what a source supports. Nothing is invented.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install standup@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add standup@jabworks-agentic-toolkit
```

**OpenCode / other hosts** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode`

---

## Sources

Window: since the start of the previous working day (Friday on a Monday), or `since <date>`. Every source is optional; a missing one is skipped and named in a `Sources:` footer.

| Source | Feeds |
|---|---|
| Your commits (`git log`, author = your `user.email`) | Yesterday |
| Your PRs and reviews given (`gh`, authenticated) | Yesterday, Blockers (changes requested, failing checks), Today (open PRs) |
| Docket closes (`docket/archive/<year>.md`) | Yesterday |
| Latest session handoff (`.session-handoff/`) | Today (next steps), Blockers |

---

## Scope

Output is plain markdown with three headings, plus a one-line compact variant on request. It never posts to chat, changes tracker state, or summarises other authors' work.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
