# Transcript friction audit — 2026-07-29

Corpus: 102 sessions with real conversation (39 agentic-toolkit, 80 terminus,
5 crucible, 2 style-guide, 3 Codex rollouts in personal repos) →
1,769 user turns, 20,328 tool calls, 20 interrupts.
Codex rollouts in work repos (772 of 775) were excluded by policy.

Method: transcripts digested to user-turn + error-histogram + edit-thrash
digests (`scripts` kept in session scratchpad), then mined by five parallel
subagents on Haiku, plus corpus-wide quantitative scans run directly.

---

## Class A — harness mechanics, not skill problems

All five miners ranked these first by raw count. They are listed here to be
explicitly dismissed, not actioned.

| Count | Pattern |
|---|---|
| 83 | `File has not been read yet` — Edit/Write before Read |
| 67 | context-mode redirects (`curl`/`wget`/`WebFetch` instead of `ctx_*`) |
| 38 | bare non-zero exits |
| 10 | auto-mode classifier permission denials |
| 5 | `File has been modified since read` |

Why not a skill: these fire *before* any skill is loaded, the harness already
errors and the agent self-corrects on the next call at near-zero cost. A
SKILL.md rule cannot intercept them. The context-mode redirects are a plugin
configuration matter, not a toolkit matter.

---

## Class B — real content gaps in existing skills

### B1. No live/runtime verification anywhere in the pipeline

- `skills/finalize/SKILL.md` and `skills/preflight/SKILL.md` contain **zero**
  occurrences of browser / live / screenshot / visual / runtime.
- `finalize` stops at typecheck, lint, format, test. `preflight` is a
  self-assessment checklist.
- 27 user turns across **20 sessions** ask for live verification.
- `agent-browser` appears in 16 sessions, with recurring
  `Element not found`, `Wait timed out after Nms`, `Element with uid N_N no
  longer exists` errors — the loop exists but is unguided.

> "Remember to do live verification before pushing"
> "Let's do live verify later, somehow it keep saying out of memory…"

**Proposal:** new skill `live-verification` — start/attach to the dev server,
drive the actual UI, capture evidence, and gate "done" on it. Slots between
`finalize` and `release`.

### B2. `coding-directive` has no async-UI-state tier

81 lines; exactly one line touches UI state (`<Input disabled />`, a JSX-style
nit). Meanwhile 39 turns across **33 sessions** concern loading / pending /
disabled-while-mutating / optimistic / skeleton states.

> "When enabling all, we should show some pending indicator, maybe a spinner
> next to it, and disable the checkbox while pending, **remember to do this
> from now on**, we are missing quite some UX implementation for mutations and
> fetchs"

**Proposal:** amend `coding-directive` with an enforced tier covering every
async boundary: pending indicator, control disabled while in flight, error
surface, empty state.

### B3. `coding-directive` has no accessibility tier

31 turns across **25 sessions** concern aria / focus / keyboard navigation.
Nothing in the skill mentions any of it.

**Proposal:** amend `coding-directive` — judgment tier, since a11y needs are
component-specific.

### B4. Theme correctness — dark-mode-first

Repeated black-on-dark and token-desync defects, corrected mid-session more
than once in the same session.

> "Didn't you see the text is black on dark background? As I said before:
> '… border-radii, popover offsets, text colors, spacing, paddings, dropdown
> options hover state, etc… Go from dark mode first'"

**Proposal:** amend `coding-directive` CSS tier — build and verify dark first;
never hardcode a color that a token covers; stroke and background radii must
come from one source.

### B5. Env example upkeep

11 turns across 8 sessions.

> "Remember to update the env example for newly added env vars"

**Proposal:** one line in the `finalize` checklist — new env var ⇒
`.env.example` updated in the same change.

---

## Class C — trigger reliability (the meta-finding)

The toolkit's problem is less missing rules than rules that do not fire.

- **Skills exist but are not reached.** A miner reported "release skill doesn't
  automate the version bump" — false: `toolkit-change-control` specifies bump
  classes and dual-manifest parity in detail. It simply never triggered.
- **The user does the routing manually.**

  > "Wait, why didn't you use /plan-review ?"
  > "Remember to use skills for coding"
  > "I thought we already finished the discovery phase of this?"

- **Usage is concentrated in 6 of 29 skills** (by session count): workflow 37,
  finalize 34, discovery 26, draft-plan 24, preflight 23, git-commit 20. The
  long tail is near-zero.
- **Stale invocations persist after renames**: `condux:brainstorm`,
  `condux:write-plan`, `condux:verification`, `condux:systematic-debugging`
  are still being invoked and no longer exist.

**Proposal:** a trigger audit — for each skill, derive the trigger phrases from
its `description`/`when_to_use`, replay them, and record which skill actually
fires. Feeds a rename/alias policy in `toolkit-change-control`.

---

## Class D — guardrails from real incidents

### D1. Cross-repo access without permission

> "Let's not touch other projects without my permission, you just touched my
> corporate project, it's sensitive."

Currently captured only in personal memory, not in any skill or in global
CLAUDE.md.

### D2. Scope creep past the stated target

> "my intend was to focus on condux actually, not the whole repo"

**Proposal:** scope-lock line in `discovery` — restate the target surface and
confirm before widening.
