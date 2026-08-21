# Surface Kit — shared design system for the four HTML surfaces

**Date:** 2026-08-20 · **Status:** awaiting sign-off
**Builds on:** `specs/dir-mode-navigation/design.md` (2026-08-12), which unified
colour and explicitly deferred this: *"Out of scope: any visual redesign beyond
token unification. #21 is mechanical."*
**Style guide:** [style-guide.html](style-guide.html)
(published for review; renders in the tokens it proposes)

## What and why

Four plugins render HTML. Since 2026-08-12 they share a 32-token colour core,
propagated by `scripts/check-tokens.mjs` into marker-delimited regions and
guarded byte-exactly by `tests/token-core.test.mjs`.

The colour is good. Everything else is not shared, and the audit
([audit.md](audit.md)) shows the consequences:
four ad-hoc type scales in two unit systems, near-zero motion, missing focus
states, four radius vocabularies, and no print, theme-override, or keyboard
support anywhere.

**Root cause (F1): the core tokenizes colour and nothing else.** Beyond the 30
colour tokens it carries exactly two others — `--radius` and `--mono`. The
surfaces agree on colour because colour is the only thing they were given.

## Measured ground truth

| Signal | session-report | session-handoff | plan-review | docket board |
|---|---|---|---|---|
| Lines | 1516 | 608 | 911 | ~516 |
| Plugin | session-report | session-handoff | condux | docket |
| Font | all `var(--mono)` | all `var(--mono)` | all `var(--mono)` | `ui-sans-serif` |
| Type sizes | 9, px | 4, px | 7, px | 7, rem |
| `transition:` | **0** | **0** | 2 | **0** |
| `:focus` | **0** | **0** | 4 | 1 |
| Radius values | 4 | 2 | 6 | 4 |
| `color-mix`/`oklch` | yes | yes | yes | **no** |
| `aria-*` | 1 | **0** | 1 | 9 |

Absent from **all four**: `@media print`, `localStorage`, URL state,
clipboard, `data-theme`, `prefers-reduced-motion`, `dvh`.

## Decisions

### D1 — The core carries the scale; surfaces choose the steps

38 new tokens join the 30 colour tokens: type (10 sizes, 4 leadings, 3
trackings, `--sans`), space (8 steps, 4px base), radius (5), motion (3
durations, 2 easings), elevation (3).

Type, space, radius and motion are **theme-invariant** and live only in the
bare `:root` block. **Elevation is theme-variant** — a shadow tuned for a dark
ground is wrong on cream — so it is defined in every theme block, like colour.

All sizes are `rem`, so the browser's font-size setting is honoured. Three of
the four surfaces currently use `px`, which ignores it.

The core defines the ramp; each surface picks which rungs it uses. That fixes
F1 without retiring per-surface direction.

### D2 — Mono for display and data; sans for prose and chrome

Three surfaces render *all* text in monospace at 13px, including prose. Rather
than replacing mono with sans, the roles split: **mono carries display type,
ids, paths, counts, costs and code**, where it reads as deliberate and
technical; **sans carries prose and UI chrome**, where monospace hurts reading.

This preserves the toolkit's terminal identity exactly where identity is
expressive, and fixes readability where it actually hurts — session-handoff and
plan-review are mostly prose.

Neither face is fetched. `--sans` names preferred families then falls back
through the platform stack, exactly as `--mono` already does.

### D3 — Generalize the region mechanism, not the shell

`check-tokens.mjs` is not a colour tool. It is a byte-exact region inliner that
already solves "share text across four artifacts that cannot have a runtime
dependency." Point it at three regions instead of one:

| Region | Carries |
|---|---|
| `tokens:core` | colour + the new type / space / radius / motion / elevation scale |
| `kit:css` | focus-visible, hover/active, `prefers-reduced-motion`, `@media print`, `[data-theme]`, skip-link |
| `kit:js` | theme persistence, keyboard layer + `?` overlay, clipboard, URL state |

**This is not the shared shell D2 of the 2026-08-12 design rejected.** That
rejection stands and its reasoning is unchanged: the four consumption models
are incompatible, cross-plugin runtime dependencies are banned, and no egress.
An *inlined region* has no runtime — each artifact still ships fully
self-contained, byte-identical, zero-dependency. It is the ratified gate
mechanism pointed at more than colour.

The payoff: every capability lands **once** rather than four times. Four
hand-written keyboard layers is F1 reappearing one level up.

### D4 — Extract docket's document shell to `board-shell.html` first

`docket-render.mjs` builds its whole document as one template literal
(lines 42–77) with `${CSS}`, `${JS}`, `${stats}`, `${sections}`, `${archive}`
as its only variable parts. Inlining a `kit:js` region into a JS template
literal is unsafe in a way CSS never exposed:

```
carried: `if (/\s/.test(x))`   emitted: if (/s/.test(x))
```

A backslash is consumed by the template literal, so `/\s/` silently becomes
`/s/`. No error, no warning, wrong in one surface only. `readCore()` already
guards backtick and `${` for exactly this reason; it does not guard backslash,
and CSS never needed it to.

Rather than escape on write, **move the shell out**: ~35 lines become
`skills/record/server/board-shell.html` with `{{CSS}}` / `{{KIT_CSS}}` /
`{{KIT_JS}}` / `{{STATS}}` / `{{SECTIONS}}` / `{{ARCHIVE}}` placeholders. The
data-driven builders (`itemCard`, `stat`, `yearBlock`, `mdLite`,
`sectionProse`) stay in JS, where they belong.

This makes all four targets `.html`, so one mechanism covers everything and the
hazard class stops existing rather than being escaped around. It also makes
docket's markup editable as HTML, which matters more for the layout work than
the escaping does.

Verified cheap: `composition.json` maps `"skills/record/server": "server"` as a
**directory**, so the new file needs no sync or composition change;
`annotate-server.js` already reads its template by `readFileSync`, so the
pattern is established in-repo; and `tests/docket-cli.test.mjs` asserts on
`renderHtml()`'s returned string, a contract this preserves.

Lands as its own commit with **no visual change**, so a regression bisects to
one file.

### D5 — Adoption is per-surface, so the kit ships coherent on its own

The kit PR defines the scale but does not force adoption. Its
immediately-visible changes are purely **additive** — focus rings, motion,
print, reduced-motion, theme override, keyboard — none of which require a
surface to restructure. Type and space adoption (including the `px` → `rem`
migration) happens in each surface's own layout PR.

This is what keeps step 1 from shipping a half-redesigned state, and it isolates
the riskiest migration: session-report's 1516 lines are tuned at `px`, and on
`rem` its dense tables inherit the user's root font size.

### D6 — Sequencing

| # | Change | Scope | Release |
|---|---|---|---|
| 0 | Extract docket shell | docket only, pure refactor | docket |
| 1 | Surface Kit regions | **atomic, all four** | condux + docket + session-report + session-handoff + npm changeset |
| 2 | Per-surface layout & typography | four independent PRs | one plugin each |
| 3 | Style guide | with step 1 | — |

Step 1's atomicity is not a preference: `check-tokens.mjs` compares
byte-exactly, so a core change that skips `--fix` on any surface fails
`token-core.test.mjs`. This is the same coupling D1 of the 2026-08-12 design
split #20 to avoid — unavoidable here, which is why steps 0 and 2 are kept out
of it.

## Requested capabilities — where each lands

Measured current state, so nothing already shipped gets rebuilt. Docket #23
(long-document navigation) already gave session-report and plan-review their
nav; only the gap is specified here.

| Capability | Now | Shared (step 1) | Per-surface (step 2) |
|---|---|---|---|
| Keyboard nav + `?` overlay | 1 ad-hoc handler in session-report, 3 in plan-review | the whole layer, in `kit:js` | surface verbs only (approve, close item) |
| Theme override | **none** — all four are OS-only | `[data-theme]` + persistence | — |
| Empty / loading / error | **none** in any surface | skeleton + empty-block patterns in `kit:css` | the actual states, which are surface-specific |
| Search / filter | docket 1 input, plan-review 1, others **0** | input styling + `/` focus shortcut | the filtering itself |
| Navigation / TOC | session-report ✓, plan-review ✓, **handoff ✗, docket ✗** | scroll-spy helper | nav for the two that lack it |
| Responsive / mobile | 1 media query each in report and handoff, **0** in plan-review and docket | `dvh` fix, `100dvh` over `100vh` | breakpoints per layout |
| Print / PDF | **none** in any surface | `@media print` | — |

Only keyboard and theme are wholly shared. The rest split: the *pattern* is
shared, the *content* is per-surface — which is the point of D1's "core carries
the scale, surfaces choose the steps."

## Rejected alternatives

| Rejected | Why |
|---|---|
| Escape-on-write in the checker (`\`→`\\`, backtick→escaped) | Breaks the byte-identical-everywhere invariant that makes the checker trivially correct; renders the region unreadable in source; contradicts the ratified assert-at-the-source doctrine |
| Ban backslashes in the kit source | Consistent with doctrine and zero machinery, but a permanent surprising constraint on shared JS — one forgotten regex years later is the silent corruption we are designing out |
| Give docket the kit by module import, keep the template literal | Two mechanisms that must not drift, plus a test to police them. D4 removes the hazard instead of managing it |
| Core stays colour-only | Leaves F1 unfixed: four type scales, two unit systems, and each surface re-solving spacing and motion alone |
| Core carries type/space/motion outright, surfaces just consume | Maximum coherence but retires per-surface direction entirely |
| Per-surface rebuild, no shared machinery | Discards machinery shipped 2026-08-12, re-opens the drift #21 closed, and does the capability work 4× |
| Wireframe the redesign with `blueprint` | Declined by its own contract — "structure only", and `when_to_use` excludes aesthetic direction. The style guide is the sign-off artifact instead |

## Constraints

- **No egress.** Enforced repo-wide by `scripts/check-supply-chain.mjs`; the
  allowlist contains no font or CDN domain. Two of these templates were
  fetching Google Fonts until 2026-08-09.
- **Byte-mirror.** Each surface is byte-identical in 2–3 dist locations
  (`dist/plugins/`, `dist/opencode/`, `packages/condux-opencode/`).
- **No cross-plugin dependencies.** The four span four independently-installed
  plugins.
- **npm channel.** Any change reaching `packages/condux-opencode/{index.js,agents,skills}`
  needs `pnpm changeset` or `npm-channel.test.mjs` fails. plan-review's template
  is in that surface, so step 1 needs one.
- **Version bumps.** Each plugin whose templates change needs its `plugin.json`
  version bumped, per this repo's release automation.
- **Regions are marker-delimited and replaced without warning.** Per-surface
  tokens live outside them.

## Out of scope

- Redesigning the colour palette. It is already a considered warm-neutral
  system with a single accent; it stays as-is.
- Server behaviour — routing, live-reload, filter endpoints. Verified that the
  servers inject no HTML: `annotate-server.js` performs one substitution
  (`{{PLAN_NAME}}`), `DIR_MODE` only selects which JSON the API returns, and
  `docket.mjs` only serves `renderHtml()`'s string. The "served UI shells" are
  the four files.
- spec-browser. It writes `index.md` (Markdown) and stays HTML-free; the spec
  doc site renders through plan-review's `DIR_MODE`, so it inherits the
  redesign without becoming a fifth surface.
- Search indexing. Client-side filtering is in scope; a real cross-document
  search index would require producers to emit more, and is deferred.

## Open questions

- **Font embedding.** `--sans` currently names families and falls back through
  the platform stack — zero bytes, zero risk, but rendering varies by machine
  (on WSL the fallback is what shows). Base64-embedding a subsetted variable
  font would guarantee identical rendering everywhere at roughly **+20–30 KB
  per artifact**, multiplied across four surfaces and their 2–3 dist mirrors.
  Recommendation: ship the named stack, revisit if the fallback proves ugly.
- **`--radius` value.** Kept at its existing `0.25rem` so nothing currently
  referencing it shifts. Whether the redesign wants a different base is a
  step-2 question, per surface.
- **Density toggle.** Raised in the audit, not selected. The new space scale
  makes it cheap later; not built now.
