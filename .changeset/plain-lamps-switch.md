---
"@jabworks/condux": patch
---

Correct the theme-check order in `live-verification` to light mode first, then dark. The gate is unchanged — a themed change is not verified until both have been seen — only the order it walks them in.
