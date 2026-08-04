---
name: discovery
description: "Refine a rough idea into a signed-off design. Asks goal-level questions, surfaces alternatives, then runs a post-approach detail round (contracts, mappings, edge cases) that feeds the tech spec (written via technical-spec at sign-off); presents the design in sections for sign-off before any planning or code begins. Trigger for LARGE tasks, when scope is unclear, or when the user wants to brainstorm or explore a rough idea. Also when resuming or continuing an existing design or design doc — the existing-design check offers resume-or-fresh. Acts as a soft gate before /draft-plan — if discovery hasn't run, ask the user if they want to skip it consciously."
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

Before Step 1, check for an existing design: glob `.condux/designs/*<slug>*.md`
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
│  Step 2: CLARIFY — GOAL ROUND                                   │
│  Ask targeted questions — one batch, not one at a time.        │
│  Focus on: goals, constraints, what "done" looks like,         │
│  known unknowns, and what should explicitly NOT be built.      │
│  No implementation detail yet — that's Step 4's job.           │
│                                                                  │
│  Step 3: PROPOSE                                                │
│  Present 2-3 approaches with tradeoffs.                        │
│  Show design in sections — get acknowledgment per section      │
│  before moving on.                                              │
│                                                                  │
│  Step 4: DETAIL ROUND — feed the spec                           │
│  With the approach chosen, ask ONE more batch, grouped by      │
│  spec concern — only concerns this feature touches,            │
│  max ~2 questions each:                                         │
│    api.md → contracts, error shapes, external calls            │
│    fields.md → source-to-UI mappings, transformations          │
│    quirks.md → edge cases, failure modes, known gotchas        │
│    implementation.md → key files, patterns to follow           │
│  Skip the round entirely if nothing is decidable yet.           │
│                                                                  │
│  Step 5: INLINE SELF-REVIEW                                     │
│  Before presenting the final design for sign-off, silently      │
│  check — and fix anything that fails:                           │
│    ✓ No placeholders or TBDs in the design                     │
│    ✓ All requirements covered                                   │
│    ✓ Out-of-scope items explicitly noted                        │
│    ✓ No subsystems that should be separate tasks               │
│    ✓ Every contract, mapping, or edge case named in the        │
│      design has a home in a spec concern file                   │
│    ✓ Unanswered detail questions surface as open questions,    │
│      never silently dropped                                     │
│                                                                  │
│  Step 6: SIGN-OFF                                               │
│  Get explicit approval: "Looks good, proceed to planning"      │
│  Do not proceed to /draft-plan without this.                    │
│                                                                  │
│  Step 7: SAVE DESIGN + SPEC (mandatory)                         │
│  Write the design summary to                                    │
│  .condux/designs/YYYY-MM-DD-<feature>.md — this is the         │
│  artifact /draft-plan's gate check globs for.                   │
│  Spec write-back is default-on: persist the concern files       │
│  too (Spec Integration below) unless the user opts out.         │
│  Then offer the browser review loop (Design Review Loop).       │
└──────────────────────────────────────────────────────────────────┘
```

## Scope Lock (part of Step 1)

The scope check runs in both directions. Decomposition catches a request that
is secretly several features; the scope lock catches the opposite failure —
quietly discovering against a wider surface than the one asked about, e.g.
auditing a whole repo when one plugin was named.

Before Step 2, state the target surface back in one line:

> "Reading this as scoped to `<the named package / plugin / directory>` — the
> rest of the repo is out of scope unless you say otherwise."

Then hold it. If the design starts to need something outside that surface,
name the crossing and get agreement before widening — do not widen silently
because the adjacent thing looked related. Narrowing works the same way: if
the user names a narrower target mid-discovery, that is the new surface, and
work already done against the wider one is dropped, not folded in.

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

**Two rounds, two altitudes.** The examples above govern Step 2 — goal
altitude only. Step 4's detail round is the deliberate exception: once an
approach is chosen, contract/mapping/edge-case questions ("what shape does
the API error return?", "which field feeds the status badge?", "what happens
when the upstream times out?") are exactly right, and their answers land in
the matching spec concern file. What stays bad at *every* stage:
micro-decisions the agent should make itself (button variants, hook choices,
file placement).

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
✗ Widening past the named target surface without saying so
```

## Output

A short design summary covering:

- What we're building and why
- Approach chosen + why alternatives were rejected
- Key constraints and out-of-scope items
- Open questions (if any remain after sign-off)

Detail-round answers (Step 4) belong in the spec concern files, not the
summary — the summary stays short; the spec carries the detail.

Save to: `.condux/designs/YYYY-MM-DD-<feature>.md` — always, at sign-off
(Step 7). The saved file is what `/draft-plan`'s gate check globs for; a
design that lives only in conversation doesn't count as signed off.

`.condux/` is gitignored working state, created on demand at the git root
(see `/workflow` → Artifacts). Before the first write, make sure it's
ignored — see the bootstrap step there. Honour an `AGENTS.md` path override
if the project defines one.

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
node /path/to/plan-review/references/annotate-server.js .condux/designs/<file>.md --steer
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

The Markdown design doc (Step 7) is always written. The spec write-back is
**default-on** — announce it rather than ask:

> "Saving this as a tech spec too (decisions + the concern files from the
> detail round) and opening the live preview — say no to skip."

Unless the user opts out (the spec directory then becomes the target for the
Design Review Loop above, in directory mode):

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

3. **Write initial spec files** from the design into `$SPEC_PATH/`.
   `decisions.md` always (chosen approach + rationale). Then every concern
   the detail round produced answers for gets its file: `api.md`,
   `fields.md`, `quirks.md`, `implementation.md`. A detail-round answer
   that never lands in a spec file is a bug in the flow, not a judgment call.

4. **Launch preview** in the background, pointing at the absolute spec path:
   ```bash
   node "$PREVIEW" "$SPEC_PATH"
   ```
   Tell user: "Preview is live. The browser updates automatically as spec files change, and you can annotate any file and submit a decision. Ctrl+C in the terminal to stop."

### Keeping the spec current

As discovery continues and design details shift, update the relevant spec files — the preview re-renders on every save. This is the main benefit: the spec stays in sync with the conversation instead of being written once at the end.

If the user submits a decision in the preview, read `$SPEC_PATH/review.feedback.md` (notes grouped by file) and action it. Spec review is accept-or-fix (directory mode has no Reject): **Approve** = design is signed off, proceed; **Request Revisions** = fix the spec files, then continue the loop.
