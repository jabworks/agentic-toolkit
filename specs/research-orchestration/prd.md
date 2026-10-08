# PRD — research-orchestration

| Section | In one line |
|---|---|
| Problem | condux has no multi-source, cited research flow on any host |
| Users | Harvey first, then condux users on Claude Code, Codex, OpenCode, and Cursor |
| Goals | Research mode's shape — lead, parallel scouts, cited notes, synthesized report — on every host, tuned for dev questions |
| Scope | one condux skill, one worker agent, the routing hook, four-host delivery, reports in `.condux/research/` |

## Problem

condux has no multi-source, cited research flow. `anthropic-skills:deep-research` covers it on Claude Code only, cannot be a condux dependency, and has no published license, so it cannot be vendored (docket #94, #98).

## Users

| Who | Today | What changes |
|---|---|---|
| Harvey | researches dev questions by hand, or via deep-research on Claude Code only | one flow on every host, with reports kept as working state |
| condux users on Codex / OpenCode / Cursor | no Research-mode equivalent at all | full flow (Codex, OpenCode) or a sequential fallback (Cursor) |

## Goals and non-goals

| Goal | Measured by |
|---|---|
| The lead plans and scales effort to the question; parallel scouts with distinct briefs; cited notes on disk; a synthesized, cited report | the quality eval's five rubric scores |
| Tuned for dev-adjacent questions: library and framework choices, how others solve X, ecosystem and standards surveys | the quality eval set is drawn from these |
| Fires on research asks, and not on lookups or dev tasks | the trigger cases |

| Non-goal | Why excluded |
|---|---|
| Changing `researcher` | it is the API reference-card tool; its contract contradicts a survey brief |
| New search tooling | uses each host's existing search and fetch tools |
| Tuning for general topics (markets, policy, literature) | condux's job is dev work; general topics still run, untuned |
| Vendoring or adapting deep-research | no published license |

## Success metrics

| Metric | Target | How measured |
|---|---|---|
| Report quality on 10–20 real dev-research queries | judge pass on ≥ 11 of 12; every criterion mean ≥ 0.80 except tool efficiency ≥ 0.70 (set 2026-10-08 from the baseline: 12/12, means 0.89 / 0.88 / 0.87 / 0.88 / 0.77 — see verification.md) | one LLM-judge call per report: factual accuracy, citation accuracy, completeness, source quality, tool efficiency, each 0–1, plus pass/fail |
| Trigger precision | fires on research asks; does not fire on API lookups, dev tasks, or explanations | `scripts/eval-invocations.mjs` over `skills/research/evals/trigger_eval.json` |

## Scope

| In | Out |
|---|---|
| `condux:research` skill and `scout` agent | changes to `researcher` |
| Routing hook pointer to `/condux:research` | auto-invoking research from discovery or the planner (v1) |
| Delivery to Claude Code, Codex, OpenCode, and Cursor (fallback) | running the quality eval in CI |
| `.condux/research/` artifacts, promoted into a feature spec on request | a separate citation agent that re-fetches every source |
| condux runs even when deep-research is installed | editing or wrapping deep-research |

## Open questions

- ~~The quality judge's pass threshold~~ — resolved 2026-10-08: pass on ≥ 11 of 12, criterion means ≥ 0.80 (tool efficiency ≥ 0.70), from the baseline in verification.md.
- ~~Codex `MODEL_DEFAULTS` for scout~~ — resolved 2026-10-08: `gpt-6.1-sol` at medium effort, sandbox `workspace-write` (`install-codex-agents.mjs`).
- ~~Do OpenCode's restricted-agent denials need scout hardcoded?~~ — resolved 2026-10-08: no. `agentPermissionPolicy` derives them from `tools:`, so scout gets `bash: deny` and keeps edit, because Write is allowed.
