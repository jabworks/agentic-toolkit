---
name: finalize
description: "End-of-task quality gate — typecheck → lint → format → tests. Runs in order, once. Stops on first failure and fixes before continuing. Run after all implementation is complete. Called automatically by /workflow, or standalone. Check AGENTS.md for the project's actual commands. Not for auditing whether requirements and plan steps are complete (preflight, first); not for running the change and watching it work (live-verification, after)."
argument-hint: "[package or path to scope — optional]"
---

# /finalize

One quality gate at the end. Typecheck → lint → format → test. In that order. Once.

## Usage

```
/finalize              # full repo
/finalize apps/web     # scoped to package or path
```

## Before Running

Check `AGENTS.md` for the project's finalize commands. If `AGENTS.md` defines a `finalize` script or step sequence, use that. Otherwise fall back to reading `package.json` scripts and infer the right commands. If no `.condux/plans/*<slug>*.md` exists for the inferred feature slug, note it in the output below — don't block. This is informational only, surfacing when a task ran without going through `/workflow` or `/draft-plan`, not a gate.

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                         FINALIZE                                │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: TYPECHECK                                              │
│  Run: typecheck script from AGENTS.md or package.json          │
│  → Failure: fix type errors, re-run typecheck only             │
│  → Clean: proceed to Step 2                                     │
│                                                                  │
│  Step 2: LINT                                                   │
│  Run: lint script from AGENTS.md or package.json               │
│  → Errors: fix, re-run lint only to confirm                    │
│  → Warnings: note them, do not block                           │
│  → Clean: proceed to Step 3                                     │
│                                                                  │
│  Step 3: FORMAT                                                 │
│  Run: format check, then auto-fix if dirty                     │
│  → Report which files were changed                             │
│  → Continue to Step 4 regardless (format is auto-fixed)        │
│                                                                  │
│  Step 4: TEST                                                   │
│  Run: test script from AGENTS.md or package.json               │
│  → Failure: diagnose, make one targeted fix, re-run            │
│    failing tests only (not full suite)                         │
│  → Still failing: stop, report, do not loop                    │
│  → Clean: done                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Failure Handling

```
Typecheck fails
  → Read the error carefully
  → Fix the type issue
  → Re-run typecheck only — do not proceed until clean

Lint fails (errors, not warnings)
  → Fix flagged issues (auto-fix with --fix if safe)
  → Re-run lint only to confirm clean
  → Do not proceed to tests until clean

Format is dirty
  → Run format --write
  → Note changed files in output
  → Continue — format never blocks

Tests fail
  → Read failure output carefully
  → Make one targeted fix
  → Re-run the failing test(s) only
  → If still failing: STOP and report — do not loop
```

## Output Format

The `Plan` line below only appears when no matching plan doc was found for the inferred feature slug — it's omitted entirely otherwise.

```
## Finalize: [task or feature name]

Typecheck  ✓ clean
Lint       ✓ clean  (2 warnings — not blocking)
Format     ✓ 2 files auto-fixed (Button.tsx, invoice.router.ts)
Tests      ✓ 18 passed, 0 failed
Env        ✓ 1 new var → .env.example updated (STRIPE_WEBHOOK_SECRET)
Plan       (none found for this task — treating as standalone scope)

Ready to commit.
```

On failure:

```
## Finalize: [task or feature name]

Typecheck  ✗ FAILED
  apps/web/src/components/InvoiceTable.tsx:42
  Property 'onExport' does not exist on type 'InvoiceTableProps'
  Fix: added onExport?: () => void to InvoiceTableProps
  Re-run: ✓ clean

Lint       ✓ clean
Format     ✓ clean
Tests      ✓ 18 passed
```

## Companion Files

One cheap scan of the diff, reported alongside the gate. It never blocks —
it exists because "remember to update the env example for newly added env vars"
should not have to be said again.

- A new env var anywhere in the diff (`process.env.X`, `import.meta.env.X`, a
  new key in an env schema, a new `docker-compose`/CI variable) ⇒ the project's
  example file (`.env.example`, `.env.sample`, or whatever it uses) gains the
  same key in the same change — placeholder value only, never a real secret.
- Report `Env  ✓ n/a` when the diff adds none, so the check is visibly running.

## What Does NOT Happen

```
✗ Running tests mid-implementation
✗ Running lint/typecheck after individual file edits
✗ Looping on test failures — one fix attempt, then stop and report
✗ Blocking on lint warnings (errors only)
✗ Running the full test suite multiple times
✗ Skipping steps because "the change was small"
```

## See Also

- `references/rationalization-table.md` — common rationalizations for skipping finalize and why they're wrong
