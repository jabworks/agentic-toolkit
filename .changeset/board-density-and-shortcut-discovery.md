---
"@jabworks/condux": patch
---

Make the keyboard layer discoverable, and stop surfaces restating what the kit owns

The `?` overlay shipped with no way to find it — a keyboard layer nobody can
discover is a keyboard layer nobody uses. `kit.js` now places a `?` button beside
every theme group, so the affordance arrives on all four surfaces at once rather
than being added four times.

It wraps the theme group and the button in a `.kit-controls` flex box rather than
inserting a bare sibling: a surface may host its chrome in a flex row or in block
flow, and in block flow a sibling drops onto its own line. The wrapper makes the
pairing hold either way.

Also fixes a segmented control that was rendering its middle button fully
rounded. The cause was a surface restating skin the kit already owns — a local
`border-radius` at specificity (0,1,1) applied to all three buttons, while
`.kit-theme button:first-child/:last-child` at (0,2,1) squared off only the outer
two, leaving the middle one as the button nothing overrode.
