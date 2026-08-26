---
name: discovery
description: "Refine a rough idea into a signed-off design, presented in sections for sign-off before any planning or code begins. Feeds the tech spec, written via technical-spec at sign-off. Trigger for LARGE tasks, when scope is unclear, or when the user wants to brainstorm or explore a rough idea. Also when resuming an existing design or design doc — the existing-design check offers resume-or-fresh. A soft gate before /draft-plan: if discovery has not run, ask whether to skip it consciously."
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
and both spec scopes — `<package-root>/specs/<slug>/` and
`<git-root>/specs/<slug>/`, the workflow router's two-scope lookup (slug =
kebab-case of the feature name). If any
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
│  UI surface or data model involved? Load `blueprint` to        │
│  render the proposal visually — wireframes and diagrams        │
│  become part of what gets signed off.                           │
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

For full design mockups — UI wireframes and renders in the house token
language, data-model / flow / architecture diagrams — load the `blueprint`
skill; the design doc links the files it produces. At sign-off, offer to
promote the chosen wireframes to render mode (a style-block swap). For
*picking between* side-by-side options in the browser, see
`references/mockup-picker.md` (it can point at blueprint's files).

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
node /path/to/plan-review/references/annotate-server.js .condux/designs/<file>.md --steer --no-reject
```

Poll `GET http://127.0.0.1:7777/api/decision` (long-poll — blocks until a
decision is submitted) and branch on the result. Design review is
**accept-or-fix** — `--no-reject` hides the Reject verdict, which belongs to
plan review, not the design stage (directory/spec review hides it on its own;
the flag matters for single-file design review):

- **Approve** → design is signed off; proceed to `/draft-plan`, carrying any
  feedback notes into the plan.
- **Request Revisions** → revise the design file in place per the feedback
  (the open tab live-reloads over SSE), then poll again.

**If straight to planning chosen:** proceed directly, no server launch.

## Spec Integration (Live Preview)

Integrates with `technical-spec` to persist the design and render it live while
discovery runs. At sign-off (Step 7), unless the user opts out: run
`technical-spec`'s scaffold script to create the spec directory, write the
design's decisions/contracts/mappings/edge-cases into its concern files
(`decisions.md`, `api.md`, `fields.md`, `quirks.md`, `implementation.md`), then
launch `plan-review`'s directory-mode preview against that spec path so it
live-reloads as the conversation refines the design. Full commands, the
existing-spec check, and how to action a submitted review decision:
`references/spec-integration.md`.
