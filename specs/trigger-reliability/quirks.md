# Quirks — Trigger Reliability

Edge cases and failure modes in how skills do (and don't) get activated.

## Q1 — Injected context suppresses activation even when vocabulary matches verbatim

A skill can declare the exact phrase the user types and still not fire, when
content equivalent to the skill's *output* was already injected into context
(a SessionStart memory digest, a memory index). The model's information need
is satisfied before the trigger is consulted, so the workflow — with its
gates, scoring, and cleanup — silently doesn't run. Signature: within one
skill, phrase sets with a context substitute miss while phrase sets without
one fire (session-handoff: resume misses, wrap-up fires — nothing injected
answers "write a handoff"). This class is invisible to lexical audits, which
is why period 1 (100% trigger-contract compliance) could not see it.

## Q2 — A plugin gaining hooks must drop its root Agent Plugins manifest

Shipping a root `plugin.json` switches Codex to the Agent Plugins loader,
which has no hooks support — every Codex hook the plugin declares silently
dies (this repo's `8688e5b` incident; full table in
`specs/agent-plugins-conformance/quirks.md`). Any plugin this programme adds
a nudge hook to (session-handoff first) must join the exclusion that
`scripts/generate-agent-manifests.mjs` derives from the Codex manifest;
`tests/agent-plugins.test.mjs` asserts the coupling.

## Q3 — A nudge that carries content recreates the suppression it counters

The suppressed class is caused by context that answers the question. A
routing nudge that summarizes the handoff (or any artifact) becomes exactly
such context — the skill it routes to fires even less. Nudges are directives
only: they say where a phrase routes, never what the artifact contains.

## Q4 — The eval harness cannot simulate injected SessionStart context (resolved 2026-08-28)

The repo's trigger harness (`scripts/eval-triggers.mjs`) presents catalog +
query to a router model; cases are `(query, expected_skill)` pairs with no
context field, so injected-digest conditions cannot be replayed. Suppressed-
class coverage therefore splits: the end-to-end fire is asserted by
`tests/session-handoff-hooks.test.mjs` (countermeasure presence: conditional
emit, wire formats, fail-open), while the router eval keeps measuring
vocabulary routing. The split is informative, not a gap: session-handoff's
resume phrases ("continue from last session") already sit in
`skills/session-handoff/evals/trigger_eval.json` and pass at the ~93% band —
the same phrases that failed ~91% of the time live in period 2.
**Eval-pass + live-fail is the suppression signature.** Extending the harness
with an optional injected-context preamble per case is docketed, not shipped
here.
