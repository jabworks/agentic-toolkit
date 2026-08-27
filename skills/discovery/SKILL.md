---
name: discovery
description: Refine a rough idea into a signed-off design, presented in sections for sign-off before any planning or code begins. Feeds the tech spec, written via technical-spec at sign-off.
when_to_use: "Trigger for LARGE tasks, when scope is unclear, or when the user wants to brainstorm or explore a rough idea. Also when resuming an existing design or design doc — the existing-design check offers resume-or-fresh. A soft gate before /draft-plan: if discovery has not run, ask whether to skip it consciously."
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
exists, read its frontmatter `status` and offer accordingly:

- `signed-off`, or no `status` field at all (the file predates the field, so
  it was saved at sign-off): "Found a signed-off design for this feature at
  `<path>` — resume from there, or start a fresh discovery?"
- `in-progress`: "Found a discovery that stopped partway at `<path>`
  (`<n>` sections agreed) — pick up where it left off, or start fresh?"

Accept either answer, same as any other soft gate in this skill.

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
│  Announce the section list, then create the design file        │
│  (status: in-progress) and open the live preview.              │
│  Present one section at a time in the card shape, get          │
│  acknowledgment, append the agreed section to the file.        │
│  §1 is approaches-and-tradeoffs; the rest follow the design.   │
│  Full contract: The Section Card, below.                        │
│  Does a section's decision turn on one of blueprint's five     │
│  questions? Load `blueprint` — the artifact path is cited      │
│  in the design doc as inline code, not opened in a new tab.    │
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
│  Step 7: SIGN OFF THE FILE + SPEC (mandatory)                   │
│  The design file already exists — Step 3 created it and        │
│  every agreed section is in it. Flip its frontmatter            │
│  status: in-progress → signed-off. That flip is what           │
│  /draft-plan's gate check reads.                                │
│  Spec write-back is default-on: persist the concern files       │
│  too (Spec Integration below) unless the user opts out.         │
│  The preview is already running — reuse it (Design Review       │
│  Loop); never launch a second server or open a second tab.      │
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
✗ A section card that runs past one screen, or a paragraph past three lines
✗ Launching a second preview server, or opening a tab the user didn't ask for
```

## The Section Card (Step 3)

Step 3 used to say "show design in sections" and stop, which left the shape to
be reinvented every time — and what came out was prose. The shape is now fixed.

**Before §1, announce the section list.** Name every section you intend to
present, in order: *"4 sections: approach · section shape · blueprint trigger ·
rollout."* Three lines, and the reader knows the shape of the conversation
before they are inside it. Then create the design file and open the preview
(next section), and begin.

**Every card, same skeleton:**

```
## §n of N · <name>                    ← position, always
<one line: what this section decides>

<the evidence — table, list, or a cited artifact path. Never a wall.>

**Recommendation:** <X>, because <one sentence>.
<the decision, as named options>
```

**Three rules underneath it:**

| Rule | Why |
|---|---|
| The card fits one screen — about 25 lines. Overflow goes into the design file, and the card links it. | Without a number this is advice, not a contract, and advice is what produced the walls. |
| No paragraph runs past three lines. Longer means it is a table or a list. | Prose is the failure mode. A table cannot sprawl. |
| Rejected alternatives get one line each with a why-not; the full reasoning lives in the file. | Alternatives are why the recommendation can be trusted, and are also what bloats the card. |

The per-section stops stay. They were never the problem — the problem was that
the design existed only as scrollback, so the thread was lost between them. The
`§n of N` marker and the live file are what hold it.

**Visuals.** Load `blueprint` when a section's decision turns on one of its five
questions — what entities exist · what happens in what order · what talks to
what · what states are legal · what goes where on a screen. Inside discovery
the artifact's git-root-relative path is *cited in the design doc as inline
code* (e.g. `.condux/designs/assets/checkout-flow.html`), never opened in its
own tab and never written as a clickable relative link — the annotate server
serves only the review page and `/api/*`, so a relative link 404s in the
preview. The preview reloads and shows the citation; the reader opens the
file from the editor or filesystem.

## The Design File and the Live Preview (Step 3 onward)

**The file is created at §1, not at sign-off.** Write
`.condux/designs/YYYY-MM-DD-<feature>.md` when Step 3 opens, and append each
section to it as it is agreed. This is the whole mechanism behind the card
contract: the card can stay small precisely because the design has somewhere
else to live.

**The file's shape lives in `references/design-template.md`** — the canonical
home of the frontmatter contract (`status` / `date` / `feature`), the section
set, and the lifecycle stamp saying when each part gets written. Copy its
at-creation parts when the file is created; append each agreed section in its
§-entry shape (the section card's presentation twin — same four facts).

At Step 7, flip `status` to `signed-off`. `/draft-plan` and the `planner` agent
both read that value; **a design file with `status: in-progress` does not
satisfy their gate**, which is what keeps an abandoned discovery from being
planned against. (A file with no `status` field at all predates this contract
and was only ever written at sign-off, so absence means `signed-off`.)

**The preview runs from §1, by default.** Launch it with the design file, in
manual mode — no `--steer`, which would block on a decision:

```bash
node /path/to/plan-review/references/annotate-server.js .condux/designs/<file>.md --no-reject
```

Manual mode renders, watches the directory and live-reloads over SSE without
blocking, so every appended section appears in the tab the reader already has
open. It still accepts a submitted decision, which means **one server covers
the whole of discovery** — launched at §1, still serving at sign-off. Never
start a second one.

Manual mode binds a **free port** — there is no fixed number to assume. The
server prints the URL on startup (`Plan review → http://127.0.0.1:<port>`, on
stderr); read it from that output and announce exactly that URL — do not ask
first:

> "Design preview running at http://127.0.0.1:<port> — it updates as we go.
> Say the word if you'd rather I close it."

The preview's purpose is to help make the *next* decision, so gating it behind
an opt-in defeats what it is for; and discovery only runs on the LARGE tier, so
there is no small case to protect from the ceremony. The default is visible and
reversible, never silent.

**Fail open.** No Node, no browser, headless, port taken — say so once in a
single line and continue terminal-only. The design file is still written and
still appended to; only the preview is missing. Never block discovery on it,
and never retry in a loop. `--no-open` exists for the headless case.

`.condux/` is gitignored working state, created on demand at the git root (see
`/workflow` → Artifacts). The bootstrap check now happens at §1 rather than at
sign-off — still ask only once.

## Output

A short design summary covering:

- What we're building and why
- Approach chosen + why alternatives were rejected
- Key constraints and out-of-scope items
- Open questions (if any remain after sign-off)

Detail-round answers (Step 4) belong in the spec concern files, not the
summary — the summary stays short; the spec carries the detail.

Lives at: `.condux/designs/YYYY-MM-DD-<feature>.md`, created at §1 and
appended to per section, in the shape of `references/design-template.md`
(see The Design File and the Live Preview). Step 7
does not write it — it flips its `status` to `signed-off`, and that flip is
what `/draft-plan`'s gate check reads. A design that lives only in
conversation doesn't count as signed off, and neither does one still marked
`in-progress`.

Honour an `AGENTS.md` path override if the project defines one.

For full design mockups — UI wireframes and renders in the house token
language, data-model / flow / architecture diagrams — load the `blueprint`
skill; the design doc cites the paths of the files it produces as inline
code, and the running preview shows the citation rather than a new tab
opening. At sign-off, offer to promote the chosen wireframes to render mode
(a style-block swap). If the spec references a blueprint artifact, promote
the file too: copy it into the spec directory and cite the committed path —
a committed spec may never point into `.condux/`, which is gone on any other
clone (workflow's citation-direction rule). For *picking between*
side-by-side options in the browser, see `references/mockup-picker.md` (it
can point at blueprint's files).

## Design Review Loop

At Step 7, after the status flip, always offer — mirroring `/draft-plan`'s
post-save review:

> "Design signed off at `<path>`. Want a pass over it in the browser before we
> plan, or go straight to /draft-plan?"

**The server is already running** — it has been since §1, and the reader has
been watching the design accumulate in it. Do not launch another and do not
open another tab. `--no-reject` is independent of `--steer`, so the design
stage's **accept-or-fix** semantics (no Reject verdict — that belongs to plan
review) are already in force from the §1 launch.

**If a review pass is chosen:** point the reader at the tab they already have,
ask them to annotate and submit a decision, and read the result — the submitted
decision lands in the feedback file in manual mode rather than being long-polled:

- **Approve** → proceed to `/draft-plan`, carrying any feedback notes into the plan.
- **Request Revisions** → revise the design file in place per the feedback (the
  open tab live-reloads over SSE), then ask again.

**If the preview failed open at §1** (no Node, no browser, headless) there is no
tab to point at. Say so in one line and go straight to planning; do not retry
the launch here.

**If straight to planning chosen:** proceed directly.

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
