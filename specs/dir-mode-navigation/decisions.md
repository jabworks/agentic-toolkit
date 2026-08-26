# Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Doc-site split: folder tree + filter + breadcrumb + prev/next | the bar is "reads like a real doc site" at 50+ docs — a quieter flat list still scrolls forever | accepted |
| 2 | Filter matches docs AND headings | one box that finds only doc names is half a search | accepted |
| 3 | Collapse default: fold all except the active doc's ancestors | the sidebar fits a screenful and orientation survives at the 50+ scale | accepted |
| 4 | Badge counts roll up to collapsed folder rows | pending feedback must never be invisible; a tree fighting the user's fold state is worse than a count | accepted |
| 5 | Prev/next reuses the existing `docs[]` order | the order `listDocs()` already emits; no new ordering scheme, no frontmatter weights | accepted |
| 6 | Single-file plan mode untouched — every addition `DIRMODE`-gated | plan review's core surface must render byte-for-byte as before | accepted |

## Architecture: doc-site split (2026-08-13)

Chosen over a minimal retrofit of the flat list and over a Ctrl-K
palette-first design. Rationale: the target scale is 50+ nested docs and the
signed-off bar is "reads like a real doc site" — a quieter flat list still
scrolls forever, and a palette is invisible to first-time users.

Components: collapsible folder tree sidebar + filter box, active-doc-only
headings, breadcrumb over the content pane, prev/next footer.

## Filter matches docs AND headings (2026-08-13)

One box finds both "the quirks file" and "the Error shapes section" —
matched headings render under each hit doc. Alternative (doc names only)
rejected as half a search.

## Collapse default: everything folded except the active doc's ancestors (2026-08-13)

The sidebar always fits roughly a screenful and orientation is preserved.
Alternatives (all expanded / first level open) rejected at the 50+ scale.

## Badge counts roll up to collapsed folder rows (2026-08-13)

A collapsed folder shows the summed annotation count of its contents —
pending feedback is never invisible. Alternative (auto-expanding annotated
folders) rejected: the tree fighting the user's fold state is worse than a
count.

## Prev/next reuses the existing docs[] order (2026-08-13)

Folder-grouped, `index.md` first per folder, alphabetical otherwise — the
order `listDocs()` already emits. No new ordering scheme, no frontmatter
weights.

## Single-file plan mode is untouched (2026-08-13)

Every piece of new chrome is `DIRMODE`-gated. Plan review's core surface
(one file, TOC of its headings, annotation flow) must render byte-for-byte
as before.
