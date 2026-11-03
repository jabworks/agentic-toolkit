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

## Where the numbers come from

When a [usage-trace](https://github.com/jabworks/agentic-toolkit/tree/main/plugins/usage-trace)
store exists on the machine, the report reads it; otherwise it reads the transcripts still
on disk. Transcripts get pruned and the store does not, so older weeks keep their numbers.
usage-trace is optional — nothing here requires it. Force a source with
`--source store|transcripts|auto` (default `auto`); the report says which one it used.

---

## Comparing periods

Ask for a comparison — "how did this week compare" — or pass `--compare weekly` (also
`<N>d` or `<N>h`, with `--periods N`, default 4). The report gains a period comparison
table, oldest window first: tokens, cost, sessions, messages, calls, active hours, cache
hit rate and cache breaks. `--compare-end <ISO>` ends the windows at a past date.

- Each API call lands in the window its timestamp falls in, so a session that straddles a
  boundary is split correctly. It still counts once in each window it touches, which means
  the sessions column does not sum.
- A window marked **partial** had no data at its start — transcripts were pruned or
  capture began mid-window — so read its totals as a floor, not a drop.

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
