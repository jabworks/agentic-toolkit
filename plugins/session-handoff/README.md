# Session Handoff

Preserve a session's working state before the context window ends it, and pick it up
cleanly in the next one.

A handoff document is not a summary. It is the specific things a fresh session cannot
reconstruct from the code: what you already tried and rejected, which decision was made
and why, what is half-finished, what is blocked and on what. The diff shows what
changed; the handoff shows what you *know*.

The design bet is that **the expensive part of a lost session is the reasoning, not the
edits**. Edits are in git. Reasoning is only in the conversation, and the conversation
is the thing that ends.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install session-handoff@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add session-handoff@jabworks-agentic-toolkit
```

**OpenCode / other hosts** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode`

---

## Using it

Say "wrap up", "save state", or "handoff" — or let it trigger when context approaches
capacity, at a natural pause, or when you switch workstreams. To resume: "continue from
last session".

Documents live under `.session-handoff/` at the git root, gitignored, with the pruning
commands to keep the folder from becoming its own backlog.

---

## What it is not for

- Resuming an in-flight plan from condux's progress ledger — that is `subagent-execution`.
- Resuming work on a design or spec artifact — that is `discovery` / `draft-plan`.
- A usage or cost report — that is `session-report`.
- Remembering facts across Codex sessions unattended — that is `concord`. A handoff is
  a deliberate continuation artifact; concord is hook-driven background memory. Running
  both is normal.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
