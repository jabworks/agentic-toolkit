---
"@jabworks/condux": minor
---

blueprint's diagrams gain a visual language: role as a fixed categorical slot drawn as a translucent tint (`fill="var(--cat-N)" fill-opacity="0.10"` plus a matching stroke, attributes on the tag), kind as a `<use>`d mark glyph on a single stroked rect body (store, external, UI surface, actor, queue, batch — six marks the kit ships as a `<defs>` fence), protocol as dash on `--subtle` edges, an HTML legend under the svg, and a tinted title strip per boundary — across all four diagram families, house tokens only. The one-accent rule is rewritten: categorical colour is identity, never emphasis; `--primary` stays the single accent. The checker's `<defs>` skip now survives nested containers (a `<g>` or `<symbol>` inside defs used to end it early and its paths were read as edges), with a negative fixture for a mark drawn as a raw path. Verified on the reporting specimen redrawn in the language: checker-clean, rendered light and dark.
