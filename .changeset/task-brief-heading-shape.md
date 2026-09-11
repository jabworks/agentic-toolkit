---
"@jabworks/condux": patch
---

subagent-execution's `task-brief.sh` extracts a card from a template-compliant plan again: it matched `### Task N:` while draft-plan's template mandates `## Task N:`, so every current plan printed "Task N not found" and the file-handoff path was dead. Both heading shapes are read now, and a trailing `## ` section no longer leaks into the last card's brief. technical-spec stamps the PR that carries a spec (`PR #N`; the scaffold writes `PR #pending`) instead of a commit hash, which the squash-merge that lands the PR orphans.
