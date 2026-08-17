# AGENTIC-TOOLKIT DOCKET

**Open items only.** Closed items move to `archive/<year>.md` with their
verification records. The id space is shared across open and archive and ids
are never reused — a "#N" in a commit subject refers to these numbers (this
docket is the tracker). When an item ships: stamp it ✅ with the date and
verification status, then move the entry to the archive in the same action.
Stale open markers cost real sessions — closing means moving.

## Committed

### 37. Triage the 27 case-intrinsic flaky routing cases into accept alternates and one real seam (2026-08-17)

Split from #36, 2026-08-17, once the bucket question it asked was answered.

Two 3-run bands (2026-08-16 and 2026-08-17, identical parameters) share **27
flaky cases against 4.4 expected under pure judge variance — 6.2× chance**.
Flakiness is therefore predominantly a property of specific cases, not of the
judge, which is what makes this triable at all: each of the 27 can be settled
once instead of costing a full band every time it is re-encountered.

Three families, wanting three different responses.

**A. Two skills legitimately fit — use the `accept` alternates field.** It
already exists for exactly this and is underused. Clear members: `verify this`
(preflight / finalize / live-verification), `how is this repo organized` and
`im new to this repo, give me the lay of the land` (toolkit-orientation and its
neighbours), `any security issues in this change?` (code-review /
security-review), `batch these lookups together` (1/3 in both bands).

Care needed: an `accept` alternate is a claim that both answers are
doctrinally correct, not a way to make a number go up. Anything added here
should be defensible as "either routing serves the user."

**B. A real seam — test-routing.** Four cases cluster on the
test-first-development ↔ workflow boundary: `the test is failing so just fix
the test`, `update the failing test to match the new behavior`, `add tests for
the existing legacy code`, `write e2e tests with playwright for the flow`. Four
co-located cases is not sampling noise; this is a contract question about which
skill owns test work that arrives as a plain request. Answer the boundary
first, then decide what the corpus should expect.

**C. Known-hard oracle calls, carried deliberately.** `parallelize the test
suite in ci` (1/3) was ratified as a known miss on 2026-08-16 — an eval should
encode the correct answer, not the one the judge finds easy. Leave it, and
leave the record of why.

Method note worth keeping: the discriminator here was intersecting two bands'
flaky *sets*, not comparing their flaky *rates*. The rate was stable across
months and said nothing about cause; the set overlap answered it in one
computation. Any future "is this noise or a seam" question should reach for the
same test.

Related: #14 (trajectory-based eval — deterministic static grading removes the
judge from the loop, which would dissolve family A rather than annotate it).

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

### 38. OpenCode has no routing enforcement — condux ships the SessionStart hook to Claude and Codex only (2026-08-17)

Noticed 2026-08-17 while answering "how does condux work in OpenCode?".

condux enforces `/workflow` as the entry point with a `SessionStart` hook that
injects `skills/workflow/hooks/routing.md` (~390 tokens) before the first
prompt. One payload, one script (`session-start.mjs`), two host dialects:
Claude Code gets a JSON envelope via `hooks/hooks.json`; Codex gets raw stdout
via `codex-hooks.json` with `additionalContextLimit: 4000`.

**OpenCode gets nothing.** `packages/condux-opencode/index.js` has one `config`
hook that injects the four specialist agents and registers the bundled skills
onto `cfg.skills.paths`, plus an opt-in `session.idle` listener for plan-review.
No routing injection anywhere. So on OpenCode `/workflow` is reached by catalog
inference alone — the ~80% path the hook was built to replace.

Why that matters more than it sounds: the hook exists because on catalog
inference `workflow` scored ~26-27/33, and the misses were condux's *own*
siblings winning the query (root-cause-analysis on a crash report, draft-plan on
"write the plan"). That collision cannot be fixed by strengthening workflow's
description without stealing trigger space from those siblings, which
toolkit-skill-standards forbids. OpenCode users are living with the exact
failure mode the hook was built for.

Side effect worth recording: the trigger evals measure catalog inference, so
they describe OpenCode's real behaviour accurately and *understate* Claude and
Codex, where the hook does work the corpus never sees.

#### Candidate mechanism

OpenCode supports `instructions` in config — an array of paths/globs
automatically included as model context, combined with the user's AGENTS.md.
The existing `config` hook already mutates `cfg` successfully for
`skills.paths`, so the shape is proven:

```js
cfg.instructions ??= []
const routing = path.join(SKILLS_DIR, 'workflow', 'hooks', 'routing.md')
if (existsSync(routing) && !cfg.instructions.includes(routing)) cfg.instructions.push(routing)
```

`routing.md` **already ships in the npm package** at
`skills/workflow/hooks/routing.md` — the build copies the whole skill dir
including `hooks/`. It is dead weight in the tarball today. Nothing new needs
bundling.

#### What must be verified before this is treated as a fix

1. **Timing.** `skills.paths` works because the config hook mutates the cached
   config before OpenCode lazily discovers skills. Whether `instructions` is
   resolved late enough to catch a plugin mutation is a different question, and
   this package has already been bitten by exactly this class — a `tools` map
   set in the config hook is silently ignored because `tools`→`permission`
   folding happens during config parse, which is over by then. Needs an
   empirical check on a live OpenCode install, not reasoning.
2. **Cost and channel.** `SessionStart` fires once per startup/clear/compact;
   `instructions` is ambient on every turn. Stronger enforcement, permanent
   token cost, and it lands in the same channel as the user's own AGENTS.md
   rules rather than as session-start context. Decide whether that trade is
   wanted before wiring it.

If it ships: `condux-doctor` should learn to check it (it already probes the
OpenCode registration), and any change to `packages/condux-opencode/index.js`
needs `pnpm changeset` or the npm channel silently stalls.

## Loose threads
