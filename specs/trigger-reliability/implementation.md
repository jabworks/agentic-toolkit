# Implementation — Trigger Reliability

## Key files

| File | Role |
|---|---|
| `skills/workflow/hooks/routing.md` + condux `session-start.mjs` | the proven routing-injection pattern the nudge generalizes (payload as prose, script emits per-host wire format, fails open) |
| `tests/condux-hooks.test.mjs` | precedent for hook gates: per-host root variables, wire formats, fail-open |
| `skills/session-handoff/` (+ its dist/plugin trees) | first nudge recipient; resume trigger surface `.session-handoff/`, legacy `handoffs/` |
| `skills/toolkit-change-control/`, `skills/toolkit-research-frontier/`, `skills/toolkit-debugging-playbook/`, `skills/remember/` | pending period-1 rewrites #1, #2, #3, #8 (D6) |
| `skills/toolkit-skill-standards/SKILL.md` | gains the nudge-pattern rules so future suppressed-class verdicts have a named remedy |
| `specs/friction-audit-2026-07-29/trigger-matrix.md` | period-1 methodology — period 2 mirrors it for comparability |
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
