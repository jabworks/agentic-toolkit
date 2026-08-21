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

## Q5 — Elevation is the only theme-variant new token group

Type, space, radius and motion go in the bare `:root` block only. Shadows must
be redefined in every theme block — a shadow tuned for `#111110` reads as dirt
on `#f6f5ef`. Getting this wrong produces the classic artifact bug: a value
whose only definition sits behind a media query, absent in the un-stamped
state.

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
