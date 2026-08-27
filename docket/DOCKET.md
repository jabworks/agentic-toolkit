# AGENTIC-TOOLKIT DOCKET

**Open items only.** Closed items move to `archive/<year>.md` with their
verification records. The id space is shared across open and archive and ids
are never reused — a "#N" in a commit subject refers to these numbers (this
docket is the tracker). When an item ships: stamp it ✅ with the date and
verification status, then move the entry to the archive in the same action.
Stale open markers cost real sessions — closing means moving.

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

### 54. Re-check #14's corpus-portability finding on a stronger model (2026-08-25)

Docket #14 (priced and declined 2026-08-25) concluded that the trigger-eval
corpus is not portable to trajectory-based scoring, because its stimuli are
routing phrases rather than tasks: a 12-case probe produced 3 activations out
of 12, and every dev-task case activated nothing. `"write the implementation
plan"` returns a clarifying question — correctly, since there is no task in
that string.

**Every run in that probe used `claude-haiku-4-5-20251001`.** A stronger model
may commit to a skill where Haiku asks for clarification, which would soften
the portability finding. It would not touch #14's other two conclusions —
vally is unnecessary, and corpus-authoring cost dominates the ~$17 of API
calls — and a Sonnet/Opus corpus run would price *higher* than $17, so the
economics only get worse, not better.

Scope: re-run the same 12 cases (or the 6 dev-task ones) on Sonnet, same
method — `claude -p --output-format stream-json`, count `Skill` tool_use
blocks. ~$0.30 at Haiku rates, more at Sonnet. The probe harness was
throwaway (`/tmp/probe.mjs`); rebuild it from A3b's description or write a
small one — it is ~25 lines.

Second untested variable, cheaper to note than to fix: all runs happened in
`/tmp` with no project context. A real repo might change activation behaviour,
though there is still no *task* in the stimulus, so a flip is not expected.

Close as confirmed-or-corrected either way — A3b currently states the
Haiku-only limitation in its own text, so the record is honest as it stands;
this only tightens it.

### 58. Re-run the 2026-07-11 corpus subset to separate contract lift from composition lift (2026-08-25)

A3d measured **93.4% ± 1.9pp**, up from **88.4% ± 0.7pp** on 2026-07-11, and updated
the standing claim to ~92-95%. The comparison is **not like-for-like** and A3d says so.

The corpus grew **394 -> 598 cold cases** between those runs. The skills added since
(session-handoff, docket, coding-directive, blueprint, release, git-worktree) were all
authored against the toolkit's authoring standards, and newer contracts have
historically routed well on first measurement — A3's own record notes `release` hitting
15/15 with zero tuning, and `toolkit-foundry` 4/4 after its rename.

So the +5pp is some mix of:
1. genuine trigger-contract improvements to the older skills, and
2. composition — a larger share of the corpus being easy, well-authored cases.

Nothing in the current data separates them, which means "~92-95%" cannot yet be
claimed *about the older skills specifically*.

Scope: reconstruct the 2026-07-11 corpus subset (the 394 cold cases as of that commit
— recoverable from git history of `skills/*/evals/trigger_eval.json`), run 3 trials on
it with the current contracts, and compare against 88.4% ± 0.7pp directly. ~25 min per
trial at the measured rate, so ~75 min and roughly $0.08.

If the subset also lifts, the contract work is real and the standing claim holds
generally. If it sits near 88%, the standing claim is about corpus composition and
should be restated that way.

### 59. Inline SVG in plan-review's renderer, or decide against it (2026-08-26)

Found while designing discovery-presentation (2026-08-26). The design makes the
browser preview the place a design is read, and blueprint artifacts are part of
that design — but they can only be *linked* from the doc, never embedded, so
there is always one click between the reader and the picture.

The cause is deliberate, which is why this is a decision and not a bug.
`plan-review-template.html`'s `renderBlocks` runs `esc()` on every path and
`safeHref()` blocks `javascript:`, `data:` and `vbscript:` hrefs. That escaping
is a security boundary, and it is shared by plan review, design review and spec
preview — three surfaces, one renderer.

So the question is not "can we render SVG" but "is a narrow, audited SVG
passthrough worth widening that boundary for". Answering it means naming what
an attacker could put in a `.md` file the renderer is pointed at, and whether
the answer changes when the file came from an agent rather than a human.

Worth doing only as its own piece of work with its own reasoning. It was
explicitly ruled out of discovery-presentation pass one rather than deferred
by accident — see `specs/discovery-presentation/quirks.md` Q2.

2026-08-27: field evidence from a Codex session on another project (a
numeric-KPI discovery). A blueprint artifact linked relatively from the
design doc 404'd in the preview — the annotate server serves only the review
page and `/api/*`, so discovery's promise that "the running preview …
shows the link" is structurally unkeepable: every relative link resolves
against the server and dies. The agent root-caused it correctly, then inlined
an ASCII copy of the diagram beside the HTML artifact — one fact, two homes,
the exact drift shape #61 closed. Two consequences for this item:

1. "One click between the reader and the picture" understates the status
   quo — the click is a 404 surfacing to the user mid-review. The decision
   is now **serve-or-embed**, not embed-or-link, and serving sibling files
   is a *wider* boundary than the audited SVG passthrough (path traversal,
   agent-authored files), so the security reasoning gets more load-bearing,
   not less.
2. Interim contract fix worth shipping regardless of the outcome: discovery
   and blueprint must stop writing clickable relative links into design docs
   — cite the artifact path as inline code (what the Codex agent improvised,
   minus the duplicated diagram) until the server question is decided.

2026-08-27 (later): interim contract fix SHIPPED as condux 2.26.0 — discovery
and blueprint cite artifact paths as inline code (git-root-relative), never
clickable relative links; blueprint's Step 4 renamed LINK→CITE; discovery's
sign-off gained promote-on-cite (a blueprint artifact the spec references is
copied into the spec dir and cited by its committed path). Field evidence
recorded as `specs/discovery-presentation/quirks.md` Q5. **Entry stays open**
for the serve-or-embed decision itself.

## Loose threads
