# surface-kit — Tech Spec

> Shared design system for the toolkit's four self-contained HTML surfaces:
> extends the colour core into type, space, radius, motion and elevation, and
> generalizes `check-tokens.mjs` from one inlined region to three so state and
> behaviour are written once instead of four times.

**Last updated:** 2026-08-20
**Commit:** 46947a4
**Status:** draft

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
- [api.md](api.md) — region grammar, checker CLI, and the three producer
  contracts the redesign must not break
- [quirks.md](quirks.md) — the template-literal corruption class, placeholder
  substitution, byte-mirror and release traps
- [implementation.md](implementation.md) — key files, phasing, tests, release surface

## Changelog
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
