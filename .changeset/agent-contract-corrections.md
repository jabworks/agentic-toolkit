---
"@jabworks/condux": patch
---

The bundled agents' prompts no longer contradict themselves. `researcher` may read the files version resolution needs (`package.json`, the lockfile, the installed package), which its constraints had forbidden. `explorer` no longer points to a search tool it doesn't have. `planner` follows workflow's tiers instead of its own conflicting file-count thresholds. Every agent drops spawn-cost guidance that only the orchestrator could act on. `discovery` and `draft-plan` drop wording that described earlier versions of themselves.
