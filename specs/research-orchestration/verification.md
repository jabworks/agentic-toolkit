# Verification — research-orchestration

Evidence that `condux:research` does what `prd.md` claims, measured against condux 2.35.0 on Claude Code before merge (PR #180).

| Check | Result | Run |
|---|---|---|
| Quality baseline (Sonnet scouts) | 12/12 pass; means below | 2026-10-08 |
| Depth gate (decision 7) | 5/5 pass | 2026-10-08 |
| Haiku 5.5 scout A/B | partial — 5/12 scored, inconclusive | 2026-10-08 |

## Environment

| Setting | Value |
|---|---|
| Runner | `scripts/eval-research-quality.mjs` |
| Plugin | `dist/plugins/condux` loaded with `--plugin-dir`, condux 2.35.0; the only condux copy loaded (verified in the init event) |
| Lead / judge | opus / opus |
| Scouts | sonnet (as shipped) |
| Disabled plugins | `context-mode@context-mode` — its WebFetch redirect blocks every allowlisted agent (quirks Q4, docket #99) |
| Corpus | `skills/research/evals/quality_eval.json` — 12 questions: 9 normal, 3 fallback |

## Quality baseline

The first 3 cases ran as a smoke run; the remaining 9 ran with the same version, environment, and judge. `local-first-sync` returned a verdict the runner could not parse. It was re-judged once from its saved report and notes; the runner now retries automatically and keeps every judge reply.

| id | shape | fallback | factual | citation | completeness | source quality | tool efficiency | pass | cost |
|---|---|---|---|---|---|---|---|---|---|
| server-state-libs | comparison | no | 0.90 | 0.90 | 0.90 | 0.95 | 0.80 | ✓ | — |
| edge-auth | survey | no | 0.90 | 0.85 | 0.85 | 0.90 | 0.65 | ✓ | — |
| test-runners-fallback | comparison | yes | 0.88 | 0.90 | 0.95 | 0.85 | 0.88 | ✓ | — |
| ts-orms | comparison | no | 0.92 | 0.92 | 0.85 | 0.88 | 0.78 | ✓ | $5.82 |
| js-linters | comparison | no | 0.90 | 0.92 | 0.80 | 0.88 | 0.70 | ✓ | $3.96 |
| monorepo-tools | comparison | no | 0.87 | 0.90 | 0.85 | 0.85 | 0.70 | ✓ | $3.67 |
| plugin-versioning | survey | no | 0.85 | 0.85 | 0.85 | 0.85 | 0.75 | ✓ | $5.85 |
| design-tokens | survey | no | 0.82 | 0.88 | 0.85 | 0.90 | 0.78 | ✓ | $6.57 |
| rsc-support | survey | no | 0.93 | 0.87 | 0.88 | 0.92 | 0.80 | ✓ | $3.24 |
| local-first-sync | survey | no | 0.90 | 0.88 | 0.85 | 0.80 | 0.75 | ✓ | $7.16 |
| feature-flags-fallback | survey | yes | 0.90 | 0.75 | 0.90 | 0.85 | 0.85 | ✓ | $4.55 |
| bundlers-fallback | comparison | yes | 0.95 | 0.95 | 0.90 | 0.90 | 0.85 | ✓ | $4.83 |

**Means (12):** factual 0.89 · citation 0.88 · completeness 0.87 · source quality 0.88 · tool efficiency 0.77.
**Lowest per criterion:** 0.82 · 0.75 · 0.80 · 0.80 · 0.65.
**Cost:** $45.65 for the 9 costed cases (about $5 per question), including the re-judge. The smoke run predates cost capture.

Run folders checked by hand:
- Both fallback cases announced "researching sequentially" and wrote notes without any scout.
- Normal cases dispatched 3–6 scouts. `design-tokens` wrote 7 notes, a gap round included.
- Fetch failures recorded as Gaps: 0–3 per case, except `local-first-sync` with 11. That case has the lowest source-quality score (0.80).

**Observation:** tool efficiency is the weakest criterion (mean 0.77, low 0.65 on `edge-auth`, a 251-line report from 5 scouts). The judge reads it as over-collection. This is not acted on yet; the A/B shows whether it is model-dependent.

## Depth gate

`--gate` poses `skills/research/evals/gate_eval.json` without naming the skill (6-turn cap, no judge) and scores the transcript.

| id | expect | skill loaded | fanned out | asked | pass |
|---|---|---|---|---|---|
| inferred-comparison | ask | yes | no | yes | ✓ |
| inferred-survey | ask | yes | no | yes | ✓ |
| inferred-options | ask | yes | no | yes | ✓ |
| single-fact | direct | no | no | no | ✓ |
| single-api | direct | no | no | no | ✓ |

## Haiku 5.5 scout A/B

Same 12 questions with `--scout-model haiku` (`claude-haiku-5-5`), everything else unchanged. Decision rule agreed 2026-10-08: switch scouts to Haiku if no criterion's mean drops more than 0.05 and citation accuracy does not drop.

**Partial run.** The first 5 cases scored. The last 7 (from `plugin-versioning` on, including all 3 fallback noise controls) wrote no `report.md`, and most recorded no cost. That pattern is consistent with the runs being cut off — the session hit a usage limit around the same time — but the cause is unconfirmed. Re-run those 7 before deciding.

Matched comparison on the 5 scored cases:

| Criterion | Sonnet scouts | Haiku scouts | Δ |
|---|---|---|---|
| factual | 0.90 | 0.90 | +0.00 |
| citation | 0.90 | 0.90 | −0.00 |
| completeness | 0.85 | 0.83 | −0.02 |
| source quality | 0.89 | 0.88 | −0.01 |
| tool efficiency | 0.73 | 0.75 | +0.02 |

- All 5 pass.
- Every delta is within ±0.02, inside the 0.05 rule. Citation moved by −0.002, which is below any meaningful resolution.
- **Cost did not fall** on the 3 cases costed in both runs: $13.45 with Sonnet scouts, $14.80 with Haiku. The opus lead and judge dominate the bill, so a cheaper scout alone does not cut cost here; the lead model is the bigger lever.
- **Verdict: inconclusive** — no noise control, and only 5 of 12 cases.
