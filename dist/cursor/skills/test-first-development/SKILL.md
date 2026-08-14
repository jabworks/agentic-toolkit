---
name: test-first-development
description: "Tests-first development — write tests before implementation. Opt-in only: one upfront consent (write tests first + auto-run), then run the cycle without re-asking. Trigger when the user explicitly asks for tests-first, picks it at a workflow checkpoint, or when implementing logic with clear input/output behavior. Also triggers whenever an existing test spec is about to be edited to make it pass — that decision runs through this skill."
argument-hint: "<what to test>"
---

# /test-first-development

Tests first, implementation second. But only when you've asked for it.

## Usage

```
/test-first-development $ARGUMENTS
```

## The Ask Rules

**One upfront consent, then work.** At skill start, ask once:

```
"Tests-first for this task: I'll write failing tests, auto-run them
 through each red-green-refactor cycle, and implement against them.
 Ok to proceed?"
```

Wait for yes. After that, do **not** re-ask before writing new tests or
running them — the cycle needs fast red-green feedback, and re-asking at
every step is noise. If invoked from a `/workflow` checkpoint where the
user already picked "Write tests first", that pick *is* the consent —
start immediately.

**The one standing exception — updating existing test specs.** Always ask
before modifying any existing test file:

```
"This change affects existing test specs — want me to update them,
 or review the diffs first?"
```

Never silently update an existing spec. That is a decision point every time.

## The RED-GREEN-REFACTOR Cycle

```
┌──────────────────────────────────────────────────────────────────┐
│                      TDD CYCLE                                  │
├──────────────────────────────────────────────────────────────────┤
│  RED                                                            │
│  → Write the failing test                                       │
│  → Run it — it must fail before moving on                       │
│    (a test that passes immediately proves nothing)              │
│                                                                  │
│  GREEN                                                          │
│  → Write the minimal implementation to make it pass            │
│  → Run it — it must pass before moving on                       │
│                                                                  │
│  REFACTOR                                                       │
│  → Clean up without changing behavior                           │
│  → Run the tests again — they must still pass                   │
└──────────────────────────────────────────────────────────────────┘
```

Run only the relevant test file(s) during the cycle — the full suite
belongs to `/finalize`.

## What Makes a Good Test

```
✓ Tests behavior, not implementation details
✓ One clear assertion per test
✓ Descriptive name: "should return error when token is expired"
✓ Tests edge cases discovered during thinking, not after
✓ Independent — doesn't rely on other tests running first

✗ Tests internal function calls or private methods
✗ Tests that only pass because of the implementation you just wrote
✗ Vague names: "test1", "should work"
✗ Tests that need other tests to run first
```

## Updating Existing Test Specs

This is the most dangerous operation in TDD. Silently rewriting specs to make a bug fix pass is how bugs get buried.

Before touching any existing test file:

1. Show the current spec and what would change
2. Explain why the change is necessary (behavior change vs. test was wrong)
3. Wait for explicit approval

```
Legitimate reasons to update a spec:
  ✓ The feature behavior intentionally changed (product decision)
  ✓ The test was testing the wrong thing (implementation detail)
  ✓ The test was brittle/flaky and needs a better assertion

NOT legitimate:
  ✗ "The test was failing so I updated it to match the new output"
  ✗ "The behavior changed as a side effect of the fix"
```

## When TDD Applies (and When It Doesn't)

```
Good candidates for TDD:
  ✓ Pure functions with clear inputs/outputs
  ✓ Utility logic (date formatting, currency, validation)
  ✓ API handlers with predictable request/response shapes
  ✓ Bug fixes where a failing test proves the bug exists

Poor candidates (don't force TDD here):
  ✗ UI layout and visual components
  ✗ Framework glue code (wiring up routes, registering providers)
  ✗ One-off scripts or migrations
  ✗ Prototyping — test after shape is clear
```

## See Also

- `references/rationalization-table.md` — common rationalizations for skipping tests-first and why they're wrong
