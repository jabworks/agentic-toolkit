---
name: live-verification
description: Verify a change by actually running it — drive the real UI or endpoint, check each claim against observed behaviour, and capture evidence before pushing.
when_to_use: After /finalize, before committing, pushing, or merging a change with a runnable surface — UI, page, component, endpoint, CLI. Triggers include "verify it live", "did this actually work", "check it in the browser", "verify on preview", "live verify before pushing", "does it render right". Not for typecheck/lint/test (finalize), auditing plan completeness (preflight), or reading code to judge it (code-review).
argument-hint: "[what to verify — optional; defaults to the current diff]"
---

# /live-verification

Green tests are not evidence that the thing works. This skill closes the gap
between "the pipeline passed" and "I watched it do the thing".

## Usage

```
/live-verification                    # verify the current diff
/live-verification the upload dialog  # verify a named surface
```

## When It Applies

| Change touches | Run this? |
|---|---|
| A rendered surface — page, component, story, dialog | **Yes** |
| An endpoint, procedure, or CLI a human will call | **Yes** |
| Behaviour behind a flag or a state the tests don't reach | **Yes** |
| Types, docs, comments, config with no runtime effect | No — say so and skip |
| Code fully covered by a test that genuinely exercises it | Judgment: skip, and name the test you're leaning on |

Skipping is a legitimate outcome. Skipping *silently* is not.

## How It Works

### Step 1 — Resolve the run target

Do not assume a dev server. In order:

1. Something already running? Check the project's usual port before starting
   anything (`ss -tlnp` / `lsof -i` / the URL in `README` or `AGENTS.md`).
2. `AGENTS.md` — if it names the command to run the app, that command wins.
3. `package.json` scripts — `dev`, `storybook`, `start`, `preview`.
4. Nothing runnable → stop here and report that. Do not scaffold a harness.

Start it in the background, wait for it to actually serve (poll the URL — do
not `sleep` and hope), and note the URL in the report.

### Step 2 — Enumerate the claims

Before touching the UI, write down what the change claims to do — one line
each, from the diff and the task description. These are the only things you
verify. A change that claims four things needs four verdicts.

Bad: "the dialog works." Good: "Save is disabled while the mutation is in
flight", "a failed save shows the server's message inline", "Escape closes
the dialog and returns focus to the trigger".

### Step 3 — Drive it

Use whatever driving tool this environment actually has — a browser MCP, a
headless script the repo already ships, `curl` for an endpoint, or the CLI
itself. **Nothing is assumed installed.** If no driving tool exists, degrade
honestly: report what could not be driven rather than inventing a result.

Order of checks, because this is where the defects were:

1. **Light mode first.** Then dark. A themed change is not verified until it
   has been seen in both — that part is the gate, not the order.
2. **The interactive states**, not just the resting one — hover, focus,
   disabled, selected, and the in-flight state of every mutation.
3. **The failure path.** Make the thing fail on purpose if you can (offline,
   bad input, forced error) and confirm the error is surfaced where the user
   acted.
4. **Keyboard.** Tab to it, Escape out of it, confirm focus lands somewhere
   sensible.

### Step 4 — Capture evidence

One artifact per claim that has a visual or observable outcome — screenshot,
response body, console excerpt. Store under
`<git-root>/.condux/verification/<YYYY-MM-DD>-<slug>/` — everything a run
produces lives inside that dir, nothing at the verification root. Name each
evidence file for the claim it supports and reference it from the report's
claim table. Console errors and failed network requests seen along the way
get reported even when they belong to another feature.

Then write `report.md` into the same dir, in the shape of
`references/report-template.md` — every run writes one, including runs where
nothing could be driven (the template carries the fallback shape).

### Step 5 — Report and stop

The terminal report **is** `report.md`: print the file's content — never a
second shape that can drift from the persisted one. One pass. Fix what you
found, re-verify only the claims that failed, update `report.md` to match,
then stop. This skill does not loop.

## Failure Handling

The recurring failures here are environmental, not logical — treat them as
results, not as things to retry into the ground:

```
Server won't start / port already in use
  → Report it. Do not kill a process you did not start.

Out of memory, model won't load, dependency missing
  → Not your bug. Report "could not verify — <reason>" and stop.
     "Let's do live verify later" is a valid user answer.

Selector not found / element no longer exists
  → Re-read the current DOM once and retry with what's actually there.
     Second miss: report the claim as unverified, don't keep guessing.

Wait timed out
  → Poll for the condition, never a fixed sleep. On a real timeout, report
     it as a finding — a surface that takes longer than the timeout to
     appear is itself a defect worth naming.
```

Two failed attempts on the same claim is the ceiling. Report and move on.

## Output Format

The report shape — the fixed header table (Date / Target / Diff / Themes),
the claim table (Claim | Evidence | Verdict), "Also seen", and the outcome
line — lives in `references/report-template.md`, the canonical home. It also
carries the fallback shape for when nothing could be driven; that run still
writes `report.md`, because an absent report is indistinguishable from a run
that never happened. Fixed header keys and a fixed claim-table shape are what
make two runs of the same surface comparable.

## What Does NOT Happen

```
✗ Reporting a claim as verified because the code looks right
✗ Inventing a screenshot, a response, or a result that wasn't observed
✗ Installing a browser driver or scaffolding a test harness to get a result
✗ sleep-then-check instead of polling for the condition
✗ Retrying the same selector more than twice
✗ Killing processes the run didn't start
✗ Re-running typecheck/lint/tests — that was finalize's job
```

## Artifacts

Evidence is **working state**: `<git-root>/.condux/verification/`, gitignored,
alongside condux's `designs/` and `plans/`. Never the repo root, never the
project's `docs/`.

**Bootstrap.** Same contract as every condux skill — run the `.condux/`
bootstrap from `/workflow` → Artifacts (check `git check-ignore -q .condux/`,
offer the `.gitignore` line once, `AGENTS.md` override wins) before the first
write.
