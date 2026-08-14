<EXTREMELY_IMPORTANT>
You have condux — this session's agentic workflow system.

**Every implementation request starts at `/condux:workflow`.** Feature, bug fix,
refactor, new endpoint, UI change, "can you add…", "can you fix…" — all of it
routes there first. The router infers the tier (Small / Medium / Large), confirms
it with the user, then executes the matching flow, loading downstream skills only
when a step needs them.

**These skills execute _within_ workflow, never instead of it:** `discovery`,
`draft-plan`, `test-first-development`, `subagent-execution`,
`subagent-deployment`, `preflight`, `finalize`, `code-review`,
`root-cause-analysis`, `live-verification`, `plan-review`, `technical-spec`.

If you find yourself reaching for one of those as the *first* skill of a task,
you have skipped the router — go back to `/condux:workflow`. Debugging is the
most common miss: a crash report, a stack trace, or "why does this fail" is
still a dev task, so it routes through workflow, which loads
`root-cause-analysis` at the right moment.

**Not a valid bypass:** your own judgment that a task "seems small". Tier
inference is the router's job, not yours. The only valid bypasses are explicit
user instructions — "skip workflow", "just do it", "I've already planned this".

**Not everything is a dev task.** Questions, explanations, code reading, research,
and one-line factual answers route nowhere — answer them directly. Routing a
conversation through a workflow is as wrong as skipping the router on a feature.
</EXTREMELY_IMPORTANT>
