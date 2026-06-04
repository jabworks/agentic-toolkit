---
name: verification
description: Lightweight "am I actually done?" checklist before calling /finalize. Prevents premature completion — catches skipped steps, missing behavior, and silent regressions. Called automatically at the end of every /workflow tier before /finalize runs. Can also be triggered standalone with "verify this" or "am I done?".
argument-hint: "[task or feature name]"
---

# /verification

Before you call done — actually check that you're done.

## Usage

```
/verification              # check current task
/verification <task name>  # explicit scope
```

## How It Works

Run through this checklist. Every item must be answered honestly — not optimistically.

```
┌──────────────────────────────────────────────────────────────────┐
│                       VERIFICATION                              │
├──────────────────────────────────────────────────────────────────┤
│  □ REQUIREMENTS MET                                             │
│    Can I point to each requirement and show it's implemented?   │
│    Not "I think so" — actually trace it.                        │
│                                                                  │
│  □ PLAN STEPS COMPLETE (LARGE tasks)                           │
│    Is every task card in the plan marked done?                  │
│    Any skipped or partially completed steps?                    │
│                                                                  │
│  □ EDGE CASES HANDLED                                           │
│    What happens with: empty input, null, zero, max value,       │
│    concurrent requests, missing permissions, expired tokens?    │
│    Have the relevant ones been considered?                      │
│                                                                  │
│  □ NO REGRESSIONS INTRODUCED                                    │
│    Did the change touch anything outside the stated scope?      │
│    Could it affect adjacent features or shared utilities?       │
│                                                                  │
│  □ NOTHING LEFT BEHIND                                          │
│    No console.log, no debug code, no TODO comments that         │
│    weren't there before, no commented-out blocks.               │
│                                                                  │
│  □ READY FOR FINALIZE                                           │
│    All the above are yes → call /finalize                       │
│    Any are no → fix first, then re-check                        │
└──────────────────────────────────────────────────────────────────┘
```

## Common Rationalizations

| Claim                                          | Reality                                                  |
| ---------------------------------------------- | -------------------------------------------------------- |
| "I tested it manually, it works"               | Manual testing doesn't substitute for /finalize. Run it. |
| "I'll clean up the debug logs in a follow-up"  | They ship. Clean up now.                                 |
| "The edge cases are unlikely"                  | They happen in production. Consider them now.            |
| "The plan steps were mostly done"              | Mostly done is not done.                                 |
| "I only changed one line, nothing could break" | One-line changes cause regressions too.                  |

## Output

```
## Verification: [task name]

□ Requirements met     ✓ / ✗ [notes]
□ Plan steps complete  ✓ / ✗ [notes]  (or N/A for SMALL/MEDIUM)
□ Edge cases handled   ✓ / ✗ [notes]
□ No regressions       ✓ / ✗ [notes]
□ Nothing left behind  ✓ / ✗ [notes]

→ Ready for /finalize  [YES / NO — list blockers if NO]
```

If any item is NO: fix it first. Do not proceed to /finalize with known gaps.
