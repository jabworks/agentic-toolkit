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
| [memory-stack-decision.md](memory-stack-decision.md) | docket #67: replace the third-party memory stack on Claude Code? Options, parity cost, pre-registered period-3 criterion |

## Changelog
- 2026-08-28: Decision brief for docket #67 written (`memory-stack-decision.md`) — recommends deferring the memory-stack replacement against a pre-registered period-3 fire-rate criterion; no config knob exists to demote the third-party digest; awaiting ratification.
- 2026-08-28: Docket #64 closed — trigger-eval harness gained an optional per-case `context` preamble, scored as a separate metric and seeded on session-handoff. First measurement 6/6 fires: the preamble does not reproduce suppression, because the harness always asks for a route (Q4 update).
- 2026-08-28: Period-2 report landed (suppression confirmed 9% vs 64%; all 8 period-1 rewrites already applied — the lexical ceiling is measured). Nudge shipped in session-handoff 1.10.0; record/git-worktree sharpened; Q4 resolved (eval-pass + live-fail is the suppression signature); dockets #64–#67 filed.
- 2026-08-27 (ed4cbb4): Initial spec — design signed off; measurement and fixes pending
