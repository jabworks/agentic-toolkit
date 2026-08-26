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
- Diagrams keep a single look, re-skinned in tokens.
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
