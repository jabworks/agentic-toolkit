---
name: discovery
description: Refine a rough idea into a signed-off design. Asks clarifying questions, surfaces alternatives, and presents the design in sections for sign-off before any planning or code begins.
when_to_use: Trigger for LARGE tasks, when scope is unclear, or when the user wants to brainstorm or explore a rough idea. Acts as a soft gate before /draft-plan — if discovery hasn't run, ask the user if they want to skip it consciously.
argument-hint: "<rough idea or feature description>"
effort: high
---

# /discovery

Turn a rough idea into a clear, agreed-upon design. Nothing gets planned or built until you sign off.

## Usage

```
/discovery $ARGUMENTS
```

## How It Works

Before Step 1, check for an existing design: glob `docs/plans/*<slug>*-design.md`
and `specs/<slug>/` (slug = kebab-case of the feature name). If either
exists, offer: "Found an existing design for this feature at `<path>` —
resume from there, or start a fresh discovery?" Accept either answer, same
as any other soft gate in this skill.

```
┌──────────────────────────────────────────────────────────────────┐
│                        DISCOVERY                                │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: SCOPE CHECK                                            │
│  Before asking detailed questions, assess:                      │
│    - Does this describe multiple independent subsystems?        │
│      → Flag decomposition opportunity before going deeper       │
│    - Is the request already well-defined (ticket, spec doc)?    │
│      → Ask: "This looks well-defined. Skip discovery and       │
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
│  Step 4: INLINE SELF-REVIEW                                     │
│  Before presenting the final design for sign-off, silently      │
│  check — and fix anything that fails:                           │
│    ✓ No placeholders or TBDs in the design                     │
│    ✓ All requirements covered                                   │
│    ✓ Out-of-scope items explicitly noted                        │
│    ✓ No subsystems that should be separate tasks               │
│                                                                  │
│  Step 5: SIGN-OFF                                               │
│  Get explicit approval: "Looks good, proceed to planning"      │
│  Do not proceed to /draft-plan without this.                    │
│                                                                  │
│  Step 6: SAVE THE DESIGN (mandatory)                            │
│  Write the design summary to                                    │
│  docs/plans/YYYY-MM-DD-<feature>-design.md — this is the       │
│  artifact /draft-plan's gate check globs for.                   │
│  Then offer the browser review loop (Design Review Loop).       │
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

If the user jumps straight to `/draft-plan` or starts describing implementation without running discovery:

> "We haven't run discovery on this yet — want to quickly align on the design first, or do you already have a clear picture and want to go straight to planning?"

Accept either answer. Never block. Never lecture.

## What Does NOT Happen

```
✗ Writing any code
✗ Writing a plan doc (that's /draft-plan)
✗ Asking questions one at a time in a long back-and-forth
✗ Proceeding to planning without explicit sign-off
✗ Treating a well-defined ticket as needing full discovery
```

## Output

A short design summary covering:

- What we're building and why
- Approach chosen + why alternatives were rejected
- Key constraints and out-of-scope items
- Open questions (if any remain after sign-off)

Save to: `docs/plans/YYYY-MM-DD-<feature>-design.md` — always, at sign-off
(Step 6). The saved file is what `/draft-plan`'s gate check globs for; a
design that lives only in conversation doesn't count as signed off.

For side-by-side layout comparisons or architecture diagrams during the design phase, see `references/mockup-picker.md`.

## Design Review Loop

After saving, always offer — mirroring `/draft-plan`'s post-save review:

> "Design saved to `<path>`. Want to review it in the browser before we plan,
> or go straight to /draft-plan?"

**If review chosen:** locate `annotate-server.js` from the installed
`plan-review` skill (`find ~/.claude ~/.codex ~/.agents -name
annotate-server.js -path '*plan-review*' 2>/dev/null | head -1`) and launch
it in `--steer` mode against the saved design file (or the spec directory,
if the design was saved as a tech spec — see Spec Integration below):

```bash
node /path/to/plan-review/references/annotate-server.js docs/plans/<file>-design.md --steer
```

Poll `GET http://127.0.0.1:7777/api/decision` (long-poll — blocks until a
decision is submitted) and branch on the result. Design review is
**accept-or-fix** — there is no Reject at this stage:

- **Approve** → design is signed off; proceed to `/draft-plan`, carrying any
  feedback notes into the plan.
- **Request Revisions** → revise the design file in place per the feedback
  (the open tab live-reloads over SSE), then poll again.

**If straight to planning chosen:** proceed directly, no server launch.

## Spec Integration (Live Preview)

Integrates with the `technical-spec` skill to persist the design and render it live while discovery runs.

### At discovery start

Infer the feature slug (kebab-case from `$ARGUMENTS`). Specs live under
`<git-root>/specs/`, mirroring the repo structure: check
`<git-root>/specs/<pkg-relpath>/<feature-slug>/` (pkg-relpath = the nearest
package root's path relative to the git root, empty at the root) and
`<git-root>/specs/<feature-slug>/` for an existing spec.

If found, offer:

> "Found an existing spec for this feature. Open live preview while we refine the design? [y/n]"

If yes, go straight to **Launch preview** below (skip scaffold + write — spec already exists).

### At sign-off

The Markdown design doc (Step 6) is always written. Additionally offer:

> "Also save the design as a tech spec and open the live preview? [y/n]"

If yes (the spec directory then becomes the target for the Design Review
Loop above, in directory mode):

1. **Find scripts** — the scaffold from technical-spec, the preview from
   plan-review (its annotate server renders spec directories):
   ```bash
   SCAFFOLD=$(find ~/.claude ~/.codex ~/.agents -name "scaffold.sh" -path "*technical-spec*" 2>/dev/null | head -1)
   PREVIEW=$(find ~/.claude ~/.codex ~/.agents -name "annotate-server.js" -path "*plan-review*" 2>/dev/null | head -1)
   ```
   If either is missing, tell the user: "the `technical-spec` / `plan-review` skills weren't found — install the condux plugin to enable spec integration."

2. **Scaffold** the spec dir and capture the output:
   ```bash
   SCAFFOLD_OUT=$(bash "$SCAFFOLD" "<FeatureName>")
   SPEC_PATH=$(echo "$SCAFFOLD_OUT" | sed 's/^[^:]*://; s/ .*//')
   ```
   `SPEC_PATH` is an absolute path (e.g. `/repo/specs/apps/web/wan-config`).
   The scaffold script places specs under `<git-root>/specs/`, mirroring the
   repo structure, automatically.

3. **Write initial spec files** from the design summary into `$SPEC_PATH/`.
   At minimum, write `decisions.md` with the chosen approach and rationale.
   Add `api.md` or `fields.md` if the design covers contracts or field mappings.

4. **Launch preview** in the background, pointing at the absolute spec path:
   ```bash
   node "$PREVIEW" "$SPEC_PATH"
   ```
   Tell user: "Preview is live. The browser updates automatically as spec files change, and you can annotate any file and submit a decision. Ctrl+C in the terminal to stop."

### Keeping the spec current

As discovery continues and design details shift, update the relevant spec files — the preview re-renders on every save. This is the main benefit: the spec stays in sync with the conversation instead of being written once at the end.

If the user submits a decision in the preview, read `$SPEC_PATH/review.feedback.md` (notes grouped by file) and action it. Spec review is accept-or-fix (directory mode has no Reject): **Approve** = design is signed off, proceed; **Request Revisions** = fix the spec files, then continue the loop.
