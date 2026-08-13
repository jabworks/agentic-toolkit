# Quirks & edge cases

- **Filter-hidden annotated docs.** The filter is a transient view — it never
  affects what gets submitted. An annotated doc hidden by the filter still
  appears in badge rollups and in the verdict strip's grouped feedback.
- **Clearing the filter restores prior collapse state**, not "all collapsed" —
  the user's fold work survives a search.
- **Deep nesting clamps indentation.** Sidebar indent stops growing past ~3
  levels (matches today's `lvl` clamp) so deep trees stay readable.
- **Docs with no headings** get a doc row and nothing else — no empty TOC
  stub under the active doc.
- **Root-level docs** (no folder) sit above the first folder group, as the
  current flat list already orders them.
- **`review.feedback.md` and dotfiles** never appear — `listDocs()` already
  excludes them; the tree renders exactly its output.
- **Switching docs via prev/next or breadcrumb** goes through `switchDoc()` —
  scroll positions per doc keep working, hidden panes stay in the DOM so
  highlights survive.
- **Badge rollup double-count guard.** A folder row's count sums doc-level
  counts only (each annotation counted once), not doc + heading badges.
