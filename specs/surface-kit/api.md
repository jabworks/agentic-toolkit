# Contracts

## Region grammar

Each shared region is delimited by a matched comment pair. The body between
them is **replaced without warning** by `--fix`; per-surface tokens and styles
must live outside.

| Region | Start | End | Canonical source |
|---|---|---|---|
| `tokens:core` | `/* tokens:core:start */` | `/* tokens:core:end */` | `scripts/tokens/core.css` |
| `kit:css` | `/* kit:css:start */` | `/* kit:css:end */` | `scripts/tokens/kit.css` |
| `kit:js` | `/* kit:js:start */` | `/* kit:js:end */` | `scripts/tokens/kit.js` |

Rules inherited from the existing implementation, unchanged:

- Comparison is **byte-exact** — no CSS or JS parsing, no property diffing.
  Only possible because the region has exactly one legal form.
- Expected body = newline after the start marker, then the canonical text
  verbatim (which already ends in a newline), leading into the end marker.
- A missing or duplicated marker is **not** mechanically fixable — the checker
  reports it and refuses rather than guessing placement.
- The target list is **literal, never globbed**. A new surface is a deliberate
  edit to `SURFACES`, not something a directory scan discovers. (Inferring
  membership by probing the tree is the failure mode docket #11 is filed
  against.)

## Checker CLI

```
node scripts/check-tokens.mjs             # check every region in every surface
node scripts/check-tokens.mjs --fix       # rewrite non-matching regions
```

Exit non-zero on any mismatch. Gates `sync.sh` both pre- and post-build and the
pre-commit hook, exactly as today. Dependency-free — it must run in a fresh
clone with no `node_modules`.

### Source assertions (read time)

Assertions are **per target kind**, not blanket. Getting this wrong would
re-impose the constraint D4 exists to remove.

| Rejected | Applies to | Why |
|---|---|---|
| `</script`, `</style` | **always** — every region, every target | Terminates the element in any output document. Not docket-specific |
| `` ` ``, `${`, `\` | **only while a target is a `.js`/`.mjs` file** | The template-literal corruption class (quirks Q1) |

After D4 every target is `.html`, so the second row asserts nothing today. It
stays in the checker as a **latch**: it activates automatically if a JS target
is ever added back to `SURFACES`, rather than relying on whoever adds one to
remember why it mattered.

Deliberately **not** a blanket rule: `kit.js` must be free to use regexes and
escape sequences. Banning backslashes outright is the alternative
[decisions.md](decisions.md) rejects — a permanent, surprising constraint on
shared JS, where one forgotten regex years later is the silent corruption D4
designs out.

The existing `readCore()` guard is unconditional today because docket *was* a
JS target; converting it to the latch above is part of step 1.

## Producer contracts — must not break

Verified by inspection; the redesign touches rendering only.

### plan-review

`annotate-server.js` injects **no HTML**. It performs exactly one substitution:

```js
TEMPLATE.replace(/\{\{PLAN_NAME\}\}/g, escapeHtml(path.basename(planFile)))
```

`DIR_MODE` selects which JSON `/api/*` returns; the client builds the sidebar
from it. The template must keep consuming those JSON shapes and must keep the
`{{PLAN_NAME}}` placeholder.

### docket

```js
renderHtml(d, { openId = null, date, live = false }) -> string
```

Signature and return type unchanged by D4. `live: true` appends the SSE client.
`docket browse` writes the returned string to `--out` or tmpdir, so the output
must remain a **complete standalone document** — server-side rendered, not a
shell awaiting client hydration.

### session-report

`analyze-claude.mjs` and `analyze-codex.mjs` emit **zero DOM identifiers** —
no class names, ids, or selectors (verified: 0 matches for
`class=`/`id=`/`querySelector`/`getElementById`). They write JSON into the data
island; the template owns 100% of rendering. The redesign is therefore
template-only for this surface.

### session-handoff

Filled by the agent following `SKILL.md`. Structural changes to the template
must be mirrored in those fill instructions, or the skill will describe a
document that no longer exists.

## `board-shell.html` placeholders (new, D4)

| Placeholder | Filled with |
|---|---|
| `{{CSS}}` | the board's own stylesheet |
| `{{KIT_CSS}}` | shared `kit:css` region |
| `{{KIT_JS}}` | shared `kit:js` region |
| `{{STATS}}` | rendered stat strip |
| `{{SECTIONS}}` | rendered open sections |
| `{{ARCHIVE}}` | rendered archive block, or empty |

Substitution is **single-pass with a replacer function**, so substituted
content is never re-scanned for further placeholders — see [quirks.md](quirks.md).
