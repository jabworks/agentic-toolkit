---
"@jabworks/condux": minor
---

PRD done-checks and an accessibility pass. The `prd.md` template's Scope section now gives every In row a priority (P0/P1) and a "Done when" check, Out is its own table, and open questions say whether they block and who answers them. discovery enforces those rules at §0, and preflight's drift check reads P0 done-checks on feature-completing tasks. live-verification gains a WCAG 2.2 AA accessibility pass (name and role, visible focus, contrast, reflow, target size, plus a native font-scale check), and code-review gains an Accessibility dimension.
