# Trigger-routing run — 2026-07-11

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 394 cold-trigger cases scored (20 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 88.1% / 88.6% / 88.6% · mean **88.4% ± 0.7pp** (95% CI, t-dist) · flaky cases: 39
Overall routing accuracy: **349/394 = 88.6%**

## Per expected skill

| expected | accuracy |
|---|---|
| git-operations | 3/5 |
| discovery | 11/15 |
| subagent-execution | 11/15 |
| toolkit-research-frontier | 12/16 |
| workflow | 25/33 |
| technical-spec | 10/13 |
| preflight | 15/18 |
| root-cause-analysis | 16/19 |
| subagent-deployment | 12/14 |
| finalize | 8/9 |
| toolkit-change-control | 16/18 |
| toolkit-debugging-playbook | 19/21 |
| test-first-development | 11/12 |
| draft-plan | 12/13 |
| plan-review | 15/16 |
| toolkit-failure-archaeology | 15/16 |
| toolkit-skill-standards | 16/17 |
| toolkit-plugin-reference | 18/19 |
| (null) | 47/48 |
| code-review | 17/17 |
| git-commit | 3/3 |
| release | 16/16 |
| spec-browser | 4/4 |
| toolkit-foundry | 4/4 |
| toolkit-orientation | 11/11 |
| adapting-skills | 2/2 |

## Misses (45)

| query | expected | got | corpus file |
|---|---|---|---|
| resume the design we started yesterday | discovery | session-handoff | discovery |
| found an existing design doc for this, continue from it | discovery | session-handoff | discovery |
| design a database schema for multi-tenancy | discovery | workflow | discovery |
| the plan needs revision per the review feedback | draft-plan | null | draft-plan |
| quick inline plan for a medium sized task | workflow | null | draft-plan |
| something like plannotator? | plan-review | null | plan-review |
| verify this | preflight | null | preflight |
| I tested it manually, ship it | preflight | release | preflight |
| only changed one line, can we skip the checks | preflight | null | preflight |
| push my branch up | git-operations | null | release |
| 3 fixes failed already, whats the next idea | root-cause-analysis | null | root-cause-analysis |
| just patch it quickly, we can investigate later | root-cause-analysis | null | root-cause-analysis |
| add error handling to this function | workflow | null | root-cause-analysis |
| fix the bug — I already know exactly whats wrong | workflow | null | root-cause-analysis |
| spawn a generic subagent with this custom prompt | subagent-deployment | null | subagent-deployment |
| dispatch all three coders in the same message | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| which model should the coder agent get for this task | subagent-execution | null | subagent-execution |
| we compacted mid-plan, where were we with the agents | subagent-execution | session-handoff | subagent-execution |
| dont re-dispatch tasks that are already done | subagent-execution | null | subagent-execution |
| sdd the plan | subagent-execution | null | subagent-execution |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| update the spec for wan-config | technical-spec | null | technical-spec |
| scaffold a spec folder for this feature | technical-spec | null | technical-spec |
| bump the index.md changelog for the spec | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| design the feature first before documenting | discovery | null | technical-spec |
| should I tdd ui components | test-first-development | null | test-first-development |
| write e2e tests with playwright for the flow | workflow | test-first-development | test-first-development |
| run the tests | finalize | null | test-first-development |
| jest config setup for the monorepo | workflow | null | test-first-development |
| quick temp skill, skip the marketplace bit for now | toolkit-change-control | toolkit-foundry | toolkit-change-control |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | toolkit-failure-archaeology | toolkit-change-control |
| publish my npm package | null | release | toolkit-change-control |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | toolkit-skill-standards | toolkit-debugging-playbook |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | toolkit-orientation | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| where did we leave the trigger-eval work | toolkit-research-frontier | toolkit-failure-archaeology | toolkit-research-frontier |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | toolkit-failure-archaeology | toolkit-research-frontier |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | null | toolkit-research-frontier |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | toolkit-failure-archaeology | toolkit-research-frontier |
| fix this failing test right now | toolkit-debugging-playbook | null | toolkit-research-frontier |
| my yaml description has a colon and things broke | toolkit-skill-standards | toolkit-debugging-playbook | toolkit-skill-standards |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | workflow | workflow |

## Flaky cases (39 — hit in some trials, missed in others)

| query | expected | hits |
|---|---|---|
| fix the critical findings from the review | workflow | 2/3 |
| found an existing design doc for this, continue from it | discovery | 1/3 |
| design a database schema for multi-tenancy | discovery | 2/3 |
| create the docs/plans file for this feature | draft-plan | 1/3 |
| the plan needs revision per the review feedback | draft-plan | 1/3 |
| something like plannotator? | plan-review | 1/3 |
| verify this | preflight | 1/3 |
| any debug logs left behind? | preflight | 2/3 |
| npm unpublish the broken version | release | 2/3 |
| push my branch up | git-operations | 1/3 |
| 3 fixes failed already, whats the next idea | root-cause-analysis | 2/3 |
| add error handling to this function | workflow | 2/3 |
| fix the bug — I already know exactly whats wrong | workflow | 1/3 |
| my toolkit skill isnt triggering | toolkit-debugging-playbook | 2/3 |
| fix these 3 unrelated failing test files at once | subagent-deployment | 2/3 |
| batch these lookups together | subagent-deployment | 2/3 |
| dispatch all three coders in the same message | subagent-deployment | 1/3 |
| parallelize the test suite in ci | null | 2/3 |
| use the coder agent to implement the plan | subagent-execution | 2/3 |
| whats in spawn-rules for picking an agent | subagent-execution | 2/3 |
| we compacted mid-plan, where were we with the agents | subagent-execution | 1/3 |
| dont re-dispatch tasks that are already done | subagent-execution | 1/3 |
| update the spec for wan-config | technical-spec | 1/3 |
| bug: prove it with a failing test then fix it | test-first-development | 1/3 |
| run the tests | finalize | 1/3 |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | 1/3 |
| browser devtools show a network error on my site | null | 2/3 |
| fix the 502 on my nginx server | null | 2/3 |
| has this happened before | toolkit-failure-archaeology | 2/3 |
| we should try monorepo plan paths | toolkit-failure-archaeology | 2/3 |
| wheres the marketplace json and what reads it | toolkit-orientation | 2/3 |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | 2/3 |
| what frontmatter fields are actually parsed vs just convention | toolkit-plugin-reference | 2/3 |
| is argument-hint a real frontmatter field | toolkit-plugin-reference | 2/3 |
| where did we leave the trigger-eval work | toolkit-research-frontier | 1/3 |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | 2/3 |
| fix this failing test right now | toolkit-debugging-playbook | 1/3 |
| lint my typescript code | null | 2/3 |
| update the readme wording for the install section | workflow | 1/3 |

