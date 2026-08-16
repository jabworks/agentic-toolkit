---
"@jabworks/condux": minor
---

technical-spec now scaffolds a purpose slot, and the artifact contract states which direction a reference may point.

Every new spec's `index.md` opens with an HTML comment prompting for the
one-line `> …` note that `spec-browser`'s catalog shows as the spec's
description. The prompt is a comment rather than visible placeholder text
because a placeholder generates into the catalog looking like content; a
comment is invisible in every rendered view and the catalog skips it, so an
unfilled spec still reads as an honest "no description" (docket #33).

`workflow`'s artifact contract gains the rule that was missing behind six dead
citations: durable content may not depend on ephemeral content. A committed
file may not cite a path inside `.condux/` — promote the design or verification
report into the spec directory and cite the committed path, or, when the
artifact is already gone, name what survives instead (docket #34, #35).
