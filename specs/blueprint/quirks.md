# blueprint — Quirks

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | `xdg-open`/`open` may be absent or a no-op | headless / SSH hosts | low | yes — write files, print paths, continue |
| Q2 | `.condux/` has no git root to anchor to | non-git repos | low | yes — CWD fallback, said once |
| Q3 | Frontmatter a strict parser rejects | hand-edited SKILL.md frontmatter | medium | yes — canonical grammar check with `--fix` |
| Q4 | Folded description can blow the channel cap | `when_to_use` merged on OpenCode/Cursor | low | yes — merged text ≤ 1024 chars, test-gated |
| Q5 | routing.md payload bloat | adding blueprint to the SessionStart hook | low | yes — one list mention, no prose paragraph |
| Q6 | Other skills claim mockup requests | hosts carrying `design`, Figma MCP, dataviz, taste skills | medium | yes — not-for boundaries named in both directions |
| Q7 | Wireframes quietly become styled UI | any wireframe edit | medium | yes — neutral token allowlist asserted by test |
| Q8 | Hand-routed edges cross boxes, labels land on text | any diagram with cross-lane edges (from ~5 nodes up) | high | yes — kit routing rules (grid, ports, corridors, halos) + `references/diagram-check.mjs` gate before Deliver |

## Q1 — Headless / SSH hosts

**Symptom:** the deliver step's open command does nothing, or errors.
**Trigger:** hosts where `xdg-open`/`open` is absent or a no-op.
**Cause:** no display, or no opener installed.
**Mitigation:** yes — the skill must not fail: write the files, print absolute paths, and continue.

## Q2 — Non-git repos

**Symptom:** nowhere to anchor `.condux/`.
**Trigger:** running blueprint outside a git repository.
**Cause:** the artifact contract keys working state to the git root.
**Mitigation:** yes — `.condux/` falls back to CWD (workflow's bootstrap rule); blueprint inherits that and says so once.

## Q3 — Frontmatter grammar

**Symptom:** frontmatter that Claude's lenient parser accepts and Codex's strict parser rejects.
**Trigger:** hand-editing SKILL.md frontmatter.
**Cause:** the canonical grammar bans single quotes and free-form YAML.
**Mitigation:** yes — run `node scripts/check-frontmatter.mjs --fix` on violation; never hand-fix.

## Q4 — `when_to_use` folding

**Symptom:** a merged description over the channel cap.
**Trigger:** the OpenCode/Cursor channels folding `when_to_use` into `description`.
**Cause:** two fields become one on those hosts.
**Mitigation:** yes — merged text must stay ≤ 1024 chars (test-gated).

## Q5 — routing.md token budget

**Symptom:** a bloated SessionStart payload taxing every session.
**Trigger:** adding blueprint to the routing hook.
**Cause:** the payload is ~390 tokens and rides every session start.
**Mitigation:** yes — one list mention, no prose paragraph.

## Q6 — Boundary collisions

**Symptom:** a mockup request routed to the wrong skill.
**Trigger:** hosts that also carry a `design` canvas skill, Figma MCP, dataviz, or third-party taste skills claiming mockup requests.
**Cause:** overlapping trigger territory across independently installed skills.
**Mitigation:** yes — the trigger contract names these as not-for boundaries in both directions: blueprint = structural clarity at design time; those = aesthetic or host-specific surfaces.

## Q7 — Wireframe discipline drift

**Symptom:** HTML mockups quietly becoming styled UI.
**Trigger:** any edit to wireframe output or its CSS.
**Cause:** the natural failure mode of HTML mockups — styling accretes.
**Mitigation:** yes — since the 2026-08-26 two-mode rework the discipline is mechanical, not just stated: wireframe mode's CSS may only reference the neutral token allowlist, asserted by `tests/blueprint-kit.test.mjs` (chromatic vocabulary belongs to render mode), and the kit's token core is byte-pinned to `scripts/tokens/core.css` by the same test.

## Q8 — Edge routing collisions

**Symptom:** edge labels drawn over node text, edges running straight through boxes they do not connect, two labels stacked in one corridor. First seen 2026-09-08 in a "Reporting contract boundary" architecture diagram produced from a Codex session.
**Trigger:** any diagram with cross-lane edges — from roughly five nodes upward, the straight line between two boxes has a third box in the way.
**Cause:** the kit gave styling conventions and no layout rule, so the agent placed boxes on a grid and drew centre-to-centre straight lines; and the agent never sees its render (Codex cannot view its own output), so nothing fed the defect back.
**Mitigation:** yes — two halves. The kit's "Layout and Routing" section makes corridors, ports, orthogonal paths and haloed labels the rule; `references/diagram-check.mjs` is the feedback loop — it parses the inline SVG, reports `edge-through-box`, `label-over-label`, `label-over-box`, `edge-through-label`, `unlabeled-edge` and `text-outside-canvas`, and blueprint delivers only a clean run (a skipped check is said, never silent). Known approximation: text width is estimated at 0.6 em per character and curves are reduced to their endpoints, so tolerances sit at 1–2 px and lean toward catching; a free label sitting fully inside a box's empty area reads as owned by the box and passes. `tests/diagram-check.test.mjs` pins the motivating diagram's defects as a fixture.

## Q9 — Font size read blind

**Symptom:** a 23-character semibold title visibly overflowing its 210-wide box on both sides in an architecture diagram a Codex session produced under the 2.29.0 kit (2026-09-10), while `diagram-check.mjs` reported the file clean. Docket #76 had been filed on the opposite hypothesis — that the 0.6 em/char width estimate ran narrow for mono.
**Trigger:** any diagram that sizes text through CSS rather than attributes. The 2026-09-10 diagrams set nothing on `<svg>` or the titles (so they inherit the browser's 16px) and give edge labels 11px through a `.edge-label` class rule; the checker read every one of them at its 13px default — titles 19% narrow, labels 18% wide.
**Cause:** the checker resolved `font-size` from attributes only and fell back to 13 — a number that came from the fixtures' own `text { font-size: 13px }` rule, which it equally could not read. Measured in Chrome, a `text { font-size }` rule overrides every `font-size` attribute in the diagram and a `.class` rule overrides both, so even the fixtures rendered their 11px labels at 13. The estimate itself measured exact for mono (0.602 em/char), generous for regular sans (0.51), and a little narrow for semibold titles on the DejaVu Sans fallback (0.63 mean, 0.70 max); at the right size, 0.6 catches the overflow without change. `verification/2026-09-10-font-size-calibration/report.md` has the numbers.
**Mitigation:** yes — since 2.30.0 the checker cascades sizes as the browser does, restricted to what a regex can see: a `.class` rule, then a bare `text` / `svg text` rule, then the element's attribute, then one inherited from `<g>` or `<svg>`, then 16px with a stderr notice naming how many texts it had to assume. A node's own text that exceeds the node is `text-overflows-box` (before, it silently became a "free" label and the node lost its title), and `label-over-box` now also catches owned text straddling a neighbour. The kit puts the base size on the `<svg>` tag and bans `text { font-size }` rules, and sizes halos from the same 0.6 em budget — 8 of the 16 real labels were 1–19 units wider than their halo. Still blind: `em`/`rem`/`var()` sizes, any other selector shape, and the actual font — Geist is what the token core names, the measurement ran on the fallback stack.

## Q10 — Marks read as edges

**Symptom:** a kind glyph (a small cylinder or window icon beside a node title) drawn as a `<path>` reports `unlabeled-edge`, twice per glyph, in every diagram that carries one — 14 findings on the first visual-language mockups (2026-09-10) with nothing wrong in the drawing.
**Trigger:** any stroked `<path>` with `fill="none"` (or no fill) anywhere the checker walks, including the legend's mini `<svg>`s in the page.
**Cause:** `processPath` classifies by fill alone — a fill other than `none` is a shape, everything else is an edge. It has no notion of decoration for paths, only for stroke-less rects.
**Mitigation:** design-level, by D9's invariant — marks live in `<defs>` as `<g id="mark-…">` groups and are placed via `<use>`, which the checker never walks (Q11 makes the defs skip hold). The legend is HTML, outside every svg. `tests/fixtures/diagram-check/mark-as-path.html` keeps the failing shape on record.

## Q11 — The `<defs>` skip ends at a nested container

**Symptom:** three mark groups declared inside one `<defs>`: the first is skipped, the second and third are scanned and their paths reported as edges.
**Trigger:** any container (`<symbol>`, `<g>`, `<clipPath>`, `<pattern>`) nested inside `<defs>` or `<marker>`.
**Cause:** the tag walk pushes a skip entry for `defs`/`marker` and pops on a close tag; a nested container's close tag pops the skip entry, so the rest of the defs block is walked as drawing.
**Mitigation:** yes — since 2.31.0 a frame pushed inside a skipped subtree no longer claims the skip decrement; only the `defs`/`marker` frame itself ends the skip. Tested with `<g>` and `<symbol>` wrappers, and the visual-language fixture's six mark groups.

