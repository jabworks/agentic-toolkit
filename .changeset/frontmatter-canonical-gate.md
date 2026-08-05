---
"@jabworks/condux": patch
---

Fix the code-review skill's frontmatter, which strict YAML parsers rejected. Its `when_to_use` was a single-quoted scalar containing bare apostrophes ("that's plan-review"), and YAML requires `''` inside single quotes — so the first apostrophe closed the scalar and the rest failed to parse. Hosts with a strict parser (Codex) refused to load the skill outright; lenient ones (Claude Code) accepted it, which is why it shipped. The bundled skills are now enforced against a canonical frontmatter grammar — every line is `key: value`, values are plain when safe and double-quoted otherwise, single quotes banned — backed by a real strict YAML parse in CI.
