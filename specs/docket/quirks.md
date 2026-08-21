# Docket — Quirks & Edge Cases

## The ghost-work lesson (why close is strict)

In terminus, #27 and #29 sat "open" after shipping and each burned a
session's scoping on ghost work. Hence the contract: shipping an item means
stamp ✅ + date + verification *and move it* in the same action. `close` does
both atomically; skills must never stamp without moving. `docket:groom`'s
stale sweep exists to catch the ones that slip anyway.

## Legacy layout detection

- Detection order: `<git-root>/docket/` wins; else root `BACKLOG.md` (+
  optional `BACKLOG_ARCHIVE.md`) is recognized as the legacy terminus
  layout.
- In legacy mode every op works in place (add/close/check target the root
  files; close appends to `BACKLOG_ARCHIVE.md`, no yearly rotation).
- `migrate` is offered once per session when legacy is detected — never
  forced, never auto-run. Terminus itself keeps working untouched.
- Both layouts present → docket/ wins, warn about the orphaned root files.

## Id-space hazards

- `next_id` drift (hand-edits bypassing the CLI): `check` cross-verifies
  against the observed max and reports it; repair is a manual `docket.json`
  edit — groom guides it, the user consents, and there is deliberately no
  automated repair flag (updated 2026-08-05 at preflight: state rewrites
  stay human-approved). `add` refuses on detected drift rather than
  allocating a dupe.
- Ids referenced by commit history must survive migration byte-identically
  in headings.
- Archives from absorbed files (terminus absorbed RANDOM_IDEAS.md) mean the
  archive can contain ids with gaps or interleaved order — `check` treats
  gaps as normal, only dupes/reuse as findings.

## Qualified ids: reference, not allocation (2026-08-06)

A bare `### 47.` allocates id 47. A qualified `### 47 (remainder).` only
references it — the partial-ship convention, where a slice and its parent
deliberately share a number so commit subjects citing #47 keep pointing at
one thing.

The parser had tolerated the shape since the beginning (`ITEM_RE`,
`ARCHIVE_ENTRY_RE`) and `migrate` was tested to preserve it, but `collectIds`
discarded the qualifier, so `check` saw a bare `47` twice and called it
corruption. On terminus — the reference consumer, and the layout this tool
was generalized from — that made `check` permanently red on three items the
day it adopted docket. A check that is always red is a check nobody wires
into CI and nobody reads.

Rules now:

- Duplicate detection runs over **allocations only**. Two bare `### 2.`
  headings are still a finding, unchanged.
- A reference whose parent id is not allocated anywhere is an
  `orphan-reference` finding — a dangling pointer, worth reporting.
- Two identical references (`## 26 (shipped slice).` twice) are legal: a
  parent can ship in any number of slices.
- `next_id` is unaffected. It uses the numeric value, so a qualified
  `74 (remainder)` still blocks reallocating 74.
- `close` resolves a number against open items and **errors on ambiguity**
  rather than taking the first match; the exact slot (`close "47 (remainder)"`)
  is the disambiguator. Before this, terminus's `docket close 1` reached the
  right item only because its open ids happened to be unique.

Verified against the real terminus docket (2026-08-06, with permission —
`docket/` only): 78 entries, 74 allocations, 4 references
(`1 (remainder)`, `24 (follow-ups)`, `26 (shipped slice)` ×2), `next_id` 75
against a max id of 74. The pre-fix code reported 4 `duplicate-id` findings
there; the fixed code reports none and `docket check` exits 0, which is what
lets it be wired into a preflight or CI step at all.

## Routing collision surface (intra-bundle)

`record` vs `groom` phrasing must stay disjoint: item-level verbs ("add",
"close #N", "note on #N", "later/someday" capture) → record; whole-backlog
verbs ("groom", "what's next", "anything stale", "check the ids") → groom.
Eval cases must include near-miss prompts on both sides — shipped 2026-08-05
in 0.1.1 (`skills/{record,groom}/evals/trigger_eval.json`, auto-discovered by
`scripts/eval-triggers.mjs`), closing the drift accepted at preflight
2026-08-05. Neither skill may
trigger on generic "backlog" alone in repos with no docket and no legacy
files — offer scaffold only on explicit intent.

## Proactive capture guardrails

Capture fires on deferral phrases mid-conversation ("later", "someday",
"we should eventually") but must *offer*, never silently write; one offer
per idea; declining is remembered for the session. No capture in repos
without a docket (offer scaffold instead, at most once).

## Browser edge cases

- Empty docket (fresh scaffold) renders a usable empty state, not a blank page.
- `--serve` binds localhost only; port conflict → next free port, print it.
- The archive is one closed drawer under the board (2026-08-21; it used to
  be per-year blocks): every row is rendered, bodies open on demand, so the
  open board never waits on archive size and a filter can reach into it.
- Light theme is checked first, then dark (toolkit lesson, 3d3a0d9).

## Frontmatter / repo invariants that bit before

- SKILL.md frontmatter must pass the canonical grammar (no single quotes;
  run `node scripts/check-frontmatter.mjs --fix` — never hand-fix).
- Plugin-level `server/` dir in dist is NOT reached by the skill-tree copy:
  needs its own `sync.sh` case + mirror test (the condux `hooks/` 6ba6572
  lesson).
- Description/when_to_use budgets: description ≤ 500 chars, frontmatter
  total ≤ 1024 chars, OpenCode merged description ≤ 1024.

## Board columns (2026-08-21)

- `--open <id>` must open the targeted card's fold: a `#item-N` that lands on
  a collapsed `<details>` shows the lede only. The deep-link handler sets
  `open` on the card's details before scrolling, as it already does for the
  archive's year `<details>`.
- `.hidden` filtering must keep `data-kit-item` in sync (the kit's j/k walk)
  — carried over from the list layout; the filter now spans columns.
- Horizontal scroll lives on the board grid, not the page: `.board` (a div
  inside `<main>`, so the fresh-scaffold empty state can sit above it)
  scrolls; the sticky header does not move with it.
- Date stamps are stripped from the displayed title and shown in the card's
  meta line; the file is untouched. A title carrying two stamps
  (`(2026-08-21) (2026-08-21)`, as `add` produces when the title already has
  one) shows the first.
- The render-contract test (`tests/docket-cli.test.mjs`, "renderHtml
  produces a self-contained board…") pins the scope pills, stats row and
  `#filter-toggle`; it is rewritten to the column contract as a named plan
  task, never edited silently.
