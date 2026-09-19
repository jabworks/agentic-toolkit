---
"@jabworks/condux": minor
---

condux writes and reads a per-feature PRD. `technical-spec` gains a `prd.md` concern file — six fixed sections (problem, users, goals and non-goals, success metrics, scope, open questions), tables first. `discovery` authors it: the goal round covers the six sections in one batch and presents them as a §0 requirements card before §1, built from the user's answers, from a `prd.md` already in the spec, or from a ticket or product doc they bring; sign-off writes it beside `decisions.md`. A request for only the requirements can sign off at §0. `workflow`'s router loads `prd.md` for new-feature tasks, and `preflight`'s drift check reads it — work that lands in the scope table's Out column or inside a non-goal is drift. An unanswered section becomes an open question, never an invented answer. "write a PRD" and "product requirements" route to discovery; "save this PRD" to technical-spec.
