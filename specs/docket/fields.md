# Docket — File Grammar

## Layout (everything inside `docket/`, committed)

```
docket/
  DOCKET.md         # open items only
  archive/
    2026.md         # closed items for the year, append-only
  docket.json       # machine state, owned by the CLI
```

## DOCKET.md

- `# <PROJECT> DOCKET` title, then the header contract prose (open items
  only; where closed items go; id-space rule; the stamp-and-move lifecycle;
  the ghost-work rationale).
- Sections, in order: `## Committed` · `## Someday` · `## Loose threads`.
- Item: `### <id>. <title> (<YYYY-MM-DD>)` followed by freeform prose body.
  Amendments allowed in the heading tail, terminus-style:
  `(2026-07-18, corrected 2026-07-23)`, `(split from #26, 2026-07-14)`,
  `(remainder)`.
- Follow-ups: `#### Status <YYYY-MM-DD> — <summary>` blocks appended under
  the item, never rewriting history above.
- `## Loose threads` holds unnumbered bullets — observations not yet worth
  an id; promoting one runs `add`.

## archive/<year>.md

- `# <PROJECT> DOCKET ARCHIVE <year>` header noting the shared id space.
- Entry: `## <id>. <title> — ✅ DONE <YYYY-MM-DD>` + the item's full body as
  moved, plus a verification record (what was verified, how, commit/SHA when
  known). Other terminal stamps allowed: `❌ DROPPED <date>` with a reason.
- Append-only; entries land in the year they closed.

## docket.json

```json
{
  "version": 1,
  "next_id": 71,
  "sections": ["Committed", "Someday", "Loose threads"],
  "created": "2026-08-05"
}
```

- `next_id` is authoritative for allocation but `check` cross-verifies it
  against the max id found in DOCKET.md + all archive files.
- `sections` drives scaffold/browse ordering; renaming is a user edit the
  CLI respects, never initiates.

## Ids

- Monotonic integers, never reused, never renumbered; the space spans open +
  archive (+ legacy files when unmigrated).
- `#N` in commit subjects refers to docket ids — the docket is the tracker.
- Splits allocate fresh ids and name the parent in the heading tail.
