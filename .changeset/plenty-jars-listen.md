---
"@jabworks/condux": patch
---

test-first-development now claims the two things it already owned but never advertised.

**Advisory questions about the practice.** "should I tdd ui components" missed
0/3 in two independent variance bands — never once routed, the most stable miss
in the corpus. The contract said "trigger when the user explicitly asks for
tests-first", so a question about *whether* to read as a question, not a
request, and the router declined. But deciding when tests-first applies is this
skill's whole opt-in design. The contract now says so, mirroring `workflow`'s
"also the operating manual" clause.

**Requests to change a passing-by-editing test, in user phrasing.** The rule was
already there — "whenever an existing test spec is about to be edited to make it
pass" — but written from the agent's side in passive voice, describing a state
the agent is about to enter. The router only ever sees a user message, so
matching it required a two-step inference it made about a third of the time.
Named in user phrasing now: just fix the test, update the failing test to match
the new behavior.

No exclusion clause was added, deliberately. Across 582 cases, nothing wrongly
routed *to* this skill in either band — zero false positives — so a "not for
ordinary test work" clause would have bought nothing measurable (docket #37).
