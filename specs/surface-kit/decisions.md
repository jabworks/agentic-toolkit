# Decisions

Six ratified calls. Full reasoning in [design.md](design.md); the measurements
behind them in [audit.md](audit.md).

## D1 — The core carries the scale; surfaces choose the steps

38 tokens join the existing 30 colour tokens.

| Group | Tokens | Theme |
|---|---|---|
| Type | `--sans`, `--text-2xs`…`--text-4xl` (10), `--leading-*` (4), `--tracking-*` (3) | invariant |
| Space | `--space-1`…`--space-12` (8, 4px base) | invariant |
| Radius | `--radius-sm`, `--radius`, `--radius-md`, `--radius-lg`, `--radius-full` | invariant |
| Motion | `--dur-fast`, `--dur`, `--dur-slow`, `--ease-out`, `--ease-spring` | invariant |
| Elevation | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | **variant** |

Theme-invariant tokens live only in the bare `:root` block, matching how
`--mono` and `--radius` are already handled. **Elevation is the exception** — a
shadow tuned for a dark ground is wrong on cream — so it is redefined in every
theme block alongside colour.

All sizes are `rem`. Three of four surfaces use `px` today, which overrides the
reader's browser font-size setting.

Rationale: the audit's root cause is that the core tokenizes colour and nothing
else, so the surfaces agree on colour and nothing else. Defining the ramp
centrally while letting each surface pick its rungs fixes that without retiring
per-surface direction.

## D2 — Mono for display and data; sans for prose and chrome

`session-report`, `session-handoff` and `plan-review` render **all** text in
monospace at 13px, prose included. `docket` alone uses a sans stack.

Roles split rather than replace:

- **mono** — display type, ids, paths, commit hashes, counts, costs, code
- **sans** — prose, headings below display size, UI chrome, labels

Preserves the terminal identity where it is expressive; fixes readability where
monospace actively hurts. Neither face is fetched: `--sans` names preferred
families then falls back through the platform stack, the technique `--mono`
already uses.

## D3 — Generalize the region mechanism, not the shell

`check-tokens.mjs` becomes a three-region inliner:

| Region | Carries |
|---|---|
| `tokens:core` | colour + the D1 scale |
| `kit:css` | focus-visible, hover/active, reduced-motion, `@media print`, `[data-theme]`, skip-link |
| `kit:js` | theme persistence, keyboard layer + `?` overlay, clipboard, URL state |

**This does not reverse the 2026-08-12 "no shared shell" decision.** That
rejection was about a *runtime* shell: four incompatible consumption models, a
ban on cross-plugin dependencies, and no egress. An inlined region has no
runtime — each artifact still ships self-contained, byte-identical and
dependency-free. The gate mechanism is simply pointed at more than colour.

Without it, every capability is implemented four times and drifts — the audit's
root cause reappearing one level up.

## D4 — Extract docket's document shell to `board-shell.html`, first and alone

`docket-render.mjs` builds its whole document as one template literal
(lines 42–77). Inlining JS there is unsafe in a way CSS never exposed: a
backslash is consumed by the literal, so `/\s/` silently becomes `/s/` — see
[quirks.md](quirks.md).

The shell (~35 lines) moves to `skills/record/server/board-shell.html` with
`{{CSS}}` / `{{KIT_CSS}}` / `{{KIT_JS}}` / `{{STATS}}` / `{{SECTIONS}}` /
`{{ARCHIVE}}` placeholders. Data-driven builders (`itemCard`, `stat`,
`yearBlock`, `mdLite`, `sectionProse`) stay in JS.

All four targets become `.html`, so one mechanism covers everything and the
hazard class ceases to exist rather than being escaped around. Secondary
benefit, larger in practice: docket's markup becomes editable HTML for the
step-2 layout work.

Lands as its own commit with **no visual change**, so a regression bisects to
one file.

## D5 — Adoption is per-surface, so the kit ships coherent alone

The kit PR defines the scale but does not force adoption. Its visible effects
are purely additive — focus rings, motion, print, reduced-motion, theme
override, keyboard — none requiring a surface to restructure. Type and space
adoption, including the `px` → `rem` migration, happens in each surface's own
layout PR.

This prevents step 1 from shipping a half-redesigned state, and isolates the
riskiest migration: session-report's 1516 lines are tuned at `px`, and on `rem`
its dense tables follow the reader's root font size.

## D6 — Sequencing

| # | Change | Scope | Release |
|---|---|---|---|
| 0 | Extract docket shell | docket only, pure refactor | docket |
| 1 | Surface Kit regions | **atomic, all four** | 4 plugins + npm changeset |
| 2 | Per-surface layout & typography | four independent PRs | one plugin each |
| 3 | Style guide | with step 1 | — |

Step 1's atomicity is forced, not chosen: `check-tokens.mjs` compares
byte-exactly, so a core change skipping `--fix` on any surface fails
`token-core.test.mjs`. This is the cross-plugin coupling the 2026-08-12 design
split docket #20 to avoid; it is unavoidable for the core itself, which is why
steps 0 and 2 are deliberately kept out of it.

## D7 — Categorical colour is a core group, distinct from accent and semantics

*(docket #46, 2026-08-21. Specimen: [ramp-direction-c.html](ramp-direction-c.html))*

The core carries `--cat-1` … `--cat-8` plus `--cat-other`, as their own group.
Not the accent (`--primary` is the surface's voice, not a series) and not the
semantics (`--success`/`--warning`/`--destructive`/`--info` mean good, bad and
attention; a project is none of those). This does not reopen "redesign the
palette" below — the warm-neutral system and its single accent are untouched;
categorical is an addition beside them.

Values were computed against our two surfaces with the `dataviz` method rather
than picked: chroma capped at 0.13 so the hues stay as muted as the rest of the
skin, and the slot order chosen by enumerating all 40,320 orderings and
maximizing the worst adjacent pair.

| | slots 1–8 |
|---|---|
| dark (`:root`) | `#cf686e` `#897ed6` `#41a265` `#3694d4` `#94911b` `#ba6cae` `#c37827` `#00a0a4` |
| light (both light blocks) | `#b04d54` `#6f63b8` `#1e874b` `#0a78b7` `#797600` `#9d5192` `#a45e00` `#008f93` |

Worst adjacent CVD ΔE **15.8 dark / 15.7 light** against a target of 8;
normal-vision ΔE **18.2 / 18.1** against a floor of 15; all eight clear **3:1 on
both surfaces**, so no relief rule is needed anywhere. Tritan separation is 3.4
— the method gates protanopia and deuteranopia only, so this is a permitted
trade, recorded so it is not rediscovered as a bug.

**Identity is never colour alone, and the ramp is finite.** Slots 9–16 repeat
the same eight hues with a second channel; past 16 everything folds to
`--cat-other`. The second channel is per-medium: `▓` instead of `█` in text
glyph runs, a diagonal stripe in CSS blocks. Hues are assigned from one global
ranking of the entity, never from position within the current view — colour
follows the entity, not its rank.

## Rejected

| Rejected | Why |
|---|---|
| Promote the existing `PCOL` array as-is | Fails four of five checks in both modes: `#978365` below the chroma floor, adjacent CVD ΔE 3.3, normal-vision 12.9, and 7 of 8 below 3:1 on cream. The clay slot is the accent doing double duty as a series, and it is the pair that collapses |
| Adopt the `dataviz` reference instance verbatim | Passes, but at CVD ΔE 8.4/9.1 against D7's 15.8/15.7, four light slots need the relief rule, and the hues are brighter and cooler than the skin. Provenance is the only axis it wins |
| Max-chroma ramp that clears 3:1 on cream | Requiring 3:1 for all eight without a chroma cap admits exactly one hue set, and it is garish (`#bb0280`, `#0177fe`) — wrong for a warm-neutral system |
| Cycle hues past slot 8 | The docket item assumed cycling; the method forbids it. Two projects sharing a hue in the gantt, where no row label disambiguates, is precisely the reported bug |
| Escape-on-write in the checker | Breaks the byte-identical invariant that makes the checker trivially correct; unreadable region in source; contradicts the ratified assert-at-the-source doctrine |
| Ban backslashes in the kit source | Zero machinery and doctrine-consistent, but a permanent surprising constraint on shared JS — one forgotten regex years later is the silent corruption being designed out |
| docket gets the kit by module import | Two mechanisms that must not drift, plus a test to police them. D4 removes the hazard instead of managing it |
| Core stays colour-only | Leaves the root cause unfixed |
| Core carries type/space/motion outright | Maximum coherence, but retires per-surface direction entirely |
| Per-surface rebuild, no shared machinery | Discards machinery shipped 2026-08-12, re-opens the drift docket #21 closed, does the capability work 4× |
| Wireframe with `blueprint` | Declined by its own contract — structure only; `when_to_use` excludes aesthetic direction |
| Redesign the palette | Already a considered warm-neutral system with a single accent |
