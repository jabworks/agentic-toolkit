---
name: record
description: "Manage a project docket — a file-based backlog under docket/ with open items in DOCKET.md, closed items in archive/<year>.md, and a shared never-reused id space. Add items with the next free id, append status updates, split items, and close shipped work by stamping and moving it to the archive in one action. Detects legacy root BACKLOG.md layouts and works in place; offers scaffold and migration. Item-level docket work: add to the backlog or docket, close #N, note on #N, show or browse the backlog — and capture, when the user defers an idea (later, someday, we should eventually). Offer scaffold when a repo has no docket and the user wants one. Not for whole-backlog passes — grooming, stale sweeps, id checks, or picking what to work on next (that is groom)."
argument-hint: "[add \"title\" | close N | show]"
---

# /record

Keep the project docket true: every idea captured with an id, every shipped
item stamped and moved the moment it ships.

## The contract

```
docket/
  DOCKET.md         # open items ONLY — Committed · Someday · Loose threads
  archive/2026.md   # closed items + verification records, one file per year
  docket.json       # next_id and section config — owned by the CLI
```

- Item: `### <id>. Title (YYYY-MM-DD)` + freeform body. Follow-ups append as
  `#### Status YYYY-MM-DD — summary` blocks under the item — never rewrite
  history above.
- Ids are monotonic integers, never reused, never renumbered; the space spans
  open + archive. `#N` in a commit subject refers to these ids — the docket
  is the tracker.
- **Closing means moving.** Stamp `— ✅ DONE <date>` + verification record
  and relocate to the archive in one action. A stamped item still sitting in
  DOCKET.md is the failure mode this tool exists to prevent: stale open
  markers burn future sessions scoping ghost work.

Legacy layout: a root `BACKLOG.md` (+ `BACKLOG_ARCHIVE.md`) is the same
contract in older clothes. All operations work on it in place.

## Mechanics — never hand-allocate an id

Prefer the MCP tools when registered (`docket_add`, `docket_close`,
`docket_next`, `docket_check`). Otherwise run the bundled CLI — from this
skill's base directory:

```bash
node <skill-base>/server/docket.mjs next-id
node <skill-base>/server/docket.mjs add "Title here" --section committed
echo "Body prose." | node <skill-base>/server/docket.mjs add "Title" --body -
node <skill-base>/server/docket.mjs close 47 --note "live-verified on preview"
```

Id allocation and the close move are the two ops you must not do by hand-edit
— they are exactly where duplicates and half-moves come from. Status updates,
splits, and body edits are normal prose edits you make directly.

## Operations

**Add.** Confirm section (default Someday; Committed only when the user has
decided to do it; Loose threads for unnumbered observations — plain bullets,
no id). Write the body in the docket voice: concrete, dated, why-first.

**Status update.** Append a `#### Status <date> — <summary>` block under the
item. Never edit earlier status blocks.

**Split.** New ids via `add` for each part, each heading tail naming the
parent: `(split from #26, <date>)`. Close or annotate the parent — a split
parent left untouched double-counts the work.

**Close.** Run `close <id> --note "<how it was verified>"`. Report the
suggested commit subject it prints (`docs(docket): close #<id>`) — the
convention, not a requirement; committing stays the user's call.

**Show.** `node <skill-base>/server/docket.mjs browse` renders the board to
a self-contained HTML file and prints the path; `--serve` live-reloads it,
`--open <id>` deep-links an item.

## No docket in the repo?

Offer once — never scaffold uninvited:

- Fresh repo → `scaffold [--project <name>]` creates the tree above. It
  targets the nearest root and refuses when any ancestor directory already
  has a docket — nested dockets are not supported; run it from the intended
  root.
- Legacy files present → operations work in place already; offer `migrate`
  (byte-faithful, originals left for the user to delete) at most once.

Templates for what scaffold produces: `references/scaffold-templates.md`.

## Capture

When the user defers an idea mid-conversation — "later", "someday", "we
should eventually", "not now" — offer to docket it. Guardrails in
`references/capture-playbook.md`; the short version: offer once per idea,
never write silently, drop it if declined.

## Boundaries

Whole-backlog work — grooming sweeps, stale checks, id integrity, "what
should I work on next" — belongs to the `groom` skill, not here. Commit
mechanics belong to the repo's own conventions (or a git-commit skill when
installed); this skill only suggests the subject line.
