---
"@jabworks/condux": minor
---

Surface Kit: share the state and behaviour layers across every HTML surface

`scripts/check-tokens.mjs` was a byte-exact inliner for one region — the colour
core. It now carries three: `tokens:core`, `kit:css` and `kit:js`. That is what
lets four artifacts which may not share a runtime dependency still share source,
each one still shipping fully self-contained with no egress.

The colour core gains 38 tokens — type, space, radius, motion and elevation —
so the surfaces agree on more than colour. Type, space, radius and motion are
theme-invariant and live in the base block only; elevation is restated per theme,
because a shadow tuned for the dark ground reads as dirt on cream. A third theme
state joins the two: `[data-theme]` now overrides the OS preference, persisted in
`localStorage`.

`kit.css` adds focus-visible rings, a skip link, `prefers-reduced-motion`, a print
stylesheet that repoints the tokens so a dark page does not print as blank, and
the empty / loading / error patterns none of the surfaces had. `kit.js` adds theme
persistence, a keyboard layer with a `?` overlay built from the live binding
registry, copy-to-clipboard and URL state — every behaviour feature-detected, so a
surface without the hooks is unaffected.

This release is deliberately additive: the scale is defined but not yet adopted,
so no surface restructures. Per-surface layout follows separately.
