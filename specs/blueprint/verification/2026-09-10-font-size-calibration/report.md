# Calibration: diagram-check text widths against a real render (blueprint, condux 2.30.0)

Docket #76 asked for the checker to be run against diagrams from the session that motivated the 2.29.0 gate, every visible defect confirmed as a finding, and the 0.6 em/char width estimate compared with real label widths. Three diagrams from that lineage arrived on 2026-09-10 — an architecture diagram, a request flow and a state machine, all drawn under the 2.29.0 rules. They belong to another project, so this report carries the geometry and the numbers, not the names; `tests/fixtures/diagram-check/overflow-css-sized.html` is a synthesized twin of the architecture diagram with generic labels.

| | |
|---|---|
| Date | 2026-09-10 |
| Checker | `skills/blueprint/references/diagram-check.mjs` at 2.29.0 (before), then the 2.30.0 change |
| Render | Chrome headless (`--headless=new --dump-dom`), 1400×1000 window, `file://`; each `<text>` measured with `getBBox()` and `getComputedStyle().fontSize` by a script appended to a copy of the file |
| Fonts | Geist is not installed on the measuring machine; `--sans` resolved to DejaVu Sans, `--mono` to a monospace fallback. DejaVu is the wide end of the token core's stack |

## Checker verdicts, before and after

| Diagram | Visible defects | 2.29.0 | 2.30.0 |
|---|---|---|---|
| Architecture (7 nodes, 7 edges) | the accent node's 23-character semibold title extends past both sides of its 210-wide box | `clean` | one `text-overflows-box`, by 5.4 units |
| Request flow (6 nodes, 5 edges) | none | `clean` | `clean` |
| State machine (5 states, 7 transitions) | none | `clean` | `clean` |

The fix is not the width factor. Each diagram sets no base size (titles inherit the browser's 16px) and gives edge labels 11px through a `.edge-label` class rule; the checker read all of it at 13px. At 16px the existing estimate already puts the title at 220.8 units in a 210 box.

## Width estimate vs render

Em per character = measured `getBBox().width` ÷ (characters × computed font size), across all three diagrams.

| Text group | n | em/char min | mean | max | 0.6 reads as |
|---|---|---|---|---|---|
| mono, 11px, regular (edge labels) | 16 | 0.602 | 0.602 | 0.606 | exact |
| sans, 12px, regular (detail rows) | 23 | 0.430 | 0.508 | 0.566 | generous, by ~15% |
| sans, 16px, semibold (titles) | 16 | 0.571 | 0.634 | 0.695 | narrow by ~5% mean, ~14% on the widest word — on DejaVu Sans |

Mono is font-independent at 0.6. The sans numbers are for the fallback face; Geist and Segoe UI are narrower, so 0.6 stays, with the tolerance leaning toward catching where the box is tight.

## The cascade the checker must mirror

Measured in the same Chrome with a `text { font-size: 13px }` rule, a `.lbl { font-size: 11px }` rule, `font-size="20"` on `<svg>` and `font-size="9"` on a `<g>`:

| Element | Computed size | Which source won |
|---|---|---|
| `<text font-size="11">` | 13px | the `text` rule beats the attribute |
| `<text>` (no attribute) | 13px | the `text` rule beats the inherited 20 |
| `<text class="lbl" font-size="30">` | 11px | the class rule beats both |
| `<g font-size="9"><text>` | 13px | the `text` rule beats inheritance from `<g>` |
| `<text>` in a second `<svg>` with no attribute | 13px | the rule applies to every `<svg>` in the document |

Consequence for the shipped fixtures: their `text { font-size: 13px }` rule rendered every `font-size="11"` label at 13. Both now carry `font-size="13"` on the `<svg>` tag instead, so attributes take effect as written.

## Also seen

- **Halos narrower than their labels.** 8 of the 16 edge labels are wider than the stroke-less halo rect behind them, by 1 to 19 units (the widest: a 21-character label, 139 units, over a 120 halo). Not visible in these three because no edge crosses those labels; it would be the moment one did. The kit now sizes halos from the 0.6 em budget; no checker rule yet — filed as a docket item.
- **Nothing false fires.** No finding on the two clean diagrams at 2.30.0, and the architecture diagram's one finding names the one visible defect.

## Reproduce

1. Append to a copy of the diagram a script that, for each `svg text`, records `textContent.length`, `getComputedStyle(t).fontSize`, `getBBox().width`, and the smallest stroked `rect` containing the text's centre.
2. `google-chrome --headless=new --dump-dom file:///…/copy.html`, then read the recorded rows from the DOM dump.
3. `node skills/blueprint/references/diagram-check.mjs <diagram>` before and after; the notice on stderr says how many texts had no resolvable size.
