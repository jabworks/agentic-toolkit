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
- Large archives render lazily per year; the open board never blocks on
  archive size.
- Light theme is checked first, then dark (toolkit lesson, 3d3a0d9).

## Frontmatter / repo invariants that bit before

- SKILL.md frontmatter must pass the canonical grammar (no single quotes;
  run `node scripts/check-frontmatter.mjs --fix` — never hand-fix).
- Plugin-level `server/` dir in dist is NOT reached by the skill-tree copy:
  needs its own `sync.sh` case + mirror test (the condux `hooks/` 6ba6572
  lesson).
- Description/when_to_use budgets: description ≤ 500 chars, frontmatter
  total ≤ 1024 chars, OpenCode merged description ≤ 1024.
