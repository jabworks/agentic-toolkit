# Docket — Quirks & Edge Cases

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Shipped items sitting "open" burn sessions on ghost work | stamping ✅ without moving the item | medium | yes — `close` stamps and moves atomically; groom sweeps for stragglers |
| Q2 | Legacy terminus layouts must keep working in place | root `BACKLOG.md` repos, or both layouts present | low | yes — detection order, in-place ops, migrate offered never forced |
| Q3 | Hand edits can corrupt the id space | `next_id` drift, migration, absorbed archives | medium | partial — `check` detects, `add` refuses; repair stays manual by design |
| Q4 | Qualified ids are references, not allocations | `### 47 (remainder).` sharing a number with its parent | high | yes — duplicate detection over allocations only; `close` errors on ambiguity |
| Q5 | Intra-bundle routing collision | phrasing that reads both item-level and whole-backlog | low | yes — disjoint verb sets plus near-miss eval cases both sides |
| Q6 | Proactive capture can annoy or silently write | deferral phrases mid-conversation | low | yes — offer only, once per idea, declines remembered |
| Q7 | Browser edge cases | empty docket, port conflicts, archive size | low | yes — empty state, next-free-port, archive drawer |
| Q8 | Repo invariants that bit before | frontmatter, plugin-level dirs, description budgets | medium | yes — canonical-grammar check, sync case + mirror test, budgets |
| Q9 | Board-column interactions each break a different way | deep links, filters, scroll, date stamps | medium | yes — per-interaction fixes, pinned by the render-contract test |
| Q10 | The close stamp defeats the trailing-date strip | any archived item with a filed-date parenthetical | low | yes — positional strip, only before the close stamp or at true end |
| Q11 | mdLite renders a pipe table as literal text | a pipe table in an item body | medium | yes — lookahead table support; ragged rows pad; escaped pipes stay content |

## Q1 — The ghost-work lesson (why close is strict)

**Symptom:** items sitting "open" after shipping — in terminus, #27 and #29
each burned a session's scoping on ghost work.
**Trigger:** stamping an item ✅ without moving it in the same action.
**Cause:** stamp and move were separable operations, so an item could carry a
done mark and still occupy the open board.
**Mitigation:** yes — the contract is that shipping an item means stamp ✅ +
date + verification *and move it* in the same action. `close` does both
atomically; skills must never stamp without moving. `docket:groom`'s stale
sweep exists to catch the ones that slip anyway.

## Q2 — Legacy layout detection

**Symptom:** a legacy terminus repo mis-detected, or migrated without consent.
**Trigger:** running docket ops in a repo with root `BACKLOG.md` (+ optional
`BACKLOG_ARCHIVE.md`), or with both layouts present.
**Cause:** two layouts exist in the wild and terminus itself must keep working
untouched.
**Mitigation:** yes — detection order: `<git-root>/docket/` wins; else the
root files are recognized as the legacy terminus layout. In legacy mode every
op works in place (add/close/check target the root files; close appends to
`BACKLOG_ARCHIVE.md`, no yearly rotation). `migrate` is offered once per
session when legacy is detected — never forced, never auto-run. Both layouts
present → `docket/` wins, warn about the orphaned root files.

## Q3 — Id-space hazards

**Symptom:** duplicate ids allocated, or ids that commit history references
failing to survive.
**Trigger:** hand-edits bypassing the CLI (`next_id` drift), migration, or
archives absorbed from other files (terminus absorbed RANDOM_IDEAS.md).
**Cause:** the id space is shared and never reused, but nothing stops a hand
edit from stepping around `docket.json`.
**Mitigation:** partial — `check` cross-verifies `next_id` against the
observed max and reports drift; `add` refuses on detected drift rather than
allocating a dupe. Repair is a manual `docket.json` edit — groom guides it,
the user consents, and there is deliberately no automated repair flag
(updated 2026-08-05 at preflight: state rewrites stay human-approved). Ids
referenced by commit history must survive migration byte-identically in
headings, and `check` treats archive gaps and interleaved order as normal —
only dupes/reuse are findings.

## Q4 — Qualified ids: reference, not allocation (2026-08-06)

**Symptom:** `check` permanently red on terminus — 4 `duplicate-id` findings
on legal partial-ship references. A check that is always red is a check nobody
wires into CI and nobody reads.
**Trigger:** qualified headings — a bare `### 47.` allocates id 47; a
qualified `### 47 (remainder).` only references it, the partial-ship
convention where a slice and its parent deliberately share a number so commit
subjects citing #47 keep pointing at one thing.
**Cause:** the parser had tolerated the shape since the beginning (`ITEM_RE`,
`ARCHIVE_ENTRY_RE`) and `migrate` was tested to preserve it, but `collectIds`
discarded the qualifier, so `check` saw a bare `47` twice and called it
corruption.
**Mitigation:** yes —

- Duplicate detection runs over **allocations only**. Two bare `### 2.`
  headings are still a finding, unchanged.
- A reference whose parent id is not allocated anywhere is an
  `orphan-reference` finding — a dangling pointer, worth reporting.
- Two identical references (`## 26 (shipped slice).` twice) are legal: a
  parent can ship in any number of slices.
- `next_id` is unaffected: it uses the numeric value, so a qualified
  `74 (remainder)` still blocks reallocating 74.
- `close` resolves a number against open items and **errors on ambiguity**
  rather than taking the first match; the exact slot
  (`close "47 (remainder)"`) is the disambiguator. Before this, terminus's
  `docket close 1` reached the right item only because its open ids happened
  to be unique.

Verified against the real terminus docket (2026-08-06, with permission —
`docket/` only): 78 entries, 74 allocations, 4 references (`1 (remainder)`,
`24 (follow-ups)`, `26 (shipped slice)` ×2), `next_id` 75 against a max id of
74. The pre-fix code reported 4 `duplicate-id` findings there; the fixed code
reports none and `docket check` exits 0, which is what lets it be wired into a
preflight or CI step at all.

## Q5 — Routing collision surface (intra-bundle)

**Symptom:** a prompt routed to the wrong skill of the bundle.
**Trigger:** phrasing that could read as item-level or whole-backlog.
**Cause:** two skills share one domain.
**Mitigation:** yes — the verb sets stay disjoint: item-level ("add",
"close #N", "note on #N", "later/someday" capture) → `record`; whole-backlog
("groom", "what's next", "anything stale", "check the ids") → `groom`. Eval
cases include near-miss prompts on both sides — shipped 2026-08-05 in 0.1.1
(`skills/{record,groom}/evals/trigger_eval.json`, auto-discovered by
`scripts/eval-triggers.mjs`), closing the drift accepted at preflight
2026-08-05. Neither skill may trigger on generic "backlog" alone in repos with
no docket and no legacy files — offer scaffold only on explicit intent.

## Q6 — Proactive capture guardrails

**Symptom:** silent writes, or the same idea offered for capture repeatedly.
**Trigger:** deferral phrases mid-conversation — "later", "someday", "we
should eventually".
**Cause:** proactive capture is a standing behaviour with no natural end.
**Mitigation:** yes — capture must *offer*, never silently write; one offer
per idea; declining is remembered for the session. No capture in repos without
a docket — offer scaffold instead, at most once.

## Q7 — Browser edge cases

**Symptom:** a blank page on fresh scaffold, a port collision, or the open
board waiting on archive size.
**Trigger:** empty docket, occupied port, or a large archive.
**Cause:** the board is a standalone render of everything the docket holds.
**Mitigation:** yes — an empty docket renders a usable empty state, not a
blank page; `--serve` binds localhost only and takes the next free port on
conflict, printing it; the archive is one closed drawer under the board
(2026-08-21; it used to be per-year blocks) — every row rendered, bodies open
on demand, so the open board never waits on archive size and a filter can
reach into it. Light theme is checked first, then dark (toolkit lesson,
3d3a0d9).

## Q8 — Frontmatter / repo invariants that bit before

**Symptom:** frontmatter a strict parser rejects, a plugin-level dir that
never reaches `dist/`, or a description over budget.
**Trigger:** hand-editing SKILL.md frontmatter, adding plugin-level files, or
growing descriptions.
**Cause:** known toolkit invariants, each with a prior incident.
**Mitigation:** yes — frontmatter must pass the canonical grammar (no single
quotes; run `node scripts/check-frontmatter.mjs --fix` — never hand-fix); the
plugin-level `server/` dir in dist is NOT reached by the skill-tree copy and
needs its own sync case + mirror test (the condux `hooks/` 6ba6572 lesson);
budgets: description ≤ 500 chars, frontmatter total ≤ 1024 chars, OpenCode
merged description ≤ 1024.

## Q9 — Board columns (2026-08-21)

**Symptom:** a deep link landing on a collapsed card shows the lede only; a
filter desyncs the kit's j/k walk; horizontal scroll leaks to the page; date
stamps double up in displayed titles.
**Trigger:** the column layout's interactions — folds, filters, scroll
ownership, meta stripping.
**Cause:** each interaction crosses a mechanism that assumed the old stacked
layout.
**Mitigation:** yes —

- `--open <id>` sets `open` on the card's `<details>` before scrolling, as it
  already does for the archive's year `<details>`.
- `.hidden` filtering keeps `data-kit-item` in sync (the kit's j/k walk) —
  carried over from the list layout; the filter now spans columns.
- Horizontal scroll lives on the board grid, not the page: `.board` (a div
  inside `<main>`, so the fresh-scaffold empty state can sit above it)
  scrolls; the sticky header does not move with it.
- Date stamps are stripped from the displayed title and shown in the card's
  meta line; the file is untouched. `add` refuses a title that already ends in
  a date stamp rather than doubling it up on write (docket #47) — Q10 covers
  the render side.
- The render-contract test (`tests/docket-cli.test.mjs`, "renderHtml produces
  a self-contained board…") pins the scope pills, stats row and
  `#filter-toggle`; it is rewritten to the column contract as a named plan
  task, never edited silently.

## Q10 — The close stamp defeats the trailing-date strip (2026-08-24, docket #47)

**Symptom:** the filed date leaks into every archived card's displayed title
(`Retire the legacy exporter (2026-08-05) — ✅ DONE 2026-08-21`) — not only
the duplicate-stamp case that surfaced it (`(2026-08-21) (2026-08-21) — ✅
DONE 2026-08-21`, hand-fixed once in the archive file itself; the actual
defect was always in the renderer, not the data).
**Trigger:** any archived item — `close()` appends `— ✅ DONE <date>` after
the title, so the filed-date parenthetical is never trailing anymore.
**Cause:** `displayTitle`'s strip regex was anchored to the literal end of the
string — `\(\d{4}-\d{2}-\d{2}[^)]*\)\s*$` — and the close-stamp suffix is not
itself a `(...)` group, so the `$` stops matching.
**Mitigation:** yes — the fix is positional, not lexical: strip a `(...)` date
group only when it sits immediately before the close stamp (or at the true
string end, for open items), never a date-shaped parenthetical anywhere else
in the title — a title may legitimately carry one, e.g. "Reopen A4 collision
detection (the 2026-07-14 falsification)". The close stamp itself is
deliberately never stripped; it is the one thing this regex was never supposed
to treat as noise.

## Q11 — mdLite tables: a delimiter is what makes one (2026-08-25, docket #43)

**Symptom:** a pipe table in an item body printed as literal pipe text — nine
of them across the dogfood docket, **eight in the archive**.
**Trigger:** any pipe table in an item body.
**Cause:** `mdLite()` renders a deliberate markdown subset, and tables were
absent until docket #43. The archive distribution killed the alternative fix
the item proposed (convert tables to lists by convention): the archive is the
record of closed work, and rewriting it to suit the renderer is the wrong
direction.
**Mitigation:** yes — table support, with three decisions worth not
re-litigating:

- **Detection is lookahead, not buffering.** A pipe line only opens a table
  when the *next* line is a delimiter. The first implementation buffered pipe
  lines and fell back to a paragraph when no delimiter arrived — which emitted
  the fallback as its own block and so split a paragraph that merely contained
  pipes into two. A regression on prose that never involved a table; caught by
  the test that asserts the old behaviour survives.
- **Split on unescaped pipes only.** An escaped `\|` is cell content. Same
  rule `spec-index.test.mjs` applies when reading the generated catalog.
- **Ragged rows pad, they do not truncate.** A short row gains empty cells so
  the grid stays rectangular; a long row keeps its extras, because dropping a
  cell loses content the author wrote.

The output is wrapped in `<div class="tbl">` because a card column is ~450px
and a table does not reflow — the wrapper scrolls so the column never
stretches and the page never gains a horizontal scrollbar. `board-shell.html`
had no table CSS at all before this, which the item did not scope: emitting
`<table>` without it renders a browser-default table into a designed surface.

A 4-space-indented line beginning with `|` is still prose — `mdLite` has no
indented-code-block support, and #43's own body quotes the broken output that
way. That is correct: it is an illustration, not a table.
