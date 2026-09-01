---
"@jabworks/condux": minor
---

Routing on OpenCode moves out of `config.instructions` and into the session: the plugin now pushes workflow's routing payload as a `synthetic: true` `<system-reminder>` text part on the first user message of every main session (`chat.message`), re-injects it after compaction, and never sends it to subagent sessions (bundled agents by name, every other child by `parentID`). The payload itself is rewritten for OpenCode — `/condux:workflow` was a Claude Code command the host cannot run; it now says `skill(name="workflow")` and carries a `/name` → `skill(name)` mapping. Same ~390 tokens per main-session turn as before, better seat, no subagent leak. Resolves docket #72; research in `specs/trigger-reliability/opencode-routing-research.md`.
