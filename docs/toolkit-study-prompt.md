# Prompt: study jabworks/agentic-toolkit and extract transferable doctrine

You have read access to a checkout of `jabworks/agentic-toolkit` — locally at
`/home/hieuvi/projects/agentic-toolkit` if you are on the owner's machine, otherwise
clone it from GitHub. It is a working, shipped toolkit of agent skills and plugins that
runs across three different agent hosts (Claude Code, Codex, OpenCode) from a single
source tree. Your job is to learn from it, not to inventory it.

The target environment runs **Codex** — judge every finding through that lens. I want
the good parts of this repo working there. That can happen two ways, and your report
must say which applies, per finding:

- **Port the pattern** — re-implement the design decision, the invariant, and the
  machinery that enforces it, natively in the target repo.
- **Adopt the artifact** — install the skill or plugin as-is through one of its
  distribution channels (see "Adoption channels" below) when it stands alone and the
  need matches.

So the deliverable is **transferable doctrine with evidence — the design decisions, the
invariants, and the machinery that makes them hold — plus an adoption plan**. Not a tour
of the directory structure, and not a summary of what each skill does.

## Ground rules

1. **Read the actual files.** `CLAUDE.md` and `README.md` state intent; the skills, the
   scripts, and especially `tests/` state what is actually enforced. Where they disagree,
   the tests win — and the disagreement is itself a finding.
2. **Quote evidence.** Every claim you make cites a file and line. A pattern you cannot
   point at is a guess; label it as one.
3. **Prefer the enforced over the aspirational.** Any rule that is only prose is a rule
   that drifts. Note which conventions here have a test behind them and which don't.
4. **Port deliberately, adopt deliberately.** When porting, carry the mechanism, not
   the text. When recommending an as-is install, first check the skill stands alone (no
   cross-plugin dependency — the repo enforces this) and won't compete with the target's
   existing skills for the same prompts. Either way, tell me what it costs and when it
   would be the wrong choice.

## The map

```
skills/<name>/SKILL.md          30 skills — the editable source of truth
  references/                   optional deeper material, loaded on demand
dist/plugins/<name>/            generated install mirror (Claude Code + Codex manifests)
dist/opencode/skills/           generated OpenCode mirror (different frontmatter shape)
packages/condux-opencode/       npm plugin — self-registers agents + bundled skills
.claude-plugin/marketplace.json plugin registry
scripts/sync.sh                 skills/ → dist/ mirror + opencode build
scripts/build-opencode.mjs      the host-specific transform
scripts/eval-triggers.mjs       measures whether skills actually fire on realistic prompts
scripts/collision-scan.mjs      finds skills that would compete for the same prompt
tests/*.test.mjs                18 test files — the real specification
distillation/                   the repo's own prior self-analysis (read this LAST)
specs/                          durable design docs for past work
```

## Adoption channels (Codex)

When you recommend adopting an artifact as-is, these are the two Codex-ready channels
(full instructions live in `README.md`):

- **Plugin marketplace** (preferred — brings manifests, hooks, and bundles):
  `codex plugin marketplace add jabworks/agentic-toolkit`, then
  `codex plugin add <name>@jabworks-agentic-toolkit` — installs from `dist/plugins/`,
  reading each plugin's `.codex-plugin/plugin.json`.
- **Skills CLI** (single skills, no plugin machinery):
  `npx skills add jabworks/agentic-toolkit` — auto-detects Codex and installs from
  top-level `skills/`.

## The Codex lens

Weigh these Codex-specific facts while you study:

- `when_to_use` is a native Codex frontmatter field — the trigger contract ports to
  Codex without transformation. The OpenCode fold machinery (`scripts/build-opencode.mjs`)
  is worth reading only as doctrine for adapting to a second host, never for porting.
- Every plugin ships a `.codex-plugin/plugin.json` beside `.claude-plugin/plugin.json`;
  `tests/manifest-parity.test.mjs` forces them to agree and keeps `interface` and
  `hooks` Codex-only. Study how host-specific surface is contained, not duplicated.
- Two skills carry real Codex hook machinery worth special attention: `concord`
  (rollout-sync capture + session-start recall, Codex-only hooks) and `plan-review`
  (Codex Stop-hook auto-capture, manifest `hooks` → codex-hooks.json wiring).

## Lines of inquiry

Work through these. They are ordered roughly by how much they'll teach you.

**1. The trigger contract.** Read ten `SKILL.md` frontmatter blocks — start with
`skills/preflight/`, `skills/live-verification/`, `skills/root-cause-analysis/`,
`skills/coding-directive/`. There is a deliberate split between `description` (what it
is) and `when_to_use` (when it fires), and nearly every skill carries explicit _negative_
triggers — "Not for X; that's Y." Work out: why is a negative trigger load-bearing? What
failure does it prevent that a good positive description doesn't? How is the contract
enforced (`tests/manifest-parity.test.mjs`, `tests/skill-invariants.test.mjs`,
`tests/skill-routing-contracts.test.mjs`)? What are the size budgets and why those
numbers?

**2. Treating skill-firing as a measurable property.** `scripts/eval-triggers.mjs` and
`scripts/collision-scan.mjs` treat "does the right skill activate?" as something you
evaluate, not something you hope for. Read both. What is being measured, against what
corpus, and what does a failure look like? This is the least common practice in the repo
and possibly the most valuable — say what it would take to stand up an equivalent
elsewhere.

**3. One source, three hosts.** `skills/` is authored once; `dist/plugins/` and
`dist/opencode/skills/` are generated. Read `scripts/sync.sh`, `scripts/build-opencode.mjs`,
and `tests/dist-mirror.test.mjs` + `tests/opencode-dist.test.mjs`. What differs between
hosts and what is forced to stay identical? How does the repo make generated-tree drift
impossible to commit rather than merely discouraged (look for the pre-commit hook and
what CI re-checks)? Where is the mirror a genuine mirror and where is it a transform?

**4. Tests as the specification for prose artifacts.** These are markdown files, yet 20
test suites guard them: frontmatter budgets, kebab-case names matching directory names,
manifest parity across two hosts, marketplace paths resolving on disk, docs catalogs
staying in sync with the registry, and a _no-network-egress_ guarantee for one skill
(`plan-review`). Read `tests/skill-invariants.test.mjs`, `tests/manifest-parity.test.mjs`,
`tests/docs-catalog.test.mjs`, `tests/browser-security.test.mjs`,
`tests/script-safety.test.mjs`. Which invariants are worth stealing for any repo that
ships agent instructions? Which are specific to this one's distribution model?

**5. The workflow doctrine.** `skills/workflow/SKILL.md` is the routing brain: effort
tiers (Small/Medium/Large), soft gates, "implement yourself by default, delegate only
with justification", checkpoints. Then read the skills it routes into — `discovery`,
`draft-plan`, `preflight`, `finalize`, `live-verification`, `code-review` — and note the
ordering discipline (preflight _before_ finalize; live-verification _after_). What is the
theory of when an agent should stop and ask versus proceed? Where is that theory encoded
so it survives a fresh context?

**6. Institutional memory as skills.** `skills/toolkit-failure-archaeology/` and
`skills/toolkit-debugging-playbook/` encode past failures so they don't recur;
`skills/concord/` is a memory plugin with real tiered aging (buffer → days → recent →
archive) and hook-driven capture. Read `skills/concord/lib/` and its five test suites.
What is the durable idea here about giving an agent memory that doesn't rot?

**7. Artifact placement.** There's a strict contract: durable output goes to a normal
project path (`specs/`), working state goes to `<git-root>/.<plugin-name>/`, gitignored,
named for the owning plugin — never the repo root, never CWD, never the project's `docs/`.
Find it in `skills/toolkit-skill-standards/SKILL.md`. Note that shipping skills restate
this inline rather than referencing it — work out why, and what that says about writing
skills that must survive being installed alone.

**8. Progressive disclosure.** Some skills are a single `SKILL.md`; others carry
`references/`. Find the rule the repo uses to decide, and judge whether it holds.

## Cross-check, then report

Read `distillation/` **only after** you've formed your own view — it is this repo's own
earlier attempt at exactly your task (capability map, trigger matrix, transfer eval,
three separate review passes, an uncertainty register). Compare. Where you agree, say so
briefly. Where you disagree or found something it missed, say that loudly — that's the
most useful thing you can produce.

## Output

A single markdown report. No file inventory, no per-skill summaries.

- **Top patterns worth adopting** — ranked. For each: the pattern in one sentence, the
  evidence (file:line), the failure it prevents, what it costs to adopt, and when it
  would be wrong.
- **The enforcement ladder** — for each convention, whether it's enforced by a test, by a
  hook, by prose, or by nothing. Call out anything important sitting on prose alone.
- **What I'd port first** — the smallest change to another repo that captures the most
  value here, concretely enough to act on.
- **What I'd install as-is** — which skills or plugins serve the target environment
  unmodified, via which channel, and what trigger collisions with the target's existing
  skills an install would create (apply the `scripts/collision-scan.mjs` idea against
  the combined skill set).
- **What not to copy** — over-fitting to this repo's three-host distribution, or anything
  whose cost outruns its value at smaller scale.
- **Open questions** — what you couldn't determine from the source, and what you'd need
  to read or run to settle it.

Be direct about weaknesses. A report that only praises the repo is a failed report.
