---
status: signed-off
date: 2026-08-26
feature: spec-artifact-readability
scope: skills/technical-spec (templates + SKILL.md)
---

# Spec artifact readability — pass two

> Pass two of two. Pass one (`specs/discovery-presentation/`) fixed the live
> terminal read during discovery. This pass fixes the written artifact.
> Docket #60 (templates read heavy) and #61 (types carry no explanation).

## Sections

1. Who the artifact serves — ✓ agreed
2. `decisions.md` — the new shape — ✓ agreed
3. `quirks.md` — the undiagnosed 88% — ✓ agreed
4. `api.md` / `fields.md` — the two-homes rule (#61) — ✓ agreed
5. The budget, and whether it is enforced — ✓ agreed
6. `implementation.md` — ✓ agreed
7. `index.md` — ✓ agreed

*(The list grew from 5 to 7 at §5's sign-off: §1 decided to layer every concern
file, but §§2–4 only designed four of the six. The gap was surfaced by the
inline self-review rather than shipped silently.)*

## Measured baseline (2026-08-26)

5,967 lines of spec markdown across 68 files in `specs/`.

| template file | n | median lines | prose % | paragraphs >3 lines |
|---|---|---|---|---|
| `decisions.md` | 12 | 68 | **93%** | 79 |
| `quirks.md` | 12 | 64 | **88%** | **98** |
| `api.md` | 6 | 101 | 68% | 16 |
| `index.md` | 12 | 22 | 60% | 19 |
| `implementation.md` | 12 | 76 | 55% | 21 |
| `fields.md` | 5 | 43 | **46%** | 8 |

The two templates that mandate a table are the two readable files. The two
that are pure prose headings are the walls. `fields.md` is nothing but a table
and scores best; `decisions.md` is four prose headings per decision and scores
worst.

`quirks.md` carries the most long paragraphs in absolute terms — 98 — and
nobody reported it. Same disease, undiagnosed.

## §1 — Who the artifact serves (agreed)

All four reading jobs are kept. They are not aspirational: two of them are
shipped consumers with running code.

| Job | Wants | Served by |
|---|---|---|
| Find one thing fast | scan structure | the table layer |
| Reload context wholesale | narrative order | the reasoning underneath |
| Drift-check against code | checkable assertions | the table layer |
| Hand to an agent as context | self-contained statements | the table layer |

`preflight`'s Drift Check already reads `api.md` / `fields.md` / `quirks.md` /
`implementation.md` against the diff, and `/workflow`'s router step 2 already
loads spec files by task type. Dropping either job from the design would not
stop them reading; it would only mean the artifact is not shaped for what
reads it.

**Decision: layer every concern file** — a scannable table on top, the
reasoning underneath. One table serves three of the four jobs, so the extra
readers cost nothing; dropping them would remove the justification for the
table without removing any work.

**Decision: keep ADR's four facts, drop its four prose headings.** Pass one's
lesson applies directly — the rejected alternatives are the load-bearing
content, and the ADR form buries them inside "Rationale" prose. Promoting
alternatives to their own table is what makes a decision both trustworthy and
short.

**Rejected — pick one reader and optimise for it.** Would simplify the
artifact but loses real consumers, and saves nothing: the cost of the other
three jobs is zero once the table layer exists.

**Rejected — table layer with ADR headings kept underneath.** Adds the scan
layer without touching the 93% prose that is the actual complaint.

**Drafting risk to carry:** "checkable assertion" can push writing toward
stilted. Mitigation is a drafting rule — write each row as a claim, not a
label — not a structural change.

## §2 — `decisions.md` (agreed)

Worst file in the corpus: 93% prose, 79 paragraphs over three lines, median 68
lines across 12 files. New template:

```markdown
# Decisions — {Feature}

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | {what was decided} | {why, one line} | accepted |

## 1. {Title} — {YYYY-MM-DD}

**Decided:** one sentence, stated as a claim.
**Because:** one sentence.

| Alternative | Why not |
|---|---|
| {option considered} | {one line} |

**Consequences**
- {what changes — and where it costs, named}

**Context** *(only when the question's origin is not obvious)*
{prose — the one place prose earns its keep}
```

**Decision: Context becomes conditional.** The single biggest prose cut. Most
Context sections restate what `Decided` already implies. The rule for including
it: a reader six months from now could not reconstruct *why the question arose*
without it. `Because` covers why *this* option won; `Context` covers why a
decision was needed at all, and that is frequently self-evident from the
feature.

**Decision: alternatives are promoted to their own table.** They are the
load-bearing content — the reason a decision can be trusted rather than merely
read — and the ADR form buries them inside "Rationale" prose. A table also
makes it structurally impossible to write "we considered X" without a why-not.

**Decision: `Decided` and `Because` are one-liners.** If the claim cannot be
stated in a sentence, the decision is not settled yet, and that is worth
surfacing rather than hiding in a paragraph.

**Decision: a summary table opens the file.** "Which decisions exist for this
feature" is currently answerable only by reading the whole file.

**Rejected — keep Context mandatory.** Safer against losing the why, but leaves
the largest prose block in the worst file untouched, which is the complaint.

**Rejected — summary table only, detail opt-in.** Shortest artifact, but a
decision recorded as a row with no reasoning is exactly the assertion-without-
rationale failure the ADR form existed to prevent.

## §3 — `quirks.md` (agreed)

88% prose and **98 paragraphs over three lines — the most in the corpus** — and
nobody reported it. The template is one prose blob asked to carry four
different facts: what breaks, what sets it off, why, and what to do.

A second problem surfaced while measuring, and it is not about density.

| | |
|---|---|
| Template says | `## {Quirk Title}` — no number |
| Repo actually uses | `## Q1 — Title` (surface-kit, 26 quirks) |
| `discovery-presentation` used | `## Q1. Title` — a second variant, invented 2026-08-26 |
| `durable-citations.test.mjs` enforces | every cited `Q<n>` resolves to a `## Q<n>` heading |

**The template never taught a convention a shipped test already enforces.**
Eight of twelve `quirks.md` files carry no Q-numbers at all; the ones that do
each invented a format. The test only checks the citation direction, so the
divergence stayed invisible — including to the session that added the second
variant an hour before writing this.

New template:

```markdown
# Quirks — {Feature}

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | {symptom} | {what sets it off} | high | yes / no / partial |

## Q1 — {Title}
**Discovered:** {date or commit}

**Symptom:** what a reader will observe.
**Trigger:** what sets it off.
**Cause:** why it happens.
**Mitigation:** what to do — or "none", said plainly.

{prose — only the part that genuinely needs explaining}
```

**Decision: `## Q<n> — Title` is canonical.** Oldest form, most used, and what
the majority of existing citations already point at. The alternative (`Q1.`)
had one user and was a day old.

**Decision: `Mitigated: yes / no / partial` is a required column.** It is a
checkable assertion, which is what makes the row useful to `preflight`'s drift
check rather than only to a human scanning.

**Decision: splitting the blob into Symptom / Trigger / Cause / Mitigation.**
Four facts were already being asked for in one paragraph; naming them stops
the common failure of describing a symptom and never saying what to do.

**Deferred to §5:** whether the heading format is *enforced* by a test, and
what that would mean for the eight files that do not currently comply.

## §4 — The two-homes rule (agreed, closes #61)

Reported as: *"the data shape or types/interfaces lacks comments and jsdocs for
localized explanation, I either had to search for it or the explanation was
non-existent."*

| | carries | what the reader actually opens |
|---|---|---|
| `api.md` "Key Types / Schemas" | a bare `interface`, no annotation guidance | **this one** |
| `fields.md` | a table *with* a Description column | not this one |

The explanation usually exists — it is simply never on the thing being read.
Neither file is wrong on its own, which is why this survived unnoticed.

**Decision: the type says what a field *means*; the table says what *happens to
it*.** A crisp division that removes the duplication without deleting either
home.

```typescript
interface Invoice {
  id: string;               // Stripe invoice id, `in_`-prefixed
  amountDue: number;        // minor units (cents) — never format directly
  status: InvoiceStatus;    // drives the badge; `draft` is hidden in the list
  voidedAt: string | null;  // ISO 8601; null unless voided
}
```

`fields.md` then keeps only what a type cannot express — the journey:
`amount_due → amountDue`, *cents → dollars at BE*, *omitted when null*. Its
Description column becomes explicitly about the transformation.

**Decision: trailing `//` by default, JSDoc only when a line will not do**
(units, constraints, nullability semantics). `api.md` is already the
second-longest concern file at 101 median lines; a JSDoc block per field would
make the density problem worse while fixing the localisation one.

**Rejected — generate `fields.md` from the annotated types.** Would stop the
drift returning permanently, but adds a generator and a check to a repo whose
spec tooling is deliberately just markdown. Worth revisiting only if the two
files are observed drifting again after this rule lands.

**The general rule worth carrying beyond this file:** *a fact with two homes
goes missing from the one you are reading.*

## §5 — The budget and the gate (agreed)

Pass one's lesson was *the budget must be a number*. The honest reading here is
different: **the structure is the budget.** A summary table plus labelled
fields mechanically caps prose — 79 long paragraphs cannot be written into a
shape with nowhere to put them.

So the gate checks structure, not a percentage.

| Candidate gate | Verdict |
|---|---|
| Prose ≤ 60% per concern file | **Rejected.** Measures a proxy, flags legitimately prose-heavy content, and "61%" is an unactionable failure message |
| Structural checks | **Chosen.** Unambiguous, actionable, and checks the contract rather than a stand-in |
| Guidance only, no test | **Rejected.** Advice is what produced the 93% |

**Decision: three structural checks.** `quirks.md` headings match
`## Q<n> — Title`; `decisions.md` opens with a summary table; `api.md` type
blocks carry per-field annotation.

**Decision: no grandfathering.** All 12 existing specs migrate. The end state
is one convention with no allowlist and no visible-debt bookkeeping.

**Measured cost of that choice:** 69 decisions and 82 quirks — **151 items** —
across 24 files and 2,419 lines, plus per-field annotation on 6 `api.md` files
(concord, docket, plugin-doctor, preflight-drift-check, surface-kit,
uninstall-convention). It is judgement work per item, not a script: each
decision's prose must be split into Decided / Because / Alternatives /
Consequences without turning rationale into assertion.

**Decision: two PRs, same end state.**
- **PR A** — new templates, the structural test, `scripts/spec-density.mjs`,
  and enough of this repo's own specs migrated for the test to pass.
- **PR B** — the remaining specs.

A bad migration is caught in a small batch rather than buried in a 2,400-line
diff. Splitting is about reviewability only; no grandfathering is introduced by
it, and the test lands in PR A already enforcing.

**Decision: `scripts/spec-density.mjs` ships as a non-blocking reporter** —
prints the prose-density table measured at the top of this design, so the
target stays checkable on demand without gating a build.

## §6 — `implementation.md` (agreed)

55% prose, median 76 lines — already the second-best file, because it has a Key
Files table. The problem is the three prose sections around it.

```markdown
# Implementation — {Feature}

| File | Role |
|---|---|

## Data flow
1. {step} — {what happens}
2. …

## Patterns
| Pattern | Where | Why not the obvious thing |
|---|---|---|

## Overview *(only when the file table does not already tell the story)*
```

**Decision: Data Flow becomes a numbered list.** The current template already
describes it as "step-by-step description of how data moves through the
system" — it was never prose; it was a list written as paragraphs.

**Decision: Overview becomes conditional**, on the same rule as `decisions.md`'s
Context: include it only when the Key Files table does not already tell the
story.

**Decision: Patterns gains a "why not the obvious thing" column.** A pattern
recorded without the alternative it displaced is trivia — the reader cannot
tell whether it was a considered choice or an accident.

## §7 — `index.md` (agreed)

60% prose but median **22 lines** — the shortest concern file and the least
broken. One change only.

```markdown
## Contents
| File | Answers |
|---|---|
| [Decisions](decisions.md) | why it works this way, and what was rejected |
| [Quirks](quirks.md) | what will bite you, and whether it is mitigated |
```

**Decision: Contents becomes a table with an "Answers" column,** so the index
answers *which file do I open* rather than restating filenames.

**Consequence:** `references/scaffold.sh` writes `index.md`, so it changes too.
That is the only place in this design where a script is touched.

**Deliberately minimal.** At 22 lines there is no density problem to solve, and
a heavier template would buy nothing while widening the change.

## Open questions carried into planning

1. Whether the structural test can check "`api.md` type blocks carry per-field
   annotation" robustly — parsing a fenced block for per-field comments is
   doable but heuristic, and a flaky gate is worse than none.
2. Whether `scaffold.sh`'s `index.md` writer should emit the Contents table
   pre-filled with the standard six rows, or leave it for the agent to fill.

## Related work filed, not done here

- **#62** — `discovery` and `live-verification` write artifacts with no
  template. Do it after this lands so the design-doc template consumes this
  vocabulary rather than inventing a parallel one.
- **#63** — `discovery` hardcodes preview port 7777; the server auto-assigns.
  Out of this design's scope lock (`skills/technical-spec`).

## §5 addendum — the reporter's primary metric (agreed 2026-08-26)

Measured after writing this spec's own concern files in the proposed shape:

| file | corpus | new | paragraphs >3 lines (corpus avg → new) |
|---|---|---|---|
| `decisions.md` | 93% | **36%** | 6.6 → **0** |
| `implementation.md` | 55% | **24%** | 1.8 → **0** |
| `quirks.md` | 88% | 80% | 8.2 → 4 |
| `index.md` | 60% | 59% | 1.6 → 1 |

`decisions.md` and `implementation.md` validate the design outright.
`quirks.md` moved 8pp on percentage while halving its long paragraphs, and
`index.md` did not move at all.

**Cause:** the quirks template uses labelled one-liners (`**Symptom:** …`),
which the density measure counts as prose — a four-line labelled block and a
four-line wall score identically. `index.md` shows the same at 22 lines, where
a blockquote and a changelog dominate the ratio.

**Decision: `scripts/spec-density.mjs` leads with paragraphs over three lines**,
and reports prose percentage as secondary context. The long-paragraph count
tracked reality in all four files; the percentage did not in two.

This is also the strongest evidence for §5's structural-gate decision: the
percentage failed as a measure on the very file it was measuring. Had it been
the gate, `quirks.md` would have failed at 80% while being materially fixed.

**Not reopening §3.** The quirks shape halved its long paragraphs; what failed
was the metric, not the template.
