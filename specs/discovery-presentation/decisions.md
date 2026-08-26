# Decisions — Discovery Presentation

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Rewire the design artifact's timing rather than build anything new | discovery already writes the file and serves it in a browser — both just happened after the read was over | accepted |
| 2 | Preview defaults on, announced and reversible | its purpose is helping the next decision, so opt-in defeats it; discovery only runs on LARGE, so there is no small case to protect | accepted |
| 3 | Blueprint fires on the question, not the noun | a noun test cannot see a design whose subjects are a terminal shape and a markdown file | accepted |
| 4 | Artifacts must be specific enough to disagree with | a box the reader cannot disagree with carries no information, so it cannot be evidence | accepted |
| 5 | No auto-open inside discovery | the reader is already looking at the preview; a tab per section is the interruption | accepted |
| 6 | Terminal-first scope, with the cost named | the live read is felt every session; the double-designed mapping is the accepted price of shipping it first | accepted |

## 1. Rewire the design artifact's timing rather than build a new one — 2026-08-26

**Decided:** create the design file at §1 instead of at sign-off, append each
agreed section to it, and run the browser preview from §1 onward; give the
terminal card a fixed skeleton and a density budget; build no new machinery.
**Because:** discovery already writes a design file and already knows how to
serve it in a browser — it did both at Step 7, *after* the read was over, so
the design existed only as terminal scrollback while it was being decided.

| Alternative | Why not |
|---|---|
| **B** — terminal shape only | Fixes the prose but leaves the whole-design view missing — a scannable wall is still a wall you cannot see the whole of |
| **A** — live doc, browser force-opened | Fixes the read but takes away the user's control over their own screen; **C′** (chosen) takes A's timing with an announced, reversible default |

**Consequences**
- The read moves off scrollback and onto a live artifact; the terminal card
  shrinks to the ask.
- `draft-plan`'s sign-off gate is invalidated and must change (see quirks).
- Discovery gains a long-running child process for the duration of a LARGE
  design, which must fail open.
- The per-section stops were explicitly *not* the problem and are kept — what
  was missing was a place to see the design whole.

**Context** — the report was "a wall of prose that loses the thread across the
per-section sign-off stops". The instinct is to fix the prose; the actual
finding is structural.

## 2. Preview defaults on, announced and reversible — not opt-in — 2026-08-26

**Decided:** the preview launches by default; the terminal announces that it
is running and how to stop it; the off-switch is a plain sentence, not a flag.
**Because:** the preview exists to help make the *next* decision, not to
reward finishing the design — gating it behind an ask defeats what it is for —
and discovery only runs on the LARGE tier, so there is no small case for the
ceremony objection to defend.

| Alternative | Why not |
|---|---|
| Opt-in ask (the first proposal) | Framed auto-launching a server as ceremony condux avoids; both arguments above overturned it |

**Consequences**
- Must fail open: no Node, no browser, or headless → skip silently and
  continue terminal-only. `--no-open` already exists for this.
- One server serves the whole discovery (verified: manual mode renders,
  watches, live-reloads over SSE, and accepts a decision without blocking), so
  sign-off needs no restart and opens no second tab.
- Lands on the pattern condux 2.22.1 ratified for blueprint's modes — *the
  default is visible and reversible, never silent* — which is evidence it is
  the house answer rather than a one-off.

## 3. Blueprint fires on the question, not the noun — 2026-08-26

**Decided:** fire blueprint when the section's decision turns on one of
blueprint's own five questions: what entities exist · what happens in what
order · what talks to what · what states are legal · what goes where on a
screen.
**Because:** the noun test — "UI surface or data model involved?" — could not
see the design recorded in this spec, which has neither and still needed a
flow diagram badly enough that the diagram carried the design better than the
prose did.

| Alternative | Why not |
|---|---|
| Keep the noun trigger | Cannot fire for a feature whose contents are unusual, even when the artifact would obviously help (quirks Q3) |

**Consequences**
- Blueprint fires on more designs, including ones with no visual surface in
  the conventional sense.
- Paired with the specificity rule (decision 4), or the extra firings become
  noise.

**Context** — the taxonomy already exists inside blueprint: `diagram-kit.md`'s
"Choosing the Shape" table is keyed on *the question being asked*. Discovery
simply was not using it as the trigger — no new concept is introduced; an
existing one is moved to where the decision is made.

## 4. Artifacts must be specific enough to disagree with — 2026-08-26

**Decided:** every label in a blueprint artifact must name something real from
the design it serves — a path, a command, a field, a state, a status value. If
a label would be equally true of a different feature, it is too vague.
**Because:** a diagram is evidence for a decision; a box the reader cannot
disagree with carries no information, so it cannot be evidence. The test is
falsifiability, stated as a label rule because that is where the failure is
visible.

| Alternative | Why not |
|---|---|
| Generic boxes and labels (the reported failure mode) | "Boxes and labels so generic they'd fit any feature; nothing specific enough to agree or disagree with" |

**Consequences**
- Artifacts become harder to produce early, when specifics are not yet known —
  which is correct: a diagram drawn before there are specifics is decoration.

**Context** — `section-loop.html` is the worked example:
`.condux/designs/<date>-<slug>.md`, `plan-review --steer`,
`status: in-progress`, `signed-off → plan proceeds`. The generic version of
the same diagram reads "Design Doc", "Preview", "Gate".

## 5. No auto-open inside discovery — 2026-08-26

**Decided:** inside discovery, blueprint does not open anything. The artifact
is linked from the design doc; the already-running preview live-reloads and
shows the link. Standalone blueprint invocations keep their current
open-on-deliver behaviour.
**Because:** the reader is already looking at the preview — delivering into
that surface costs zero attention, while opening a tab costs a context switch
per section, the interruption the user explicitly asked to avoid ("update the
current preview, not ask to open a new one").

| Alternative | Why not |
|---|---|
| Keep Step 3 DELIVER's `xdg-open` per artifact | One browser tab per section under per-section firing |
| Inline the SVG into the design markdown | The true single-surface answer, rejected for this pass: plan-review's renderer escapes all HTML deliberately (`esc()` on every path, `safeHref` blocking `javascript:`/`data:`) — changing a shared security boundary as a side effect of a presentation fix. Filed as a follow-up |

**Consequences**
- One click stands between the reader and a diagram, until inline SVG lands.
- Blueprint's delivery behaviour becomes context-dependent, which the skill
  must state explicitly or it will drift back.

## 6. Terminal-first scope, with the cost named — 2026-08-26

**Decided:** ship the live-read fixes now; defer the written-artifact fixes to
a second pass. `technical-spec` is touched in this pass only at its invocation
point (Step 7 becomes "flip status, then write back" because the design file
already exists).
**Because:** the live read is what is felt every session, so it ships first.

| Alternative | Why not |
|---|---|
| One pass covering all five pain points | Holds the felt fix hostage to the template rework — three of the five points concern the live read, two the written artifact |

**Consequences**
- **Named cost:** the design-doc → `decisions.md` mapping gets designed twice —
  once here as the §-card contract, once in pass two as the template rework.
  Accepted deliberately in exchange for shipping the felt fix sooner.
