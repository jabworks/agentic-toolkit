# Quirks & edge cases

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | No spec dir must stay silent | a task with no matching spec | low | yes — silent N/A, no nudge |
| Q2 | A missing concern file is not drift | spec dir exists, concern file absent | low | yes — no claim, skip |
| Q3 | Scaffold-only files make no claim | template headings with no real content | low | yes — treated as missing |
| Q4 | Two spec dirs can match | package scope and git root both match | low | yes — nearest package scope wins, same as the router |
| Q5 | Untouched concerns are out of scope | drift in a concern the task never touched | low | yes — the check is task-scoped, not a staleness audit |
| Q6 | Spec updates must be visible | user picks "update spec" | medium | yes — visible update, live-preview offer applies |
| Q7 | Accepted drift must not vanish | user picks "accept knowingly" | medium | yes — recorded in the preflight output |

## Q1 — No spec dir → silent N/A

**Symptom:** commentary or a nudge to create a spec where none exists.
**Trigger:** running the drift check on a task with no matching spec dir.
**Cause:** the check has nothing to compare against.
**Mitigation:** yes — zero commentary, no nudge: mirrors the workflow
router's "no spec → proceed without comment" and the no-lecture doctrine. (A
"one-line nudge on LARGE" variant was considered and rejected at the detail
round.)

## Q2 — Spec dir exists, concern file missing

**Symptom:** absence of a concern file read as drift.
**Trigger:** a spec dir carrying only some of the concern files.
**Cause:** concern files are optional per spec.
**Mitigation:** yes — that concern makes no claim; skip it. Never treat
absence as drift.

## Q3 — Concern file is scaffold-only

**Symptom:** template headings with no real content read as a claim.
**Trigger:** a scaffolded-but-unwritten concern file.
**Cause:** the scaffold ships headings before content exists.
**Mitigation:** yes — no claim; skip, same as missing.

## Q4 — Multiple matching spec dirs

**Symptom:** ambiguity when package scope and git root both match.
**Trigger:** the same subject matched at both scopes.
**Cause:** the router's two-scope lookup.
**Mitigation:** yes — nearest package scope wins, same as the router.

## Q5 — Drift in a concern the task never touched

**Symptom:** the check ballooning into a whole-spec audit.
**Trigger:** stale content in a concern outside the task's footprint.
**Cause:** specs accumulate staleness independently of the current task.
**Mitigation:** yes — out of this check's scope: it compares the *task's*
implementation against the spec; it is not a whole-spec staleness audit.

## Q6 — User picks "update spec"

**Symptom:** a spec file changed without the user seeing it happen.
**Trigger:** resolving a stale-spec finding.
**Cause:** the fix for that direction of drift is a spec edit.
**Mitigation:** yes — the update happens visibly as part of resolving the
finding (and the live-preview offer from workflow's spec companion applies);
never silently.

## Q7 — Accept is recorded, not lost

**Symptom:** an accepted drift finding vanishing from the record.
**Trigger:** the user accepting a finding knowingly.
**Cause:** acceptance ends the finding's lifecycle.
**Mitigation:** yes — noted in the preflight output so it survives into the
conversation record; it does not block finalize.
