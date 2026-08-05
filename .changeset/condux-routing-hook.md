---
"@jabworks/condux": minor
---

Ship condux's routing rule as a SessionStart hook so `/workflow` is reached as the entry point rather than inferred from the skill catalog. Catalog inference sits at roughly 80%, and the misses are condux's own siblings winning the query — `root-cause-analysis` on a crash report, `draft-plan` on "write the plan" — which no description change can fix without taking their trigger space. The payload is prose in `skills/workflow/hooks/routing.md` (~390 tokens): it names workflow as the entry point, lists the siblings that execute within it, and states what should *not* be routed, so questions and code reading still answer directly.

The hook is wired on Claude Code and Codex. OpenCode has no session-hook surface, so for this package the files ship as payload only — the routing rule is inert there until OpenCode gains one.
