# Finalize Rationalization Table

Common reasons agents skip or shortcut the finalize gate — and why they're wrong.

| Rationalization                                     | Reality                                                                                  | Counter                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| "The change was too small to break types"           | Type errors compound. A small change that breaks an import breaks everything downstream. | Run typecheck. It takes seconds.                                           |
| "I already ran lint during implementation"          | Lint state during implementation is stale. You may have added new violations since.      | Run lint once at the end, clean.                                           |
| "Tests were passing before my change"               | Your change may have introduced a regression that existing tests catch.                  | Run tests. That's their purpose.                                           |
| "I'll skip format — it's just whitespace"           | Noisy diffs make code review harder and hide real changes.                               | Format is auto-fixed and non-blocking. There's no reason to skip it.       |
| "The tests take too long to run"                    | Check AGENTS.md for a fast/watch mode. Scope the run to the affected package.            | Run scoped tests. Don't run the full suite if there's a faster option.     |
| "I fixed the failing test so I can skip re-running" | The fix might have introduced a new failure.                                             | Re-run the affected test(s). One command.                                  |
| "Typecheck is already run by the build"             | The build runs in CI, not locally. You want to catch errors before push, not after.      | Run typecheck locally before committing.                                   |
| "I'll fix the lint errors in a follow-up"           | Follow-ups don't happen. The lint errors accumulate and become background noise.         | Fix now. It's part of the task.                                            |
| "There are too many test failures to fix right now" | Stop and report. Don't merge broken tests.                                               | If tests are failing and you can't fix them, surface that — don't hide it. |
