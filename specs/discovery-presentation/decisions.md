# Decisions — Discovery Presentation

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Rewire the design artifact's timing rather than build anything new | discovery already writes the file and serves it in a browser — both just happened after the read was over | accepted |
| 2 | Preview defaults on, announced and reversible | its purpose is helping the next decision, so opt-in defeats it; discovery only runs on LARGE, so there is no small case to protect | accepted |
| 3 | Blueprint fires on the question, not the noun | a noun test cannot see a design whose subjects are a terminal shape and a markdown file | accepted |
| 4 | Artifacts must be specific enough to disagree with | a box the reader cannot disagree with carries no information, so it cannot be evidence | accepted |
| 5 | No auto-open inside discovery | the reader is already looking at the preview; a tab per section is the interruption | accepted |
| 6 | Terminal-first scope, with the cost named | the live read is felt every session; the double-designed mapping is the accepted price of shipping it first | accepted |

## Rewire the design artifact's timing rather than build a new one

**Date:** 2026-08-26
**Status:** accepted

### Context

Discovery's design output was reported as a wall of prose that loses the thread
across the per-section sign-off stops. The instinct is to fix the prose. The
actual finding is structural: discovery already writes a design file and
already knows how to serve it in a browser — it does both at Step 7, *after*
the read is over. The design therefore exists only as terminal scrollback while
it is being decided.

### Decision

Create the design file at §1 instead of at sign-off, append each agreed section
to it, and run the browser preview from §1 onward. Give the terminal card a
fixed skeleton and a density budget. Build no new machinery.

### Rationale

Three candidates were compared. **B** (terminal shape only) fixes the prose but
leaves the whole-design view missing — a scannable wall is still a wall you
cannot see the whole of. **A** (live doc, browser force-opened) fixes the read
but takes away the user's control over their own screen. **C′** takes A's
timing with an announced, reversible default.

The per-section stops were explicitly *not* the problem and are kept. What was
missing was a place to see the design whole.

### Consequences

- The read moves off scrollback and onto a live artifact; the terminal card
  shrinks to the ask.
- `draft-plan`'s sign-off gate is invalidated and must change (see quirks).
- Discovery gains a long-running child process for the duration of a LARGE
  design, which must fail open.

---

## Preview defaults on, announced and reversible — not opt-in

**Date:** 2026-08-26
**Status:** accepted

### Context

The first proposal gated the browser preview behind an opt-in ask, on the
grounds that auto-launching a server is ceremony condux avoids.

### Decision

The preview launches by default. The terminal announces that it is running and
how to stop it. The off-switch is a plain sentence, not a flag.

### Rationale

Two arguments overturned the opt-in framing:

1. **Purpose.** The preview exists to help make the *next* decision, not to
   reward finishing the design. Gating it behind an ask defeats what it is for.
2. **No small case to protect.** Discovery only runs on the LARGE tier. If
   discovery is running at all, the design is big enough to warrant a preview,
   so the ceremony objection has no case to defend.

This lands on the pattern condux 2.22.1 ratified for blueprint's modes — *the
default is visible and reversible, never silent* — which is evidence it is the
house answer rather than a one-off.

### Consequences

- Must fail open: no Node, no browser, or headless → skip silently and continue
  terminal-only. `--no-open` already exists for this.
- One server serves the whole discovery (verified: manual mode renders,
  watches, live-reloads over SSE, and accepts a decision without blocking), so
  sign-off needs no restart and opens no second tab.

---

## Blueprint fires on the question, not the noun

**Date:** 2026-08-26
**Status:** accepted

### Context

Blueprint's discovery trigger is a noun test — "UI surface or data model
involved?". The design recorded in this spec has neither a UI surface nor a
data model, and still needed a flow diagram; the diagram carried the design
better than the prose did. The trigger would not have fired.

### Decision

Fire blueprint when the section's decision turns on one of blueprint's own five
questions: what entities exist · what happens in what order · what talks to
what · what states are legal · what goes where on a screen.

### Rationale

The taxonomy already exists inside blueprint — `diagram-kit.md`'s "Choosing the
Shape" table is keyed on *the question being asked*. Discovery simply was not
using it as the trigger. No new concept is introduced; an existing one is moved
to where the decision is made.

### Consequences

- Blueprint fires on more designs, including ones with no visual surface in the
  conventional sense.
- Paired with the specificity rule below, or the extra firings become noise.

---

## Artifacts must be specific enough to disagree with

**Date:** 2026-08-26
**Status:** accepted

### Context

Reported failure mode when blueprint *did* fire: "boxes and labels so generic
they'd fit any feature; nothing specific enough to agree or disagree with."

### Decision

Every label in a blueprint artifact must name something real from the design it
serves — a path, a command, a field, a state, a status value. If a label would
be equally true of a different feature, it is too vague.

### Rationale

A diagram is evidence for a decision. A box the reader cannot disagree with
carries no information, so it cannot be evidence. The test is falsifiability,
stated as a label rule because that is where the failure is visible.

`section-loop.html` is the worked example: `.condux/designs/<date>-<slug>.md`,
`plan-review --steer`, `status: in-progress`, `signed-off → plan proceeds`. The
generic version of the same diagram reads "Design Doc", "Preview", "Gate".

### Consequences

- Artifacts become harder to produce early, when specifics are not yet known —
  which is correct: a diagram drawn before there are specifics is decoration.

---

## No auto-open inside discovery

**Date:** 2026-08-26
**Status:** accepted

### Context

Blueprint's Step 3 DELIVER opens every file it produces via `xdg-open`. Under
per-section firing that is one browser tab per section — the interruption the
user explicitly asked to avoid ("update the current preview, not ask to open a
new one").

### Decision

Inside discovery, blueprint does not open anything. The artifact is linked from
the design doc; the already-running preview live-reloads and shows the link.
Standalone blueprint invocations keep their current open-on-deliver behaviour.

### Rationale

The user is already looking at the preview. Delivering into that surface costs
zero attention; opening a tab costs a context switch per section.

Inlining the SVG directly into the design markdown would be the true
single-surface answer and was **rejected for this pass**: plan-review's
markdown renderer escapes all HTML (`esc()` on every path, `safeHref` blocking
`javascript:`/`data:`). Making SVG render inline means changing a shared
renderer that escapes deliberately. Filed as a follow-up.

### Consequences

- One click stands between the reader and a diagram, until inline SVG lands.
- Blueprint's delivery behaviour becomes context-dependent, which the skill
  must state explicitly or it will drift back.

---

## Terminal-first scope, with the cost named

**Date:** 2026-08-26
**Status:** accepted

### Context

Five pain points were reported. Three concern the live terminal read; two
concern the written spec artifact (`technical-spec`'s templates, and the
absence of inline explanation on types and interfaces).

### Decision

Ship the live-read fixes now. Defer the written-artifact fixes to a second
pass. `technical-spec` is touched in this pass only at its invocation point
(Step 7 becomes "flip status, then write back" because the design file already
exists).

### Rationale

The live read is what is felt every session, so it ships first.

### Consequences

- **Named cost:** the design-doc → `decisions.md` mapping gets designed twice —
  once here as the §-card contract, once in pass two as the template rework.
  Accepted deliberately in exchange for shipping the felt fix sooner.
