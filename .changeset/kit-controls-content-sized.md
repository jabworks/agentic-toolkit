---
"@jabworks/condux": patch
---

plan-review: pair the ? button against the theme toggle in the nav rail

`kit.css` gave `.kit-controls > .kit-theme` a `flex: 1 1 auto`, so the theme
group grew to fill whatever width its wrapper had. Three of the four surfaces
host the group in a flex row where the wrapper is already content-sized, so
nothing stretched and the rule looked correct. plan-review hosts it at the top
of `.nav`, which is block flow — the wrapper spans the full sidebar, the group
stretched across it, and the `?` button landed at the far edge instead of
against "Auto".

The growth was opt-in behaviour written as the default, and its only real
consumer was the style guide's rail, which asks for it through its own
`.themebar` class. The default is now `flex: none` — content-sized, so the
pairing holds in either kind of host — and the guide opts back in locally.

Also moves plan-review's rail spacing from `.kit-theme` onto `.kit-controls`:
flex centres the margin box, so a bottom margin on the group alone rode it
~6px above the `?` it is meant to sit beside.

Closes docket #52.
