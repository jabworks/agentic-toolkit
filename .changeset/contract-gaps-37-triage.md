---
"@jabworks/condux": patch
---

Four skill-contract gaps surfaced by the #37 sibling-miss triage are fixed (docket #39).

**root-cause-analysis** now claims declarative bug reports, not just
questions — "checkout crashes on empty cart" is a bug report even without a
question mark, the same passive-voice-to-user-phrasing move that fixed
test-first-development in 2.17.2.

**subagent-execution**'s when_to_use now names model selection for a
dispatched agent explicitly — the skill already owned this in its body
(`references/spawn-rules.md`), but the contract never said so, so "which
model should the coder agent get" missed.

**remember** (Concord) no longer attracts open-ended retrospective
questions — "what mistakes did past sessions make", "what did the audit
leave open", "has this happened before" in an unrelated project. Its
contract now says explicitly: a session log, not a mistake ledger or audit
index. A toolkit mistake in this project is still `toolkit-failure-archaeology`.

**The "sdd the plan" eval stimulus** was genuinely ambiguous between
spec-driven development and subagent-driven execution — reworded to "spawn
the agents for this plan" rather than resolving the ambiguity in either
skill's contract.

**git-operations' enumerated situation list** (submodules, bisect) was left
unchanged, by decision: the skill's own "Out of scope" section already
excludes both by name pending a dedicated history-rewriting skill, so the
miss is an intentional guard, not a gap.
