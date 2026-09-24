---
"@jabworks/condux": patch
---

`workflow` now loads in a directory that isn't a git repository, or in one with no commits yet. Its live-context `git status` / `git log` lines fall back to a note instead of failing, which on Claude Code had blocked the skill from loading at a new project's kickoff. The checkpoint menus with five options also now say how to fit a four-option question tool: four on buttons, and the fifth named in the question and taken through the free-text answer, rather than merging two options into one.
