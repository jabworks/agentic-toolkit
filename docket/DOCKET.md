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

2026-08-18: re-checked against all three trigger conditions — none have fired.
The `specs/` tree grew to 10 dirs (composition-manifest, cursor-channel,
concord, docket, etc.) since 2026-08-05, but every mention of "changelog
stamp" or "drift decision" found in the repo is a per-spec bookkeeping note
inside a plan file, not a host-enforced mechanism. No cross-spec link
integrity check exists (`tests/spec-index.test.mjs` checks the catalog
index, not inter-spec links). `draft-plan`'s "signed-off design" requirement
remains a soft, agent-discipline gate, not host-enforced. Still declined;
next re-check on the same trigger, not on a schedule.

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

### 40. Retire the third-party taste-skill installs now that blueprint covers the clarity use case (2026-08-20)

`.agents/skills/` and `skills-lock.json` (both untracked, repo-local only) hold ten
skills installed from `Leonxlnx/taste-skill` via `npx skills add`: brandkit,
design-taste-frontend, full-output-enforcement, high-end-visual-design, image-to-code,
imagegen-frontend-mobile, imagegen-frontend-web, industrial-brutalist-ui, minimalist-ui,
redesign-existing-projects.

**Why they never fired:** their descriptions are capability blurbs with zero trigger
conditions — no "Use when…", no `when_to_use`. That is the same trigger-contract defect
this repo's own `skill-invariants.test.mjs` enforces against first-party skills.

`blueprint` (condux 2.18.0, PR #85) now covers the design-time clarity use case
first-party and trigger-contracted. Decide per skill whether anything here is still
wanted — the aesthetic/premium-direction ones (brandkit, high-end-visual-design,
industrial-brutalist-ui, minimalist-ui) are deliberately *outside* blueprint's boundary,
so retiring all ten is not automatic.

If any are kept, they need trigger conditions written in, which means forking rather than
tracking upstream.

Related: [[project-blueprint-skill]] memory, and the split-out symlink item below.

### 41. Repair the dangling ~/.claude/skills symlinks (they point at a near-empty ~/.agents/skills) (2026-08-20)

The global `~/.claude/skills/*` entries are symlinks into `~/.agents/skills/`, but that
directory only contains `i-have-adhd`. Every other symlink dangles, so those skills are
unavailable in **every project except this repo** — which is half of why the visual-mockup
skills "almost never fired" (the other half is the missing trigger contracts, docket #40).

Scope: enumerate the symlinks, decide per target whether to repopulate `~/.agents/skills/`
or remove the dead link, and settle whether the global layer should exist at all now that
the toolkit ships four dist channels.

Out of this repo's tree — touches `~/.claude` and `~/.agents` only, which are shared config
and in bounds, but it is a workstation-hygiene task, not a toolkit change. No commit here.

### 43. mdLite renders markdown tables as raw pipe text on the docket board (2026-08-20) (2026-08-20)

`mdLite()` in `skills/record/server/docket-render.mjs` has no table support, so a
markdown table in a DOCKET.md item body renders as literal pipe text on the
board. Visible today in item #10, which carries a three-row table:

    | idea | what it does | |---|---| | semantic compare | name + description …

Pre-existing — `mdLite` was untouched by the Surface Kit work — but the
redesign's cleaner spacing makes it conspicuous, and the docket is the one
surface whose content is authored as markdown by hand.

Scope if picked up: `mdLite` is deliberately a small subset renderer, not a
markdown library (rung 1 of the dependency ladder — no deps). A pipe-table
parser is maybe 25 lines and stays inside that constraint. Decide first whether
tables belong in item bodies at all, or whether the convention should be to use
a list instead — the format is a hand-edited file, so a convention is a legitimate
alternative to a parser.

Found 2026-08-20 while visually verifying the Surface Kit redesign.

### 44. Docket board renders a section header for a section with no items (2026-08-20) (2026-08-20)

A DOCKET.md section with zero open items still emits its `<h2>` and rule on the
board — "COMMITTED" currently renders as a heading over nothing. The section nav
also links to it, so the link is a jump to an empty region.

`renderHtml` maps every `open.sections` entry unconditionally
(`skills/record/server/docket-render.mjs`), and `sectionProse` already returns
`''` for a section with no loose prose — so the empty case is representable, just
not suppressed.

Not simply "skip empty sections": a section heading with a zero count is arguably
correct signal on a backlog board (it says the bucket exists and is clear), which
is why the scope pills already render `data-total="0"` at reduced opacity rather
than disappearing. Decide which reading is wanted before changing it — and if
sections are suppressed, `sectionNav()` must drop the matching link in the same
change or the nav points at nothing.

Found 2026-08-20 while visually verifying the Surface Kit redesign.

## Loose threads
