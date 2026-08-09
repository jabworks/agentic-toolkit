# AGENTIC-TOOLKIT DOCKET

**Open items only.** Closed items move to `archive/<year>.md` with their
verification records. The id space is shared across open and archive and ids
are never reused — a "#N" in a commit subject refers to these numbers (this
docket is the tracker). When an item ships: stamp it ✅ with the date and
verification status, then move the entry to the archive in the same action.
Stale open markers cost real sessions — closing means moving.

## Committed

## Someday

### 2. UNINSTALL.md — the removal half of the ease-of-install convention (2026-08-05)

Reverse path for the ease-of-install convention: agent-followable removal — drop the Codex config.toml table, remove the OpenCode json key (or restore the .bak backups), verify the registration is gone, report per host. Docket as reference implementation; generalizes to condux/concord alongside INSTALL.md.

### 4. Board cosmetic: hide the count chip on zero-count sections (2026-08-05)

Zero-count sections render an empty chip pill after the heading (`count || empty-string` still emits the span). One-line fix in docket-render.mjs. Seen at live verification 2026-08-05.

### 7. Spec MCP server — revisit when specs gain write-side invariants (2026-08-05)

Declined for now (2026-08-05): specs are read-mostly markdown — router lookup is ls + fuzzy match, agents read files natively, and a server would duplicate the file path every skill must keep anyway. Reconsider docket-style (thin MCP over a CLI) only if specs grow mutations worth guarding: enforced changelog stamps on drift decisions, cross-spec link integrity, or a host-enforced spec-before-plan gate.

### 9. INSTALL.md front door for condux — consolidate three scattered installers (split from #5, 2026-08-06) (2026-08-06)

condux is the larger half of #5, and the reason is not obvious from the parent
item: condux has no plugin-level installer, but it already ships two, buried
inside skills where no user would find them.

| existing | does |
|---|---|
| `skills/plan-review/references/install-codex-hook.sh` | merges the Stop hook into `hooks.json`, enables `features.hooks` |
| `skills/subagent-execution/references/install-codex-agents.mjs` | installs the four specialist agents for Codex |
| *(no script)* | OpenCode: add `plugin: ["@jabworks/condux"]` to `opencode.json` |

Per host:

- Claude Code — nothing to do; the plugin manifest registers the hooks. Report
  `skipped`.
- Codex — both scripts above, plus the experimental hooks feature flag.
- OpenCode — one JSON key.

So this is a **front door over three scattered mechanisms**, not a new
installer. That carries a design decision the concord half does not: whether
those two scripts get absorbed into one installer, wrapped by it, or left in
place and merely documented by INSTALL.md. Decide that before writing code —
absorbing them moves files two skills own, wrapping them keeps the duplication
but costs nothing, and documenting alone leaves the discovery problem half
solved.

Unblocks `condux-doctor --fix`, which today prints a repair it cannot perform.

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

### 11. Declare bundle composition as data instead of if-arms in sync.sh (2026-08-09)

`scripts/sync.sh:55-114` decides what goes where using two mechanisms that both
fail quietly:

1. **Bundle membership is inferred by probing the build artifact** —
   `if [[ -d "$DIST_DIR/$p/skills/$p/$name" ]]` walks `dist/plugins/*/` looking
   for an existing directory. So `dist/` is partly its own source of truth, and
   a skill whose dist target does not exist yet prints `SKIP` and syncs nothing.
2. **Plugin-level dirs are three hardcoded name equality checks** —
   `subagent-execution -> condux/agents`, `workflow -> condux/hooks`,
   `record -> docket/server`. Each carries a comment admitting it is a repeat of
   the `6ba6572` blind spot, and `hooks/` stayed hand-maintained in `dist/`
   until 2026-08-05 anyway.

Current doctrine — "every out-of-tree mirror target needs its own sync step AND
its own test" — is a discipline fix for something that wants to be a data fix.

Upstream precedent: `github/awesome-copilot`, `eng/materialize-plugins.mjs`
(MIT). Their `plugin.json` carries a composition manifest listing repo-relative
sources (`extensions["com.github.awesome-copilot"].{agents,skills,hooks,commands}`);
the build resolves each entry, copies it, then projects the manifest down to a
spec-field allow-list so build-only fields never reach the served manifest.
Adding a new plugin-level dir there is a data edit, not a code edit plus a
remembered bespoke test.

**Do not copy the other half.** Verified from their git tree: `plugins/` holds
only `plugin.json` + `README.md` (92 of each) and **zero materialized content is
committed** — it is assembled at publish time and removed by
`clean-materialized-plugins.mjs`. Our three install channels read committed
trees (`npx skills add` <- `skills/`, marketplace <- `dist/plugins/`, OpenCode
<- `dist/opencode/`), so `dist/` stays committed and `dist-mirror.test.mjs`
keeps guarding it byte-for-byte. Only the declaration transfers.

Decide before writing code:

- where the declaration lives — inside each `plugin.json` (one file, but adds a
  non-spec field both hosts must tolerate) or a sibling `composition.json`
- whether one generic "every declared source->dest pair is mirrored, and no
  undeclared dir exists in dist" test replaces the three bespoke mirror tests
  (`condux-hooks.test.mjs`, the agents check in `skill-invariants.test.mjs`,
  `docket-server.test.mjs`) or runs alongside them

Touches every plugin manifest and `dist/`, so it runs through the
toolkit-change-control gate.

Found 2026-08-09 surveying awesome-copilot's maintenance machinery.

### 12. Generate marketplace.json and the README catalogs instead of testing them (2026-08-09)

We hand-maintain `.claude-plugin/marketplace.json` and the plugin catalogs in
`README.md` / `CLAUDE.md`, then assert completeness after the fact —
`docs-catalog.test.mjs` fails when a marketplace plugin is missing from a
catalog, and `skill-invariants.test.mjs` checks the marketplace paths resolve on
disk.

Validating catches the omission; generating makes it unrepresentable. "Missed
registration" is already a named entry in the failure ledger
(`skills/toolkit-failure-archaeology/`), and everything in those files is
derivable from `plugin.json` plus the skills tree.

Upstream precedent (MIT): `eng/generate-marketplace.mjs` builds the marketplace
from `plugins/*/plugin.json` — name, description, version, source path — sorted
case-insensitively, as part of `npm run build`. `eng/update-readme.mjs` (36 KB)
generates the README and the `docs/README.*.md` catalogs the same way; their
skills catalog is 207 KB and entirely generated.

Caveat that shapes the design: marketplace descriptions were deliberately
allowed to diverge from their SKILL.md descriptions (ratified by-design
2026-08-04, PR #16). A generator must take that divergence as declared input —
a per-plugin marketplace-description field — rather than flattening the two back
together. Getting this wrong silently reverts a ratified decision.

Sequencing note: this shares a source of truth with #11. If the composition
manifest lands first, the generator reads it; if this lands first, it will want
the same data and the two should be designed together.

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

### 15. Three cheap skill-validation checks we do not have (2026-08-09)

Small additions to `tests/skill-invariants.test.mjs`, each a few lines, all
lifted from `eng/validate-skills.mjs` + `eng/constants.mjs` in
`github/awesome-copilot` (MIT). Batch them into one pass.

- **Description floor.** We enforce ceilings (description <= 500, frontmatter
  total <= 1024) and no floor. Upstream uses
  `SKILL_DESCRIPTION_MIN_LENGTH = 10`. A one-word description passes every check
  we have today while being useless for routing — and routing quality is the
  thing we measure hardest.
- **Bundled asset size cap.** Upstream refuses any bundled asset over 5 MB. We
  check no sizes at all, and docket ships a whole `server/` tree that the
  marketplace has to carry.
- **Asset directory allow-list.** Upstream only walks `references/`, `assets/`,
  `scripts/` inside a skill. Our `references/` convention is documented in
  `toolkit-skill-standards` but unenforced, so a stray directory ships silently
  through the mirror.

Not worth a workflow on their own; good filler alongside #13, which touches the
same test surface.

Found 2026-08-09 surveying awesome-copilot's maintenance machinery.

## Loose threads
