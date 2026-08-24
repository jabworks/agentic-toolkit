# surface-kit — Tech Spec

> Shared design system for the toolkit's four self-contained HTML surfaces:
> extends the colour core into type, space, radius, motion and elevation, and
> generalizes `check-tokens.mjs` from one inlined region to three so state and
> behaviour are written once instead of four times.

**Last updated:** 2026-08-24
**Commit:** 46947a4
**Status:** D6 step 2 complete

## Contents

- [decisions.md](decisions.md) — the six ratified calls and what was rejected
- [design.md](design.md) — the signed-off design this spec was written from
- [audit.md](audit.md) — the measured state of all four surfaces before the
  redesign, and which taste-skill recommendations the no-egress constraint rules out
- [style-guide.html](style-guide.html) — living style guide, rendered in the
  proposed tokens; the artifact the design was signed off against
- [ramp-direction-c.html](ramp-direction-c.html) — the signed-off categorical
  ramp (D7): both themes, both composite tiers, and the overflow fold, at real
  chart size
- [handoff-direction-b.html](handoff-direction-b.html) — the signed-off
  session-handoff direction (D8), rendered from a real handoff: the rail, the
  hoisted sections, and the capped measure. The visual contract for step 2's
  first surface
- [session-report-direction-c.html](session-report-direction-c.html) — the
  signed-off session-report direction (D9), rendered from a real 30-day report:
  the pinned anomaly strip, the comparison rail, and every section folded. The
  visual contract for step 2's third surface
- [plan-review-direction-d.html](plan-review-direction-d.html) — the signed-off
  plan-review direction (D10), rendered from a real plan through the **shipped**
  template with only the four server endpoints stubbed: the manuscript spine,
  the numbered marginalia and the categorised gutter. Interactive — select text
  and the popover anchors for real. The visual contract for step 2's last surface
- [api.md](api.md) — region grammar, checker CLI, and the three producer
  contracts the redesign must not break
- [quirks.md](quirks.md) — the template-literal corruption class, placeholder
  substitution, byte-mirror and release traps
- [implementation.md](implementation.md) — key files, phasing, tests, release surface

## Changelog
- 2026-08-24: D10 — plan-review becomes a manuscript (D6 step 2, surface 4, the
  last). The document leads: graph paper gone, a typographic spine of space and
  rule, and every highlight numbered with the same ordinal its note carries in
  the review column, which recedes to marginalia with category as colour on the
  ordinal and the label. `paint()` renders in **document** order rather than
  insertion order — the counter numbers by document position, so insertion order
  put the two numberings out of step the moment a note was added above an
  earlier one — and exposes `data-cat`, since the category was otherwise only
  written as text and CSS cannot select on text content. Q20 (**the UI order and
  the payload order are two different lists** — fixing only the render leaves the
  reviewer's "note 1" arriving as the agent's note 2; found end-to-end against
  the real server, which the specimen's stubbed `/api/feedback` cannot reach),
  Q21 (**hiding grid children leaves their tracks** — print auto-placed `.main`
  into a 248px column and the scroll container clipped output to one screenful:
  docket #50, pre-existing), Q22 (an appended overlay does not model source
  order, so a specimen's responsive behaviour is an artifact of how it was
  built), Q23 (the category set is the popover's chips — "Praise" is not one of
  them and "Comment" is), Q24 (**a `display: none` pane does not increment a
  CSS counter** — in directory mode the in-document ordinals counted only the
  active document while the gutter counted every note, so a note at gutter 3
  carried a highlight reading 1; found only because DIRMODE was driven against
  the real server), Q25 (a section rule plus draft-plan's `---` is the same
  divider twice, on nearly every plan this surface renders). **Closes docket #48**: plan-review was the last surface
  carrying it, and the pairing assertion now runs over all four in
  `tests/surface-theme-pairing.test.mjs`, treating "declares no extension tokens"
  as a pass so board-shell's original mis-scope cannot recur. D6 step 2 is
  complete. Also recorded: Q17–Q19 were attributed to D9 in this changelog and
  never written into `quirks.md` (docket #51). Specimen:
  [plan-review-direction-d.html](plan-review-direction-d.html)
- 2026-08-23: D9 — session-report becomes a cockpit (D6 step 2, surface 3): a
  solid sticky anomaly strip, a comparison rail carrying project shares and a
  per-day sparkline, and every section in a `<details open>`. Q17 (**the render
  is not null-guarded** — trimming a section throws on its container and kills
  every render step after it, the section nav included, with nothing on the page
  to say so), Q18 (**folds break navigation and print** — a chip or deep link
  into a collapsed section lands on a 48px bar, and a collapsed `<details>`
  prints nothing; both need explicit handling, and the reveal must be scoped to
  the section folds or it expands every drill row too), Q19 (a sticky offset
  hardcoded in CSS is wrong the moment the thing it measures wraps — measure it
  and re-measure on resize). Closes docket #48 on session-report and corrects
  its scope: **board-shell was never affected** (it defines no extension tokens
  outside the kit regions), so plan-review is the only surface left. F6 was
  already closed by step 1; F9 is now closed on both document surfaces. The
  step-2 order was **flipped** — session-report 3rd, plan-review 4th (see
  [implementation.md](implementation.md)). Specimen:
  [session-report-direction-c.html](session-report-direction-c.html)
- 2026-08-22: D8 — session-handoff becomes a rail (D6 step 2, surface 1), with
  Q13 (`data-kit-chrome` is print suppression; `g`+digit walks
  `[data-kit-section]`), Q14 (a bare `1fr` column floors at min-content) and Q15
  (capping measure on paragraphs alone misses the worst line) and Q16 (a
  surface's extension tokens need `[data-theme]` blocks, not just a media query —
  open on the other three surfaces, docket #48). `audit.md` carries
  a re-measurement banner — F2/F3/F4/F5/F8 are closed on the three document
  surfaces. Specimen: [handoff-direction-b.html](handoff-direction-b.html)
- 2026-08-21: D7 — categorical ramp added to the core (docket #46), with Q10
  (the core is dark-first), Q11 (inline `background` erases the stripe) and Q12
  (`░` reserves the low end of the ink range). Specimen:
  [ramp-direction-c.html](ramp-direction-c.html)
- 2026-08-20 (46947a4): Initial spec from signed-off design
  ([design.md](design.md))
