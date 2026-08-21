# HTML surface audit — four rendering surfaces

**Date:** 2026-08-20 · **Stage:** discovery Step 3 (pre-proposal)
**Method:** taste-skill audit (`redesign-existing-projects`), filtered against
this repo's no-egress constraint. Signals extracted mechanically from the four
files; nothing here is inferred from screenshots.

## Surfaces

| Surface | Plugin | Lines | Consumption model |
|---|---|---|---|
| `skills/session-report/template.html` | session-report | 1516 | agent-`Edit`ed copy + JSON data island |
| `skills/session-handoff/references/handoff-template.html` | session-handoff | 608 | hand-filled static document |
| `skills/plan-review/references/plan-review-template.html` | condux | 911 | server-substituted SPA (`annotate-server.js`) |
| `skills/record/server/docket-render.mjs` | docket | ~516 | JS string-builder + SSE live mode |

## What is already good (do not "fix")

- **The colour core is tasteful.** Warm charcoal base (`#111110`), not pure
  `#000`. Warm cream light mode (`#f6f5ef`). A single accent (`--primary`
  `#978365`, a tan/clay). One consistent (warm) gray family. No purple/blue
  "AI gradient". This passes most of the taste audit's colour section already.
- **`color-mix(in oklch, …)` in 3 of 4 surfaces** — modern, perceptually
  correct blending. Only docket uses none.
- **Real max-width containers exist** (1180px, 1000px, 760px, 52rem).
- **`--mono` names Geist Mono / JetBrains Mono before falling back to
  `ui-monospace`.** This is a *legal* way to get a font with character under
  no-egress: named, never fetched, graceful fallback.

## Findings

### F1 — The core tokenizes colour and nothing else *(root cause)*

`scripts/tokens/core.css` carries 30 colour tokens plus exactly two others:
`--radius: 0.25rem` and `--mono`. There is **no type scale, no spacing scale,
no shadow token, no motion token, no radius scale.**

Every downstream inconsistency below follows from this. The surfaces agree on
colour because colour is the only thing the core governs.

### F2 — Type scale is ad-hoc and unitless-inconsistent

| Surface | Sizes found | Unit |
|---|---|---|
| session-report | 10, 11, 12, 15, 16, 18, 20, 40, 56 | px |
| session-handoff | 10, 11, 12, 13 | px |
| plan-review | 10, 11, 12, 13, 14, 16, 21 | px |
| docket | .75, .8, .85, .88, .9, .95, 1.15 | rem |

No ratio governs any of them. Three surfaces use `px` font sizes, which
**ignore the user's browser font-size setting** — an accessibility defect, not
only an aesthetic one. docket is the only one on `rem`.

### F3 — Everything is monospace except docket

`session-report`, `session-handoff` and `plan-review` set body text to
`13px/1.55 var(--mono)` — *all* text, including prose paragraphs. docket alone
uses `15px/1.55 ui-sans-serif, system-ui, sans-serif`.

This is the single largest driver of "looks dated / hard to read". Monospace
at 13px is fine for a terminal and for data columns; it is poor for the prose
that session-handoff and plan-review are *made of*. Note the inversion: the two
document surfaces are fully monospace, while the kanban board — the most
data-like surface — is the only one in a sans stack.

### F4 — Motion is essentially absent

| Surface | `transition:` rules |
|---|---|
| session-report | **0** |
| session-handoff | **0** |
| docket | **0** |
| plan-review | 2 (`.12s` colour only) |

No `prefers-reduced-motion` block in any of the four. Every state change is a
hard cut.

### F5 — Focus states are missing or thin

| Surface | `:hover` | `:focus` |
|---|---|---|
| session-report | 8 | **0** |
| session-handoff | 1 | **0** |
| plan-review | 12 | 4 |
| docket | 2 | 1 |

session-report and session-handoff have **zero** focus styling. plan-review is
an interactive annotation SPA and has four. This is a keyboard-accessibility
gap, and the audit treats visible focus as a requirement, not a nicety.

### F6 — Radius is uncoordinated

- session-report: 4px, 8px, 12px, 9999px
- session-handoff: 12px, 9999px
- plan-review: 0, 2px, 4px, `var(--radius)`, `var(--radius-md)`, 9999px
- docket: .25rem, .4rem, .5rem, .6rem

Four vocabularies for one concept. `--radius` exists in the core but only
plan-review consistently uses it.

### F7 — Shadows: one untinted, most absent

- session-report / session-handoff: exactly one shadow,
  `0 20px 60px rgba(20, 20, 19, 0.22)` — warm-tinted, correct.
- plan-review: mixes tinted focus rings (good, `color-mix` + `--ring`) with
  **pure-black** elevation (`rgba(0,0,0,0.45)`, `rgba(0,0,0,0.16)`) — the
  "generic box-shadow" pattern.
- docket: **no shadows at all.**

### F8 — Viewport and layout mechanics

- `100vh` in three surfaces, `dvh` in **none** → iOS Safari viewport jump.
- plan-review: 17 flex rules to 1 grid — the "complex flexbox math" pattern
  where grid is the reliable answer.
- docket: **0 grid**, 4 flex — a board layout built entirely on flex.

### F9 — Data typography underused

`tabular-nums` appears once each in session-report, session-handoff and
plan-review, and three times in docket. These are data-heavy surfaces
(token counts, costs, dates, ids); figures should be tabular by default, not
by exception.

### F10 — docket is the consistent outlier

Confirms D4 of the 2026-08-12 design ("docket's palette is unowned").
It is the only surface with: no `color-mix`/`oklch`, no shadows, no grid, a
sans stack, and `rem` sizing. Ironically its `rem` sizing is the *correct*
choice the other three lack.

## Constraint filter applied to the taste skill

Rejected as inapplicable here:

| Skill recommendation | Why rejected |
|---|---|
| Load Geist / Outfit / Satoshi / Cabinet Grotesk | No egress. Legal alternatives: name the font in the stack (current `--mono` approach), or base64-embed a subsetted woff2 |
| `picsum.photos` background imagery | No egress; also wrong genre for a local dev artifact |
| Lucide / Phosphor / Heroicons packages | No dependencies, no egress — inline SVG only |
| og:image, social meta, cookie consent, legal links, 404 page | These are local single-file artifacts, not public web pages |
| "Use realistic names, avoid round numbers" | These surfaces render the user's real data |

Accepted and applicable: type scale and tracking, tabular figures, tinted
shadows, single-accent discipline, hover/active/focus states, `transform`/
`opacity` motion, `min-height: 100dvh`, semantic HTML, z-index scale,
empty and loading states, `text-wrap: balance`/`pretty`.

## Open — needs user input

**F11 — "Missing capability" was selected as a goal but not specified.**
Candidates visible from the audit: search (plan-review has *zero* `<input>`;
session-report has none), filtering, cross-document navigation, export,
responsive/mobile behaviour. Must be pinned down before planning.
