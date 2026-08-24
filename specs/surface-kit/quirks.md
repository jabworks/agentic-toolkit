# Quirks

## Q1 — A template literal silently eats backslashes *(the reason for D4)*

Carrying JS source inside a JS template literal corrupts it without any error:

```js
const carried = `if (/\s/.test(x)) { y = "a\nb"; }`;
// emitted: if (/s/.test(x)) { y = "a
// b"; }
```

`/\s/` — match whitespace — becomes `/s/`, which matches the letter "s". No
throw, no warning, and wrong in **one surface only**. The `\n` case at least
fails loudly (a real newline inside a string literal is a syntax error); the
regex case ships.

`readCore()` already guards `` ` `` and `${` for exactly this reason. It does
**not** guard backslash, and CSS never needed it to — CSS barely uses
backslashes, while JS uses them in every regex and escape sequence.

D4 removes the hazard by making every target `.html`. The source assertion is
still added, because `core.css` could one day carry `content: "\2014"` and a
future surface could reintroduce a JS target.

## Q2 — Placeholder substitution must be single-pass

`board-shell.html` fills `{{SECTIONS}}` with rendered docket content, which is
derived from user-authored `DOCKET.md` text. A naive chained `.replace()` per
placeholder re-scans already-substituted output, so an item literally titled
`{{ARCHIVE}}` would be substituted a second time.

Substitute once, with a replacer function over a single alternation:

```js
shell.replace(/\{\{(CSS|KIT_CSS|KIT_JS|STATS|SECTIONS|ARCHIVE)\}\}/g,
              (_, key) => values[key]);
```

The replacer's return value is never re-scanned, so the hazard cannot occur.

## Q3 — `</script` terminates the element regardless of language

Any `kit:js` content containing the literal `</script` closes the `<script>`
element in the output document. This is **not** docket-specific — it applies to
all four surfaces, unlike Q1. Asserted at the source rather than escaped.

## Q4 — `--muted` means opposite things in the two historical vocabularies

Recorded 2026-08-12 (D4 of that design) and still live for anyone editing
docket's own styles: docket's legacy `--muted: #6a6f76` was a muted
*foreground* used as `color:`; the core's `--muted: #222221` is a *surface*,
with `--muted-foreground` for text. A mechanical rename inverts the role
silently.

## Q5 — Elevation and categorical colour are the theme-variant new groups

Type, space, radius and motion go in the bare `:root` block only. Shadows must
be redefined in every theme block — a shadow tuned for `#111110` reads as dirt
on `#f6f5ef`. Getting this wrong produces the classic artifact bug: a value
whose only definition sits behind a media query, absent in the un-stamped
state. `--cat-*` (D7) joined elevation here on 2026-08-21: its two rows differ
per theme, so it is restated in every theme block for the same reason.

`token-core.test.mjs:61` is what enforces this — a token name that does not
match `THEME_INVARIANT` is *required* to have a light override.

## Q6 — Three theme states, not two

`prefers-color-scheme` alone is insufficient once `[data-theme]` exists. The
core must define, in this order:

1. bare `:root` — dark (this toolkit is dark-first)
2. `@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { … } }`
   — OS light, unless explicitly stamped dark
3. `:root[data-theme="light"] { … }` — explicit light beats a dark OS

The light block therefore appears **twice**. That duplication is acceptable
precisely because `core.css` is the single source and the checker propagates
it; hand-maintaining it in four files would not be.

## Q7 — `px` → `rem` is a behaviour change, not a restyle

session-report's 1516 lines are tuned at `px`. On `rem`, rendered size follows
the reader's browser font-size setting — correct for accessibility, but dense
tables can overflow at non-default sizes. Deferred to that surface's own
step-2 PR (D5) rather than riding along with the kit.

## Q8 — Release traps

- **npm channel.** plan-review's template lives in
  `packages/condux-opencode/skills/`. Any change there needs `pnpm changeset`
  or `npm-channel.test.mjs` fails. condux 2.12.0, 2.13.0 and 2.14.0 each
  shipped without one, and npm served 0.7.0 while the marketplace moved on.
- **Version bumps.** Every plugin whose templates change needs its
  `plugin.json` version bumped; `release-plugins.test.mjs` also requires a
  `CHANGELOG.md` entry for each shipped version
  (`node scripts/release-plugins.mjs --write-changelog`).
- **Byte-mirror.** Each surface is byte-identical in 2–3 dist locations. Edit
  `skills/`, then `bash scripts/sync.sh`; `dist-mirror.test.mjs`,
  `opencode-dist.test.mjs` and `cursor-dist.test.mjs` fail on drift.
- **Pre-commit stages all of `dist/`.** `git add dist/` is unconditional, so a
  commit split touching `dist/` needs `--no-verify` after a manual sync.

## Q9 — docket's board must stay a standalone document

`docket browse` writes `renderHtml()`'s output to a file and prints the path.
That file is opened later, offline, with no server. D4 keeps server-side
rendering precisely to preserve this; converting the board to a
shell-plus-hydration model would make the written file inert without JS and was
rejected for that reason.

## Q10 — The core is dark-first, so the ramp's rows invert silently

Bare `:root` carries `--background: #111110`. The **base block is the dark
palette**; both light blocks are the overrides. Writing D7's rows the intuitive
way round — light in `:root` — ships the cream ramp on the dark ground, and
**nothing in the suite catches it**: `token-core.test.mjs` compares token *name*
sets between the two light blocks, and `check-tokens.mjs` is byte-exact against
`core.css`. Neither validates a value. The only gate is reading which block
`--background: #111110` sits in before writing hex.

## Q11 — An inline `background` shorthand erases the stripe with no error

D7's gantt tier composes a hue with a `background-image` stripe. The hue must
arrive as a custom property (`style="--hue:#b04d54"`), never as
`style="background:#b04d54"`: the shorthand sets `background-image: none`
*inline*, which outranks the stylesheet rule, so the striped tier renders
identical to the solid one. Found in the specimen — slots 1 and 9 were
pixel-identical at 3× zoom while the class was present and the CSS was correct.

Once composed correctly, the stripe is legible at the real `0.85rem` segment
height in both themes, which is what makes the tier viable at all.

## Q12 — `░` reserves the low end of the ink range

The empty track in a glyph bar is `░`, measured at **8.0%** ink in the mono
stack at 32px against `█`'s 44.7%. A texture chosen for the second channel must
sit near the *full* end or it reads as partially-filled track and corrupts
perceived bar length: `▓` is 35.1% and works; `▒` (21.4%) and `▚` (22.4%) do
not. A private-use tofu box measures 9.0%, so ink coverage also distinguishes a
missing glyph from a real one — width does not, since the fallback font gives
every codepoint the same advance.

## Q13 — `data-kit-chrome` is print suppression; `g`+digit walks `[data-kit-section]`

Two kit attributes that look like navigation machinery and are not:

- **`data-kit-chrome`** appears once in `kit:css`, inside `@media print`, beside
  `.kit-help`, `.kit-helpbtn` and `.kit-theme` — all `display: none !important`.
  It marks *chrome that must not print*. Putting it on a nav is correct; putting
  it on a container that also holds content silently removes that content from
  every printout.
- **`g` + digit** enumerates `querySelectorAll('[data-kit-section]')` in `kit:js`
  and indexes into that list. It never reads the section-nav markup.

The distinction decides a PR's blast radius. Retiring a surface's nav row is a
one-plugin layout change; had the jump walked the nav, the same edit would have
had to happen inside `kit:css`/`kit:js`, and D6 step 1 makes a kit change atomic
across all four surfaces **plus** an npm changeset (plan-review's template is
bundled in `packages/condux-opencode/`). Read the region before assuming which
one you are in.

## Q14 — a bare `1fr` column floors at min-content

A stacked single-column grid written `grid-template-columns: 1fr` resolves to
`minmax(auto, 1fr)`, and `auto` as a minimum is *min-content* — so one long
unbreakable token (a file path in a table, a package name in `<code>`) widens the
column past the viewport and the whole page scrolls horizontally. Measured on the
handoff rail at 500px: `body.scrollWidth` 553 against a 500px viewport, with the
table's own `overflow-x` wrapper working correctly and not at fault.

Write `minmax(0, 1fr)` in every grid column that can receive prose or tables, and
give flex/grid children that scroll internally an explicit `min-width: 0`.

## Q15 — capping measure on `<p>` alone misses the worst line

`p { max-width: 68ch }` reads as "prose is capped" and is not. The longest line in
the session-handoff document was a **list item** at 90 characters — in *important
context*, the one section the template marks MUST READ. Cap `li` too, and exempt
`td p, td li` so table cells still use their column.

Note the unit: `ch` is the width of `0`, which is wider than average prose, so
`68ch` measured **~74** real characters here. Verify by dividing an element's
rendered height by its computed `line-height` and its text length by the result —
`Range.getClientRects()` counts inline fragments, not lines, and will tell you a
9-line paragraph has 38.

## Q16 — a surface's extension tokens need `[data-theme]` blocks, not just a media query

Each surface defines its own extension tokens outside the `tokens:core` markers
(`--secondary`, `--card-hover`, `--gold-10`, and the aliases built on them such as
`--titlebar`). They are dark-first like the core, so their light values are an
override — and all four surfaces wrote that override as a bare
`@media (prefers-color-scheme: light) { :root { … } }` with **no `[data-theme]`
blocks**.

On a light system, clicking **Dark** then flips every core token and leaves the
extension tokens cream, because the media query still matches. The tell is
partial: tokens that alias a core token (`--term-bg: var(--background)`) follow
the toggle, literal hexes do not — so on session-handoff the card inverted to
`#111110` while its own header stayed `#f0efe3`. Nothing caught it; the toggle is
not exercised by any test, and Q10's polarity test checks the *core*.

Write extension overrides the way `core.css:84-85,130` writes them — the
system-light block guarded as `:root:not([data-theme="dark"])`, plus a matching
`:root[data-theme="light"]` block defining the same token set.

**Closed 2026-08-24.** Fixed on session-handoff in D8, session-report in D9 and
plan-review in D10. `board-shell` was never affected — it declares no extension
tokens outside the kit regions, and the original sweep counted "zero
`[data-theme]` blocks" as the signal, which flags a surface with nothing to fix
exactly as loudly as a broken one. The assertion now runs over all four surfaces
in `tests/surface-theme-pairing.test.mjs`, and treats "declares no extension
tokens" as a pass rather than a failure, so that mis-scope cannot recur.

## Q17 — a retired section's target must stay in the DOM, not get deleted

`session-report`'s render (`skills/session-report/template.html`) carries no
null guards anywhere — `const $ = (id) => document.getElementById(id)`, then
every section writes straight into `$("some-id").innerHTML` with nothing
checking the return. The one `try/catch` in the file wraps only the
`#report-data` `JSON.parse` at the top; everything after it is a long run of
synchronous IIFEs with no per-section recovery.

D9 retired the "prompt size distribution" section (three of its eight buckets
are empty on a real 30-day report and the shape is bimodal). Deleting its
`<section>` markup outright — the obvious way to retire something — turns
`$("prompt-histogram").innerHTML = hist...` into a write on `null`, which
throws. Because nothing downstream is guarded, that throw kills every render
step queued after it in the same script, **including the section-nav
builder** two IIFEs later. The result isn't "one section missing" — it's a
silently empty section index and no visible error, found only by breaking the
page on purpose and reloading.

The fix already had a precedent in the same file: the zero-sessions path
hides `.term-body section`, `.strip` and `.rail` rather than removing them,
specifically so the calls further down still have somewhere to write zeroes.
`prompt-histogram` took the same shape — the container stays, just `hidden`:

```html
<div id="prompt-histogram" hidden></div>
```

**The general shape:** in a render with no defensive checks by convention,
retiring a section is a *hide*, not a *delete* — unless every call that
targets it is edited in the same change.

## Q18 — a closed `<details>` is invisible to three navigation routes and to print, each a different way

D9 wraps every section in `<details class="fold" open>`. Collapsing that
`<details>` breaks four things that all assumed sections were always visible,
each independently and each silently (nothing throws):

- **The nav chip.** Built from the DOM (one chip per `h2`, so a renamed
  section can't drift the nav) and wired to `sec.scrollIntoView(...)` — which
  scrolls to a closed 48px bar and shows nothing.
- **A `#sec-...` deep link.** Needs its own open-before-scroll, and needs it
  twice: once for a hash already in the URL at load, and once for
  `hashchange`. A hash present at load never fires a `hashchange` event, so
  the load case has to call the same jump function directly — `jump()` runs
  once on its own right after the listener is registered.
- **kit:js's `g` + digit.** Indexes `[data-kit-section]` directly and never
  touches the section-nav markup at all, so it broke exactly the same way as
  the chips, by a completely separate code path (see Q13 on why `g`+digit and
  the nav are not the same mechanism).
- **Printing.** A collapsed `<details>` prints nothing — the browser drops
  its content from the print tree — so a printed report would silently lose
  every section that happened to be closed.

The fix is one `reveal()` used by both the chip and the deep-link routes,
plus a separate `beforeprint`/`afterprint` pair for print:

```js
const reveal = (node) => {
  if (!node || !node.querySelectorAll) return;
  node.querySelectorAll("details.fold").forEach((d) => (d.open = true));
  for (let n = node; n && n !== document; n = n.parentNode) {
    if (n.classList?.contains("fold")) n.open = true;
  }
};
```

`reveal()` walks **both directions** on purpose: the `<details class="fold">`
is a *child* of the `<section>` for a top-level section jump, but a fold can
also nest inside another fold, so the parent-walk half matters too — either
walk alone silently does nothing for the case it doesn't cover. It's scoped
to `details.fold` specifically, not every `<details>`, because the drill
lists lower in each section are `<details>` too — an unscoped reveal expands
all hundred prompt rows along with the one section you asked for.

Print gets its own handler, because "open everything" is the print-only
answer — a report on screen should stay collapsed where the reader left it:

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

Print needed one more fix beside the folds: `.strip` is `position: sticky`
and `.shell` is a two-column grid, and both survive into `@media print`
unless told otherwise — the sticky strip then overlaps the body it indexes.
The print block forces `.strip` and `.rail` to `position: static` and
`.shell` to `display: block`.

**The general shape:** a fold hides more than paint — every route that can
land a user (or a print pass) inside a collapsed region has to open it first,
and each route tends to be a separate mechanism that fails independently.
Enumerate the routes, don't fix the one you tripped over first.

## Q19 — a sticky offset in CSS is a fallback, not a measurement

The rail's sticky `top` and every section's `scroll-margin-top` key off
`--strip-h`, a custom property with a CSS fallback of `3.25rem`. That constant
was measured against the strip at its default size and was **9px short** of
the real height, which slid the rail under the strip on load — and the strip
itself wraps onto a second line at narrow widths, so no single constant is
ever right for every viewport.

Fixed by measuring instead of asserting:

```js
const sync = () => term.style.setProperty("--strip-h", strip.offsetHeight + "px");
sync();
if (window.ResizeObserver) new ResizeObserver(sync).observe(strip);
```

`sync()` runs once on load and again on every resize the `ResizeObserver`
reports, so a wrap at a narrow viewport re-measures instead of leaving the
stale constant in place.

**The general shape:** a hardcoded CSS value standing in for a runtime
measurement is right for exactly the layout it was measured on. If the thing
it describes can reflow (wrap, resize, gain content), the constant is a
fallback for before JS runs, not the answer — measure it, and re-measure on
whatever event can change it.

## Q20 — the numbering in the UI and the numbering in the payload are two different lists

D10 numbers each highlight with a CSS counter and repeats the ordinal in the
review column's gutter, so a reviewer can say "note 3" and mean something. The
counter numbers by **document position**; `annotations` is in **insertion**
order; and the submitted payload was a third thing again — the raw array.

Fixing only the render leaves the defect half-closed and invisible: the screen
reads 1-2-3 top to bottom while the written feedback file lists the same notes
in a different order under the same numbers, so the reviewer's "note 1" reaches
the agent as note 2. Found end-to-end against the real server, not in the
specimen — the specimen stubs `/api/feedback` and never writes the file.

Order once, in one place (`threadOrder()`), and use it for **both** the render
and the payload (`thread: threadOrder()`).

## Q21 — hiding grid *children* leaves their *tracks* behind

`[data-kit-chrome] { display: none }` in the kit's print block hides
plan-review's `.nav` and `.chat`, but `.app`'s three column tracks
(`248px minmax(0,1fr) 372px`) survive. `.main` then auto-places into the
**first** track and the plan printed in a ~151px column — about a tenth of the
page. Measured on the shipped surface before any D10 change, so this had been
true for as long as the three-column shell existed.

Compounding it: `.main` is the scroll container (`overflow-y: auto`), and a
scroll container clips printed output to the one screenful scrolled into view.
The rest of the plan did not print at all.

A print block that hides chrome must also **collapse the shell that positioned
it** and unset any overflow that clips:

```css
@media print {
  .app { display: block; }
  .main { overflow: visible; padding: 0; height: auto; }
}
```

Docket #50. Keep the measure cap — prose set to full page width is no more
readable on paper than on screen.

## Q22 — an appended overlay does not model source order

The D10 directions were compared as specimens built by appending the direction's
CSS as a `<style>` block after the whole stylesheet. That is fine for judging a
look and **wrong for judging responsive behaviour**: an appended unscoped rule
outranks even the `max-width` queries it should lose to, so the three-column
grid survived into a 640px viewport with `.main` at 88px and the popover off
screen — a defect that exists only in the specimen.

Integrated normally, the base rule precedes the media queries and they win, as
the file's own convention intends. Measure responsive behaviour **after**
integration; a specimen's breakpoints are an artifact of how it was built.

## Q23 — the category set is the popover's chips, and "Praise" is not one of them

D10 colours notes by category. The categories are exactly
`Comment · Issue · Question · Suggestion · Nitpick`, declared as `data-cat` on
the popover's chips — plus `Note`, which is what a note carries when no chip was
clicked (`openToolbar` clears `pendingCat` on every open, so the markup's
initial `active` chip is **not** a default).

The first draft styled `Praise`, which this surface has never offered, and left
`Comment` — the most common category — unstyled. The seed data in a specimen is
not the product's vocabulary; read the chips.

## Q24 — a `display: none` pane does not increment a CSS counter

D10 numbers highlights with `counter-reset: hl` on `.doc` and numbers the review
column with `counter-reset: note` on `.thread`. In **directory mode** those two
count different populations:

- marks inside a hidden `.docpane` do not increment `hl`, so the in-document
  ordinals number **only the active document**, 1..m
- every `.msg` row is visible, so the gutter numbered **every note across every
  document**, 1..n

Measured in DIRMODE with notes on two documents: a note at gutter position 3
whose highlight rendered **1**. That is exactly the divergence the numbering
exists to remove, surviving in the case the single-document specimen cannot
show — and DIRMODE is the spec-review path `/discovery` uses.

Rows from another document are flagged in `paint()` (`data-other-doc`) and take
no ordinal, so both sequences run 1..m over the same set. The third numbering
agrees by construction: `feedbackMarkdown` groups DIRMODE notes per file and
restarts at 1 in each group.

**The general shape:** whenever a counter and a list are reset on different
ancestors, check what each one can actually see. Visibility is part of a
counter's scope.

## Q25 — a section rule and a `---` are the same divider twice

D10 gives `h2` a `border-top`, and `draft-plan`'s canonical plan template puts
`---` immediately before every task card. Nearly every plan this surface renders
therefore drew two horizontal rules 66px apart before each card — measured 9 in
one 9-task plan.

The renderer wraps each block in its own `.blk`, so `hr + h2` matches nothing.
The relative selector has to look forward across the wrappers:

```css
.blk:has(> hr):has(+ .blk h2) { display: none; }
```

Suppress the separator, not the section rule: the rule is the typographic spine
and applies to every `h2`, while the `---` is redundant only in this pairing.
