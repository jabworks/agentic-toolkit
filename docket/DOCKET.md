# AGENTIC-TOOLKIT DOCKET

**Open items only.** Closed items move to `archive/<year>.md` with their
verification records. The id space is shared across open and archive and ids
are never reused — a "#N" in a commit subject refers to these numbers (this
docket is the tracker). When an item ships: stamp it ✅ with the date and
verification status, then move the entry to the archive in the same action.
Stale open markers cost real sessions — closing means moving.

## Committed

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

### 39. Contract gaps surfaced by the #37 triage — cases left as misses deliberately, each naming a weak seam (2026-08-17)

Filed 2026-08-17 while closing out #37's family A. The triage's rule was
corpus-only: where a miss pointed at a contract defect rather than a
two-skill stimulus, the case stayed a miss and the defect is recorded here
instead of being fixed mid-pass. Each cluster is small on its own; together
they are the residue the accept-alternates pass could not absorb.

**root-cause-analysis loses to workflow on plain bug reports.** `checkout
crashes on empty cart` went 2/3→workflow and its "theres a bug where…"
variant 0/3→workflow. RCA's contract triggers on "why is this failing" /
"this bug" phrasing, but a declarative crash report without a question mark
reads as an implementation request. Per the ratified rule these stay misses
(workflow-over-downstream is the drift signal), but the seam is real: the
fix, if wanted, is RCA claiming declarative bug *reports*, not just
questions — the same passive-voice-to-user-phrasing move that fixed
test-first-development in condux 2.17.2.

**subagent-execution's ownership of its own machinery is invisible.**
`which model should the coder agent get for this task` (0/3) and `whats in
spawn-rules for picking an agent` (1/3) both miss, yet the skill's body
owns model tiering and spawn-rules outright. Its when_to_use never names
them. Same defect class as #32 and family B: rule in the body, absent from
the contract.

**git-operations' enumerated list reads as exhaustive.** `add a submodule
to this repo` and `bisect to find the bad commit` (both expected null, both
2/3 with git-operations misses) sit outside its named situations
(undo/discard/park/integrate/recover). Either the contract should claim
routine-but-unlisted git operations, or null is right and these stay
over-trigger guards. Decide once, not per case.

**remember attracts history questions it cannot answer.** Three cases
(`what did the 2026-07-08 audit leave open`, `what mistakes did past
sessions make in this repo`, `has this happened before in my nextjs app`)
routed to remember, whose contract is about *saving* state, not answering
history. Evidence its description reads as recall; failure-archaeology owns
two of the three. Left as misses — routing there serves nobody.

**Over-trigger evidence, no action wanted yet:** release on `deploy the app
to production` (deploy ≠ cut-a-release), git-commit on `write a good PR
description` (contract stops before push). These misses are the corpus
doing its job.

**Ambiguous jargon:** `sdd the plan` (0/3, technical-spec/null) — "sdd"
reads as spec-driven development at least as naturally as
subagent-driven-development. Candidate for rewording the stimulus rather
than accepting anything.

Related: #37 (the triage that produced this list), #14 (a trajectory eval
would grade several of these on behavior instead of a single routing token).

## Loose threads
