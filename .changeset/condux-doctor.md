---
"@jabworks/condux": minor
---

Bundle `condux-doctor`, the plugin's health check, into the OpenCode package. It answers "is condux actually working on this host?" — probing the SessionStart routing hook by *running* it (Claude Code's JSON envelope, Codex's raw payload), resolving plan-review's Codex Stop hook without executing it, checking the OpenCode registration and the four specialist agent definitions, and comparing the installed version against the local marketplace clone. Offline and read-only.

Running the hook is the point. `session-start.mjs` fails open by design: if its payload is missing it exits 0 and prints nothing, so every static check passes while condux's routing rule is silently absent. Only executing it tells you that `/workflow` stopped being the entry point.
