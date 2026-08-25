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

### 55. Merge a duplicate case's `accept` in the trigger corpus, or stop dropping it silently (2026-08-25)

Found while shipping #53 (A3c). `scripts/eval-triggers.mjs` dedups the corpus on
`query + "||" + expected`. #53 made a duplicate's `disallowed` merge into the kept
case; its `accept` is still dropped, silently.

Why #53 did not just fix both: `accept` feeds `isHit`. Widening a kept case's
accept set can flip a MISS to a HIT and move A3's ~89-92% operating band — the
number the whole health campaign is judged on, and the exact thing #53's
separate-metric decision existed to protect. Doing it inside #53 would have moved
the band silently, inside a change whose premise was band comparability.

Measured 2026-08-25: 19 duplicate keys in the corpus, **2 with divergent accept**:

| query | kept | dropped |
|---|---|---|
| `is it safe to hand-edit dist to hotfix this` | toolkit-change-control, accept `["toolkit-failure-archaeology"]` | toolkit-debugging-playbook, accept `[]` |
| `is argument-hint a real frontmatter field` | toolkit-plugin-reference, accept `["toolkit-skill-standards"]` | toolkit-skill-standards, accept `[]` |

In both, the wider set is the one kept — `readdirSync` returns the owning skill's
directory first, alphabetically, by accident. So the drop is **inert today** and
merging would be a no-op on the band. That is luck, not a property: renaming a
skill, or adding a third file carrying the same query with a wider accept, flips
it without warning.

Two defensible fixes, decide when picked up:
1. Merge `accept` like `disallowed`, and re-run a band to confirm the no-op
   empirically rather than by inspection (~10 min, one trial).
2. Make the drop loud instead — fail `tests/trigger-eval-corpus.test.mjs` when two
   cases share a dedup key with divergent `accept`, forcing the corpus to agree
   with itself. Cheaper, no band risk, and arguably the real defect: the same query
   asserting two different things in two files is a corpus bug either way.

Leaning (2) — the current entry in A3c documents the drop as known and inert, and
option 2 keeps that true without ever touching isHit.

## Loose threads
