---
"@jabworks/condux": patch
---

Trigger-eval corpus: seed `disallowed` assertions on the adjacency seams

The bundled condux skills (`discovery`, `draft-plan`, `subagent-execution`,
`technical-spec`) now declare which sibling skills must never win their most
collision-prone queries — the "resume" space that discovery and session-handoff
share, and the doc-creation space that draft-plan and technical-spec share.

This is test-fixture data used by the toolkit's routing eval, not runtime
behaviour: nothing an OpenCode user does changes, and no skill's trigger
contract moved. It ships because `evals/` is part of the bundled skill tree.
