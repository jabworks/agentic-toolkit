# Session Report

Turn a session transcript into an explorable HTML report: tokens, cache behaviour, cost,
subagents, skills, and the prompts that were expensive.

Works for Claude Code and Codex. The output is a single self-contained file with no
network access — open it, or send it to someone.

The design bet is that **usage numbers only mean something next to the prompt that
produced them**. A total token count tells you nothing you can act on; "this one
request cost more than the rest of the session, and here it is" tells you what to
change.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install session-report@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add session-report@jabworks-agentic-toolkit
```

**OpenCode / other hosts** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode`

---

## What it reports

- **Tokens and cache** — input, output, cache reads and writes, and what the cache
  actually saved rather than what it theoretically could.
- **Cost** — derived from the model actually used per request, not a flat rate.
- **Subagents** — which ran, how long, and what they consumed.
- **Skills** — which were loaded and when, so you can see whether routing behaved.
- **Expensive prompts** — ranked, with the request that caused each.

---

## Reading it

The report is exploratory, not a dashboard: it opens on the summary and lets you drill
into any single request. Nothing is aggregated so far that you cannot get back to the
transcript entry behind it.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
