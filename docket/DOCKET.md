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

### 26. Worktree operations skill — safe git worktree workflows (create, switch, prune, agent isolation) (2026-08-13)

Sibling to `git-commit` / `git-operations`: a decision router for `git worktree`
— create/list/switch, prune stale trees, move work between trees, and the
undo paths. Motivation: agent hosts now lean on worktrees for isolation
(Claude Code's `EnterWorktree` / `isolation: "worktree"` agents), and the
existing `git-operations` skill doesn't cover them. Scope question to settle
at design time: standalone skill vs a section grown inside `git-operations`
(the router-with-undo-paths shape is identical; what differs is trigger
vocabulary — "worktree", "parallel checkout", "agent sandbox tree").

Filed 2026-08-13 mid-#22 (unrelated to that change).

### 27. Cursor compatibility — verify the skills channel, decide on a trigger-variant build (2026-08-14)

README claims Cursor support via `npx skills add` (the vercel-labs CLI
auto-detects the host), but no Cursor install has ever been verified
end-to-end. Two open questions:

1. **Does the skills channel actually work on Cursor?** Install the toolkit
   into a real Cursor setup and check the skills land, load, and trigger.

2. **Does Cursor surface `when_to_use`?** Condux-style skills carry their
   trigger conditions in `when_to_use` frontmatter. OpenCode only surfaces
   `description`, which is why `dist/opencode/skills/` exists (build folds
   `when_to_use` into `description`, 1024-char cap). If Cursor has the same
   constraint, it needs the same treatment — likely a `dist/cursor/` variant
   out of `scripts/build-opencode.mjs` generalized, or reuse of the OpenCode
   tree if the caps align.

What Cursor will NOT get regardless (host-feature gaps, document rather than
build): the condux SessionStart routing hook (routing falls back to catalog
inference, ~80% in evals), plan-review's ExitPlanMode/Codex Stop hooks, named
agents. Docket's MCP server could work on Cursor via a manual mcp.json entry —
the installer only targets Claude Code/Codex/OpenCode today; the dependency-
free CLI fallback (degrade-ladder rung 2) should work as-is.

Outcome shape: a verified compatibility row in README (what works, what
degrades, what's absent), plus a build decision on the trigger variant.

Filed 2026-08-14 after the "are we compatible with cursor?" question — the
honest answer was "advertised, never tested".

### 28. Cursor follow-ups — toolkit-ops channel docs, docket-doctor cursor probe (2026-08-14)

The Cursor channel shipped (docket #27): dist/cursor/skills via scripts/build-cursor.mjs, cursor-dist.test.mjs, docket installer cursor target (0.6.0), README/CLAUDE.md channel docs. Deliberately scoped out, same precedent as the OpenCode channel:

1. toolkit-ops docs still describe three channels — toolkit-orientation (SKILL.md + references/porting.md), toolkit-plugin-reference, toolkit-foundry mention build-opencode/dist layout without the cursor tree. Refresh + toolkit-ops patch bump.
2. docket-doctor probes Claude/Codex/OpenCode registrations but not ~/.cursor/mcp.json — add a cursor row mirroring the installer's target.

Verification evidence for the shipped channel: .condux/verification/2026-08-14-cursor-channel/report.md. Upstream caveat to re-check before advertising global installs: vercel-labs/skills#421 (fix PR #464 unmerged as of 2026-08-14).

## Loose threads
