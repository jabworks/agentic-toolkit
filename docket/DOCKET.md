# AGENTIC-TOOLKIT DOCKET

**Open items only.** Closed items move to `archive/<year>.md` with their
verification records. The id space is shared across open and archive and ids
are never reused — a "#N" in a commit subject refers to these numbers (this
docket is the tracker). When an item ships: stamp it ✅ with the date and
verification status, then move the entry to the archive in the same action.
Stale open markers cost real sessions — closing means moving.

## Committed

### 32. subagent-deployment routes at 62.5% — four of six misses bleed to workflow (2026-08-15)

Measured 2026-08-15 during the git-worktree eval run (#26), full corpus,
claude-haiku-4-5-20251001, 582 cases. Overall was 90.0% — in the established
~89-92% band. **subagent-deployment scored 10/16 = 62.5%**, the weakest skill
in the corpus by a wide margin and roughly 27pp below band.

Nothing to do with the change that surfaced it. The failure mode is coherent
rather than noisy, which is what makes it worth fixing:

| query | expected | got |
|---|---|---|
| fix these 3 unrelated failing test files at once | subagent-deployment | workflow |
| two independent bugs in different packages, handle both | subagent-deployment | workflow |
| batch these lookups together | subagent-deployment | null |
| spawn a generic subagent with this custom prompt | subagent-deployment | null |
| one small task, just do it yourself | workflow | null |
| parallelize the test suite in ci | null | workflow |

**Four of six involve `workflow`** — twice swallowing a case that should reach
the fan-out skill, once being the expected answer and losing to null, once
capturing a should-not-trigger case. That is a one-hop adjacency, exactly the
error class A3 names as dominant.

The plausible mechanism, to be checked not assumed: `workflow`'s trigger
contract claims *every* implementation request ("Trigger with any
implementation request… Every dev task starts here"), which is true as routing
doctrine but makes its description a strong attractor for any multi-task
phrasing. `subagent-deployment` then has to win against a skill that has
declared itself the universal entry point. The two do not currently name each
other in `tests/skill-routing-contracts.test.mjs` — the pairs there are
`['subagent-deployment','subagent-execution']` only.

Worth considering, in order:

1. Add `['subagent-deployment','workflow']` to the routing-contracts pairs so
   the seam is at least test-enforced in both directions.
2. Sharpen subagent-deployment's description on the *independence* signal
   (nothing shared, no ordering) rather than on the fan-out mechanics, since
   "3 unrelated files" and "two independent bugs" are the exact phrasings that
   missed.
3. Re-measure. Do not tune the corpus — two of the six ("batch these lookups
   together", "parallelize the test suite in ci") may be genuinely ambiguous
   cases worth keeping as recorded misses.

Prior art on the seam problem: docket #10 (semantic collision detection) and
#14 (trajectory-based eval) both bear on measuring exactly this.

## Someday

### 7. Spec MCP server — revisit when specs gain write-side invariants (2026-08-05)

Declined for now (2026-08-05): specs are read-mostly markdown — router lookup is ls + fuzzy match, agents read files natively, and a server would duplicate the file path every skill must keep anyway. Reconsider docket-style (thin MCP over a CLI) only if specs grow mutations worth guarding: enforced changelog stamps on drift decisions, cross-spec link integrity, or a host-enforced spec-before-plan gate.

### 10. Reopen A4 collision detection — the falsification was lexical-only (2026-08-09)

A4 (collision automation) is recorded as CLOSED in
`skills/toolkit-research-frontier/references/health-campaign.md`: the
preregistered criterion was "static n-gram overlap reproduces >=80% of observed
collisions with <20% false alarms", and `scripts/collision-scan.mjs --check`
returned **max 5% recall at every threshold 0.08-0.18**.

The verified reason for that result is method-specific, and reads as a general
closure today: our collisions are *semantic* adjacencies whose contracts share
almost no vocabulary, because the 2026-07-08 disambiguation passes had already
de-overlapped them lexically. That falsifies n-grams. It says nothing about a
semantic detector.

Upstream precedent: `github/awesome-copilot`, `.github/workflows/duplicate-resource-detector.md`
(MIT) — a weekly scheduled agentic workflow with three ideas we never tried:

| idea | what it does |
|---|---|
| semantic compare | name + description + first ~20 body lines, judged by meaning, with worked negatives in the prompt (two same-style code-review resources = duplicates; general-React vs React-testing = not) |
| durable accept-list | searches *closed* issues labelled `duplicate-review` for "intentionally separate" / "keep both" / checked boxes, excludes those pairs, annotates re-flags with "(previously reviewed — see #N)" |
| containment | `safe-outputs: create-issue: {max: 1, close-older-issues: true}` + `noop` when clean — the agent can never hold more than one open issue |

Why it fits here specifically: A3's dominant error mode is one-hop adjacency
pairs (discovery<->session-handoff on "resume", draft-plan<->technical-spec on
doc-creation) — exactly the signal a semantic detector reads and a lexical one
cannot. And we already own the accept-list ingredient: the curated
empirical-pair registry inside `scripts/collision-scan.mjs`, currently updated
by hand per eval round.

Decide before building: whether the accept-list lives in GitHub issues (their
model, needs the workflow to have issue read access) or stays in the repo as
the existing registry (our model, no egress, but needs a review ritual).

Whatever the outcome, this needs an A4 addendum in `health-campaign.md`
recording that the falsification was method-specific — the entry currently
reads as though collision automation is a dead end in general.

Found 2026-08-09 surveying awesome-copilot's maintenance machinery.

### 14. Price a trajectory-based routing eval against the judge-prompt harness (2026-08-09)

`scripts/eval-triggers.mjs` renders the live skill catalog into a prompt and
asks a judge model which skill it would route each query to. That is deliberate
— the header says it presents "the catalog the host sees" — and it produced ten
dated reports and a defensible ~89-92% operating band. Its known cost is written
into A3: **judge variance is the dominant error mode** (44 flaky cases, mostly
one-hop adjacencies).

A different measurement exists. `@microsoft/vally` (MIT, 0.13.0) ships
`dist/graders/static/skill-invocation-grader.js`: it takes
`{required: string[], disallowed: string[]}`, walks `trajectory.events`, counts
`event.type === "skill_activation"`, and passes only when every required skill
activated and no disallowed one did. Grader metadata is `costProfile: "free"`,
`determinism: "static"` — the grading is free and deterministic. The cost sits
entirely in producing the trajectory: one real agent run per stimulus, against
~394 cases.

What it would buy: no judge variance, and it measures the host's actual
skill-loading behaviour rather than a model's opinion about a rendered catalog.

The primitive worth stealing regardless of the verdict: **`disallowed`** — a
first-class "this skill must NOT fire here" assertion. Our `should_trigger:
false` cases approximate it as a routing decision, not as an observed
non-activation, which is a weaker claim about exactly the collisions we care
about most.

This is a pricing exercise, not a rewrite. Concretely: run a ~30-case subset
both ways, compare per-case agreement, and cost the full run in wall-clock and
tokens. If the two agree closely, the cheap harness is vindicated and this
closes; if they diverge on the flaky adjacency seams, that is a real finding
about A3's numbers.

Also in vally if this ever gets built out: `compare` (pairwise comparison of two
eval runs — what we do by hand across dated reports), `max-repeat` and
`loop-outcome` graders, JSONL/JUnit/markdown reporters.

Found 2026-08-09 surveying awesome-copilot's maintenance machinery.

### 33. technical-spec's scaffold writes no purpose line, so every new spec starts at "—" in the catalog (2026-08-16)

Follow-up from #77 (spec-browser 1.1.1), which fixed the reading half of this.

#### The gap

`skills/technical-spec/references/scaffold.sh` writes `index.md` as a title
followed straight by a metadata block — `**Last updated:**`, `**Commit:**`,
`**Status:** draft`, then `## Contents`. There is nowhere for a one-line
purpose to go. spec-browser's catalog looks for a `>` note or an opening prose
paragraph, finds neither, and renders `—`.

#77 made that `—` *honest* — before it, the catalog reported
`**Last updated:** 2026-08-13` as the purpose of six of nine specs. But honest
is not useful: every spec scaffolded from now on still lands in the catalog
with no description until someone adds one by hand, which is exactly the step
people skip. Three of this repo's own specs needed one backfilled in #77, and
they were the oldest ones — the pattern is not hypothetical.

#### Shape of the fix

Add a `>` purpose placeholder to the scaffold template, between the title and
the metadata block.

Open question worth deciding rather than assuming: a literal placeholder would
be generated into the catalog verbatim until edited, which is arguably worse
than `—` because it looks like content. Alternatives: have the scaffold prompt
for the purpose (it already takes a name argument), or teach build-index.js to
treat a known placeholder string as absent. Decide before implementing.

#### Why it was not folded into #77

The scaffold belongs to `technical-spec`, which ships in condux — a different
plugin from spec-browser. Touching it needs its own version bump and, because
sync regenerates `packages/condux-opencode/skills/`, an npm changeset
(`pnpm changeset`), or `npm-channel.test.mjs` fails. Deliberately kept out of a
spec-browser patch.

#### Related

Nothing validates the shape of `specs/` entries. No test walks the tree, so a
malformed spec dir stays silently malformed — `specs/friction-audit-2026-07-29/`
has no `index.md` at all and is invisible to the catalog by design, which is
correct but undetected.

## Loose threads
