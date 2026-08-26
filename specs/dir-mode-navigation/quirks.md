# Quirks & edge cases

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Filter could hide annotated docs from the submit view | filtering while annotations exist | medium | yes — the filter is a transient view; rollups and the verdict strip still show them |
| Q2 | Clearing the filter could lose the user's fold work | searching, then clearing | low | yes — prior collapse state restored, not "all collapsed" |
| Q3 | Deep trees become unreadable | nesting past ~3 levels | low | yes — indent clamps at the existing `lvl` clamp |
| Q4 | Empty TOC stubs under heading-less docs | a doc with no headings | low | yes — doc row only, no stub |
| Q5 | Root-level docs need a home | docs with no folder | low | yes — above the first folder group, as the flat list ordered them |
| Q6 | Internal files could leak into the tree | `review.feedback.md`, dotfiles | low | yes — `listDocs()` already excludes them; the tree renders exactly its output |
| Q7 | Doc switches could drop scroll state or highlights | prev/next or breadcrumb navigation | medium | yes — all routes go through `switchDoc()`; hidden panes stay in the DOM |
| Q8 | Badge rollups could double-count | folder rows summing doc + heading badges | low | yes — doc-level counts only |

## Q1 — Filter-hidden annotated docs

**Symptom:** an annotated doc hidden by the filter looks dropped from the
review.
**Trigger:** filtering while annotations exist.
**Cause:** the filter is a view over the tree, and annotations live per doc.
**Mitigation:** yes — the filter is a transient view and never affects what
gets submitted; a hidden annotated doc still appears in badge rollups and in
the verdict strip's grouped feedback.

## Q2 — Clearing the filter restores prior collapse state

**Symptom:** a search that costs the user their fold work.
**Trigger:** filtering, then clearing the filter.
**Cause:** filtering necessarily expands matching branches.
**Mitigation:** yes — clearing restores the prior collapse state, not "all
collapsed"; the user's fold work survives a search.

## Q3 — Deep nesting clamps indentation

**Symptom:** sidebar rows squeezed unreadable by deep trees.
**Trigger:** nesting past ~3 levels.
**Cause:** unbounded indent in a fixed-width sidebar.
**Mitigation:** yes — indentation stops growing past ~3 levels (matches
today's `lvl` clamp).

## Q4 — Docs with no headings

**Symptom:** an empty TOC stub under the active doc.
**Trigger:** a doc with no headings.
**Cause:** the heading list renders under the active doc's row.
**Mitigation:** yes — such docs get a doc row and nothing else.

## Q5 — Root-level docs

**Symptom:** docs with no folder needing a place in a folder tree.
**Trigger:** root-level files in the reviewed directory.
**Cause:** the tree is folder-grouped.
**Mitigation:** yes — they sit above the first folder group, as the current
flat list already orders them.

## Q6 — `review.feedback.md` and dotfiles never appear

**Symptom:** the review's own working files showing up as reviewable docs.
**Trigger:** rendering the tree from the directory contents.
**Cause:** the directory holds more than the reviewable docs.
**Mitigation:** yes — `listDocs()` already excludes them; the tree renders
exactly its output.

## Q7 — Switching docs via prev/next or breadcrumb

**Symptom:** lost scroll positions or highlights on navigation.
**Trigger:** switching docs by any route other than the sidebar.
**Cause:** per-doc state lives in the panes.
**Mitigation:** yes — every route goes through `switchDoc()`: scroll
positions per doc keep working, and hidden panes stay in the DOM so
highlights survive.

## Q8 — Badge rollup double-count guard

**Symptom:** a folder badge larger than the annotations it contains.
**Trigger:** summing doc badges and heading badges together.
**Cause:** heading badges subdivide the same annotations the doc badge counts.
**Mitigation:** yes — a folder row's count sums doc-level counts only, so
each annotation is counted once.
