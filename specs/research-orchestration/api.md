# API — research-orchestration

The contracts here are files, not endpoints: the scout agent's interface, and the shapes of the three artifacts each run writes.

## scout agent

| Field | Value |
|---|---|
| Name | `scout` (fifth condux agent; source `skills/subagent-execution/agents/scout.md`) |
| Model | sonnet (Claude); Codex default proposed `gpt-6.1-sol` medium |
| Tools | read-only search and fetch tools plus Write; never names `WebSearch` or `WebFetch` (it uses what the host exposes) |
| Write scope | its own notes file only — a contract rule, not tool-enforced (quirks Q1) |
| Budget | 10–15 tool calls per brief |
| Input | a brief: objective, key questions, suggested sources, constraints, absolute notes path |
| Output | the notes file at that path; its final message is a short summary, not the notes |

## Run folder

```
.condux/research/<YYYY-MM-DD>-<slug>/   // never overwritten; a follow-up opens a new folder
  plan.md                                // sub-questions, scout count, every brief verbatim
  notes/<angle>.md                       // one per scout, or per angle in fallback mode
  report.md                              // the deliverable
```

## Notes shape (per brief question)

| Part | Contains |
|---|---|
| Answer | 1–2 lines |
| Findings | claim — source URL — source version or date; a finding without a URL is a Gap |
| Conflicts | sources that disagree, both cited |
| Gaps | what could not be found, and why |

## Report shape

| Part | Contains |
|---|---|
| Recommendation / answer | first, decision-ready |
| Comparison table | when the question has options |
| Evidence sections | inline `([source](url))` citations; each claim traces to a note finding |
| Risks and unknowns | including unresolved conflicts and gaps |
| Sources | the full list |

## Promotion

| Step | Rule |
|---|---|
| Offer | once, at delivery |
| Target | `specs/<the-spec-it-feeds>/research-<date>-<topic>.md`, plus a link row in that spec's `index.md` |
| No fitting spec | stays in `.condux/` |
| Citations | external URLs only; never a `.condux/` path (`durable-citations.test.mjs`) |
