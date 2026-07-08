# Distillation — 2026-07-08 skill-library audit trail

Mission record for the DAWN_DIRECTIVE audit of jabworks/agentic-toolkit. Everything
below is in the working tree, uncommitted, awaiting Hiếu's review.

## Index of this directory

| File | Contents |
|---|---|
| 00_distillation_plan.md | Evaluation contract + owner scope rulings |
| 01_repo_capability_map.md | 12-section repo map (verified state at HEAD 0b88ab2) |
| 02_expert_distillation_notes.md | Heuristics, red flags, decision trees, git-evidenced lessons |
| 03_trigger_matrix.md | Per-skill trigger analysis, collision seams, 150-query corpus |
| 04_model_transfer_eval.md | 14-task benchmark (2 tasks live-verified) |
| 05/06/07_review_*.md | Independent factual / doctrine / usability reviews |
| 08_fixer_report.md | All 11 IMPORTANT fixed; MINOR disposition |
| 09_uncertainty_register.md | What is NOT verified — read before trusting anything |
| 10_maintenance_plan.md | How to keep the library at this standard |

## Skills CREATED (toolkit-ops bundle, v1.0.0, one marketplace entry)

| Skill | One line | Invoke when |
|---|---|---|
| toolkit-orientation | Zero-context map: trees, bundles, manifest pairing, docs trust order | landing cold in this repo |
| toolkit-change-control | Classify a change, pick the bump, gate on the publish checklist — THE definition of "shipped" and the version-bump home | before calling anything done/published |
| toolkit-skill-standards | Frontmatter budgets, two-field trigger contract, progressive disclosure, collision scan | writing/reviewing any SKILL.md here |
| toolkit-debugging-playbook | Symptom → discriminating command → root cause, with false friends | a skill/plugin from this repo misbehaves |
| toolkit-failure-archaeology | Git-evidenced incident ledger (references/incident-ledger.md) | "has this happened before" / before re-fighting a settled battle |
| toolkit-plugin-reference | Verified plugin.json + marketplace.json schema — THE schema home; Claude↔Codex divergences | field-level manifest questions |
| toolkit-research-frontier | Open problems, assets, next steps + four-front health campaign (references/health-campaign.md) | planning toolkit improvement work |

All seven: safe for automatic model invocation (read-only by themselves) AND manual
invocation by name. Each carries `evals/trigger_eval.json` (≥20 queries).

## Skills/files TOUCHED (fixes to the existing library)

- `plugin-foundry` — 5 defects fixed (marketplace schema, version-bump location, step
  numbering, missing verify gate, hook overclaim) + post-review dedup (bump policy →
  change-control; schema authority → plugin-reference). Version 1.2.0→1.2.1.
- `preflight`, `subagent-execution`, `test-first-development` — trigger contracts
  added via `when_to_use` (they had none). condux 2.0.0→2.0.1.
- All 9 manifest pairs — `interface` added to 5 Claude manifests, `skills` path
  normalized to `./skills/<plugin-dir-name>` everywhere, session-report descriptions
  unified; every touched plugin patch-bumped in both manifests.
- `scripts/sync.sh` + `tests/dist-mirror.test.mjs` — bundle detection generalized
  beyond hardcoded condux (required for toolkit-ops).
- NEW `tests/manifest-parity.test.mjs` (pair identity + interface presence + hooks
  asymmetry + trigger contracts) and NEW `scripts/install-hooks.sh`.
- README.md + CLAUDE.md — validate.sh ghost removed, catalogs completed (git-commit,
  git-operations, spec-browser, toolkit-ops, /using-condux), cp-r workflow replaced
  with sync.sh + verify, trigger-contract invariant wording amended (owner-ratified).
- `.claude-plugin/marketplace.json` — toolkit-ops entry added (9 plugins total).

## Dependency map (who defers to whom)

- Publish mechanics: everyone → `plugin-foundry` (canonical checklist).
- "Is it shipped" + version-bump policy: everyone → `toolkit-change-control`.
- Manifest/marketplace schema: everyone → `toolkit-plugin-reference`.
- Content/trigger bar: foundry + orientation → `toolkit-skill-standards`.
- Precedent: playbook + frontier → `toolkit-failure-archaeology`.
- External templates: standards → `adapting-skills` (pre-existing) first.

## Suggested first skills for a zero-context session

1. `toolkit-orientation` → 2. `plugin-foundry` (if building) or
`toolkit-debugging-playbook` (if fixing) → 3. `toolkit-change-control` before
claiming anything is done.

Last generated: 2026-07-08
