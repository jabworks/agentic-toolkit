# blueprint — Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Condux bundle member, not a standalone plugin | cross-plugin dependencies are banned, and bundle membership guarantees presence at the phase the skill exists for | accepted |
| 2 | Name: `blueprint` | structural by definition — covers wireframes and system diagrams alike, signals clarity-not-aesthetics | accepted |
| 3 | Grayscale single-mode discipline | superseded 2026-08-26 by two modes (wireframe/render) over one skeleton in the surface-kit tokens; the structural discipline survives in wireframe mode | superseded |
| 4 | Dependency-free: self-contained HTML + inline SVG | no Mermaid CDN or image generation — identical on all four hosts (ladder rung 1) | accepted |
| 5 | Two output families, chosen by surface | UI → wireframes, data model / topology → diagrams, both → both | accepted |
| 6 | `mockup-picker.md` and `choice-server.js` stay in discovery | option picking is discovery's UX, and moving them breaks single-skill npx installs | accepted |
| 7 | Three entry points + trigger-eval cases ship with the skill | the motivating defect was a mockup skill that almost never fired | accepted |
| 8 | Collision checker + routing rules, not a layout generator | keeps #4 (hand-authored SVG) and gives the agent the render feedback it lacks; rules alone are a hope, a generator is LARGE and reverses #4 | accepted |
| 9 | Visual language: role tint, kind marks, protocol dash | the routed diagrams were correct but read as a wall of same-shaped grey boxes; colour as fixed role slots, kind as footprint-free marks on one rect body, protocol as dash — the checker needs no new geometry rule | accepted |

## 1. Condux bundle member, not a standalone plugin

**Decided:** blueprint ships inside the condux bundle.
**Because:** cross-plugin dependencies are banned (docket #6), so a standalone plugin would degrade the discovery integration to "load if installed"; bundle membership guarantees presence at the phase the skill exists for.

| Alternative | Why not |
|---|---|
| Standalone plugin | Degrades the discovery integration to "load if installed" |
| Grow discovery's `mockup-picker.md` in place | A reference file cannot trigger standalone and cannot serve draft-plan |

## 2. Name: `blueprint`

**Decided:** the skill is named `blueprint`.
**Because:** structural by definition — it covers UI wireframes and system diagrams alike, and signals clarity-not-aesthetics.

| Alternative | Why not |
|---|---|
| `mockup` | FE-only connotation |
| `sketch`, `visual-draft` | Vague — neither carries the structural claim |

## 3. Grayscale single-mode discipline — superseded 2026-08-26

**Decided:** ~~wireframe discipline enforced as the single mode: grayscale, boxes, annotations, no brand styling~~ — superseded 2026-08-26 (ratified by Harvey) by **two modes over one shared skeleton**, both in the surface-kit token core: `wireframe` (schematic — dashed grouping, neutral colour roles only, semantics silent; the structural discipline survives here) and `render` (full house language — accent, semantic and categorical colour, elevation, motion; for sign-off and presentation).
**Because:** the grayscale dialect made blueprint output the only toolkit HTML not speaking surface-kit, and it showed.

| Alternative | Why not |
|---|---|
| Keep the single grayscale mode | The one toolkit surface outside the house language — the driver for the supersession |

**Consequences**
- Promotion is a style-block swap — the skeleton never changes, which is what keeps a render honest to the approved structure.
- The original boundary survives in scoped form: aesthetic *direction* is still out of scope — render mode means the house language, never brand exploration — so the line against taste-style skills, the `design` canvas, and Figma holds.
- Diagrams keep a single look, re-skinned in tokens. The "never more than one accent use" wording is amended by #9: categorical colour is role identity, never emphasis, and `--primary` stays the single accent.
- `references/token-core.css` is a byte-identical copy of `scripts/tokens/core.css`, guarded by `tests/blueprint-kit.test.mjs`; the same test pins wireframe mode's CSS to a neutral token allowlist, so "wireframe stays structural" is a failing test, not a hope.

## 4. Dependency-free (ladder rung 1)

**Decided:** self-contained HTML + hand-authored inline SVG.
**Because:** it works identically on Claude Code, Codex, OpenCode and Cursor.

| Alternative | Why not |
|---|---|
| Mermaid CDN, image generation, host-specific renderers | Egress or host-dependence — both break rung 1 |

## 5. Two output families, chosen by task surface

**Decided:** UI wireframes when a UI is touched; system visuals (ER / flow / architecture / state) when a data model or service topology is touched; both when both.
**Because:** the surface being designed picks the artifact — no mode flag to get wrong.

## 6. `mockup-picker.md` and `choice-server.js` stay in discovery

**Decided:** the picker and its server remain discovery's files; blueprint produces files, and discovery's picker can point at them.
**Because:** option picking is discovery's UX, and moving them would break single-skill npx installs of discovery.

| Alternative | Why not |
|---|---|
| Move them into blueprint | Breaks single-skill npx installs of discovery |

## 7. Entry points: three, with trigger-eval cases shipped

**Decided:** loaded by discovery at propose/sign-off; citable from draft-plan task cards; standalone trigger via condux-style `when_to_use` ("mock this up", "visualize the data model", "sketch the architecture") wired into workflow's table and the `routing.md` hook payload. Trigger-eval cases (routing-oracle corpus) ship with the skill.
**Because:** the motivating defect was a mockup skill that almost never fired.

## 8. Collision checker + routing rules, not a layout generator — 2026-09-08

**Decided:** diagrams stay hand-authored; the kit gains a "Layout and Routing" section, and a dependency-free checker (`references/diagram-check.mjs`) gates Deliver.
**Because:** the defect (Q8) is an agent drawing without seeing. Rules alone are a hope — the agent still cannot see its output — so the mechanical half is what closes it, the same shape as Q7's token allowlist. A checker keeps decision #4 intact.

| Alternative | Why not |
|---|---|
| Routing rules only | No feedback loop; the agent that drew the defect would read the rules and draw it again |
| JSON node/edge spec → SVG with automatic orthogonal routing | LARGE; reverses #4; a router that fails on one topology fails silently on all of them, and nobody hand-fixes generated SVG |

## 9. Visual language: role tint, kind marks, protocol dash — 2026-09-10

**Decided:** diagrams adopt one visual language across all four families — role as a fixed categorical slot drawn as a translucent tint plus matching stroke (`fill="var(--cat-N)" fill-opacity="0.10" stroke="var(--cat-N)"`, attributes on the tag), kind as a `<use>`d mark glyph on a single stroked `<rect>` body (service, store, external, UI surface, actor, queue, batch; boundary keeps its dashed rect and gains a tinted title strip), protocol as dash on `var(--subtle)` edges (solid 1.5 sync call, solid 1 in-process, `6 4` async message, `2 3` file/batch/adapter), and an HTML legend under the svg. Fixed slots: frontend runtime `--cat-4`, API/service `--cat-2`, persistence `--cat-3`, external `--cat-7`, messaging `--cat-8`, actor `--cat-6`, batch `--cat-5`, unassigned `--cat-other`; at most five roles per diagram. The accent rule is rewritten: categorical colour is identity, never emphasis; `--primary` remains the one accent (2.5px stroke + primary title text over the role tint); semantic tokens stay reserved for state.
**Because:** docket #78 — the routed diagrams were correct but read as a wall of same-shaped grey boxes. Three options were generated from the reporting specimen with identical geometry and picked in the browser; tinted roles read from across the room while every mark stays footprint-free, so `diagram-check.mjs` sees every node with no new geometry rule.

| Alternative | Why not |
|---|---|
| Role bars (neutral fills, a 4px categorical bar per node) | a 4px cue at diagram scale; role stops reading once zoomed out |
| Tinted regions + real geometry (cylinders, hexagons) | the checker cannot see non-rect bodies — 3 of 12 nodes invisible, a false `clean` — and needs footprint rules plus fixtures before any ship |
| Semantic tokens for roles | they already carry meaning; persistence-green and success-green would collide |
| New `--cat-N-muted` tokens | crosses into the byte-pinned token core every surface inherits |
| Legend inside the svg | scanned by the checker; stroked swatches become nodes, unstroked ones vanish |

**Consequences**
- A node's body is exactly one stroked `<rect>`; everything else on it is decoration (a stroke-less rect or a `<use>`). Boundary classification is untouched.
- The kit ships the marks `<defs>` block and the legend markup verbatim, pinned by `blueprint-kit.test.mjs` like the token core.
- The checker's `<defs>` skip survives nested containers (Q11, fixed in 2.31.0), so mark paths are plain `fill="none"` — six groups for eight kinds, since a service has no mark and a boundary uses its title strip.
- Footprint-changing shapes are a later docket, opened only when a diagram needs one.
