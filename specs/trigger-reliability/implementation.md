# Implementation — Trigger Reliability

> **2026-08-28 — the nudge was retired.** session-handoff 2.0.0 removes the
> SessionStart hook this document describes shipping (D2, retired). Sections
> below that record the period-2 ship are left as written — they are an accurate
> record of what shipped then, and rewriting history to match a later decision
> would lose the sequence. The key-files table is live and has been corrected.

## Key files

| File | Role |
|---|---|
| `skills/workflow/hooks/routing.md` + condux `session-start.mjs` | the proven routing-injection pattern the nudge generalizes (payload as prose, script emits per-host wire format, fails open) |
| `tests/condux-hooks.test.mjs` | precedent for hook gates: per-host root variables, wire formats, fail-open |
| `skills/session-handoff/` (+ its dist/plugin trees) | the suppressed skill; resume trigger surface `.session-handoff/`, legacy `handoffs/`. Was the first and only nudge recipient — hook removed in 2.0.0, so the skill now carries no countermeasure |
| `skills/toolkit-change-control/`, `skills/toolkit-research-frontier/`, `skills/toolkit-debugging-playbook/`, `skills/remember/` | pending period-1 rewrites #1, #2, #3, #8 (D6) |
| `skills/toolkit-skill-standards/SKILL.md` | carries the suppressed-class **diagnosis** (recognise it; do not fatten the description) and the directive-never-content finding. The nudge remedy is declined doctrine as of #69 — D2's rules live here in the spec, not there |
| `specs/friction-audit-2026-07-29/trigger-matrix.md` | period-1 methodology — period 2 mirrors it for comparability |
| `scripts/eval-triggers.mjs` + `scripts/trigger-eval-score.mjs` | the trigger harness; docket #64 added the optional per-case `context` preamble and its separate metric (Q4) |
| `composition.json` → `scripts/sync.sh` → `node --test` | registration and drift gates for every shipped change |

## Measurement (period 2)

Corpus: session transcripts 2026-07-30 → 2026-08-27 from the D5 sources.
Method mirrors period 1: per-session skill-invocation lines unioned across
install channels, organic user turns swept against each skill's declared
vocabulary, every candidate miss classified per D1. The evidence report is
written into this spec directory (durable) — never left in gitignored
working state.

## Verification chain

`node --test` (manifest parity, dist mirror, frontmatter grammar) →
toolkit-ops trigger evals re-run (band 93.1% ± 0.2pp at 2026-08-26 must hold
or improve; rewritten skills' cases green) → live-verify the nudge hook (run
the SessionStart script against a repo with and without handoffs; directive
present/absent; fail-open on induced error) → preflight drift check against
this spec.

## Ship shape

One PR: evidence report + spec + session-handoff nudge + sweep survivors.
Plugin bumps as shipped (semver per toolkit-change-control): session-handoff
1.10.0 (nudge = new capability, minor), docket 0.11.1 and git-worktree 1.0.2
(trigger sharpening, patch), toolkit-ops 1.7.13 (standards entry, patch).
Concord shipped nothing — rewrite #8 was already applied (D6 outcome). Bumps
ride `.github/workflows/plugin-release.yml` on merge. No condux bump, no npm
changeset (D4).
