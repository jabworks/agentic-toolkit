# trigger-reliability — Tech Spec

> Why installed skills fail to fire on matching phrases — the miss classes
> (lexical-cold, shadowed, suppressed, hook-wiring), the conditional
> routing-nudge countermeasure, and the period-2 measurement that routes each
> fix. Period 1 is `specs/friction-audit-2026-07-29/`.

**Last updated:** 2026-08-28
**Commit:** ed4cbb4
**Status:** current

## Contents

| File | Answers |
|---|---|
| [decisions.md](decisions.md) | D1–D6: dual mechanism, nudge rules, our-side boundary, condux read-only, corpus reach, verdict-table-first |
| [quirks.md](quirks.md) | Q1–Q4: suppression class, Codex root-manifest trap, content-carrying nudges, eval-simulation limit |
| [implementation.md](implementation.md) | key files, period-2 method, verification chain, ship shape |
| [period-2-report.md](period-2-report.md) | the evidence: corpus, 9%-vs-64% asymmetry, lexical ceiling, verdict tables |

## Changelog
- 2026-08-28: Period-2 report landed (suppression confirmed 9% vs 64%; all 8 period-1 rewrites already applied — the lexical ceiling is measured). Nudge shipped in session-handoff 1.10.0; record/git-worktree sharpened; Q4 resolved (eval-pass + live-fail is the suppression signature); dockets #64–#67 filed.
- 2026-08-27 (ed4cbb4): Initial spec — design signed off; measurement and fixes pending
