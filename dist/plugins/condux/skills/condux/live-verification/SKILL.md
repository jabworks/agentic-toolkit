---
name: live-verification
description: Verify a change by actually running it — drive the real UI or endpoint, check each claim against observed behaviour, and capture evidence before pushing. Detects what's runnable, checks light mode then dark, and reports claim → evidence → verdict with unverifiable claims named rather than hidden.
when_to_use: After /finalize, before committing or pushing a change that has a runnable surface — UI, page, component, endpoint, CLI. Triggers include "verify it live", "did this actually work", "check it in the browser", "live verify before pushing", "does it render right". Not for typecheck/lint/test (that's finalize), not for auditing plan completeness (preflight), not for reading code to judge it (code-review).
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
`<git-root>/.condux/verification/<YYYY-MM-DD>-<slug>/` and reference the file
in the report. Console errors and failed network requests seen along the way
get reported even when they belong to another feature.

### Step 5 — Report and stop

One pass. Fix what you found, re-verify only the claims that failed, then
stop. This skill does not loop.

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

```
## Live verification: <change>

Target     http://localhost:3000 (pnpm dev — started by this run)
Themes     light ✓  dark ✓

Claim                                          Evidence            Verdict
Save disabled while mutation in flight         save-pending.png    ✓
Failed save shows server message inline        save-error.png      ✓
Escape closes dialog, focus returns to trigger —                   ✗ focus lands on body
Empty list renders the empty state             empty-state.png     ✓

Also seen: 2 console errors on mount (pre-existing, unrelated to this change)

1 claim failed. Fixed focus return in dialog.tsx:44 — re-verified ✓
```

When nothing could be driven:

```
## Live verification: <change>

Target     none — no dev/start/storybook script and nothing on the usual ports
Verdict    NOT VERIFIED — 3 claims unchecked, listed below
```

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

**Bootstrap.** `.condux/` is created on demand at the git root by the first
skill that writes there. Before the first write, check it's ignored:

```bash
git check-ignore -q .condux/ || echo "not ignored"
```

If it isn't, offer once: "condux keeps its working files in `.condux/` — add
it to `.gitignore` so they stay out of your commits?" On yes, append
`.condux/` to the repo's `.gitignore`. If the user would rather not touch a
tracked file, write it to `.git/info/exclude` instead. Never edit either file
without asking. Not a git repo → fall back to CWD and say so once.

**Override.** A project can relocate this in `AGENTS.md`; an explicit
override always wins.
