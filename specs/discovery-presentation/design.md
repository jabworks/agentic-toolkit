---
status: signed-off
date: 2026-08-26
feature: discovery-presentation
scope: condux/discovery, condux/blueprint, condux/draft-plan (gate only)
---

# Discovery presentation rework — terminal read

> Pass one of two. This pass fixes the **live read** during discovery.
> The written spec artifact and the type-annotation rule are pass two.

## What we're building and why

Five pain points were reported against discovery's design output. They split
into two surfaces:

| # | Pain | Surface | This pass |
|---|---|---|---|
| 1 | Wall of prose in the terminal, nothing scannable | live read | ✅ |
| 2 | Visuals missing, or too vague to judge | live read | ✅ |
| 3 | Section-by-section pacing loses the thread | live read | ✅ |
| 4 | The technical-spec artifact is a hard read | written artifact | deferred |
| 5 | Types/interfaces carry no inline explanation | written artifact | deferred |

### Root causes

**(1)(2)(3) share one cause.** Discovery Step 3 is specified in two sentences —
*"Present 2-3 approaches with tradeoffs. Show design in sections — get
acknowledgment per section before moving on."* No shape, no density budget, no
artifact. The output is therefore whatever prose comes out, and the design only
ever exists as terminal scrollback, which is why the thread is lost across
stops. The stops are not the problem; the absence of a whole-design view is.

**(2) additionally** has a trigger cause: blueprint's condition is a *noun* test
("UI surface or data model involved?"). This very design has neither and still
needed a flow diagram — so the noun test is the wrong test.

## §1 — Approach (C′)

Terminal shape + design file from §1 + live preview, **default-on with
announce-and-offer**.

The load-bearing observation: discovery already writes a design file and
already knows how to serve it in a browser — it does both at Step 7, *after*
the read is over. This pass rewires the timing; it builds no new machinery.

| | A · live doc | B · terminal shape only | **C′ · chosen** |
|---|---|---|---|
| Terminal | compact card | fixed skeleton | fixed skeleton + budget |
| Design file | from §1 | Step 7 only | from §1 |
| Browser | auto, forced | none | default-on, announced, reversible |
| Fixes | 1,2,3 | 1 only | 1,2,3 |

**Why not B:** a scannable wall is still a wall you cannot see the whole of.
**Why not A:** forcing the browser open removes the user's control.
**Why default-on rather than opt-in:** the preview's purpose is to help make
the *next* decision, so gating it behind an ask defeats it. And discovery only
runs on LARGE — there is no small case to protect from the ceremony.

This is the same shape condux 2.22.1 shipped for blueprint's modes: *the
default is visible and reversible, never silent.*

**Conditions:** fails open (no Node / no browser / headless → skip silently,
terminal-only, discovery continues — `--no-open` already exists). The
off-switch is a plain sentence, not a flag.

## §2 — What a section looks like

```
## §n of N · <name>                    ← position, always
<one line: what this section decides>

<the evidence — table, list, or a diagram link. Never a wall.>

**Recommendation:** <X>, because <one sentence>.
<the decision, as named options>
```

| Rule | Why |
|---|---|
| Card fits one screen (~25 lines); overflow goes to the design file, and the card links it | Without a number it is advice, not a contract |
| No paragraph over 3 lines — longer becomes a table or a list | Prose is the failure mode; tables cannot sprawl |
| Alternatives get one line each with why-not; full reasoning lives in the file | Rejected options are why the pick is trustworthy, and are what bloats the card |

**Section list announced before §1**, *and* an `§n of N` marker on every card.
You know the shape of the conversation before you are inside it.

## §3 — Blueprint

Three changes:

1. **Question-trigger, not noun-trigger.** Blueprint fires when the section's
   decision turns on one of its own five questions — the `diagram-kit.md`
   "Choosing the Shape" table (what entities exist · what happens in what order
   · what talks to what · what states are legal) plus "what goes where on a
   screen". The taxonomy already exists inside blueprint; discovery simply is
   not using it as the trigger.
2. **No auto-open inside discovery.** Step 3 DELIVER currently `xdg-open`s
   every file it produces — that is the interruption. Inside discovery the
   artifact is instead linked from the design doc, and the already-running
   preview live-reloads to show the link. No tab opens by itself, ever.
3. **Specificity rule.** Every label must name something real from *this*
   design — a path, a command, a field, a state, a status value. If a label
   would be equally true of a different feature, it is too vague. A box you
   cannot disagree with is not saying anything.

Rule 3 answers the reported failure "boxes and labels so generic they'd fit any
feature". `section-loop.html` is the worked example: its labels are
`.condux/designs/<date>-<slug>.md`, `plan-review --steer`, `status:
in-progress`, `signed-off → plan proceeds`. The generic version would have read
"Design Doc", "Preview", "Gate".

**Rejected — inline SVG in the design doc.** plan-review's markdown renderer
escapes all HTML (`esc()` on every path; `safeHref` also blocks
`javascript:`/`data:`). Rendering the SVG inline would mean changing a shared
renderer that escapes deliberately. Filed as a follow-up, not done here.

## §4 — Scope

**In:** discovery Step 3 + Step 7, blueprint's trigger and delivery, blueprint's
kits (specificity rule), draft-plan's sign-off gate, technical-spec's
invocation point only.

**Out (pass two):** technical-spec's templates (pain 4) and the type-annotation
rule (pain 5). Deferring costs one thing, named honestly: the design-doc →
`decisions.md` mapping gets designed twice. Accepted in exchange for shipping
the felt fix sooner.

## The gotcha this design creates

`draft-plan`'s sign-off gate globs `.condux/designs/*<slug>*.md`. Today the file
exists *because* the user signed off, so its existence is a valid gate. Creating
it at §1 breaks that: an abandoned §2 would satisfy the gate and draft-plan
would plan against an unfinished design.

**Mitigation:** frontmatter `status: in-progress` → `signed-off`, flipped at
Step 7; draft-plan's gate reads the value rather than the file's existence.
This document carries that frontmatter as its own first instance.

## Verified during discovery

- `annotate-server.js` **manual mode** (no `--steer`) renders, watches, and
  live-reloads over SSE without blocking on a decision — the during-discovery
  preview.
- `watchPlan()` reloads on every write, so per-section appends land in the
  already-open tab.
- The decision endpoint works in manual mode (`mode: 'manual'`, writes the
  feedback file). **One server therefore covers all of discovery** — launched at
  §1, still serving at sign-off. No restart, no second tab.
- `--no-open` exists, so the headless fail-open path is already built.

## Open questions carried into planning

1. Exact frontmatter key and value naming for the status field.
2. Whether anything besides `draft-plan` globs `.condux/designs/` — verify
   before changing the gate.
3. Whether sign-off in the single-server flow still needs `--no-reject`
   semantics (today's design review hides the Reject verdict).

## Follow-ups to file

- Inline SVG support in plan-review's renderer (would make the preview a true
  single surface).
- Pass two: technical-spec template readability (pain 4).
- Pass two: type/interface annotation rule — `api.md`'s bare `interface` block
  and `fields.md`'s Description column are two homes for one fact, and the type
  you actually read is the one without the explanation (pain 5).

## Artifacts

- `section-loop.html` — the per-section loop as a numbered flow diagram
  (terminal ↔ design file ↔ browser, plus the draft-plan gate reading status).
