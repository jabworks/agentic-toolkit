---
"@jabworks/condux": patch
---

Trim ~1,100 characters of duplicated prose out of the condux skills' frontmatter. Hosts hold every installed skill's `description` and `when_to_use` in context permanently (Codex budgets this at 2% and silently shortens descriptions once you exceed it), so frontmatter that repeats what the skill body already says is paid for on every turn of every session.

Ten skills lost procedure text that was already present verbatim in their bodies — `live-verification`'s light/dark and claim→evidence→verdict detail, `workflow`'s tier-confirmation restatement, `plan-review`'s no-egress note, `test-first-development`'s spec-rewrite rule (which has its own body section). Every trigger phrase and all nine guarded cross-references are unchanged, and `subagent-execution`'s "agents must be pre-defined, never inject a system prompt into a general-purpose one" rule was moved into its body rather than dropped — it existed only in frontmatter.

Measured, not assumed: three eval runs per catalog put the edited skills at 163/184 → 165/184 and the whole corpus at 423/470 → 425/470, well inside the ±0.8–1.8pp confidence interval. A single-run comparison had shown a scary −7, which turned out to be noise — an untouched skill swung 3 points between runs.
