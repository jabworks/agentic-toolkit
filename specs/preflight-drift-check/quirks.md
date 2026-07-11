# Quirks & edge cases

- **No spec dir → silent N/A.** Zero commentary, no nudge to create one —
  mirrors the workflow router's "no spec → proceed without comment" and the
  no-lecture doctrine. (A "one-line nudge on LARGE" variant was considered
  and rejected at the detail round.)
- **Spec dir exists, concern file missing** → that concern makes no claim;
  skip it. Never treat absence as drift.
- **Concern file is scaffold-only** (template headings, no real content) →
  no claim; skip, same as missing.
- **Multiple matching spec dirs** (package scope and git root both match) →
  nearest package scope wins, same as the router.
- **Drift in a concern the task never touched** → out of this check's scope;
  the check compares the *task's* implementation against the spec, it is not
  a whole-spec staleness audit.
- **User picks "update spec"** → the update happens visibly as part of
  resolving the finding (and the live-preview offer from workflow's spec
  companion applies); never silently.
- **Accept is recorded, not lost** — an accepted drift finding is noted in
  the preflight output so it survives into the conversation record; it does
  not block finalize.
