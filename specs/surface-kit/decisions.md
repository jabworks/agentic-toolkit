# Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| D1 | The core carries the scale; surfaces choose the steps | 38 tokens join the colour core, theme-invariant ones in bare `:root` only; elevation is the one variant exception | accepted |
| D2 | Mono for display and data; sans for prose and chrome | roles split rather than replace — three surfaces were all-mono, docket alone sans | accepted |
| D3 | Generalize the region mechanism, not the shell | `check-tokens.mjs` becomes a three-region inliner instead of each surface hand-carrying copies | accepted |
| D4 | Extract docket's document shell first and alone | a template literal consumes backslashes (`/\s/` → `/s/`), so JS inlining there is unsafe in a way CSS never exposed | accepted |
| D5 | Adoption is per-surface; the kit ships coherent alone | the kit's visible effects are purely additive, so no surface is forced to restructure on the kit's schedule | accepted |
| D6 | Sequencing: shell extraction → atomic kit regions → per-surface adoption | the one atomic step is the kit regions across all four surfaces; everything else releases independently | accepted |
| D7 | Categorical colour is a core group, distinct from accent and semantics | a series identity is neither the surface's voice (`--primary`) nor a status; conflating them was the failure | accepted |
| D8 | session-handoff is a rail, and the rail indexes rather than holds | the handoff is read once to reload a mental model — navigation belongs in a rail, content in the flow | accepted |

Full reasoning in [design.md](design.md); the measurements behind them in [audit.md](audit.md).

## D1 — The core carries the scale; surfaces choose the steps

**Decided:** the core defines the type / space / radius / motion / elevation scale centrally; each surface picks its own rungs.
**Because:** the audit's root cause is that the core tokenizes colour and nothing else, so the surfaces agree on colour and nothing else — defining the ramp centrally fixes that without retiring per-surface direction.

| Alternative | Why not |
|---|---|
| Core stays colour-only | Leaves the root cause unfixed |
| Core carries type/space/motion outright | Maximum coherence, but retires per-surface direction entirely |

**Consequences**
- 38 tokens join the existing 30 colour tokens:

  | Group | Tokens | Theme |
  |---|---|---|
  | Type | `--sans`, `--text-2xs`…`--text-4xl` (10), `--leading-*` (4), `--tracking-*` (3) | invariant |
  | Space | `--space-1`…`--space-12` (8, 4px base) | invariant |
  | Radius | `--radius-sm`, `--radius`, `--radius-md`, `--radius-lg`, `--radius-full` | invariant |
  | Motion | `--dur-fast`, `--dur`, `--dur-slow`, `--ease-out`, `--ease-spring` | invariant |
  | Elevation | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | **variant** |

- Theme-invariant tokens live only in the bare `:root` block, matching how `--mono` and `--radius` are already handled. **Elevation is the exception** — a shadow tuned for a dark ground is wrong on cream — so it is redefined in every theme block alongside colour.
- All sizes are `rem`. Three of four surfaces use `px` today, which overrides the reader's browser font-size setting.

## D2 — Mono for display and data; sans for prose and chrome

**Decided:** the two faces split by role — mono for display type, ids, paths, commit hashes, counts, costs and code; sans for prose, headings below display size, UI chrome and labels.
**Because:** three surfaces (`session-report`, `session-handoff`, `plan-review`) render **all** text in 13px monospace, prose included, while `docket` alone uses sans — the split preserves the terminal identity where it is expressive and fixes readability where monospace actively hurts.

| Alternative | Why not |
|---|---|
| Replace mono with sans outright | Retires the terminal identity exactly where it is expressive — the split keeps it for display and data |

**Consequences**
- Neither face is fetched: `--sans` names preferred families then falls back through the platform stack, the technique `--mono` already uses.

## D3 — Generalize the region mechanism, not the shell

**Decided:** `check-tokens.mjs` becomes a three-region inliner; there is still no shared runtime shell.
**Because:** without a shared mechanism every capability is implemented four times and drifts — the audit's root cause reappearing one level up.

| Alternative | Why not |
|---|---|
| A runtime shared shell | Rejected 2026-08-12 and not reopened: four incompatible consumption models, a ban on cross-plugin dependencies, and no egress |
| Per-surface rebuild, no shared machinery | Discards machinery shipped 2026-08-12, re-opens the drift docket #21 closed, does the capability work 4× |

**Consequences**
- The gate mechanism is pointed at more than colour:

  | Region | Carries |
  |---|---|
  | `tokens:core` | colour + the D1 scale |
  | `kit:css` | focus-visible, hover/active, reduced-motion, `@media print`, `[data-theme]`, skip-link |
  | `kit:js` | theme persistence, keyboard layer + `?` overlay, clipboard, URL state |

**Context** — this does not reverse the 2026-08-12 "no shared shell" decision. That rejection was about a *runtime* shell. An inlined region has no runtime — each artifact still ships self-contained, byte-identical and dependency-free.

## D4 — Extract docket's document shell to `board-shell.html`, first and alone

**Decided:** the ~35-line shell moves to `skills/record/server/board-shell.html` with `{{CSS}}` / `{{KIT_CSS}}` / `{{KIT_JS}}` / `{{STATS}}` / `{{SECTIONS}}` / `{{ARCHIVE}}` placeholders, as its own commit with **no visual change**.
**Because:** `docket-render.mjs` builds its whole document as one template literal (lines 42–77), where a backslash is consumed by the literal — `/\s/` silently becomes `/s/` — so JS inlining there is unsafe in a way CSS never exposed (see [quirks.md](quirks.md)).

| Alternative | Why not |
|---|---|
| Escape-on-write in the checker | Breaks the byte-identical invariant that makes the checker trivially correct; unreadable region in source; contradicts the ratified assert-at-the-source doctrine |
| Ban backslashes in the kit source | Zero machinery and doctrine-consistent, but a permanent surprising constraint on shared JS — one forgotten regex years later is the silent corruption being designed out |
| docket gets the kit by module import | Two mechanisms that must not drift, plus a test to police them. This decision removes the hazard instead of managing it |

**Consequences**
- All four targets become `.html`, so one mechanism covers everything and the hazard class ceases to exist rather than being escaped around.
- Data-driven builders (`itemCard`, `stat`, `yearBlock`, `mdLite`, `sectionProse`) stay in JS.
- Secondary benefit, larger in practice: docket's markup becomes editable HTML for the step-2 layout work.
- A regression bisects to one file.

## D5 — Adoption is per-surface, so the kit ships coherent alone

**Decided:** the kit PR defines the scale but does not force adoption; type and space adoption, including the `px` → `rem` migration, happens in each surface's own layout PR.
**Because:** the kit's visible effects are purely additive — focus rings, motion, print, reduced-motion, theme override, keyboard — none requiring a surface to restructure on the kit's schedule.

| Alternative | Why not |
|---|---|
| Adopt in the kit PR itself | Ships a half-redesigned state, and bundles the riskiest migration — session-report's 1516 lines are tuned at `px`, and on `rem` its dense tables follow the reader's root font size |

**Consequences**
- Step 1 cannot ship a half-redesigned state; the `rem` risk is isolated to session-report's own layout PR.

## D6 — Sequencing

**Decided:** shell extraction, then atomic kit regions, then per-surface adoption — with the style guide riding step 1.

| # | Change | Scope | Release |
|---|---|---|---|
| 0 | Extract docket shell | docket only, pure refactor | docket |
| 1 | Surface Kit regions | **atomic, all four** | 4 plugins + npm changeset |
| 2 | Per-surface layout & typography | four independent PRs | one plugin each |
| 3 | Style guide | with step 1 | — |

**Because:** the one atomic step is the kit regions across all four surfaces; everything else releases independently.

| Alternative | Why not |
|---|---|
| Release the core non-atomically | Not available: `check-tokens.mjs` compares byte-exactly, so a core change skipping `--fix` on any surface fails `token-core.test.mjs` — the atomicity is forced, not chosen |
| Fold steps 0 and 2 into the atomic step | Step 1's coupling is the cross-plugin coupling the 2026-08-12 design split docket #20 to avoid; it is unavoidable for the core itself, which is why 0 and 2 are deliberately kept out |
| Wireframe the redesign with `blueprint` | Declined by its own contract — "structure only", and `when_to_use` excludes aesthetic direction. The style guide is the sign-off artifact instead |

**Consequences**
- A core change is always 4 plugin bumps plus an npm changeset in one PR.

## D7 — Categorical colour is a core group, distinct from accent and semantics

*(docket #46, 2026-08-21. Specimen: [ramp-direction-c.html](ramp-direction-c.html))*

**Decided:** the core carries `--cat-1` … `--cat-8` plus `--cat-other` as their own group — not the accent, not the semantics.
**Because:** a series identity is neither the surface's voice (`--primary`) nor a status (`--success`/`--warning`/`--destructive`/`--info` mean good, bad and attention; a project is none of those) — conflating them was the failure.

| Alternative | Why not |
|---|---|
| Promote the existing `PCOL` array as-is | Fails four of five checks in both modes: `#978365` below the chroma floor, adjacent CVD ΔE 3.3, normal-vision 12.9, and 7 of 8 below 3:1 on cream. The clay slot is the accent doing double duty as a series, and it is the pair that collapses |
| Adopt the `dataviz` reference instance verbatim | Passes, but at CVD ΔE 8.4/9.1 against D7's 15.8/15.7, four light slots need the relief rule, and the hues are brighter and cooler than the skin. Provenance is the only axis it wins |
| Max-chroma ramp that clears 3:1 on cream | Requiring 3:1 for all eight without a chroma cap admits exactly one hue set, and it is garish (`#bb0280`, `#0177fe`) — wrong for a warm-neutral system |
| Cycle hues past slot 8 | The docket item assumed cycling; the method forbids it. Two projects sharing a hue in the gantt, where no row label disambiguates, is precisely the reported bug |
| Redesign the palette | Already a considered warm-neutral system with a single accent — categorical is an addition beside it, not a reopening |

**Consequences**
- Values were computed against our two surfaces with the `dataviz` method rather than picked: chroma capped at 0.13 so the hues stay as muted as the rest of the skin, and the slot order chosen by enumerating all 40,320 orderings and maximizing the worst adjacent pair.

  | | slots 1–8 |
  |---|---|
  | dark (`:root`) | `#cf686e` `#897ed6` `#41a265` `#3694d4` `#94911b` `#ba6cae` `#c37827` `#00a0a4` |
  | light (both light blocks) | `#b04d54` `#6f63b8` `#1e874b` `#0a78b7` `#797600` `#9d5192` `#a45e00` `#008f93` |

- Worst adjacent CVD ΔE **15.8 dark / 15.7 light** against a target of 8; normal-vision ΔE **18.2 / 18.1** against a floor of 15; all eight clear **3:1 on both surfaces**, so no relief rule is needed anywhere. Tritan separation is 3.4 — the method gates protanopia and deuteranopia only, so this is a permitted trade, recorded so it is not rediscovered as a bug.
- **Identity is never colour alone, and the ramp is finite.** Slots 9–16 repeat the same eight hues with a second channel; past 16 everything folds to `--cat-other`. The second channel is per-medium: `▓` instead of `█` in text glyph runs, a diagonal stripe in CSS blocks. Hues are assigned from one global ranking of the entity, never from position within the current view — colour follows the entity, not its rank.

## D8 — session-handoff is a rail, and the rail indexes rather than holds

*(surface-kit D6 step 2, surface 1 of 4. Signed off 2026-08-22. Specimen: [handoff-direction-b.html](handoff-direction-b.html))*

**Decided:** a sticky 19rem rail carries identity, the numbered next steps, a blockers chip and the section nav; the pane runs `Immediate next steps` → `Blockers` → the current-state lede → the document as written. The rail indexes; the pane is authoritative.
**Because:** the handoff document is read once, at session start, to reload a mental model — navigation belongs in a rail, content in the flow.

| Alternative | Why not |
|---|---|
| **Briefing** — start-here panel, depth sections folded | Shortest by far (~1550px) and the strongest answer to the scroll itself, but drilling costs a click and every deep link must open a fold |
| **Dossier** — vitals strip, numbered sections, no folds | Densest and most scannable, but leaves the long scroll intact |
| Rail carries the full step text, no pane section | The rail becomes tall and the steps narrow; this was the first draft's defect |
| Step 01 in the rail, the rest in the pane | The rail stops being a full index |
| Rail absorbs the titlebar | Theme toggle and `?` become unconventional to find |
| Empty optional section keeps the kit's dashed `.kit-empty` panel | Right for an interactive surface with a waiting slot; on a read-once document it rebuilds the screen-band of nothing this redesign removes (120px → 20px) |

**Consequences**
- Each rail step is clamped to three lines and is a *link* to its full text in the pane. Nothing exists only in the rail — a clamped 350-character step in a 19rem column is unreadable, and the first draft had exactly that defect: the pane dropped the two hoisted sections entirely, so their full text was readable nowhere.
- The rail now renders `workstream` and `continues-from`, which the surface rendered nowhere.
- The separate `.section-nav` row retires, because the rail's nav replaces it. This is safe only because `g` + digit indexes `[data-kit-section]` (Q13); had it walked the nav, the fix would have lived inside `kit:js` and D6 step 1 makes a kit change atomic across all four surfaces plus an npm changeset.
- **Measure is capped on every prose-bearing block, not only paragraphs** — `p` and `li` at `68ch`, `td` exempt, tables at full pane width because they are data. Worst line 90 → 79 characters; the 90 was a list item in *important context*, the section the template marks MUST READ. Raw `px` on the surface fell 56 → 43.
- Ordering changes in **both** templates. `SKILL.md` makes markdown the default save format and requires "identical sections, no divergence", so hoisting only in HTML would ship the hierarchy in the format nobody gets by default.
- **The page gets longer, not shorter: 4240px → 4679px** at 1440×1000. Larger prose, a narrower measure and next-steps-as-a-section all cost height; the card's tighter padding pays some of it back. This direction buys orientation from the rail, not brevity — the flat direction study measured 5394px before the card was kept, so treat that figure as superseded.

**Context** — measured before the change: **4240px** of scroll in a 936px column, nine sections at identical weight, prose at ~115 characters per line, a full screen-band spent on "No blockers", and `▸` markers beside every heading that fold nothing. Verification also turned up a theme defect older than this redesign: the surface's extension tokens had no `[data-theme]` blocks, so the manual Dark toggle left the titlebar cream on an inverted card. Fixed here and pinned; open on the other three surfaces (Q16, docket #48).
