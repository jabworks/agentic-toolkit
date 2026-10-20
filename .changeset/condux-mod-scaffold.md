---
"@jabworks/condux": patch
---

The Claude Code plugin gains a mod scaffold: a function-hooks module under `hooks/mod/` that registers `/condux` (a plan and progress board is being built on it). Nothing changes for OpenCode: the mod is Claude Code only and is not shipped in this package, and the one mirrored change is a `modules` key in `hooks/hooks.json` that OpenCode never reads.
