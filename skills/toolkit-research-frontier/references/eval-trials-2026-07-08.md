# Trigger-routing run — 2026-07-08

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 373 cold-trigger cases scored (19 in-context cases excluded; 29 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 90.6% / 89.8% / 94.4% · mean **91.6% ± 6.1pp** (95% CI, t-dist) · flaky cases: 35
Overall routing accuracy: **34/36 = 94.4%**

## Per expected skill

| expected | accuracy |
|---|---|
| discovery | 10/12 |
| code-review | 12/12 |
| workflow | 2/2 |
| plan-review | 3/3 |
| git-operations | 1/1 |
| (null) | 2/2 |
| draft-plan | 2/2 |
| technical-spec | 1/1 |
| root-cause-analysis | 1/1 |

## Misses (2)

| query | expected | got | corpus file |
|---|---|---|---|
| resume the design we started yesterday | discovery | session-handoff | discovery |
| found an existing design doc for this, continue from it | discovery | draft-plan | discovery |

## Flaky cases (35 — hit in some trials, missed in others)

| query | expected | hits |
|---|---|---|
| resume the design we started yesterday | discovery | 1/3 |
| the plan needs revision per the review feedback | draft-plan | 1/2 |
| quick inline plan for a medium sized task | workflow | 1/2 |
| something like plannotator? | plan-review | 1/2 |
| verify this | preflight | 1/2 |
| any debug logs left behind? | preflight | 1/2 |
| only changed one line, can we skip the checks | preflight | 1/2 |
| fix these 3 unrelated failing test files at once | subagent-deployment | 1/2 |
| two independent bugs in different packages, handle both | subagent-deployment | 1/2 |
| batch these lookups together | subagent-deployment | 1/2 |
| whats in spawn-rules for picking an agent | subagent-execution | 1/2 |
| dont re-dispatch tasks that are already done | subagent-execution | 1/2 |
| update the spec for wan-config | technical-spec | 1/2 |
| design the feature first before documenting | discovery | 1/2 |
| add tests for the existing legacy code | workflow | 1/2 |
| write e2e tests with playwright for the flow | workflow | 1/2 |
| jest config setup for the monorepo | workflow | 1/2 |
| review my description wording | toolkit-skill-standards | 1/2 |
| why does codex install fail with missing plugin.json | toolkit-debugging-playbook | 1/2 |
| my react app crashes on load | root-cause-analysis | 1/2 |
| debug this failing jest test in my project | root-cause-analysis | 1/2 |
| why does sync.sh special-case the agents dir | toolkit-failure-archaeology | 1/2 |
| why is grep -P banned here | toolkit-failure-archaeology | 1/2 |
| what frontmatter fields are actually parsed vs just convention | toolkit-plugin-reference | 1/2 |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | 1/2 |
| is argument-hint a real frontmatter field | toolkit-plugin-reference | 1/2 |
| where did we leave the trigger-eval work | toolkit-research-frontier | 1/2 |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | 1/2 |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | 1/2 |
| fix this failing test right now | toolkit-debugging-playbook | 1/2 |
| my yaml description has a colon and things broke | toolkit-skill-standards | 1/2 |
| convert this superpowers skill for our toolkit | adapting-skills | 1/2 |
| lint my typescript code | null | 1/2 |
| route this task | workflow | 1/2 |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | 1/2 |

