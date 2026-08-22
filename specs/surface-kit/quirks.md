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
`:root[data-theme="light"]` block defining the same token set. Fixed for
session-handoff in D8 and pinned by `tests/session-handoff-surface.test.mjs`;
open for the other three surfaces (docket #48), each in its own step-2 PR.
