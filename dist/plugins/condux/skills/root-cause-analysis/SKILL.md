---
name: root-cause-analysis
description: Enforces root-cause-first bug investigation — read the error, reproduce it, trace the data flow backward. Never propose a solution before the investigation phase completes.
when_to_use: Trigger the moment debugging starts — never proactively — and always before any fix is proposed or any change is made. Phrases include "why is this failing", "this bug", "unexpected behavior", "error when I…", and declarative bug reports with no question mark — "checkout crashes on empty cart", "there's a bug where X happens" — a stated symptom is a bug report too. Not for a jabworks/agentic-toolkit skill or plugin misbehaving (won't trigger, won't show up, dist drift); that's toolkit-debugging-playbook.
argument-hint: "<error message or bug description>"
effort: high
---

# /root-cause-analysis

Investigate first. Fix second. Always.

## Usage

```
/root-cause-analysis $ARGUMENTS
/root-cause-analysis "TypeError: cannot read property of undefined in checkout"
```

## The Four Phases

Run in order. Don't skip ahead.

```
┌──────────────────────────────────────────────────────────────────┐
│  Phase 1: ROOT CAUSE INVESTIGATION                              │
│  - Spec check FIRST: detect package root (walk up from CWD to  │
│    git root, find nearest package manifest). Check:            │
│      <package-root>/specs/ and <git-root>/specs/               │
│    Match the failing feature/domain (fuzzy kebab-case).         │
│    If found, read quirks.md, api.md, fields.md,               │
│    implementation.md. Note any behavior contradicting the spec.│
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
│  - Write a failing test first (if /test-first-development is active)              │
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

- **Phase 4 + /test-first-development active**: write a failing test before the fix
- **After fixing**: run `/preflight` to confirm nothing regressed
- **Bug reveals architectural issue**: escalate to `/discovery` before patching further
- **Multiple unrelated failures**: if 2+ failures are independent (different
  files, no shared cause), use `subagent-deployment` to fix them
  concurrently instead of one at a time
