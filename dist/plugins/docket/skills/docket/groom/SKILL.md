---
name: groom
description: Whole-backlog passes over a project docket — the file-based backlog under docket/ (or a legacy root BACKLOG.md). Runs the stale-item sweep, interprets the id-space integrity check, and recommends what to work on next from the open board. Reports candidates and reasons; never closes or edits items itself — item-level changes route through record.
when_to_use: "Whole-backlog verbs: groom the backlog, anything stale, check the ids, what should I work on next, what is on the docket. Also when a session discovers an already-shipped item still sitting open. Not for adding, closing, splitting, or annotating a single item, and not for capturing new ideas (that is record)."
argument-hint: "[sweep | check | next]"
---

# /groom

Read the whole board; recommend, never rewrite. Every change groom proposes
is executed through `record` (or by the user) — groom itself only reports.

## The contract (restated)

Open items live in `docket/DOCKET.md` under `## Committed` · `## Someday` ·
`## Loose threads`; closed items live in `docket/archive/<year>.md` with
verification records. Ids are shared across open + archive and never reused;
`#N` in commit subjects refers to them. A legacy root `BACKLOG.md` (+
`BACKLOG_ARCHIVE.md`) is the same contract and is groomed in place.

## Sweep — find the ghost work

Open the board first — the CLI ships with the sibling `record` skill, one
directory over from this skill's base:
`node <skill-base>/../record/server/docket.mjs browse` (add `--serve` for
live reload while grooming). Then work the checklist in
`references/grooming-checklist.md`. The prize finding is the **shipped item
still open** — an item whose work exists in the repo or git history but that
never got stamped and moved. Each one costs a future session scoping ghost
work, which is the failure this whole tool descends from.

Report findings as a list — item, evidence, proposed action. Closing the
confirmed ones happens via `record` (`close <id> --note …`), one decision per
item, the user driving.

## Check — id-space integrity

```bash
node <skill-base>/../record/server/docket.mjs check
```

(or the `docket_check` MCP tool). Exit 0 means clean. Findings come typed:

- `duplicate-id` — the same id claimed twice; decide which entry keeps it,
  re-add the other via `record` with a fresh id
- `next-id-drift` — docket.json fell behind a hand-edit; fix the counter to
  max+1 before any add happens
- `malformed-heading` — a `###` line that is not `### <id>. Title (date)`
- `orphaned-legacy` — both layouts present; docket/ wins, offer to migrate
  or delete the root files

Id gaps are normal (absorbed files, dropped items) — never renumber to close
them.

## Next — pick what to work on

Rubric in `references/pick-next-rubric.md`. The short form: Committed before
Someday, momentum before novelty, age as a tiebreak — and always return 1–3
candidates with reasons, not a single verdict. The user picks; groom argues.

## Boundaries

Adding, closing, splitting, annotating, capturing — item-level work, all of
it `record`. Groom never edits the docket files; the one exception is
repairing `docket.json` after a confirmed `next-id-drift` finding, and only
with the user's yes.
