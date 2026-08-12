---
'@jabworks/condux': patch
---

Adopt the shared colour core in the plan-review template.

The bundled skills now carry the canonical 32-token palette between
`tokens:core` markers, checked against `scripts/tokens/core.css` by
`scripts/check-tokens.mjs`. No behaviour change on the OpenCode side — the
template renders the same colours it did before, with `--mono` widened to the
union of both font stacks (all local-or-fallback lookups, nothing fetched).
