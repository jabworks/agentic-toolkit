# Implementation — Discovery Presentation

> Written at design time, before implementation. This is the intended touch
> list and the mechanisms it relies on — not a record of shipped code.

## Overview

Discovery's Step 3 gains a fixed presentation contract; the design file it
already writes moves from Step 7 to §1 and accumulates section by section; the
browser preview it already knows how to launch runs from §1 onward instead of
only at the end. Blueprint's trigger moves from a noun test to a question test
and stops opening browser tabs when it runs inside discovery. `draft-plan`'s
sign-off gate stops trusting file existence and reads a status field.

No new machinery: every mechanism below already ships.

## Key Files

| File | Role |
|---|---|
| `skills/discovery/SKILL.md` | §-card skeleton, density budget, section list, file-at-§1, preview default-on, Step 7 becomes the status flip |
| `skills/blueprint/SKILL.md` | question-trigger, no auto-open inside discovery |
| `skills/blueprint/references/diagram-kit.md` | specificity rule (lives with the kit that defines the shapes) |
| `skills/blueprint/references/wireframe-kit.md` | specificity rule, wireframe side |
| `skills/draft-plan/SKILL.md` | gate reads frontmatter `status` rather than file existence |
| `skills/technical-spec/SKILL.md` | invocation point only — the design doc already exists by Step 7 |
| `skills/subagent-execution/agents/planner.md` | same `status` check before treating a globbed design as settled (found during planning — see Q1) |
| `skills/plan-review/references/plan-review-template.html` | `stripFrontmatter()` at the `renderBlocks` call (found during planning — see Q2) |
| `tests/discovery-presentation.test.mjs` | guards the status contract, the card rules, the trigger questions, the specificity rule and `stripFrontmatter` |
| `skills/blueprint/evals/trigger_eval.json` | one case for a design with no UI surface and no data model that still turns on "what talks to what" — the gap the noun trigger could not see |
| `skills/plan-review/references/annotate-server.js` | unchanged; relied on, not modified |

Plus the usual shipping surface: `composition.json` blurbs if they describe the
old behaviour, a condux minor version bump, a changeset (any condux skill edit
regenerates `packages/condux-opencode/`), and `bash scripts/sync.sh` across the
four distribution channels.

## Mechanisms Relied On (verified 2026-08-26)

| Mechanism | Where | Verified behaviour |
|---|---|---|
| Manual mode | `annotate-server.js` (no `--steer`) | Renders, watches, live-reloads over SSE, does **not** block on a decision — the during-discovery preview |
| `watchPlan()` | `annotate-server.js:134` | Watches the doc's directory; per-section appends reload the open tab |
| Decision endpoint in manual mode | `annotate-server.js:378` (`mode: 'manual'`) | Accepts a submitted decision and writes the feedback file — so **one server covers all of discovery**, launched at §1 and still serving at sign-off. No restart, no second tab |
| `--no-open` | `annotate-server.js:55` | Headless fail-open path already exists |

## Data Flow

1. §1 opens → design file created with `status: in-progress`.
2. Preview launches in manual mode, announced with its off-switch. Fails open.
3. Terminal prints the §-card: heading, `§n of N`, one-line intent, the
   evidence, the recommendation, the named decision.
4. User decides.
5. The agreed section is appended to the design file.
6. The open tab live-reloads over SSE. Loop to 3 for §n+1.
7. Sign-off flips `status` to `signed-off`; `technical-spec` write-back runs.
8. `draft-plan` reads `status` and proceeds only on `signed-off`.

`section-loop.html` renders this as a numbered flow diagram.

## Patterns Used

- **Announce-and-offer defaulting** — the default is applied, stated, and
  reversible in one sentence; never silent, never a prompt to clear first.
  Ratified for blueprint's modes in condux 2.22.1 and reused here verbatim.
- **Fail open** — an absent capability (Node, browser, display) degrades to the
  terminal-only path silently and never blocks the flow. Same contract as the
  SessionStart routing hook.
- **Trigger on the question, not the noun** — see `decisions.md` and Q3.

## Resolved (were open questions at design time)

1. **Frontmatter naming.** Key `status`; values exactly `in-progress` and
   `signed-off`. **A missing `status` means `signed-off`** — every design file
   written before this field existed was only ever saved at sign-off, so
   absence is a positive signal rather than an unknown. Reading it the other
   way would retroactively invalidate every design on disk, silently.
2. **Consumers of `.condux/designs/`.** Three, not one — see Q1. The planner
   agent was missed by the design and is the dangerous one.
3. **`--no-reject` at sign-off.** No change needed. `noReject` is a meta flag
   independent of `--steer` (`annotate-server.js:332`), so passing it at the §1
   manual-mode launch keeps the design stage accept-or-fix for the whole
   session.
