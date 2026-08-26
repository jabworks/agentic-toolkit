# Decisions — Spec Artifact Readability

> Written in the shape this spec designs. It is the worked example.

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Layer every concern file — table on top, reasoning underneath | one table serves three of the four reading jobs at once | accepted |
| 2 | Keep all four reading jobs | two are shipped consumers with running code; three ride the same table for free | accepted |
| 3 | Keep ADR's four facts, drop its four prose headings | alternatives are load-bearing and the form buried them in prose | accepted |
| 4 | `Context` becomes conditional | it usually restates what `Decided` already implies — the single biggest prose cut | accepted |
| 5 | `## Q<n> — Title` is canonical in `quirks.md` | a shipped test enforces a convention the template never taught | accepted |
| 6 | The type says what a field *means*; the table says what *happens to it* | one fact with two homes goes missing from the one you read | accepted |
| 7 | The gate checks structure, not prose percentage | structure caps prose mechanically; a percentage measures a proxy and fails unactionably | accepted |
| 8 | No grandfathering — all 12 specs migrate | one convention, no allowlist, no visible-debt bookkeeping | accepted |
| 9 | Two PRs, same end state | 151 hand-migrated items are unreviewable as one 2,400-line diff | accepted |

## 1. Layer every concern file — 2026-08-26

**Decided:** every concern file opens with a scannable table and carries its reasoning underneath.
**Because:** the corpus shows the two templates that mandate a table are the two readable files.

Measured 2026-08-26 across 68 files, 5,967 lines:

| file | prose % | paragraphs >3 lines | has a mandated table |
|---|---|---|---|
| `decisions.md` | 93% | 79 | no |
| `quirks.md` | 88% | 98 | no |
| `api.md` | 68% | 16 | partly |
| `index.md` | 60% | 19 | no |
| `implementation.md` | 55% | 21 | yes |
| `fields.md` | 46% | 8 | yes |

| Alternative | Why not |
|---|---|
| Pick one reader and optimise for it | Loses real consumers and saves nothing — the other three jobs are free once the table exists |
| Table layer with ADR headings kept underneath | Adds a scan layer without touching the 93% prose, which is the complaint |

**Consequences**
- Every concern-file template changes, and 151 existing items migrate (see #9).
- Prose is confined to where it earns its keep, which makes its absence conspicuous — a decision with no reasoning now looks empty rather than terse.

## 2. Keep all four reading jobs — 2026-08-26

**Decided:** the artifact serves scanning, context-reload, drift-checking and agent handoff.
**Because:** two of those are already running code, and three are served by the same table.

**Context** — dropping jobs was proposed on the assumption they were aspirational. They are not: `preflight`'s Drift Check reads `api.md` / `fields.md` / `quirks.md` / `implementation.md` against the diff, and `/workflow`'s router step 2 loads spec files by task type. Dropping them from the design would not stop them reading; it would only mean the artifact is not shaped for what reads it.

| Alternative | Why not |
|---|---|
| Drop drift-check and agent handoff | Both keep happening regardless; removing them costs the table layer its justification while saving no work |

**Consequences**
- A table row must be written as a claim, not a label — otherwise it is scannable but not checkable.

## 3. Keep ADR's four facts, drop its four prose headings — 2026-08-26

**Decided:** Context / Decision / Rationale / Consequences survive as content; they stop being four prose headings.
**Because:** `decisions.md` scores 93% prose and 79 long paragraphs — the worst in the corpus — and the headings are the shape producing it.

| Alternative | Why not |
|---|---|
| Keep the ADR form, fix density inside it | The form *is* the density: four prose headings per decision, 69 decisions in the corpus |
| Summary table only, detail opt-in | A decision recorded as a row with no reasoning is the assertion-without-rationale failure ADR existed to prevent |

**Consequences**
- Specs written before this change use a different shape until PR B migrates them.

## 4. `Context` becomes conditional — 2026-08-26

**Decided:** include `Context` only when a reader six months later could not reconstruct why the question arose.
**Because:** `Because` already covers why *this* option won; `Context` covers why a decision was needed at all, which is frequently self-evident from the feature.

**Consequences**
- The largest prose block in the worst file disappears from most decisions.
- Risk: a genuinely non-obvious origin gets omitted by a writer in a hurry. The rule is phrased as a reader test rather than a length rule to make that judgement easier.

## 5. `## Q<n> — Title` is canonical — 2026-08-26

**Decided:** quirk headings are `## Q<n> — Title`.
**Because:** `durable-citations.test.mjs` already enforces that every cited `Q<n>` resolves to a `## Q<n>` heading, and the template never taught the convention.

**Context** — eight of twelve `quirks.md` files carry no Q-numbers at all. The four that do invented the format independently, and two variants already exist: `Q1 — Title` (surface-kit, 26 quirks) and `Q1. Title` (discovery-presentation, written 2026-08-26). The test only checks the citation direction, so the divergence stayed invisible — including to the session that added the second variant.

| Alternative | Why not |
|---|---|
| `## Q1. Title` | One user, one day old |
| Leave numbering to the writer | Template silence is what produced two variants under an enforcing test |

**Consequences**
- Eight files gain Q-numbers during migration, and any citation pointing at them becomes checkable for the first time.

## 6. Type says meaning, table says journey — 2026-08-26

**Decided:** `api.md` type blocks annotate every field with what it means; `fields.md` keeps only mapping and transformation.
**Because:** the same fact had two homes and the reader's home was the un-annotated one.

**Context** — reported as "the data shape or types/interfaces lacks comments and jsdocs for localized explanation, I either had to search for it or the explanation was non-existent." `api.md`'s Key Types block is a bare `interface` with no annotation guidance; `fields.md` carries a Description column. Neither file is wrong alone, which is why it survived.

| Alternative | Why not |
|---|---|
| JSDoc block per field | `api.md` is already the second-longest file at 101 median lines; this fixes localisation by worsening density |
| Generate `fields.md` from annotated types | Stops drift permanently but adds a generator and a check to deliberately markdown-only spec tooling |

**Consequences**
- Closes docket #61.
- The general rule is worth more than the fix: *a fact with two homes goes missing from the one you are reading.*

## 7. The gate checks structure, not prose percentage — 2026-08-26

**Decided:** three structural checks — `quirks.md` headings match `## Q<n> — Title`, `decisions.md` opens with a summary table, `api.md` type blocks carry per-field annotation.
**Because:** structure caps prose mechanically, and a percentage measures a stand-in.

| Alternative | Why not |
|---|---|
| Prose ≤ 60% per file | Flags legitimately prose-heavy content, and "61%" is an unactionable failure message |
| Guidance only, no test | Advice is exactly what produced the 93% |

**Consequences**
- `scripts/spec-density.mjs` ships as a non-blocking reporter, **leading with paragraphs over three lines** and reporting prose percentage as secondary context.
- Measured after writing this spec in the new shape: `decisions.md` 93% → 36% and `implementation.md` 55% → 24%, both with zero long paragraphs; `quirks.md` moved only 88% → 80% while halving long paragraphs 8.2 → 4, because labelled one-liners score as prose. The percentage failed as a measure on the very file it was measuring — which is the strongest available evidence that it would have been the wrong gate.
- Open question: whether the `api.md` annotation check can be made non-flaky — parsing a fenced block for per-field comments is heuristic, and a flaky gate is worse than none.

## 8. No grandfathering — 2026-08-26

**Decided:** all 12 existing specs migrate; no allowlist.
**Because:** one convention with no exceptions is simpler to hold than a shrinking exception list.

**Consequences**
- 69 decisions and 82 quirks — **151 items** across 24 files and 2,419 lines — plus per-field annotation on 6 `api.md` files.
- It is judgement work per item, not a script: each decision's prose must split into Decided / Because / Alternatives / Consequences without turning rationale into assertion.

## 9. Two PRs — 2026-08-26

**Decided:** PR A ships templates, the structural test, the reporter, and enough migration for the test to pass. PR B migrates the rest.
**Because:** a bad migration is catchable in a small batch and invisible in a 2,400-line diff.

**Consequences**
- No grandfathering is introduced by the split — the test lands in PR A already enforcing.
- Between the two PRs, `main` carries a passing test and some unmigrated specs, so PR A's migration scope is set by what the test touches, not by taste.
