# Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Doc-site split: folder tree + filter + breadcrumb + prev/next | the bar is "reads like a real doc site" at 50+ docs — a quieter flat list still scrolls forever | accepted |
| 2 | Filter matches docs AND headings | one box that finds only doc names is half a search | accepted |
| 3 | Collapse default: fold all except the active doc's ancestors | the sidebar fits a screenful and orientation survives at the 50+ scale | accepted |
| 4 | Badge counts roll up to collapsed folder rows | pending feedback must never be invisible; a tree fighting the user's fold state is worse than a count | accepted |
| 5 | Prev/next reuses the existing `docs[]` order | the order `listDocs()` already emits; no new ordering scheme, no frontmatter weights | accepted |
| 6 | Single-file plan mode untouched — every addition `DIRMODE`-gated | plan review's core surface must render byte-for-byte as before | accepted |

## 1. Architecture: doc-site split — 2026-08-13

**Decided:** collapsible folder tree sidebar + filter box, active-doc-only headings, breadcrumb over the content pane, prev/next footer.
**Because:** the target scale is 50+ nested docs and the signed-off bar is "reads like a real doc site".

| Alternative | Why not |
|---|---|
| Minimal retrofit of the flat list | A quieter flat list still scrolls forever |
| Ctrl-K palette-first design | A palette is invisible to first-time users |

## 2. Filter matches docs AND headings — 2026-08-13

**Decided:** one box finds both "the quirks file" and "the Error shapes section" — matched headings render under each hit doc.
**Because:** a box that finds only doc names is half a search.

| Alternative | Why not |
|---|---|
| Match doc names only | Half a search |

## 3. Collapse default: everything folded except the active doc's ancestors — 2026-08-13

**Decided:** the default fold state keeps only the active doc's ancestor chain open.
**Because:** the sidebar always fits roughly a screenful and orientation is preserved.

| Alternative | Why not |
|---|---|
| All expanded / first level open | Both fail at the 50+ scale |

## 4. Badge counts roll up to collapsed folder rows — 2026-08-13

**Decided:** a collapsed folder shows the summed annotation count of its contents.
**Because:** pending feedback is never invisible.

| Alternative | Why not |
|---|---|
| Auto-expand annotated folders | The tree fighting the user's fold state is worse than a count |

## 5. Prev/next reuses the existing docs[] order — 2026-08-13

**Decided:** folder-grouped, `index.md` first per folder, alphabetical otherwise — the order `listDocs()` already emits.
**Because:** no new ordering scheme, no frontmatter weights.

## 6. Single-file plan mode is untouched — 2026-08-13

**Decided:** every piece of new chrome is `DIRMODE`-gated.
**Because:** plan review's core surface (one file, TOC of its headings, annotation flow) must render byte-for-byte as before.
