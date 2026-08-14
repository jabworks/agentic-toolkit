# Capture playbook

Proactive capture is the highest-value, highest-annoyance feature of a
docket. These guardrails keep it on the right side of that line.

## When to offer

The user defers an idea mid-conversation:

- "later" / "not now" / "someday" / "we should eventually …"
- "good idea, but out of scope for this"
- a follow-up surfaces at the end of a task ("remaining: X, Y")

Offer in one line, with the section you would file it under:

> Want me to docket that? — "Consolidate the daemon tool definitions" →
> Someday

## Hard rules

1. **Offer, never write.** No silent adds — the docket is the user's record,
   not the agent's scratchpad.
2. **Once per idea.** Declined means dropped for the whole session; do not
   re-offer the same idea in different words.
3. **No docket, no capture.** In a repo with neither `docket/` nor a legacy
   `BACKLOG.md`, capture becomes a single scaffold offer at most — and only
   when an idea actually surfaced worth keeping.
4. **Batch at boundaries.** If several ideas pile up in one stretch of work,
   collect them into one offer at the next natural pause instead of
   interrupting per idea.
5. **Never mid-implementation.** Hold offers until the current edit/test
   cycle reaches a stopping point.

## Writing the entry

When accepted: allocate via `add` (never hand-pick the id), default to
Someday unless the user committed to doing it, and write the body so a future
session can act on it cold — what, why now, and any pointer worth keeping
(file, error message, commit). One paragraph is plenty; the docket is a
backlog, not a spec.
