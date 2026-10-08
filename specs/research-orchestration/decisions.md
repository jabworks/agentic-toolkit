# Decisions — research-orchestration

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | A new skill `condux:research` (main session as lead) plus a fifth named agent `scout` | the only option that keeps condux's named-agents rule and still runs workers in parallel | accepted |
| 2 | Effort scales 0 / 2–4 / 5–6 scouts by question shape; at most one gap round; the lead synthesizes from notes on disk; citations are checked against the notes | keeps the post's main gains while bounding cost | accepted |
| 3 | One never-overwritten run folder in `.condux/research/`; dev-tuned note and report shapes; promotion into the spec the report feeds | working-state contract; every finding carries a source version or date | accepted |
| 4 | scout ships through each host's agent channel and falls back to sequential research where it is absent; routing is a single hook line | three hosts already have an agent channel; Cursor has none | accepted |
| 5 | Trigger cases in the existing harness; a manual quality eval with one LLM judge | reuses tooling; follows the post's judging method; keeps token cost opt-in | accepted |
| 6 | Clean-room: prompt text is drafted in a context that never saw deep-research | deep-research has no published license, and the designing session read it | accepted |

## 1. Lead skill plus a scout agent — 2026-10-07

**Decided:** `condux:research` runs in the main session as lead and dispatches a fifth named agent, `scout` (sonnet), built for survey research.
**Because:** a contract in a file with restricted tools is how condux's other four agents work, and only this option also gives parallel workers.

| Alternative | Why not |
|---|---|
| A survey mode on `researcher` | the brief contradicts its stop-at-first-source contract, and a prompt-selected mode is call-time injection |
| `general-purpose` workers plus a reference file | the #96 exception covers only another skill's mandated spawn; condux doing it itself breaks its own rule, and tools stay unrestricted |
| Skill only, no workers | forfeits the parallelism Anthropic's post credits (multi-agent beat single-agent by 90.2%) |

**Consequences**
- A fifth agent ripples through every "four agents" claim (implementation.md lists them).
- Hosts with no agent channel need a fallback (decision 4).

## 2. Bounded, effort-scaled flow — 2026-10-07

**Decided:** clarify (only if it changes the research) → plan to disk → dispatch all scouts in one message → at most one gap round → the lead synthesizes from notes on disk → citation check → deliver. The scout count is 0 for a single fact or API, 2–4 for a comparison, and 5–6 for a survey, with 10–15 tool calls each. More than 6 needs consent, with the cost named.
**Because:** the post's effort-scaling rules prevent over-investment in simple queries, and the round cap prevents endless searching.

| Alternative | Why not |
|---|---|
| A separate writer agent | a sixth agent for one step; condux implements itself by default |
| A citation agent that re-fetches sources | doubles fetch cost; tracing claims to notes catches the common failure |
| Unbounded rounds | the post's early agents scoured endlessly for nonexistent sources |

**Consequences**
- Report quality depends on notes being complete; the scout contract carries that load.

## 3. Run folders and dev-tuned shapes — 2026-10-07

**Decided:** `.condux/research/<YYYY-MM-DD>-<slug>/` holds `plan.md`, `notes/<angle>.md`, and `report.md`, and is never overwritten. Promotion copies the report into the spec it feeds, as `research-<date>-<topic>.md` with an `index.md` row.
**Because:** research is working state until someone decides it informs a feature; a dev claim without a version or date cannot be trusted.

| Alternative | Why not |
|---|---|
| deep-research's note and report shapes | clean-room rule; its narrative style suits general topics |
| A report with no notes | the citation check needs notes on disk |
| A shared `specs/research/` dir, or a spec dir per report | cut off from the features they inform, or a full spec shape for one file |

**Consequences**
- A promoted copy keeps external URLs only and never cites `.condux/`.

## 4. Host delivery with a sequential fallback — 2026-10-07

**Decided:** scout ships via plugin `agents/` (Claude Code), `install-codex-agents.mjs` (Codex), and generated package agents (OpenCode). Wherever it cannot be spawned, the main session researches each angle sequentially with the same artifacts and says so once. The routing hook's "research routes nowhere" becomes a pointer to `/condux:research` for multi-source research.
**Because:** three hosts already deliver named agents; Cursor has none (cursor-channel Q7).

| Alternative | Why not |
|---|---|
| scout returns notes and the lead writes them | every note transits the lead's context — the post's "game of telephone" |
| Auto-invoke from discovery or the planner | v1 scope creep |
| Defer to deep-research when it is installed | two behaviors to reason about, and deep-research writes into CWD |

**Consequences**
- On Codex, scout appears only after the installer is re-run.
- scout's Write is not path-restricted (quirks Q1).

## 5. Evaluation — 2026-10-07

**Decided:** trigger cases run in `scripts/eval-invocations.mjs`. A manual quality eval (`scripts/eval-research-quality.mjs`) runs 10–20 queries headless, with one LLM-judge call per report on a five-criterion rubric, citation spot-checks, and 3 fallback-mode runs. Its pure functions are unit-tested in CI.
**Because:** the post found one judge call consistent and aligned with human judgment; per-query cost rules out CI.

| Alternative | Why not |
|---|---|
| Quality eval in CI | about 15× chat tokens per query |
| Hand grading only | not repeatable |
| Multiple specialized judges | the post found a single judge more consistent |

**Consequences**
- The baseline runs against a local install before merge, and sets the pass threshold.

## 6. Clean-room drafting — 2026-10-07

**Decided:** the architecture and effort rules come from Anthropic's public post only. `skills/research/SKILL.md` and `scout.md` are drafted by a `coder` dispatch whose only inputs are this spec and post excerpts.
**Because:** deep-research has no published license, and the session that designed this read it verbatim.

| Alternative | Why not |
|---|---|
| Draft in the designing session | it would echo phrasing it has seen |

**Consequences**
- One deliberate delegation in an implement-yourself-by-default flow.
