---
"@jabworks/condux": patch
---

subagent-deployment now triggers on the fan-out being asked for, not on the work happening to be independent.

Independence is a precondition, not a trigger. A plain implementation request —
"fix these three unrelated failing tests" — is a dev task and goes to
`/workflow`, which loads this skill if the tier warrants it. What reaches
`subagent-deployment` directly is a request that already names the mechanism:
in parallel, fan out, dispatch these together, kick off explorer and researcher.

Stated in the trigger contract and restated in the body, because the router's
"every dev task starts here, other skills execute within it, not instead of it"
only resolves the collision if the other side agrees (docket #32).
