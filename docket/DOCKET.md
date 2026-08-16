# AGENTIC-TOOLKIT DOCKET

**Open items only.** Closed items move to `archive/<year>.md` with their
verification records. The id space is shared across open and archive and ids
are never reused — a "#N" in a commit subject refers to these numbers (this
docket is the tracker). When an item ships: stamp it ✅ with the date and
verification status, then move the entry to the archive in the same action.
Stale open markers cost real sessions — closing means moving.

## Committed

### 36. Re-measure the generic-subagent contract fix, and decide what to do about a corpus where 8% of cases are flaky (2026-08-16)

Filed 2026-08-16 when #32 closed. Two things that entry produced but could not
finish.

#### 1. An unvalidated fix

`spawn a generic subagent with this custom prompt` missed **0/3** in the
variance band — the only perfectly stable miss in `subagent-deployment`'s
corpus. Cause found: the skill's body bans generic subagents outright ("Never a
generic subagent with an injected prompt — only condux's four named agents")
but the trigger contract never said so, so the router could not see the rule it
was being scored on. The contract now names it.

**No eval has run since that edit.** It ships on reasoning, not measurement.
One band re-run answers it; the case is stable, so even a single run is
informative here in a way it was not for the flaky cases.

#### 2. The corpus is noisier than the effects being measured

The band reported **47 flaky cases out of 582** — 8% of the corpus changes
answer between identical runs. Mean was 90.9% ± 1.5pp. Every per-case
conclusion drawn from a single run this session was wrong or unsupported:

- `run these together` looked like a regression caused by an edit; it is 2/3.
- `parallelize the test suite in ci` looked fixed; it is 1/3.
- Only `fix these 3 unrelated tests` and `two independent bugs` (3/3) and
  `spawn a generic subagent` (0/3) said anything at all.

The operational lesson is cheap and worth writing down somewhere durable: **a
single run cannot support a per-case claim.** Anything below roughly 3pp needs
a band, and per-case verdicts need the stability column, not the accuracy
number.

The deeper question is what a flaky case *is*. Three candidate readings, and
they want different responses:

1. **Judge variance** — same prompt, different answer, nothing to fix but
   sample size. Prior art: A3 recorded 44 flaky cases; this run found 47, so
   the rate is stable across months and skill-set changes.
2. **Genuinely ambiguous stimulus** — two skills legitimately fit and the
   corpus forces one. `batch these lookups together` (1/3) reads this way. The
   `accept` alternates field already exists for exactly this and is underused.
3. **A real seam** the corpus is detecting intermittently. These are the
   valuable ones and they are currently indistinguishable from (1).

Deciding that is prerequisite to any future routing work, because right now
every measurement pays the full cost of a band to learn which bucket a case is
in.

Related: #14 (trajectory-based eval — `disallowed` assertions and deterministic
static grading would remove the judge from the loop entirely, which is one
answer to all of this), #10 (semantic collision detection).

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

## Loose threads
