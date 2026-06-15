---
name: brainstorm
description: Refine a rough idea into a signed-off design before any planning or code. Trigger for LARGE tasks, before write-plan, or when scope is unclear. Asks clarifying questions, surfaces alternatives, presents design in sections for validation. Acts as a soft gate — if brainstorm hasn't run, ask the user if they want to skip it consciously before proceeding to planning.
argument-hint: "<rough idea or feature description>"
---

# /brainstorm

Turn a rough idea into a clear, agreed-upon design. Nothing gets planned or built until you sign off.

## Usage

```
/brainstorm $ARGUMENTS
```

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                        BRAINSTORM                               │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: SCOPE CHECK                                            │
│  Before asking detailed questions, assess:                      │
│    - Does this describe multiple independent subsystems?        │
│      → Flag decomposition opportunity before going deeper       │
│    - Is the request already well-defined (ticket, spec doc)?    │
│      → Ask: "This looks well-defined. Skip brainstorm and       │
│        go straight to planning?"                                │
│    - Is the scope genuinely unclear?                            │
│      → Proceed to Step 2                                        │
│                                                                  │
│  Step 2: CLARIFY                                                │
│  Ask targeted questions — one batch, not one at a time.        │
│  Focus on: goals, constraints, what "done" looks like,         │
│  known unknowns, and what should explicitly NOT be built.      │
│                                                                  │
│  Step 3: PROPOSE                                                │
│  Present 2-3 approaches with tradeoffs.                        │
│  Show design in sections — get acknowledgment per section      │
│  before moving on.                                              │
│                                                                  │
│  Step 4: SIGN-OFF                                               │
│  Get explicit approval: "Looks good, proceed to planning"      │
│  Do not proceed to /write-plan without this.                    │
│                                                                  │
│  Step 5: INLINE SELF-REVIEW                                     │
│  Before handing off, silently check:                            │
│    ✓ No placeholders or TBDs in the design                     │
│    ✓ All requirements covered                                   │
│    ✓ Out-of-scope items explicitly noted                        │
│    ✓ No subsystems that should be separate tasks               │
└──────────────────────────────────────────────────────────────────┘
```

## Clarifying Questions — Good vs Bad

```
Good (goal-oriented, unambiguous):
  ✓ "What does success look like for the user?"
  ✓ "Are there any libraries or patterns already in use we should follow?"
  ✓ "What should this explicitly NOT do?"
  ✓ "Is there a deadline or constraint that affects the approach?"

Bad (too detailed too early):
  ✗ "Should the button be primary or secondary variant?"
  ✗ "What exact file should this go in?"
  ✗ "Should we use useCallback here?"
```

## Soft Gate Behavior

If the user jumps straight to `/write-plan` or starts describing implementation without brainstorming:

> "We haven't brainstormed this yet — want to quickly align on the design first, or do you already have a clear picture and want to go straight to planning?"

Accept either answer. Never block. Never lecture.

## What Does NOT Happen

```
✗ Writing any code
✗ Writing a plan doc (that's /write-plan)
✗ Asking questions one at a time in a long back-and-forth
✗ Proceeding to planning without explicit sign-off
✗ Treating a well-defined ticket as needing full brainstorm
```

## Output

A short design summary covering:

- What we're building and why
- Approach chosen + why alternatives were rejected
- Key constraints and out-of-scope items
- Open questions (if any remain after sign-off)

Save to: `docs/plans/YYYY-MM-DD-<feature>-design.md` (optional — ask user)

Optionally generate an HTML visual using `references/brainstorm-design-template.html`.
Fill in the `{{PLACEHOLDERS}}` and open it in the browser for a scannable one-page summary.

For side-by-side layout comparisons or architecture diagrams during the design phase, see `references/visual-companion.md`.
