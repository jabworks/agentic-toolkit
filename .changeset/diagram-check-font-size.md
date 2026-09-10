---
"@jabworks/condux": minor
---

blueprint's diagram checker now reads font size the way the browser cascades it — a `.class` rule, then a bare `text` rule, then the element's attribute, then an inherited one, then the 16px default (said on stderr) — instead of assuming 13px for any text without an attribute, which read CSS-sized titles 19% narrow and let a 23-character title overflow its box unreported. New finding `text-overflows-box` for a node's own text wider than the node; `label-over-box` now also catches owned text straddling a neighbour. The kit states the sizing rule (base size on the `<svg>` tag, never a `text { font-size }` rule) and the halo width budget. Calibrated against three real diagrams from a Codex session: the 0.6 em estimate measured exact for mono labels and was not the problem.
