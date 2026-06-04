---
name: test-driven-development
description: Test-driven development — write tests before implementation. Opt-in only. Trigger when the user explicitly asks for TDD, mentions tests, or when implementing logic with clear input/output behavior. Always ask before writing tests, before running tests, and before updating existing test specs. Never silently rewrite test specs to match new behavior.
argument-hint: "<what to test>"
---

# /test-driven-development

Tests first, implementation second. But only when you've asked for it.

## Usage

```
/test-driven-development $ARGUMENTS
```

## The Three Ask Rules

These are non-negotiable. Always ask before:

```
1. WRITING NEW TESTS
   "Do you want me to write tests for this first?"
   Wait for yes before proceeding.

2. RUNNING TESTS
   "Ready to run the tests — go ahead?"
   Wait for yes before running.

3. UPDATING EXISTING TEST SPECS
   "This change affects existing test specs — want me to update them,
   or review the diffs first?"
   Wait for yes before modifying any existing test file.
```

Never auto-run, never silently update. Each of these is a decision point.

## The RED-GREEN-REFACTOR Cycle

```
┌──────────────────────────────────────────────────────────────────┐
│                      TDD CYCLE                                  │
├──────────────────────────────────────────────────────────────────┤
│  RED                                                            │
│  → Write the failing test                                       │
│  → Ask user: "Run to confirm it fails?"                        │
│  → Test must fail before moving on                              │
│                                                                  │
│  GREEN                                                          │
│  → Write the minimal implementation to make it pass            │
│  → Ask user: "Run to confirm it passes?"                       │
│  → Test must pass before moving on                              │
│                                                                  │
│  REFACTOR                                                       │
│  → Clean up without changing behavior                           │
│  → Ask user: "Run tests again to confirm refactor is clean?"   │
│  → Tests must still pass                                        │
└──────────────────────────────────────────────────────────────────┘
```

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

- `references/rationalization-table.md` — common reasons to skip TDD and why they're wrong
