# Period-2 Evidence Report — 2026-07-30 → 2026-08-27

Mined 2026-08-27/28. Methodology mirrors period 1
(`specs/friction-audit-2026-07-29/trigger-matrix.md`): organic user turns swept
against declared trigger vocabulary, skill invocations read from transcript
tool-use records, install channels unioned. New in period 2: **turn-level
attribution** — a phrase-turn counts as fired only when the skill activates
within two user turns of it, because session-level counting masks a missed
resume behind a later wrap-up fire in the same session.

## Corpus

| Set | Sessions | Notes |
|---|---|---|
| Included | 113 (101 Claude, 12 Codex) — 1,063 organic turns | agentic-toolkit, terminus, + worktree/scratch offshoots |
| Excluded: eval harness | 1,767 Claude `-tmp` + 15 Codex `foundry-codex-eval-*` | router-eval sessions (first turn: "You route user messages to a coding agent's skills…") |
| Excluded: corporate | all `maestro-api-gateway` cwds | never read (D5) |
| Excluded: unclassified | 92 Codex (`vedge-ui-v2` 70, `axon-*`, `lightweight-bff` 3) | naming suggests corporate; excluded conservatively — reclassify and re-mine if Harvey says personal |
| Zero in-range | crucible, style-guide, project-haven | no period-2 sessions |

## Headline: the suppression hypothesis is confirmed

Session-handoff, turn-level, period 2:

| Phrase set | Fired near | Missed | Rate |
|---|---|---|---|
| wrap-up ("wrap up", "save state", "handoff") | 47 | 27* | ~64% (higher after cleaning*) |
| resume ("resume", "continue from", "last session") | 6 | **60** | **~9%** |

\* the wrap miss list is polluted by false matches ("handoff" as a noun inside
resume turns, task-notification text); cleaned rate is higher.

Same skill, same contract, same host — the resume phrases are declared
vocabulary and the misses are verbatim: "Let's continue from our last
session" (repeatedly), "Let's resume from our last session", "continue from
previous session". Of the 6 resume "hits": 2 said "handoff" literally, 1 is
the 2026-08-27 session where the skill fired only after Harvey complained
("Wait why didn't I see you use any skills?"), leaving ~3/66 (~5%) truly
organic fires. The remember digest (third-party
`claude-plugins-official/remember`, SessionStart) was active throughout the
period and answers exactly the resume question's information need; nothing
injected answers the wrap-up need. **Verdict: suppressed-class (Q1). Remedy:
D2 conditional nudge.** The corpus even contains the user noticing:
`b4a594f6#19` "sometimes when I say wrap up this session, session-handoff got
triggered, sometimes it doesn't."

## The lexical ceiling, now measured

`toolkit-debugging-playbook`'s period-1 rewrite shipped 2026-08-06
(`400f346`). On 2026-08-20 (`fef70870#0`) the user said "I noticed that the
skill for visual mockups almost never fire" — the skill's literal remit,
post-rewrite — and it did not fire. A rewrite that adds the right vocabulary
is necessary but demonstrably not sufficient.

## Rewrite verdict table (D6)

| # | Skill | Verdict | Evidence |
|---|---|---|---|
| 1 | toolkit-change-control | already-applied (`69a7393`, 2026-08-14) | 0 organic period-2 matches — bumps now happen inside workflow flows |
| 2 | toolkit-research-frontier | already-applied (`0cfa3d1`, 2026-08-09) | only period-1 overlap misses (session `16d07041`, started 07-29); no post-apply organic test yet |
| 3 | toolkit-debugging-playbook | already-applied (`400f346`, 2026-08-06) | **missed again post-apply** (2026-08-20) — see lexical ceiling |
| 4–7 | condux skills | already-applied (period-1 finding confirmed) | condux read-only regardless (D4) |
| 8 | remember (concord) | already-applied (`d620749`, 2026-08-26) | zero post-apply window — watch next period |

**The expected `apply` set is empty.** D6 (verdict-table-first) prevented
four no-op edits.

## Fresh period-2 verdicts

| Skill | Class | Evidence | Remedy |
|---|---|---|---|
| session-handoff (resume) | suppressed | headline above | D2 nudge (this task) |
| record (docket) | lexical-cold, mild | "Docket it" (`a2c8face#13`), "Let's file a docket item first" (`6d283a0c#6`) missed; 3 other fires show the skill works | sharpen `when_to_use` with bare imperatives ("docket it/this") |
| git-worktree | lexical-cold | "Let's create a new worktree for the fix" (`7cd130bb#2`) missed; 0 fires all period | add quoted user-shaped phrases ("create a worktree", "new worktree for X") |
| toolkit-debugging-playbook | applied-but-cold | post-rewrite miss 2026-08-20 | no further lexical room — docket for a suppressed-class/nudge evaluation next period |
| remember/memory recall | inconclusive | 4 weak matches, mostly imperative "remember to…" (instructions, not recall) | none — #8 already applied, watch |
| blueprint, release, live-verification, toolkit-change-control | no genuine organic misses | blueprint's 2 misses predate/surround its own creation; release & live-verification fire via workflow CP-3 menus | none |

## Eval gate (post-fix, 2026-08-28)

3-trial router eval after the record/git-worktree contract edits: per-run
93.2% / 94.2% / 92.2%, mean **93.2% ± 2.5pp** — holds against the 2026-08-26
band (93.1% ± 0.2pp). Touched skills' own cases: record 18/18, git-worktree
15/16, session-handoff 16/16.

## Caveats

- Turn-level windows (±2 turns) are a heuristic; compaction-continuation
  turns ("This session is being continued…") were counted as organic in the
  resume sweep — removing them shrinks both columns without changing the
  asymmetry's order of magnitude.
- Codex skill detection relies on `SKILL.md` read paths in tool payloads —
  undercounts Codex fires; the headline numbers are Claude-dominated.
- The 92 unclassified Codex sessions are a real hole if they're personal —
  the asymmetry conclusion does not depend on them (agentic-toolkit +
  terminus alone carry it).
