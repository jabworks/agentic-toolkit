---
name: toolkit-research-frontier
description: Use when planning improvement work on jabworks/agentic-toolkit itself — open problems (trigger-collision automation, YAML-strict frontmatter checks, docs-catalog enforcement), existing assets, the next three concrete steps, and the four-front library-health campaign with commands and success criteria. Triggers include "what should we improve next", "toolkit roadmap", "open problems", "run the health campaign".
---

# Toolkit Research Frontier

## Purpose

Keep improvement work on this toolkit honest: what is genuinely open, what already
exists, what to do next, and how to know a result is real.

## When to use

- Choosing the next investment in this repo's tooling or skills.
- Someone proposes "we should add a check for X" — verify X isn't already covered.
- Executing or resuming the library-health campaign.

## When not to use

- Day-to-day authoring/shipping → `plugin-foundry` + `toolkit-change-control`.
- Fixing a live defect → `toolkit-debugging-playbook`.

## Inputs required

Current repo state (`node --test`, `git log --oneline -10`) — this skill's lists go
stale precisely when the work it proposes gets done.

## Assets already in place (do not re-propose)

- `node --test` suite in CI: dist-mirror byte parity (bundle-aware), frontmatter
  budgets/naming, marketplace + plugin.json validity, manifest pair parity,
  condux agents mirror, plan-review no-egress, scaffold + annotate-server behavior.
- `scripts/sync.sh` (multi-bundle target detection), `scripts/install-hooks.sh`.
- The condux and toolkit-ops bundles; plugin-foundry's authoring runbook.
- Per-skill trigger evals under `skills/*/evals/` (19 skills, ~390 queries) + the
  trigger matrix and model-transfer eval under `distillation/` (2026-07-08 audit).
- `scripts/eval-triggers.mjs` — live routing scorer (`claude -p` judge; baseline
  76.0% recorded in `references/health-campaign.md` Front A3).

## Open problems (verified open as of 2026-07-08)

1. ~~Trigger-eval routing~~ — closed 2026-07-08 at **91.7%** (three-run
   progression 76.0→85.8→91.7 in `references/health-campaign.md` Front A3).
   Remaining: A4 collision automation, seeded by the 31 residual misses
   (discovery↔session-handoff "resume" space is the strongest).
2. **YAML-strict frontmatter validation.** The invariant test regex-parses
   frontmatter; an `a13e094`-class quoting bug would pass it.
3. ~~Docs-catalog enforcement~~ — closed 2026-07-09: `tests/docs-catalog.test.mjs`
   fails CI when a marketplace plugin is missing from either catalog.
4. ~~Trigger-collision automation~~ — closed 2026-07-09 as **falsified**: lexical
   overlap scoring cannot reproduce the observed (semantic) collisions — 5%
   recall vs the ≥80% criterion (`scripts/collision-scan.mjs --check` is the
   record). Detection stays empirical: periodic eval runs + the flaky list.
5. ~~Hook parity on clones~~ — closed 2026-07-08: `tests/local-hooks.test.mjs`
   warns (never fails) on clones missing the pre-commit sync hook.

## First three concrete steps

1. Split the eval corpus into cold-trigger vs in-context cases, teach
   `scripts/eval-triggers.mjs` to accept `workflow` as a valid route for dev-task
   queries, and re-run toward the ≥90% criterion (baseline: 76.0%, 2026-07-08).
2. Add a docs-catalog test: every `marketplace.json` plugin name appears in README.md
   and CLAUDE.md; wire into `node --test`.
3. Replace the frontmatter regex parse with a strict mini-YAML check (quoting-aware,
   still dependency-free) in `tests/skill-invariants.test.mjs`.

## You have a result when…

- A command exists that fails CI when a trigger-eval query routes to the wrong skill.
- `node --test` fails on an unquoted-`:` description (today it passes).
- `node --test` fails when a registered plugin is absent from either catalog doc.
- A fresh `git clone` + documented setup leaves no safety net uninstalled
  (met 2026-07-08: README/CLAUDE.md notes + the local-hooks warn test).

## The four-front library-health campaign

Full phased campaign — commands, expected observations, branch conditions, wrong paths
fenced off, publish protocol, success criteria — lives in
`references/health-campaign.md`. Fronts: A trigger precision, B manifest parity,
C sync/publish automation, D docs staleness (all four selected by the owner,
2026-07-08; B–D substantially executed in the same audit, A's execution half remains).

## Evidence required

Before proposing any item as "open," verify it against the current test suite and
scripts — this file's own lists are the first thing to distrust.

## Output artifact

An updated frontier list, or a campaign-front status report with evidence.

## Common traps

- Restating solved problems as gaps (dist drift and manifest validity/parity are
  test-enforced now — proposing checks for them wastes a cycle).
- Building the collision-automation moonshot before running the cheap static evals
  that already exist.

## Bad behavior this prevents

Proposing "add a script that fails when skills/ and dist/ diverge" — that script has
existed since `d4118ae` (tests/dist-mirror.test.mjs; the invariant suite grew again at
`eb2b5b5`, and CI runs it all). The assets list makes already-solved problems visibly
solved.

## Related skills

`toolkit-change-control` (shipping campaign outputs), `toolkit-skill-standards`
(collision discipline the automation would mechanize), `toolkit-failure-archaeology`
(incidents that motivate each front).

## Provenance and maintenance

Re-verify volatile claims with:
- `node --test` — what's currently enforced
- `ls skills/*/evals/ 2>/dev/null` — which skills carry trigger evals
- `git log --oneline -10` — whether a frontier item has since been done

Last generated: 2026-07-08
Known uncertainty:
- No weaker-model eval run has happened yet; trigger-eval quality is untested against
  a real model (owner-confirmation-needed for which model/harness to use).
