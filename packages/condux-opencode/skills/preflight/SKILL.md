---
name: preflight
description: "Lightweight \"am I actually done?\" checklist before calling /finalize. Prevents premature completion — catches skipped steps, missing behavior, and silent regressions. Runs before /finalize at the end of every /workflow tier (automatic on SMALL; the recommended CP-2 choice on MEDIUM/LARGE). Also trigger standalone on \"verify this\", \"am I done?\", or \"preflight\". Not for executing typecheck, lint, format, and tests; use finalize. Not for actually running the change and observing it work in a browser or CLI; that's live-verification, after finalize."
argument-hint: "[task or feature name]"
---

# /preflight

Before you call done — actually check that you're done.

## Usage

```
/preflight              # check current task
/preflight <task name>  # explicit scope
```

## How It Works

Run through this checklist. Every item must be answered honestly — not optimistically.

```
┌──────────────────────────────────────────────────────────────────┐
│                        PREFLIGHT                                │
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
│  □ SPEC DRIFT (when a spec exists)                              │
│    Locate specs/<slug>/ (same lookup as the /workflow router).  │
│    Compare the diff against each existing concern file —        │
│    both directions count. No spec → N/A, no commentary.         │
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

## Drift Check

Runs only when the task has a spec. Locate it the way the `/workflow`
router does: detect the package root, then check both scopes —
`<package-root>/specs/<slug>/` and `<git-root>/specs/<slug>/` (fuzzy
kebab-case match of the task subject; nearest match wins). No spec dir →
mark `N/A` and move on, without comment.

Compare the implementation against each concern file that exists — a
missing or scaffold-only file makes no claim, skip it:

| Concern file | Check the implementation against |
|---|---|
| `api.md` | contracts touched — shapes, error forms, external calls |
| `fields.md` | source-to-UI mappings and transformations |
| `quirks.md` | edge cases and failure modes the spec says are handled |
| `implementation.md` | key files and patterns the spec says to follow |

**Both directions count.** Code that violates a spec'd contract is drift;
a spec gone stale because the implementation legitimately evolved is drift
too. Scope stays at the *task's* spec dir — this is never a whole-`specs/`
staleness audit.

**Findings are a soft gate.** Report each divergence in the findings table
(see Output) and let the user decide per finding — one batched question,
not one at a time:

- **fix code** — the spec is right; the implementation changes
- **update spec** — reality is right; update the spec file visibly (never
  silently — that's technical-spec's standing rule)
- **accept** — knowingly ship the divergence; record it in the output

Drift never blocks `/finalize` by itself — but an unreported divergence is
a preflight failure like any other.

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
## Preflight: [task name]

□ Requirements met     ✓ / ✗ [notes]
□ Plan steps complete  ✓ / ✗ [notes]  (or N/A for SMALL/MEDIUM)
□ Edge cases handled   ✓ / ✗ [notes]
□ Spec drift           ✓ / ✗ / N/A [notes]  (N/A = no spec for this task)
□ No regressions       ✓ / ✗ [notes]
□ Nothing left behind  ✓ / ✗ [notes]

→ Ready for /finalize  [YES / NO — list blockers if NO]
```

When Spec drift is ✗, list the findings and collect one decision per row:

```
| concern file | spec says | implementation does | decision |
|---|---|---|---|
| api.md | error shape {code, msg} | throws bare string | fix code / update spec / accept |
```

Accepted findings stay in the output — they ship knowingly, not silently.

If any item is NO: fix it first. Do not proceed to /finalize with known gaps.
