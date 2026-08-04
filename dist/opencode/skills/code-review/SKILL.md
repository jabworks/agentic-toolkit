---
name: code-review
description: "One-shot code review. Produces a diagnostic report categorized by severity (Critical / Important / Minor). Never fixes issues automatically. On-request only — never auto-triggers. At workflow CP-2 (pre-finalize, on request) or after /finalize, ask once: \"Want a code review before merging?\" Trigger phrases: \"review this\", \"review before merge\", \"check this PR\". Not for reviewing a plan or spec before implementation — that's plan-review. Not for running the change to watch it work — that's live-verification."
argument-hint: "<PR URL, diff, branch, or file path>"
---

# /code-review

One review pass. Categorized findings. You decide what to action. No fixing, no re-review, no loop.

## Usage

```
/code-review                    # review current changes
/code-review <branch or path>   # review specific scope
```

## When This Runs

Two sanctioned entry points:

- **Workflow CP-2** ("Implementation done") — the user picks "Code review first"
  and this skill runs on the diff before preflight/finalize.
- **After `/finalize` completes** — ask once:

> "Want a code review before merging?"

If yes → run this skill.
If no → done.

Do not ask again. Do not auto-trigger. Do not re-review after fixes unless explicitly requested.

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                       CODE REVIEW                               │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: SCOPE                                                  │
│  Read the diff or changed files.                                │
│  Understand what the change is trying to do.                    │
│                                                                  │
│  Step 2: REVIEW                                                 │
│  Evaluate across four dimensions (see below).                   │
│                                                                  │
│  Step 3: CATEGORIZE                                             │
│  Assign each finding to Critical, Important, or Minor.         │
│                                                                  │
│  Step 4: REPORT AND STOP                                        │
│  Output the report. Done.                                       │
│  Do not fix anything. Do not suggest re-reviewing.             │
└──────────────────────────────────────────────────────────────────┘
```

## Review Dimensions

**Security**

- Auth and authorization gaps
- Injection risks (SQL, XSS, CSRF)
- Secrets or credentials in code
- Unsafe deserialization, path traversal, SSRF

**Correctness**

- Edge cases (null, empty, overflow, concurrent access)
- Error handling and propagation
- Off-by-one errors
- Type safety gaps not caught by the type system

**Performance**

- N+1 queries
- Unbounded loops or queries
- Unnecessary re-renders or allocations
- Missing indexes

**Maintainability**

- Naming clarity
- Single responsibility violations
- Duplication
- Non-obvious logic without explanation

## Severity Definitions

| Severity         | Meaning                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| 🔴 **Critical**  | Must fix before merging. Security risk, data loss potential, or broken behavior. |
| 🟡 **Important** | Should fix soon. Not a blocker today, but will cause problems.                   |
| 🔵 **Minor**     | Worth noting. Style, small improvements, future-proofing.                        |
| ✅ **Good**      | Patterns worth keeping. Positive signal.                                         |

## Output Format

```markdown
## Code Review: [feature or branch name]

### Summary

[1-2 sentences: what the change does and overall quality signal]

### Findings

| Severity     | File               | Line | Finding       |
| ------------ | ------------------ | ---- | ------------- |
| 🔴 Critical  | `path/to/file.ts`  | 42   | [description] |
| 🟡 Important | `path/to/other.ts` | 18   | [description] |
| 🔵 Minor     | `path/to/file.ts`  | 67   | [description] |

### What Looks Good

- [Positive observations]

### Verdict

[Approve / Request Changes]
```

## What Does NOT Happen

```
✗ Auto-triggering after finalize without asking
✗ Fixing any finding automatically
✗ Requesting a re-review after fixes
✗ Looping: review → fix → re-review → fix → re-review
✗ Blocking merge on Minor findings
✗ Spawning a reviewer subagent (do the review inline)
```

## After the Report

The report is yours to action. Common next steps:

- **Critical findings** → fix via `/workflow` (new SMALL task), then decide if you want another review
- **Important findings** → create a follow-up task or fix now, your call
- **Minor findings** → note for later or ignore, your call
- **Nothing blocking** → merge

The agent does not manage this process. You do.
