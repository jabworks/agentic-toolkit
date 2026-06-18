---
name: systematic-debugging
description: "Use when investigating any bug — before proposing fixes, before making changes. Enforces root-cause-first investigation: read the error, reproduce it, trace the data flow backward. Never propose a solution before completing the investigation phase."
argument-hint: "<error message or bug description>"
---

# /systematic-debugging

Investigate first. Fix second. Always.

## Usage

```
/systematic-debugging $ARGUMENTS
/systematic-debugging "TypeError: cannot read property of undefined in checkout"
```

## The Four Phases

Run in order. Don't skip ahead.

```
┌──────────────────────────────────────────────────────────────────┐
│  Phase 1: ROOT CAUSE INVESTIGATION                              │
│  - Read the full error message and stack trace                  │
│  - Reproduce the failure (confirm it's real, not stale)        │
│  - Check recent changes: git log since last known good state    │
│  - Trace data flow backward from the failure point             │
│                                                                  │
│  Phase 2: PATTERN ANALYSIS                                      │
│  - Find working examples of the same pattern in the codebase   │
│  - Compare broken path vs working path completely               │
│  - Identify the single difference                               │
│                                                                  │
│  Phase 3: HYPOTHESIS + SINGLE-VARIABLE TEST                     │
│  - Form one hypothesis                                          │
│  - Design a test that proves or disproves it                    │
│  - Change exactly one thing                                     │
│                                                                  │
│  Phase 4: IMPLEMENT THE FIX                                     │
│  - Write a failing test first (if /tdd is active)              │
│  - Apply the single targeted fix                                │
│  - Verify the fix resolves the root cause, not symptoms        │
└──────────────────────────────────────────────────────────────────┘
```

## Hard Rules

**Never propose a solution in Phase 1.** Investigation comes first — no exceptions.

**Three strikes.** If three independent fixes have all failed:
- Stop patching.
- Step back and question whether the problem is where you think it is.
- Ask the user before continuing.

**One variable at a time.** Multiple simultaneous changes make it impossible to know what fixed what.

## Red Flags — Stop and Reassess

```
✗ Proposing solutions before reading the full stack trace
✗ Changing multiple things at once "to see what works"
✗ Continuing to patch after 3 failed attempts
✗ Treating a symptom as the root cause
✗ Skipping reproduction ("it's obvious what the problem is")
```

## Integration with Condux

- **Phase 4 + /tdd active**: write a failing test before the fix
- **After fixing**: run `/verification` to confirm nothing regressed
- **Bug reveals architectural issue**: escalate to `/brainstorm` before patching further
