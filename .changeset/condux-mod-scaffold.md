---
"@jabworks/condux": patch
---

The Claude Code plugin gains a mod: `/condux` opens a live, read-only board of plans and their progress, and a status line shows the open plan and its next task. It is Claude Code only, so nothing changes for OpenCode: the mod is not shipped in this package, and the one mirrored change is a `modules` key in `hooks/hooks.json` that OpenCode never reads.
