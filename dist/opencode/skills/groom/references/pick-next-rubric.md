# Pick-next rubric

"What should I work on?" gets 1–3 candidates with reasons — never a single
oracle answer, and never a reshuffle of the board.

## Order of consideration

1. **Committed with momentum** — a recent `#### Status` block or recent
   commits referencing the id. Finishing beats starting; a half-landed item
   is the cheapest win on the board.
2. **Committed, oldest first** — age is debt: the context to do it cheaply
   is evaporating. An old Committed item that keeps being skipped is also a
   candidate for demotion — say so instead of recommending it a fourth time.
3. **Someday, only when Committed is empty or blocked** — and then prefer
   items whose body still reads actionable cold (a concrete first step, a
   named file or error). If picking one, the pick includes promoting it to
   Committed.

## Signals to weigh

- **Unblocked now** — a dependency that shipped since the item was written
  (check recent closes in the archive; the body often names the blocker)
- **Verification debt** — items whose status says "built, pending
  verification": smallest distance to a close
- **Clustering** — an item touching files the user is already in this
  session costs less than a cold start

## Output shape

For each candidate: `#id title — one-line why-now`, plus what "done" means
for it (the close note it would earn). If the sweep found shipped-but-open
items, surface those first — closing ghost work outranks starting anything.
