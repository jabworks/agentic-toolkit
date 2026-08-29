# Decisions — Trigger Reliability

| # | Decision | Because | Status |
|---|---|---|---|
| D1 | Evidence-routed dual mechanism | misses aren't monolithic — each measured class gets its own remedy | ratified 2026-08-27 |
| D2 | Suppressed-class remedy: conditional routing nudge | condux's routing injection is the toolkit's only proven activation mechanism; conditionality keeps it rare | ratified 2026-08-27 |
| D3 | Our-side only; third-party remember never modified | the suppressor is `claude-plugins-official/remember` (external); countermeasures land in our skills/hooks | ratified 2026-08-27 |
| D4 | Condux skills read-only this pass | the healthy population (most-reached skills, period-1 rewrites applied); defects found there are docketed, not edited | ratified 2026-08-27 |
| D5 | Corpus reach: audit-comparable | period 2 mines the same sources as period 1 (all `~/.claude/projects/*` + `~/.codex`), corporate repos excluded | ratified 2026-08-27 |
| D6 | Verdict-table-first sweep | 2026-08 eval work already applied some period-1 rewrites; blind re-apply could regress them | ratified 2026-08-27 |
| D7 | No upstream ask; we absorb the collision | the plugin is not malfunctioning, and we do not ask a third party to change working software to suit our skill | ratified 2026-08-29 |

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
  `upstream-request.md`) was the only live remedy for the suppression class.
  **That path closed too on 2026-08-29 — see D7.** No remedy remains short of
  the #67 port; the collision is absorbed deliberately.
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

**Extended 2026-08-29 (docket #66):** `vedge-ui-v2`, `axon-*`, and
`lightweight-bff` are corporate too — Harvey's classification of the 92 Codex
sessions period 2 had excluded on naming alone. The conservative call was
correct. These four repo families are the standing corporate set: never read,
in this period or any later one. Every future mine inherits the exclusion
without re-asking.

## D6 — Verdict-table-first sweep (2026-08-27)

Each period-1 ranked rewrite (8 total) is diffed against the current
`skills/<name>/SKILL.md` and recorded as `already-applied` / `apply` /
`superseded` before anything is edited. Outcome (2026-08-28, measured in
`period-2-report.md`): **all 8 were already applied** — the design-time
provisional reading (#1/#2/#3/#8 pending) was stale, and D6 is what caught
it before four no-op edits shipped. The period-2 `apply` set became the two
fresh lexical verdicts instead: `record` and `git-worktree`.

## D7 — No upstream ask; we absorb the collision (2026-08-29)

Harvey's call, on the drafted Option D request: *"I don't really want to make
them change anything."* The request is declined and will not be filed. The
draft stays in the repo as the record of what was considered — see
`upstream-request.md`, whose status line now says so.

The reasoning is a boundary, not a cost estimate. `remember` is not
malfunctioning; it does exactly what it advertises, and the suppression is an
emergent interaction neither side designed. D3 already said we do not modify
someone else's plugin. D7 extends the same principle one step further: we do
not ask them to modify it either. A working third-party tool does not owe our
skill an accommodation, and "it costs them one string" is our estimate of their
cost to spend, not ours.

**What this closes.** Every remedy for the suppression class is now spent:

| Remedy | Status |
|---|---|
| Configure the digest down | closed on evidence — no such knob (`memory_inject_max_bytes`, `prompt_stamp` govern other things) |
| Fork or patch the plugin | barred by D3 |
| Our own SessionStart counter-nudge | shipped 1.10.0, retired 2.0.0 — a second hook per suppressed skill is a permanent per-install cost |
| Ask upstream | **declined here** |
| Port to our own memory stack (#67 Option B) | open, expensive, and now the only structural fix left |

The toolkit ships no countermeasure and will not acquire one by asking. That is
a deliberate position, and the honest description of the trade is that we accept
a ~9% resume-phrase fire rate rather than spend a hook on every session or a
request on a maintainer who did nothing wrong.

**What stays available.** Explicit invocation always works — `/session-handoff`,
or naming the skill — and costs the user a few words when they want the
structured resume. That is now the supported path, not a workaround for one.

**What would reopen this.** Upstream adding such a line on their own initiative;
the plugin gaining a demotability knob for unrelated reasons; or the collision
widening past `session-handoff` to a class of skills large enough that the
calculus is no longer one skill's convenience. None is expected.
