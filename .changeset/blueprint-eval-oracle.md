---
"@jabworks/condux": patch
---

Correct two oracle bugs in `blueprint`'s trigger-eval corpus. "build the settings
page from the approved design" and "implement this Figma design as a React
component" asserted `expected_skill: null`, which contradicts the routing hook's
own doctrine that every implementation request starts at `workflow` — the model
answered `workflow` and the corpus scored it a miss. Both now carry
`accept: ["workflow"]`, the idiom `adapting-skills` already uses, so the negative
still guards blueprint against the "design" bait without poisoning the score.
