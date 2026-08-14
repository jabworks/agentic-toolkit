# Scaffold templates

What `docket.mjs scaffold` produces, kept here so the skill can show the user
before creating anything — and so hand-scaffolding (no Node available)
produces the identical contract.

## DOCKET.md

```markdown
# <PROJECT> DOCKET

**Open items only.** Closed items move to `archive/<year>.md` with their
verification records. The id space is shared across open and archive and ids
are never reused — a "#N" in a commit subject refers to these numbers (this
docket is the tracker). When an item ships: stamp it ✅ with the date and
verification status, then move the entry to the archive in the same action.
Stale open markers cost real sessions — closing means moving.

## Committed

## Someday

## Loose threads
```

Section semantics:

- **Committed** — decided work. The pick-next pool. An item enters Committed
  when someone chooses to do it, not when it merely sounds good.
- **Someday** — captured ideas, no commitment. The default landing zone.
- **Loose threads** — unnumbered bullets; observations not yet worth an id.
  Promoting one to an item goes through `add` so it gets a real id.

## docket.json

```json
{
  "version": 1,
  "next_id": 1,
  "sections": ["Committed", "Someday", "Loose threads"],
  "created": "<date>"
}
```

`next_id` is authoritative for allocation; `check` cross-verifies it against
the ids actually present. Renaming or adding sections is a user edit the CLI
respects — it never initiates one.

## archive/<year>.md (created on first close of the year)

```markdown
# DOCKET ARCHIVE <year>

Closed items with their verification records. The id space is shared with the
open file — ids are never reused.
```

Entries land as `## <id>. Title (<original date>) — ✅ DONE <close date>`
followed by the item body exactly as it stood, plus a `Verification:` line
when a note was given. Other terminal stamps are allowed by hand:
`❌ DROPPED <date>` with a one-line reason.
