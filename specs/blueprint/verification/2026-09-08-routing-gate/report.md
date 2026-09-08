# Live verification: diagram routing gate (blueprint, condux 2.29.0)

Promoted from `.condux/verification/` (working state) into the spec dir so durable files can cite it. The generator and the screenshots stayed in working state; the two HTML files here are the reproducible evidence.

| | |
|---|---|
| Date | 2026-09-08 |
| Target | `node skills/blueprint/references/diagram-check.mjs <file>` on two generated diagrams (`as-drawn.html`, `routed.html` beside this file), rendered via chrome-devtools MCP from `file://` |
| Diff | working tree on `main` at 97b0f89 + uncommitted change (blueprint kit rules, diagram-check.mjs, tests, specs, 2.29.0) |
| Themes | light ✓ dark ✓ |

| Claim | Evidence | Verdict |
|---|---|---|
| The motivating "Reporting contract boundary" diagram, reconstructed as drawn, fails the checker and every visible defect is a finding | `as-drawn.html` (open it), `as-drawn.findings.txt` | ✓ exit 1, 25 findings: 7 `edge-through-box` (5 edges through Result validator, 2 through Filter options API), 3 `label-over-label` (labels on the validator title and two API rows), 11 `label-over-box` (labels in 57-unit gutters, plus row text overflowing the 275-wide boxes — visible in the original too), 4 `unlabeled-edge`. No `edge-through-label`: an edge that runs through a label is now attributed as that label's own edge, and the spot is still reported as `edge-through-box` + `label-over-box` |
| The same nodes and edges routed under the kit's Layout and Routing rules pass clean | `routed.findings.txt` | ✓ `clean`, exit 0 |
| The routed diagram renders in light mode with no edge through a box and no label on node text | `routed.html` opened in Chrome, light scheme (screenshot observed in-session; not committed) | ✓ every edge in a gutter, every label haloed and off the boxes; three edge-to-edge crossings near Widget host, which the kit permits |
| The routed diagram renders the same in dark mode | `routed.html` with `emulate colorScheme: dark` (screenshot observed in-session; not committed) | ✓ halos take `var(--card)` so labels stay legible on the dark palette |
| The kit's marker block pasted verbatim, usage comment included, does not trip the checker | `routed.html` lines 178–186, `routed.findings.txt` | ✓ the comment carries a `<line …/>` and the run is clean |

Also seen:
- **Fixed during the run.** Label attribution measured from the label's centre; the original places long start-anchored labels beside vertical lines, so six of seven labels read as missing (`unlabeled-edge` false positives). Attribution now measures from the label box (`distBoxToSegment`), regression test added, suite 505 green. The four `unlabeled-edge` findings that remain on the as-drawn file are real: two labels are stolen by the edge that runs through them, two sit farther from their line in the reconstruction than in the screenshot.
- Row text in the routed Widget host ("joins placement + definition + data") touches the right border in the render while the checker reads it as inside by one unit: the 0.6 em/char estimate is slightly under real 13px mono. Calibration is docket #76.
- Setting `data-theme` from a navigation init script had no effect on the reload; `emulate colorScheme` did. Not a defect in the change.
- No console errors; no network requests (file://).

0 claims failed. All green.
