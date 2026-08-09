# External survey — github/awesome-copilot maintenance machinery (2026-08-09)

What another public skill/plugin repo does differently in the four areas this
toolkit also has to solve: mirror integrity, registration, frontmatter parsing,
and collision detection. Surveyed at 2,649 blobs on `main`. Upstream is MIT;
`@microsoft/vally` (0.13.0, read from the npm tarball) is MIT.

Findings are ranked by how much they would change our work, each with the file
that proves it and the decision it forces. Every item is tracked in the docket —
this file is the evidence, the docket entry is the work.

**Scope note.** The value is not in their `skills/` tree (1,137 files of generic
per-topic prose — their `agentic-eval` skill was assessed the same day and
rejected: generic LLM-app pattern docs whose five "best practices" are all
already implemented here, more empirically, by `scripts/eval-triggers.mjs` and
the preregistered criteria in `health-campaign.md`). The value is in `eng/` and
`.github/workflows/`.

---

## 1. Front A4's falsification was method-specific — docket #10

`health-campaign.md` records A4 (collision automation) as CLOSED, falsified:
`scripts/collision-scan.mjs --check` returned max 5% recall at every threshold
0.08–0.18 against a preregistered ≥80%. The verified reason — our collisions are
semantic adjacencies whose contracts share almost no vocabulary, because the
2026-07-08 disambiguation passes had already de-overlapped them lexically —
falsifies n-grams and says nothing about a semantic detector. Open problem 4 in
`SKILL.md` and the A4 entry both currently read as a general closure.

Upstream precedent: `.github/workflows/duplicate-resource-detector.md` — a
weekly scheduled agentic workflow with three ideas absent from our
preregistration:

| idea | mechanism |
|---|---|
| semantic compare | name + description + first ~20 body lines judged by meaning, with worked negatives in the prompt (general-React vs React-testing = not duplicates; two same-style code-review resources = duplicates) |
| durable accept-list | searches *closed* issues labelled `duplicate-review` for "intentionally separate" / "keep both" / checked boxes, excludes those pairs, annotates re-flags with "(previously reviewed — see #N)" |
| containment | `safe-outputs: create-issue: {max: 1, close-older-issues: true}` plus `noop` when clean — the agent can never hold more than one open issue |

Fit is specific, not generic: A3's dominant error mode is one-hop adjacency
pairs (discovery↔session-handoff on "resume", draft-plan↔technical-spec on
doc-creation) — precisely the signal a semantic detector reads and a lexical one
cannot. We already hold the accept-list ingredient: the curated empirical-pair
registry in `scripts/collision-scan.mjs`, updated by hand per eval round.

**Decision before building:** whether the accept-list lives in GitHub issues
(their model — needs issue read access from a scheduled workflow) or stays
in-repo as the existing registry (our model — no egress, but needs a review
ritual). Either way A4 needs an addendum recording that the falsification was
method-specific.

## 2. Bundle composition should be declared data — docket #11

`scripts/sync.sh:55-114` decides placement two ways that both fail quietly:
bundle membership is **inferred by probing the build artifact**
(`if [[ -d "$DIST_DIR/$p/skills/$p/$name" ]]`, so `dist/` is partly its own
source of truth and an unscaffolded skill prints `SKIP` and syncs nothing), and
plugin-level dirs are **three hardcoded name equality checks**
(`subagent-execution → condux/agents`, `workflow → condux/hooks`,
`record → docket/server`) each commenting that it repeats the `6ba6572` blind
spot — while `hooks/` stayed hand-maintained in `dist/` until 2026-08-05 anyway.

Upstream `eng/materialize-plugins.mjs` inverts this: `plugin.json` carries a
composition manifest of repo-relative sources
(`extensions["com.github.awesome-copilot"].{agents,skills,hooks,commands}`); the
build resolves and copies each entry, then projects the manifest down to a
spec-field allow-list so build-only fields never reach the served manifest.
Adding a plugin-level dir there is a data edit, not a code edit plus a
remembered bespoke test.

**Do not copy the other half.** Verified from their git tree: `plugins/` holds
only `plugin.json` + `README.md` (92 of each) and zero materialized content is
committed — it is assembled at publish time and removed by
`clean-materialized-plugins.mjs`. Our three install channels read committed
trees, so `dist/` stays committed and `dist-mirror.test.mjs` keeps guarding it.
Only the declaration transfers.

## 3. Generate the catalogs instead of asserting them — docket #12

`eng/generate-marketplace.mjs` builds the marketplace from
`plugins/*/plugin.json` as part of `npm run build`; `eng/update-readme.mjs`
generates the README and `docs/README.*.md` catalogs (theirs is 207 KB, entirely
generated). We hand-maintain `.claude-plugin/marketplace.json` and the
README/CLAUDE.md catalogs and assert completeness afterwards
(`docs-catalog.test.mjs`, plus the marketplace path check in
`skill-invariants.test.mjs`).

Validating catches the omission; generating makes it unrepresentable — and
"missed registration" is already a ledger entry (technical-spec shipped
unregistered until `66a71eb`). Constraint on the design: marketplace
descriptions were deliberately allowed to diverge from SKILL.md descriptions
(ratified by-design 2026-08-04, PR #16), so a generator must take that
divergence as declared input rather than flattening it and silently reverting a
ratified decision.

## 4. Supply-chain lint on skill content — docket #13

Upstream runs `npx @microsoft/vally-cli lint ./skills` nightly
(`.github/workflows/skill-quality-report.yml`) and gates PRs (`skill-check.yml`).
Vally's lint is purely supply-chain (`dist/skill/reference-scanner.js` +
`external-dep-checker.js`), driven by two allow-list files (`knownDomainsFile`,
`allowedExternalDepsFile`):

| code | flags |
|---|---|
| `EXTERNAL-DOMAIN` | URL to a domain not on the known list |
| `HTTP-NOT-HTTPS` | plaintext HTTP reference |
| `PIPE-TO-SHELL` | `curl … \| sh` shaped instructions |
| `INVOKES-SCRIPT` | skill body tells the agent to run a script |
| `SCRIPT-FILE` | bundled executable script |
| `SCRIPT-NO-SRI` | remote script without subresource integrity |
| `NON-BUILTIN-TOOL-REF` | references a tool outside the host's builtins |
| `FILE-READ-ERROR` | referenced file unreadable |

We already enforce one of these — for exactly one file.
`skill-invariants.test.mjs:105` ("plan-review HTML template makes no external
network references") greps that single template for `//` URLs: `EXTERNAL-DOMAIN`,
hand-scoped to one artifact because that artifact was a known risk. Adjacent but
different: `script-safety.test.mjs` tests the *runtime* behaviour of three
installer scripts and `browser-security.test.mjs` tests plan-review's HTML
escaping — both check that our known scripts behave; neither reads a SKILL.md to
see what it instructs an agent to fetch or execute.

Several of our skills would trip these deliberately (docket's `install.sh` and
`server/mcp-server.mjs` behind `.mcp.json`; condux's `session-start.mjs` hook) —
which is the argument *for* an allow-list, since the value is that a new
unreviewed one surfaces in CI. Per the no-plugin-dependencies ladder the
adoption shape is to port the eight codes into a dependency-free check written
the way `frontmatter-canonical.test.mjs` is, not to take the CLI dependency.

## 5. Trajectory-based routing measurement — docket #14

`@microsoft/vally`'s `dist/graders/static/skill-invocation-grader.js` takes
`{required, disallowed}`, walks `trajectory.events`, counts
`event.type === "skill_activation"`, and passes only when every required skill
activated and no disallowed one did. Metadata: `costProfile: "free"`,
`determinism: "static"` — grading is free and deterministic; the cost is one real
agent run per stimulus to produce the trajectory.

Ours is deliberately a prompted proxy: `scripts/eval-triggers.mjs` renders the
live catalog and asks a judge to route, "the catalog the host sees". That
produced ten dated reports and a defensible ~89–92% band, with judge variance
named in A3 as the dominant error mode — the known cost of the design, not a
defect. Trajectory grading would remove that variance and measure the host's
real skill-loading behaviour, priced at ~394 real agent runs.

The primitive worth having regardless of the verdict is **`disallowed`** — a
first-class "must NOT fire here" assertion. Our `should_trigger: false` cases
approximate it as a routing decision rather than an observed non-activation,
which is a weaker claim about exactly the collisions we care about most.

Also present if this is ever built out: `vally compare` (pairwise comparison of
two eval runs — what we do by hand across dated reports), `max-repeat` and
`loop-outcome` graders, JSONL/JUnit/markdown reporters.

## 6. Three cheap validation checks — docket #15

From `eng/validate-skills.mjs` + `eng/constants.mjs`, each verified absent here
against `tests/skill-invariants.test.mjs`: a description **floor**
(`SKILL_DESCRIPTION_MIN_LENGTH = 10`; we have `MAX_DESCRIPTION`/`MAX_FRONTMATTER`
and only a presence check, so a one-word description passes everything while
being useless for the routing we measure hardest), a **5 MB bundled-asset cap**
(we check no sizes, and docket ships a whole `server/` tree the marketplace
carries), and an **asset-directory allow-list** (they walk only `references/`,
`assets/`, `scripts/`; our `references/` convention is documented in
`toolkit-skill-standards` and unenforced).

---

## Negative findings — checked, nothing to take

Recorded so nobody re-investigates.

- **Their frontmatter parser is weaker than ours.** `eng/yaml-parser.mjs` is
  lenient `js-yaml` via `vfile-matter`, wrapped in a `safeFileOperation` that
  logs and returns `null` on any error. That fail-open shape is what our four
  frontmatter incidents taught us to reject; the canonical-grammar gate plus a
  strict-parse oracle that **fails rather than skips** is the stronger design.
- **`eng/validate-skills.mjs` is a subset of `skill-invariants.test.mjs`** apart
  from the two size checks in §6 — no trigger contract, no frontmatter budget
  beyond raw length, no cross-tree mirror check.
- **`.schemas/` is unrelated** — `collection`, `cookbook`, `tools`.
- **Their `skills/` tree** — 1,137 files of generic per-topic prose. Not our
  house style; nothing to adapt. Same verdict as their `agentic-eval` skill.

## Provenance

Re-verify with:

- `curl -s https://api.github.com/repos/github/awesome-copilot/git/trees/main?recursive=1`
  — tree shape, and whether `plugins/` still commits only `plugin.json` + `README.md`
- `npm view @microsoft/vally version` — lint rules and graders were read from
  0.13.0; both rule codes and grader sets may move

Known uncertainty: whether upstream's duplicate detector actually achieves
useful recall is unmeasured — we observed the design, not its results. Our own
A4 criterion (≥80% recall, <20% false alarms) is the bar any port must clear,
and it has never been run against a semantic method.
