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

### 65. toolkit-debugging-playbook applied-but-cold — evaluate for a routing nudge next period (2026-08-28)

Its period-1 rewrite shipped 2026-08-06 (`400f346`); on 2026-08-20 a user turn
stating its literal remit ("the skill for visual mockups almost never fire")
still missed (`specs/trigger-reliability/period-2-report.md`). No lexical room
left. Per the routing-nudge convention (toolkit-skill-standards), a nudge needs
a measured suppressed-class verdict and a live trigger surface to condition on —
period 3 should decide whether "being inside the toolkit repo" qualifies.

**2026-08-28 — gated on #69, not just period 3.** The nudge mechanism this item
would use was retired the day it was measured-pending (session-handoff 2.0.0;
D2 retired). There is nothing to extend to a second skill until #69 decides
whether the routing-nudge convention survives with zero instances. Do not act
on this item before #69.

### 66. Classify vedge/axon/lightweight-bff Codex transcripts (92 sessions excluded from period-2 corpus) (2026-08-28)

Excluded conservatively from the period-2 mine on naming (possible corporate).
If Harvey classifies them personal, re-run the mine with them included — the
headline asymmetry doesn't depend on them, but toolkit-skill fire rates in
sibling repos go unmeasured while they're out.

### 67. Replace third-party remember plugin with our own memory stack on Claude Code? (2026-08-28)

The suppressor in `specs/trigger-reliability/` Q1 is
`claude-plugins-official/remember`'s SessionStart digest. The D2 nudge counters
it without touching it; owning the memory stack (concord already owns Codex)
would let digest and skills cooperate instead. Deliberately deferred at design
time — decision, not implementation, is the next step.

**2026-08-28 — brief written, awaiting ratification:**
`specs/trigger-reliability/memory-stack-decision.md`. Four options (keep /
replace / defer-with-criterion / upstream request) with the parity cost of a
replacement itemized. Recommends **defer against a pre-registered period-3
fire-rate criterion**: ≥40% keeps the third-party stack and closes this item,
<15% triggers the port. Two findings the brief rests on — the plugin exposes
**no config knob** that makes its digest conditional or demotable (the cheap
path is closed on evidence), and docket #64's harness extension proved **no
remedy can be pre-verified in-eval**, so live period-3 data is the only
instrument either option has. Filing an upstream request for a demotable digest
is recommended in parallel regardless of the verdict. Three questions need
Harvey's answer before ratification — see the brief's closing section.

**2026-08-28 — ratified; stays open.** All three questions answered (recorded in
the brief's Ratification section). (1) Losing model-summarized prose is **not**
acceptable, so a port must carry summarization concord does not have — Option B
is strictly more expensive than the scope table priced, and the `< 15%` branch
is a bigger commitment than it read. Recommendation unchanged: defer. (2) The
criterion is evaluated at **period 3 by accumulated sessions**, not a fixed
date, keeping the series like-for-like with periods 1 and 2 (D5). (3) The
upstream request is approved and drafted at
`specs/trigger-reliability/upstream-request.md` — **not yet filed**, pending
Harvey's read. This item closes when the period-3 criterion fires, or earlier if
upstream accepts.

**2026-08-28 (same day) — the criterion is void; the port has no automatic
trigger.** Harvey removed the session-handoff SessionStart hook (2.0.0), and the
criterion measured that nudge's efficacy. The brief's threshold table is kept as
the record of what was pre-registered and must not be applied; a replacement
written after removing the instrument would not be pre-registered, so none was
written. Period 3 now measures whether suppression persists unremediated
(~9% is the period-2 comparison), and the port becomes a judgement call on that
evidence rather than a threshold firing. With our own remedy withdrawn, the
upstream request is the only live path that can close this item without a port —
it is now the highest-value open thread here, and it is still unfiled.

### 68. Invocation-observing trigger harness — measure whether a skill fires, not which skill a router names (2026-08-28)

Fell out of #64. The `context` preamble shipped and its first measurement was 6/6 fires (haiku-4-5, 3 trials, both session-handoff seeds) — injecting a synthetic memory digest ahead of "continue from last session" did not suppress the route.

The reason is structural. `scripts/eval-triggers.mjs` poses an explicit routing question ("pick the SINGLE catalog skill best suited to HANDLE it"), so the trigger is consulted on every case by construction. Live suppression (quirks Q1) is the model *never reaching* that question: the digest satisfies the information need and the turn is answered directly. So the preamble measures whether injected context changes a routing answer — real, but weaker — and cannot measure whether the routing decision gets made at all.

Reaching the real question needs a different harness shape: pose an ordinary user turn to an agent with the skills actually installed, and observe whether a skill was *invoked*. That is an agent run per case, not a `claude -p` classification — much more expensive, and it needs an invocation signal to read (transcript skill-invocation lines, as the period-1/2 mines already parse).

Open questions before anyone builds it: is per-case cost acceptable at corpus scale, or does this only run on a suppressed-class subset? Does it replace the router eval or sit beside it as a third metric? The band's comparability rules (see #53, #55) say beside.

See `specs/trigger-reliability/quirks.md` Q4 for the full statement of the limit.

### 69. Retire or keep the routing-nudge convention now that it has zero instances (2026-08-28)

`skills/toolkit-skill-standards/SKILL.md` documents the routing-nudge pattern as
house doctrine: a conditional SessionStart hook that routes phrases to a skill,
with D2's six rules (conditional, directive-never-content, demote-the-substitute,
tiny, fail-open, dual-host safe). It was written when session-handoff was about
to become its first recipient.

That recipient is gone (2.0.0, 2026-08-28 — Harvey declined to carry a second
SessionStart hook for one skill), so the convention now documents a mechanism the
toolkit ships nowhere and has never measured. #64 established that no harness can
measure it either (Q4), so it cannot be validated in the abstract.

Three ways this can go, and the choice is a real one:

1. **Delete the convention.** Honest: we do not do this. Cost: the next
   suppressed-class verdict has no named remedy and the reasoning gets
   re-derived from scratch.
2. **Keep it, demoted to a documented option** with the retirement and its
   reason attached — "available, deliberately unused, here is why". Keeps the
   analysis, drops the implication that it is the standard answer.
3. **Keep it as-is.** Only defensible if we expect to ship one again.

Whichever wins, `toolkit-skill-standards` needs an edit and a toolkit-ops bump,
and #65 unblocks or dies with it. Note the standards skill also carries the
Q3-derived "directive, not content" rule, which is a genuinely useful finding
independent of nudges — do not delete that with the rest.

### 70. toolkit-change-control has no row for retiring a hook or a plugin-level dir (2026-08-28)

Found while versioning session-handoff 2.0.0. The classification table in
`skills/toolkit-change-control/SKILL.md` covers new skills, skill edits,
manifest fixes, marketplace fixes, doc fixes, dist resyncs and **retired
skills** — nothing for removing a hook, a `pluginDirs` entry, or any other
plugin-level surface that is not a skill.

The gap is not academic: retiring the session-handoff hook changed the install
surface on both hosts (the Codex `hooks` registration disappeared, and a root
Agent Plugins `plugin.json` appeared in its place via the Q2 exclusion flipping
off), which is a larger blast radius than the "skill edit → patch" row would
suggest. It was versioned **major** by analogy with the retired-skill row
("an installed skill disappearing is a breaking change to the install surface")
and the one precedent in `CHANGELOG.md` — condux 2.0.0, a skill rename, the same
shape of surface change. That reasoning belongs in the table rather than in a
commit message someone has to find.

Scope: add a row (or rows) for retired plugin-level surfaces, name the Q2
coupling as a consequence to check, and say explicitly that a version can be
major without any skill changing.

## Loose threads
