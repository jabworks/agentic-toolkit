# Implementation — research-orchestration

| File | Role |
|------|------|
| `skills/research/SKILL.md` | the lead's flow: clarify, plan, dispatch, gap round, synthesize, cite-check, deliver, fallback |
| `skills/research/evals/trigger_eval.json` | should-fire and should-not-fire trigger cases |
| `skills/research/evals/quality_eval.json` | 10–20 dev-research queries for the quality eval |
| `skills/subagent-execution/agents/scout.md` | the scout contract (api.md) |
| `skills/subagent-execution/references/install-codex-agents.mjs` | `MODEL_DEFAULTS` row and sandbox for scout |
| `skills/workflow/hooks/routing.md` | one line: multi-source research → `/condux:research` |
| `scripts/eval-research-quality.mjs` | the manual quality-eval runner and judge |
| `tests/` (new test file) | unit tests for the quality runner's pure functions |
| `composition.json` | the research skill joins the condux bundle; a catalog row |
| `dist/plugins/condux/.{claude,codex}-plugin/plugin.json` | minor bump |
| `.changeset/*.md` | `@jabworks/condux` minor (new skill and agent in the package) |

## Ripple: every "four agents" and "15 skills" claim

| File | Change |
|---|---|
| `skills/workflow/SKILL.md` | Agents section: five agents, scout listed |
| `skills/subagent-execution/SKILL.md` | Core Principle names five |
| `skills/subagent-deployment/SKILL.md` | "four named agents" → five |
| `skills/condux-doctor/SKILL.md`, `doctor.mjs` | the agents-shipped check expects five |
| `plugins/condux/{README,INSTALL,UNINSTALL}.md`, `install.mjs` | agent counts and lists |
| `README.md`, `CLAUDE.md` | "15 condux skills" → 16; skills table |
| `skills/workflow/evals/trigger_eval.json` | any case asserting four agents |

## Data flow

1. The user asks a multi-source question; the routing hook or description loads `condux:research`.
2. The lead classifies the question shape → 0, 2–4, or 5–6 scouts (more than 6 asks first).
3. The lead writes `plan.md` with every brief, then dispatches all scouts in one message.
4. Each scout writes `notes/<angle>.md` and returns a short summary.
5. At most one gap round re-dispatches for critical gaps.
6. The lead reads the notes from disk and writes `report.md`.
7. Citation check: each claim traces to a note finding with a URL; untraced claims are dropped or flagged.
8. Delivery: a 3–5 line chat summary plus the path; promotion offered once.

## Patterns

| Pattern | Where | Why not the obvious thing |
|---|---|---|
| Notes on disk, the lead reads files | scout → lead hand-off | returning notes as text routes them through the lead's context |
| Sequential fallback with identical artifacts | `SKILL.md` | a separate degraded flow would mean two contracts |
| Clean-room drafting by a fresh `coder` dispatch | SKILL.md and scout.md authoring | the designing session read deep-research verbatim |
| Host-agnostic tool wording | scout.md | named tools break across hosts (quirks Q4) |

## Dependencies

- Anthropic, "How we built our multi-agent research system" (https://www.anthropic.com/engineering/multi-agent-research-system) — the only permitted design source.
- `scripts/eval-invocations.mjs` (trigger cases) and `claude -p` (quality runs).
