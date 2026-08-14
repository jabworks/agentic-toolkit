---
"@jabworks/condux": patch
---

Flat bundle layout ripple: the condux-doctor now resolves its plugin root at
`../..` (bundles ship skills flat for Agent Plugins conformance) and the
workflow Codex hooks reference `skills/plan-review/...` instead of
`skills/condux/plan-review/...`. No behavior change on OpenCode installs —
the bundled skills tree was already flat there.
