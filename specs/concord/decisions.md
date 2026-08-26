# Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Clean-room under MIT, not a fork of `remember` | DPT's Community License bars redistribution and reserves derivative rights; concepts are not the protected part, expression is | accepted |
| 2 | Codex-only capture; `remember` keeps Claude Code | halves the surface to build and prove, removes cross-host format negotiation; memory not crossing hosts is accepted | accepted |
| 3 | Hook-thin capture + catch-up-on-start | rollouts are already on disk, so lazy recovery gives crash-resilience without locks, races, or write amplification | accepted |
| 4 | Pinned tier is never auto-compressed | the characteristic failure of auto-memory is summarizing the one thing the user deliberately kept | accepted |
| 5 | `codex exec` as the only summarizer, truncation fallback | the host's own CLI — no Claude auth borrowed into Codex, no backend detection | accepted |
| 6 | Two memory tiers with a hard leak boundary | a global tier is the only way memory leaks between client repos, so the boundary is a rule, not a guideline | accepted |
| 7 | Node stdlib only | the toolkit's no-plugin-dependencies rule; `node --test` is already the runner | accepted |

## D1 — Clean-room, not a fork

**Decision:** Write Concord from scratch under MIT; take only the *concept* of
tiered aging memory from the `remember` plugin.

**Why:** `remember` ships under DPT's Community License. §1 bars redistribution
in whole or in part, §3 requires the notice carried, §5 reserves derivative
rights to DPT. This toolkit publishes to a public marketplace and npm under MIT,
so vendoring a fork conflicts. Concepts are not the protected part; expression
is.

**Rejected:** vendoring the fork with the DPT notice attached — still
redistribution under §1.

## D2 — Codex-only capture

**Decision:** Concord owns memory on Codex. `remember` keeps Claude Code.

**Why:** Halves the surface to build and prove, and removes cross-host format
negotiation entirely. It also collapses the summarizer choice to one backend
(D5). Consequence: memory does not cross hosts — accepted.

**Fit:** `manifest-parity.test.mjs` already enforces that the `hooks` manifest
field is **codex-only**. A hook-driven Codex plugin lands on an invariant the
repo already has.

## D3 — Hook-thin capture + catch-up-on-start

**Decision:** Capture at checkpoints (`UserPromptSubmit`, `SessionEnd`), and
recover missed work at `SessionStart` by replaying rollouts whose recorded
position trails their line count.

**Why:** Codex hands each hook its own `rollout_path` (see api.md), so the
transcript is never in doubt. A hard-killed session never fires `SessionEnd`,
but its rollout is already on disk — lazy recovery at next start gives the
crash-resilience that PostToolUse cooldowns exist to provide, without locking,
races, or write amplification.

**Rejected:** PostToolUse capture on a cooldown (remember's model) — heavy
machinery solving problems this design does not have.

## D4 — Pinned tier is never auto-compressed

**Decision:** Explicit "remember this" writes to `pinned.md`, which
consolidation never rewrites.

**Why:** The characteristic failure of auto-compressed memory is that the one
thing the user deliberately asked to keep gets summarized into mush days later.

## D5 — `codex exec` as the only summarizer

**Decision:** LLM compression runs through `codex exec`. Degrade to
deterministic truncation if unavailable.

**Why:** Follows from D2 — the host's own CLI, no Claude auth borrowed into
Codex sessions, no runtime backend detection branching.

## D6 — Two memory tiers, hard leak boundary

**Decision:** Project tier at `<git-root>/.concord/`; global tier at
`${CODEX_HOME:-~/.codex}/concord/global/`. The global tier carries user
preferences and working patterns **only** — never project facts.

**Why:** A global layer is what makes cross-project preferences work, and is
also the only way memory leaks between client repos. The boundary is a hard
rule, not a guideline.

## D7 — Node stdlib only

**Decision:** Pure Node, no dependencies, no Python.

**Why:** The toolkit's no-plugin-dependencies rule; `node --test` is already the
test runner; `analyze-codex.mjs` establishes the precedent for rollout parsing
in Node.
