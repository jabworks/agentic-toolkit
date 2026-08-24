---
"@jabworks/condux": minor
---

plan-review becomes a manuscript (surface-kit D10)

The last of the four surfaces in the surface-kit redesign. The document now
leads the page: the graph-paper background is gone, headings carry a
typographic spine of space and rule, and every highlight is numbered with the
same ordinal its note carries in the review column — so the two columns read as
one artifact rather than two lists side by side.

The review column recedes to marginalia, with category carried as colour on the
ordinal and the label. `paint()` now renders the thread in document order rather
than insertion order, which is what keeps the two numberings in agreement, and
exposes the category as `data-cat` so the colour is reachable from CSS.

Also closes two defects on this surface:

- **docket #48** — `--hl` / `--hl-active` were dark-first with a bare
  `prefers-color-scheme` override and no `[data-theme]` blocks, so on a light
  system clicking Dark inverted the page and left the annotation highlight
  light. This was the last surface still carrying that defect; the assertion
  that guards it now runs over all four.
- **docket #50** — printing rendered the plan in a ~151px column. Hiding `.nav`
  and `.chat` for print left their grid tracks behind, so `.main` auto-placed
  into the first one; and because `.main` is the scroll container, print was
  clipped to a single screenful. The shell now collapses for print.
