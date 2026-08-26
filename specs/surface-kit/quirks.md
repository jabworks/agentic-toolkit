# Quirks

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | A template literal silently eats backslashes | carrying JS source inside a JS template literal | high | yes — D4 makes every target `.html`, plus a source assertion |
| Q2 | Chained placeholder substitution re-scans user text | an item literally titled `{{ARCHIVE}}` in `DOCKET.md` | medium | yes — single-pass replacer over one alternation |
| Q3 | `</script` terminates the element regardless of language | any `kit:js` content containing the literal sequence | medium | yes — asserted at the source |
| Q4 | `--muted` means opposite things in the two vocabularies | mechanically renaming docket's legacy tokens | medium | no — the only guard is knowing both vocabularies |
| Q5 | Elevation and categorical colour are theme-variant | defining `--shadow-*` / `--cat-*` in bare `:root` only | medium | yes — `token-core.test.mjs:61` requires the light override |
| Q6 | Three theme states, not two | writing light overrides with `prefers-color-scheme` alone | medium | yes — `core.css` is the single source; the checker propagates |
| Q7 | `px` → `rem` is a behaviour change, not a restyle | converting session-report's px-tuned layout | medium | partial — deferred to that surface's own step-2 PR |
| Q8 | Four release channels, four different traps | shipping surface changes without the channel-specific step | high | partial — three traps are test-enforced; the commit-split one is procedural |
| Q9 | docket's board must stay a standalone document | converting the board to shell-plus-hydration | medium | yes — D4 keeps server-side rendering |
| Q10 | The core is dark-first, so the ramp's rows invert silently | writing light values in bare `:root` | high | no — no test validates a value; read the block before writing hex |
| Q11 | An inline `background` shorthand erases the stripe | passing the hue as `background:` instead of a custom property | medium | yes — the hue arrives as `--hue` |
| Q12 | `░` reserves the low end of the ink range | picking a second-channel texture too close to the empty track | low | yes — `▓` chosen by measured ink coverage |
| Q13 | `data-kit-chrome` and `g`+digit are not navigation machinery | assuming either attribute is the nav mechanism | medium | no — read the region before assuming which one you are in |
| Q14 | A bare `1fr` column floors at min-content | one long unbreakable token in a grid column with prose | medium | yes — `minmax(0, 1fr)` everywhere prose can land |
| Q15 | Capping measure on `<p>` alone misses the worst line | treating `p { max-width }` as "prose is capped" | low | yes — cap `li` too, exempt table cells |
| Q16 | Extension tokens need `[data-theme]` blocks, not just a media query | clicking Dark on a light system | high | yes — closed 2026-08-24; `surface-theme-pairing.test.mjs` |
| Q17 | A retired section's target must stay in the DOM | deleting a `<section>` in a render with no null guards | medium | yes — hide, don't delete |
| Q18 | A closed `<details>` is invisible to three nav routes and to print | collapsing a `details.fold` section wrapper | high | yes — one `reveal()` plus a `beforeprint`/`afterprint` pair |
| Q19 | A sticky offset in CSS is a fallback, not a measurement | relying on the `3.25rem` fallback for `--strip-h` | low | yes — measured on load and on resize |
| Q20 | The UI numbering and the payload numbering are two lists | numbering the render without ordering the payload | medium | yes — one `threadOrder()` for both |
| Q21 | Hiding grid children leaves their tracks behind | printing a surface whose print block hides chrome only | high | yes — collapse the shell, unset the clipping overflow |
| Q22 | An appended overlay does not model source order | judging responsive behaviour from an appended-CSS specimen | low | yes — measure after integration |
| Q23 | The category set is the popover's chips | styling categories from specimen seed data | low | yes — read the chips |
| Q24 | A `display: none` pane does not increment a CSS counter | directory mode with notes on two documents | medium | yes — other-document rows take no ordinal |
| Q25 | A section rule and a `---` are the same divider twice | rendering a canonical plan with `h2` border-top | low | yes — suppress the separator with `:has()` |
| Q26 | Opt-in behaviour written as a default hides in hosts that never exercise it | hosting `.kit-controls` in block flow | low | yes — `flex: none` in the kit; the guide opts back in |

## Q1 — A template literal silently eats backslashes *(the reason for D4)*

**Symptom:** carried JS emits corrupted source with no throw and no warning — `/\s/` (match whitespace) becomes `/s/` (match the letter "s") — and wrong in **one surface only**.
**Trigger:** carrying JS source inside a JS template literal.
**Cause:** the literal consumes backslashes as escape sequences. The `\n` case at least fails loudly (a real newline inside a string literal is a syntax error); the regex case ships. `readCore()` already guards `` ` `` and `${` for exactly this reason but not backslash — CSS never needed it to, since CSS barely uses backslashes while JS uses them in every regex and escape sequence.
**Mitigation:** yes — D4 removes the hazard by making every target `.html`. The source assertion is still added, because `core.css` could one day carry `content: "\2014"` and a future surface could reintroduce a JS target.

```js
const carried = `if (/\s/.test(x)) { y = "a\nb"; }`;
// emitted: if (/s/.test(x)) { y = "a
// b"; }
```

## Q2 — Placeholder substitution must be single-pass

**Symptom:** an item literally titled `{{ARCHIVE}}` in user-authored text gets substituted a second time.
**Trigger:** a naive chained `.replace()` per placeholder, which re-scans already-substituted output.
**Cause:** `board-shell.html` fills `{{SECTIONS}}` with rendered docket content, which is derived from user-authored `DOCKET.md` text.
**Mitigation:** yes — substitute once, with a replacer function over a single alternation; the replacer's return value is never re-scanned, so the hazard cannot occur.

```js
shell.replace(/\{\{(CSS|KIT_CSS|KIT_JS|STATS|SECTIONS|ARCHIVE)\}\}/g,
              (_, key) => values[key]);
```

## Q3 — `</script` terminates the element regardless of language

**Symptom:** the output document's `<script>` element closes early.
**Trigger:** any `kit:js` content containing the literal `</script` — this is **not** docket-specific; it applies to all four surfaces, unlike Q1.
**Cause:** HTML ends a script element at that character sequence no matter what language the block claims to carry.
**Mitigation:** yes — asserted at the source rather than escaped.

## Q4 — `--muted` means opposite things in the two historical vocabularies

**Discovered:** 2026-08-12 (D4 of that design)

**Symptom:** a mechanical rename inverts a token's role silently.
**Trigger:** editing docket's own styles with the core vocabulary in mind.
**Cause:** docket's legacy `--muted: #6a6f76` was a muted *foreground* used as `color:`; the core's `--muted: #222221` is a *surface*, with `--muted-foreground` for text.
**Mitigation:** no — still live for anyone editing docket's styles; the only guard is knowing both vocabularies.

## Q5 — Elevation and categorical colour are the theme-variant new groups

**Symptom:** the classic artifact bug — a value whose only definition sits behind a media query, absent in the un-stamped state.
**Trigger:** defining `--shadow-*` or `--cat-*` in the bare `:root` block only, the way type, space, radius and motion correctly are.
**Cause:** a shadow tuned for `#111110` reads as dirt on `#f6f5ef`, and `--cat-*` (D7) has two rows that differ per theme — both must be restated in every theme block alongside colour. `--cat-*` joined elevation here on 2026-08-21.
**Mitigation:** yes — `token-core.test.mjs:61` enforces it: a token name that does not match `THEME_INVARIANT` is *required* to have a light override.

## Q6 — Three theme states, not two

**Symptom:** an explicit theme choice loses to the OS preference, or the OS preference leaks through a stamped theme.
**Trigger:** writing light overrides with `prefers-color-scheme` alone once `[data-theme]` exists.
**Cause:** there are three states — un-stamped (follow the OS), stamped light, stamped dark. The core must define, in this order:

1. bare `:root` — dark (this toolkit is dark-first)
2. `@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { … } }` — OS light, unless explicitly stamped dark
3. `:root[data-theme="light"] { … }` — explicit light beats a dark OS

**Mitigation:** yes — the light block appears **twice**, and that duplication is acceptable precisely because `core.css` is the single source and the checker propagates it; hand-maintaining it in four files would not be.

## Q7 — `px` → `rem` is a behaviour change, not a restyle

**Symptom:** dense tables overflow at non-default browser font sizes.
**Trigger:** converting session-report's 1516 px-tuned lines to `rem`.
**Cause:** on `rem`, rendered size follows the reader's browser font-size setting — correct for accessibility, but the layout was tuned at `px`.
**Mitigation:** partial — deferred to that surface's own step-2 PR (D5) rather than riding along with the kit, so the risk lands where it can be verified.

## Q8 — Release traps

**Symptom:** a release that looks complete while a channel silently serves stale content — condux 2.12.0–2.14.0 each shipped without a changeset and npm served 0.7.0 while the marketplace moved on.
**Trigger:** shipping a surface or template change without the channel-specific step.
**Cause:** four channels with four different requirements, none implied by the others.
**Mitigation:** partial — three of the four are test-enforced; the pre-commit staging trap is procedural knowledge only.

- **npm channel.** plan-review's template lives in `packages/condux-opencode/skills/`. Any change there needs `pnpm changeset` or `npm-channel.test.mjs` fails.
- **Version bumps.** Every plugin whose templates change needs its `plugin.json` version bumped; `release-plugins.test.mjs` also requires a `CHANGELOG.md` entry for each shipped version (`node scripts/release-plugins.mjs --write-changelog`).
- **Byte-mirror.** Each surface is byte-identical in 2–3 dist locations. Edit `skills/`, then `bash scripts/sync.sh`; `dist-mirror.test.mjs`, `opencode-dist.test.mjs` and `cursor-dist.test.mjs` fail on drift.
- **Pre-commit stages all of `dist/`.** `git add dist/` is unconditional, so a commit split touching `dist/` needs `--no-verify` after a manual sync.

## Q9 — docket's board must stay a standalone document

**Symptom:** a written board file that is inert without JS or a server.
**Trigger:** converting the board to a shell-plus-hydration model.
**Cause:** `docket browse` writes `renderHtml()`'s output to a file and prints the path; that file is opened later, offline, with no server.
**Mitigation:** yes — D4 keeps server-side rendering precisely to preserve this; the hydration model was rejected for that reason.

## Q10 — The core is dark-first, so the ramp's rows invert silently

**Symptom:** the cream ramp ships on the dark ground.
**Trigger:** writing D7's rows the intuitive way round — light in `:root`.
**Cause:** bare `:root` carries `--background: #111110`; the **base block is the dark palette** and both light blocks are the overrides. Nothing in the suite catches an inversion: `token-core.test.mjs` compares token *name* sets between the two light blocks, and `check-tokens.mjs` is byte-exact against `core.css`. Neither validates a value.
**Mitigation:** no — the only gate is reading which block `--background: #111110` sits in before writing hex.

## Q11 — An inline `background` shorthand erases the stripe with no error

**Symptom:** the striped tier renders identical to the solid one — found in the specimen, where slots 1 and 9 were pixel-identical at 3× zoom while the class was present and the CSS was correct.
**Trigger:** passing the hue as `style="background:#b04d54"` instead of as a custom property.
**Cause:** the `background` shorthand sets `background-image: none` *inline*, which outranks the stylesheet's stripe rule.
**Mitigation:** yes — the hue must arrive as `style="--hue:#b04d54"`. Once composed correctly, the stripe is legible at the real `0.85rem` segment height in both themes, which is what makes the tier viable at all.

## Q12 — `░` reserves the low end of the ink range

**Symptom:** a second-channel texture reads as partially-filled track and corrupts perceived bar length.
**Trigger:** choosing a texture glyph too close to the empty track's ink coverage.
**Cause:** the empty track `░` measures **8.0%** ink in the mono stack at 32px against `█`'s 44.7% — so `▒` (21.4%) and `▚` (22.4%) sit in track territory, while `▓` (35.1%) reads as filled.
**Mitigation:** yes — `▓` is the second channel. Ink coverage also distinguishes a missing glyph from a real one (a private-use tofu box measures 9.0%); width does not, since the fallback font gives every codepoint the same advance.

## Q13 — `data-kit-chrome` is print suppression; `g`+digit walks `[data-kit-section]`

**Symptom:** content silently removed from every printout, or a one-plugin layout change misjudged as an atomic four-surface kit change.
**Trigger:** treating either attribute as navigation machinery.
**Cause:** two attributes that look like navigation and are not. `data-kit-chrome` appears once in `kit:css`, inside `@media print`, beside `.kit-help`, `.kit-helpbtn` and `.kit-theme` — all `display: none !important`; it marks *chrome that must not print*. `g` + digit enumerates `querySelectorAll('[data-kit-section]')` in `kit:js` and indexes into that list; it never reads the section-nav markup.
**Mitigation:** no — read the region before assuming which one you are in.

The distinction decides a PR's blast radius: retiring a surface's nav row is a one-plugin layout change; had the jump walked the nav, the same edit would have had to happen inside `kit:css`/`kit:js`, and D6 step 1 makes a kit change atomic across all four surfaces **plus** an npm changeset (plan-review's template is bundled in `packages/condux-opencode/`).

## Q14 — a bare `1fr` column floors at min-content

**Symptom:** one long unbreakable token (a file path in a table, a package name in `<code>`) widens the column past the viewport and the whole page scrolls horizontally — measured on the handoff rail at 500px: `body.scrollWidth` 553 against a 500px viewport, with the table's own `overflow-x` wrapper working correctly and not at fault.
**Trigger:** a grid column written `grid-template-columns: 1fr` receiving prose or tables.
**Cause:** bare `1fr` resolves to `minmax(auto, 1fr)`, and `auto` as a minimum is *min-content*.
**Mitigation:** yes — write `minmax(0, 1fr)` in every grid column that can receive prose or tables, and give flex/grid children that scroll internally an explicit `min-width: 0`.

## Q15 — capping measure on `<p>` alone misses the worst line

**Symptom:** the longest line in the document survives a "capped" measure — here a **list item** at 90 characters, in *important context*, the one section the template marks MUST READ.
**Trigger:** `p { max-width: 68ch }` read as "prose is capped".
**Cause:** list items are prose too, and `ch` is the width of `0`, which is wider than average prose — `68ch` measured **~74** real characters here.
**Mitigation:** yes — cap `li` too, and exempt `td p, td li` so table cells still use their column.

To verify a real line count, divide an element's rendered height by its computed `line-height` and its text length by the result — `Range.getClientRects()` counts inline fragments, not lines, and will tell you a 9-line paragraph has 38.

## Q16 — a surface's extension tokens need `[data-theme]` blocks, not just a media query

**Discovered:** during D8 verification; closed 2026-08-24

**Symptom:** on a light system, clicking **Dark** flips every core token and leaves the extension tokens cream — on session-handoff the card inverted to `#111110` while its own header stayed `#f0efe3`. The tell is partial: tokens that alias a core token (`--term-bg: var(--background)`) follow the toggle, literal hexes do not.
**Trigger:** the manual theme toggle, on a surface whose extension-token light override is a bare `@media (prefers-color-scheme: light) { :root { … } }`.
**Cause:** each surface defines its own extension tokens outside the `tokens:core` markers (`--secondary`, `--card-hover`, `--gold-10`, and aliases such as `--titlebar`). They are dark-first like the core, so their light values are an override — and all four surfaces wrote that override with **no `[data-theme]` blocks**, so the media query still matches after stamping. Nothing caught it; the toggle is not exercised by any test, and Q10's polarity check covers the *core*.
**Mitigation:** yes — write extension overrides the way `core.css:84-85,130` writes them: the system-light block guarded as `:root:not([data-theme="dark"])`, plus a matching `:root[data-theme="light"]` block defining the same token set. Fixed on session-handoff in D8, session-report in D9 and plan-review in D10; `board-shell` was never affected — it declares no extension tokens outside the kit regions, and the original sweep counted "zero `[data-theme]` blocks" as the signal, which flags a surface with nothing to fix exactly as loudly as a broken one. The assertion now runs over all four surfaces in `tests/surface-theme-pairing.test.mjs`, and treats "declares no extension tokens" as a pass rather than a failure, so that mis-scope cannot recur.

## Q17 — a retired section's target must stay in the DOM, not get deleted

**Symptom:** a silently empty section index and no visible error, found only by breaking the page on purpose and reloading.
**Trigger:** D9 retired the "prompt size distribution" section and the obvious way to retire it — deleting its `<section>` markup outright — turned `$("prompt-histogram").innerHTML = hist...` into a write on `null`.
**Cause:** session-report's render carries no null guards anywhere — `const $ = (id) => document.getElementById(id)`, then every section writes straight into `$("some-id").innerHTML` with nothing checking the return. The one `try/catch` wraps only the `#report-data` `JSON.parse`; everything after is a long run of synchronous IIFEs with no per-section recovery, so the throw kills every render step queued after it — **including the section-nav builder** two IIFEs later.
**Mitigation:** yes — the container stays, just `hidden`:

```html
<div id="prompt-histogram" hidden></div>
```

The fix already had a precedent in the same file: the zero-sessions path hides `.term-body section`, `.strip` and `.rail` rather than removing them, specifically so the calls further down still have somewhere to write zeroes.
**The general shape:** in a render with no defensive checks by convention, retiring a section is a *hide*, not a *delete* — unless every call that targets it is edited in the same change.

## Q18 — a closed `<details>` is invisible to three navigation routes and to print, each a different way

**Symptom:** four independent, silent failures: the nav chip scrolls to a closed 48px bar and shows nothing; a `#sec-...` deep link lands nowhere; kit:js's `g` + digit breaks the same way by a completely separate code path (see Q13); and a printed report silently loses every section that happened to be closed — the browser drops a collapsed `<details>` from the print tree.
**Trigger:** collapsing a section once D9 wrapped every section in `<details class="fold" open>`.
**Cause:** every route assumed sections were always visible, and each is a separate mechanism that fails independently. The deep link needs opening *twice*: a hash already in the URL at load never fires a `hashchange` event, so the load case has to call the same jump function directly.
**Mitigation:** yes — one `reveal()` used by both the chip and the deep-link routes, plus a separate `beforeprint`/`afterprint` pair for print.

```js
const reveal = (node) => {
  if (!node || !node.querySelectorAll) return;
  node.querySelectorAll("details.fold").forEach((d) => (d.open = true));
  for (let n = node; n && n !== document; n = n.parentNode) {
    if (n.classList?.contains("fold")) n.open = true;
  }
};
```

`reveal()` walks **both directions** on purpose: the `<details class="fold">` is a *child* of the `<section>` for a top-level section jump, but a fold can also nest inside another fold — either walk alone silently does nothing for the case it doesn't cover. It's scoped to `details.fold` specifically, because the drill lists lower in each section are `<details>` too — an unscoped reveal expands all hundred prompt rows along with the one section you asked for.

Print gets its own handler, because "open everything" is the print-only answer — a report on screen should stay collapsed where the reader left it:

```js
window.addEventListener("beforeprint", () => {
  wasClosed = [...document.querySelectorAll("details.fold")].filter((d) => !d.open);
  wasClosed.forEach((d) => (d.open = true));
});
window.addEventListener("afterprint", () => {
  wasClosed.forEach((d) => (d.open = false));
  wasClosed = [];
});
```

Print needed one more fix beside the folds: `.strip` is `position: sticky` and `.shell` is a two-column grid, and both survive into `@media print` unless told otherwise — the sticky strip then overlaps the body it indexes. The print block forces `.strip` and `.rail` to `position: static` and `.shell` to `display: block`.

**The general shape:** a fold hides more than paint — every route that can land a user (or a print pass) inside a collapsed region has to open it first, and each route tends to be a separate mechanism that fails independently. Enumerate the routes, don't fix the one you tripped over first.

## Q19 — a sticky offset in CSS is a fallback, not a measurement

**Symptom:** the rail slides under the strip on load.
**Trigger:** relying on `--strip-h`'s CSS fallback of `3.25rem`.
**Cause:** the constant was measured against the strip at its default size and was **9px short** of the real height — and the strip wraps onto a second line at narrow widths, so no single constant is ever right for every viewport.
**Mitigation:** yes — measure instead of asserting:

```js
const sync = () => term.style.setProperty("--strip-h", strip.offsetHeight + "px");
sync();
if (window.ResizeObserver) new ResizeObserver(sync).observe(strip);
```

**The general shape:** a hardcoded CSS value standing in for a runtime measurement is right for exactly the layout it was measured on. If the thing it describes can reflow, the constant is a fallback for before JS runs, not the answer — measure it, and re-measure on whatever event can change it.

## Q20 — the numbering in the UI and the numbering in the payload are two different lists

**Symptom:** the screen reads 1-2-3 top to bottom while the written feedback file lists the same notes in a different order under the same numbers — the reviewer's "note 1" reaches the agent as note 2.
**Trigger:** fixing only the render when D10 numbered each highlight with a CSS counter and repeated the ordinal in the review column's gutter.
**Cause:** three lists disagreed — the counter numbers by **document position**, `annotations` is in **insertion** order, and the submitted payload was a third thing again, the raw array. Found end-to-end against the real server, not in the specimen — the specimen stubs `/api/feedback` and never writes the file.
**Mitigation:** yes — order once, in one place (`threadOrder()`), and use it for **both** the render and the payload (`thread: threadOrder()`).

## Q21 — hiding grid *children* leaves their *tracks* behind

**Discovered:** docket #50 — measured on the shipped surface before any D10 change, so this had been true for as long as the three-column shell existed

**Symptom:** the plan printed in a ~151px column — about a tenth of the page — and only the one screenful scrolled into view printed at all.
**Trigger:** printing plan-review, where the kit's print block hides `.nav` and `.chat` via `[data-kit-chrome] { display: none }`.
**Cause:** hiding the children leaves `.app`'s three column tracks (`248px minmax(0,1fr) 372px`), so `.main` auto-places into the **first** track. Compounding it: `.main` is the scroll container (`overflow-y: auto`), and a scroll container clips printed output to the one screenful scrolled into view.
**Mitigation:** yes — a print block that hides chrome must also collapse the shell that positioned it and unset any overflow that clips:

```css
@media print {
  .app { display: block; }
  .main { overflow: visible; padding: 0; height: auto; }
}
```

Keep the measure cap — prose set to full page width is no more readable on paper than on screen.

## Q22 — an appended overlay does not model source order

**Symptom:** a responsive defect that exists only in the specimen — the three-column grid survived into a 640px viewport with `.main` at 88px and the popover off screen.
**Trigger:** judging responsive behaviour from a specimen built by appending the direction's CSS as a `<style>` block after the whole stylesheet.
**Cause:** an appended unscoped rule outranks even the `max-width` queries it should lose to. Integrated normally, the base rule precedes the media queries and they win, as the file's own convention intends.
**Mitigation:** yes — specimens are fine for judging a look; measure responsive behaviour **after** integration. A specimen's breakpoints are an artifact of how it was built.

## Q23 — the category set is the popover's chips, and "Praise" is not one of them

**Symptom:** the first draft styled `Praise`, which this surface has never offered, and left `Comment` — the most common category — unstyled.
**Trigger:** styling categories from a specimen's seed data.
**Cause:** the categories are exactly `Comment · Issue · Question · Suggestion · Nitpick`, declared as `data-cat` on the popover's chips — plus `Note`, which is what a note carries when no chip was clicked (`openToolbar` clears `pendingCat` on every open, so the markup's initial `active` chip is **not** a default).
**Mitigation:** yes — the seed data in a specimen is not the product's vocabulary; read the chips.

## Q24 — a `display: none` pane does not increment a CSS counter

**Symptom:** in directory mode with notes on two documents, a note at gutter position 3 whose highlight rendered **1** — exactly the divergence the numbering exists to remove, and DIRMODE is the spec-review path `/discovery` uses.
**Trigger:** directory mode, where the two counters count different populations: marks inside a hidden `.docpane` do not increment `hl`, so the in-document ordinals number only the active document (1..m), while every `.msg` row is visible, so the gutter numbered every note across every document (1..n).
**Cause:** `counter-reset: hl` on `.doc` and `counter-reset: note` on `.thread` reset on different ancestors — and visibility is part of a counter's scope.
**Mitigation:** yes — rows from another document are flagged in `paint()` (`data-other-doc`) and take no ordinal, so both sequences run 1..m over the same set. The third numbering agrees by construction: `feedbackMarkdown` groups DIRMODE notes per file and restarts at 1 in each group.

**The general shape:** whenever a counter and a list are reset on different ancestors, check what each one can actually see.

## Q25 — a section rule and a `---` are the same divider twice

**Symptom:** two horizontal rules 66px apart before each task card — measured 9 in one 9-task plan.
**Trigger:** rendering a canonical plan: D10 gives `h2` a `border-top`, and `draft-plan`'s template puts `---` immediately before every task card.
**Cause:** the renderer wraps each block in its own `.blk`, so `hr + h2` matches nothing — the relative selector has to look forward across the wrappers.
**Mitigation:** yes:

```css
.blk:has(> hr):has(+ .blk h2) { display: none; }
```

Suppress the separator, not the section rule: the rule is the typographic spine and applies to every `h2`, while the `---` is redundant only in this pairing.

## Q26 — opt-in behaviour written as a default hides in the hosts that never exercise it

**Discovered:** docket #52; inverted 2026-08-25

**Symptom:** plan-review's theme toggle stretched across ~300px of sidebar with `?` at the far edge.
**Trigger:** hosting `.kit-controls` in block flow — plan-review puts it at the top of `.nav`, which has no `display` override, so the wrapper spans the sidebar and spare width exists.
**Cause:** `kit.css` gave the group `flex: 1 1 auto` as a default. The comment defending it named the two cases it thought it covered, but the rule cannot read its host — it grows whenever `.kit-controls` has spare width. Three of the four surfaces host the group inside a flex row (`header.titlebar`, `.hactions`) where the rule is inert, which is how it hid. The tell that it was a default and not a contract: the only host that genuinely wanted growth was `style-guide.html`, and it asks through **its own** `.themebar` class.
**Mitigation:** yes — `flex: none` in the kit, and the guide opts back in with `.kit-controls > .themebar { flex: 1 1 auto }`.

Two things to keep in mind when touching this pairing:

- **The opt-in needs the `.kit-controls >` prefix.** Bare `.themebar` is (0,1,0) and loses to `.kit-controls > .kit-theme` at (0,2,0). Matching the specificity puts source order in charge, and a surface's own CSS follows the kit region. This is the same trap the guide already records above its `.themebar` rules.
- **Space the wrapper, not the group.** `.kit-controls` centres on the cross axis, and flex centres the *margin box* — so plan-review's `.nav .kit-theme { margin: 0 0 12px }` rode the toggle ~6px above the `?` beside it. The stretch had been masking it. Margins that separate the pairing from what follows belong on `.kit-controls`.
