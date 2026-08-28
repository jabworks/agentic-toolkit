# Decisions — Trigger Reliability

| # | Decision | Because | Status |
|---|---|---|---|
| D1 | Evidence-routed dual mechanism | misses aren't monolithic — each measured class gets its own remedy | ratified 2026-08-27 |
| D2 | Suppressed-class remedy: conditional routing nudge | condux's routing injection is the toolkit's only proven activation mechanism; conditionality keeps it rare | ratified 2026-08-27 |
| D3 | Our-side only; third-party remember never modified | the suppressor is `claude-plugins-official/remember` (external); countermeasures land in our skills/hooks | ratified 2026-08-27 |
| D4 | Condux skills read-only this pass | the healthy population (most-reached skills, period-1 rewrites applied); defects found there are docketed, not edited | ratified 2026-08-27 |
| D5 | Corpus reach: audit-comparable | period 2 mines the same sources as period 1 (all `~/.claude/projects/*` + `~/.codex`), corporate repos excluded | ratified 2026-08-27 |
| D6 | Verdict-table-first sweep | 2026-08 eval work already applied some period-1 rewrites; blind re-apply could regress them | ratified 2026-08-27 |

## D1 — Evidence-routed dual mechanism (2026-08-27)

A fresh transcript mine (2026-07-30 → 2026-08-27, the month after the
period-1 audit in `specs/friction-audit-2026-07-29/`) classifies every miss
as exactly one of: **lexical-cold** (no fire, phrasing ≉ declared
vocabulary), **shadowed** (a different skill fired on the same turn),
**suppressed** (vocabulary matched near-verbatim, no fire, equivalent content
already injected into context), **hook-wiring** (an auto-fire hook didn't).
Lexical/shadowed misses get contract rewrites; suppressed misses get the D2
nudge; hook-wiring stays with its existing tracking. Rejected: lexical-only
(period 1 showed 100% contract compliance alongside the misses; vocabulary
cannot reach the suppression class) and injection-only (unconditional token
cost; the loudest tool applied everywhere).

## D2 — Conditional routing nudge (2026-08-27)

A SessionStart hook injects a short directive routing phrases to a skill.
Rules, in priority order: **conditional** (inject only when the trigger
surface is live — e.g. session-handoff only when `.session-handoff/` or
legacy `handoffs/` is non-empty; otherwise zero tokens); **directive, not
content** (never summarize the artifact — see Q3); **demote the substitute**
(name injected digests as context, not the workflow); **tiny** (≤ 3 lines /
~60 tokens); **fail open** (exit 0 on any error); **dual-host safe** (Claude
`hooks/hooks.json`, Codex manifest `hooks`, with the root-manifest exclusion
— see Q2). Recipients: session-handoff now; afterwards only skills a
measurement verdicts as suppressed-class.

**RETIRED 2026-08-28 — owner's decision, before any measurement.** Harvey
declined to carry a second SessionStart hook for one skill. session-handoff
2.0.0 removes the hook, its payload, its dual-host manifests and its test; D2's
rules stand as written but have **no live instance**, so the convention is now
untested rather than validated. The removal is a preference call, not a
falsification: the nudge was never measured, and #64 established that no harness
can measure it (Q4).

Two consequences the rules themselves do not carry:

- **The mechanism was the only remedy on our side.** D3 bars modifying the
  suppressor; with the nudge gone, the upstream request (see
  `upstream-request.md`) is the only live remedy for the suppression class.
- **The convention outlives its instance.** `toolkit-skill-standards` documents
  the nudge pattern as house doctrine. Whether that survives with zero instances
  is a separate decision — docket #69, not this one. Do not treat D2 as
  authorising a new nudge in the meantime.

## D3 — Our-side only (2026-08-27)

The injected digest comes from the third-party
`claude-plugins-official/remember` plugin (0.20.0, its
`session-start-hook.sh`). It is observed, never edited. Replacing it with the
toolkit's own memory stack on Claude Code is explicitly deferred (docketed),
not rejected.

## D5 — Corpus reach (2026-08-27)

Harvey's grant at the detail round: mine the same transcript sources as
period 1 so the periods compare cleanly. Corporate repos are never read —
`maestro-api-gateway` named explicitly. Digests are regenerated; period 1's
were session-scoped scratch and no longer exist.

## D6 — Verdict-table-first sweep (2026-08-27)

Each period-1 ranked rewrite (8 total) is diffed against the current
`skills/<name>/SKILL.md` and recorded as `already-applied` / `apply` /
`superseded` before anything is edited. Outcome (2026-08-28, measured in
`period-2-report.md`): **all 8 were already applied** — the design-time
provisional reading (#1/#2/#3/#8 pending) was stale, and D6 is what caught
it before four no-op edits shipped. The period-2 `apply` set became the two
fresh lexical verdicts instead: `record` and `git-worktree`.
