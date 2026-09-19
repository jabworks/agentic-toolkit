# Design Doc Template

The shape of `.condux/designs/YYYY-MM-DD-<feature>.md`. This file is the
canonical home of the design file's frontmatter contract and section set —
SKILL.md points here rather than restating it.

The template formalizes **accumulation**: the file is built by discovery's own
flow, never restructured afterwards. Every part carries a lifecycle stamp
saying when it gets written, so an agent mid-discovery always has a home for
what it is holding. The mid-flow file and the sign-off file are one artifact
with one shape.

```markdown
---
status: in-progress        <!-- → signed-off at Step 7; /draft-plan's gate reads this -->
date: YYYY-MM-DD
feature: <slug>
---

# <feature> — <one line>                     [at creation]

<what we're building and why — ≤3 lines>     [at creation]

**Sections:** N — <names, in order>          [at creation]

## §0 · requirements — AGREED <date>         [on acknowledgment; revised visibly]

<prd.md's six headings, verbatim — Problem · Users · Goals and non-goals ·
Success metrics · Scope · Open questions — each a table or short list.
technical-spec's references/templates.md has the template. Step 7 copies
this part into specs/<slug>/prd.md heading for heading.>

## §n · <name> — AGREED <date>               [appended per agreement]

**Decided:** <the choice>, because <one line>.

| Rejected | Why not |
|---|---|
| <alternative> | <one line> |

<evidence — table, list, or a linked blueprint artifact (served-root-relative, label = href). Never a wall.>

## Constraints & out of scope                [accumulates — rows added any time]

| Constraint / exclusion | Why |
|---|---|
| <rule or exclusion> | <one line> |

## Open questions                            [finalized at sign-off; "none" is valid]

- <question still open after sign-off, or "none">
```

## The rules

| Rule | Why |
|---|---|
| Every agreed § carries the four facts a `decisions.md` entry carries — title+date, choice, alternatives with one-line why-nots, consequence | Step 7's spec write-back becomes transcription, not authorship; the design doc and `decisions.md` cannot disagree on shape because they share one |
| §0 carries `prd.md`'s six headings verbatim, outside the `§n of N` count; an unanswered section is an open question, never a guess | Step 7 copies §0 into `prd.md` — same shape, so nothing is re-authored; an invented metric reads as fact forever after |
| The why-line is derived from §0's *Problem*, never a second statement of it | one fact, one home |
| Sections are appended as agreed, never drafted ahead | The file records the conversation's actual state; a pre-drafted section reads as agreed when it isn't |
| Constraints discovered mid-flow go straight into their table | The section exists from creation precisely so mid-flow findings have a home other than an invented heading |
| A requirements-only discovery that stops at §0 writes `prd.md` and leaves `status: in-progress` | a PRD is not a design; `/draft-plan`'s gate must still ask |
| `status` flips to `signed-off` only at Step 7, and nothing else edits the frontmatter | `/draft-plan` and the `planner` agent gate on this value |

## Lifecycle stamps, spelled out

| Stamp | When written | Parts |
|---|---|---|
| `[at creation]` | Step 3 opens, before §1 is presented | frontmatter, title, why-line, section list |
| `[on acknowledgment]` | the §0 card is acknowledged, before §1 is presented | §0 requirements — written then, not before, so the file never shows requirements as agreed that nobody has seen |
| `[revised visibly]` | a later section changes scope, goals, or users | §0 — edited in place, the change named in that section's entry |
| `[appended per agreement]` | each section, at the moment it is agreed | the § entries |
| `[accumulates]` | any time | `Constraints & out of scope` rows |
| `[finalized at sign-off]` | Step 7 | `Open questions`, the `status` flip |

A design file with no `status` field predates this contract and reads as
`signed-off` — see SKILL.md's existing-design check.
