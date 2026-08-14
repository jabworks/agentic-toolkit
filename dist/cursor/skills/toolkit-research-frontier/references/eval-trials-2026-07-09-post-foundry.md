# Trigger-routing run — 2026-07-09

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 394 cold-trigger cases scored (20 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 87.1% / 90.1% / 88.6% · mean **88.6% ± 3.8pp** (95% CI, t-dist) · flaky cases: 37
Overall routing accuracy: **349/394 = 88.6%**

## Per expected skill

| expected | accuracy |
|---|---|
| subagent-execution | 9/15 |
| technical-spec | 10/13 |
| workflow | 26/33 |
| git-operations | 4/5 |
| discovery | 12/15 |
| toolkit-failure-archaeology | 13/16 |
| toolkit-research-frontier | 13/16 |
| draft-plan | 11/13 |
| finalize | 8/9 |
| toolkit-change-control | 16/18 |
| root-cause-analysis | 17/19 |
| toolkit-plugin-reference | 17/19 |
| toolkit-orientation | 10/11 |
| test-first-development | 11/12 |
| subagent-deployment | 13/14 |
| plan-review | 15/16 |
| release | 15/16 |
| toolkit-skill-standards | 16/17 |
| preflight | 17/18 |
| toolkit-debugging-playbook | 20/21 |
| (null) | 46/48 |
| code-review | 17/17 |
| git-commit | 3/3 |
| spec-browser | 4/4 |
| toolkit-foundry | 4/4 |
| adapting-skills | 2/2 |

## Misses (45)

| query | expected | got | corpus file |
|---|---|---|---|
| resume the design we started yesterday | discovery | session-handoff | discovery |
| found an existing design doc for this, continue from it | discovery | draft-plan | discovery |
| create the docs/plans file for this feature | draft-plan | technical-spec | draft-plan |
| the plan needs revision per the review feedback | draft-plan | plan-review | draft-plan |
| something like plannotator? | plan-review | null | plan-review |
| I tested it manually, ship it | preflight | release | preflight |
| npm unpublish the broken version | release | null | release |
| just patch it quickly, we can investigate later | root-cause-analysis | null | root-cause-analysis |
| spawn a generic subagent with this custom prompt | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| use the coder agent to implement the plan | subagent-execution | null | subagent-execution |
| whats in spawn-rules for picking an agent | subagent-execution | workflow | subagent-execution |
| which model should the coder agent get for this task | subagent-execution | null | subagent-execution |
| we compacted mid-plan, where were we with the agents | subagent-execution | null | subagent-execution |
| dont re-dispatch tasks that are already done | subagent-execution | null | subagent-execution |
| sdd the plan | subagent-execution | technical-spec | subagent-execution |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| update the spec for wan-config | technical-spec | null | technical-spec |
| scaffold a spec folder for this feature | technical-spec | null | technical-spec |
| bump the index.md changelog for the spec | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| design the feature first before documenting | discovery | null | technical-spec |
| should I tdd ui components | test-first-development | null | test-first-development |
| add tests for the existing legacy code | workflow | null | test-first-development |
| write e2e tests with playwright for the flow | workflow | test-first-development | test-first-development |
| run the tests | finalize | null | test-first-development |
| jest config setup for the monorepo | workflow | null | test-first-development |
| quick temp skill, skip the marketplace bit for now | toolkit-change-control | toolkit-foundry | toolkit-change-control |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | toolkit-orientation | toolkit-change-control |
| publish my npm package | null | release | toolkit-change-control |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | toolkit-skill-standards | toolkit-debugging-playbook |
| browser devtools show a network error on my site | null | root-cause-analysis | toolkit-debugging-playbook |
| has this happened before | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| we should try monorepo plan paths | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | toolkit-orientation | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| wheres the marketplace json and what reads it | toolkit-orientation | toolkit-plugin-reference | toolkit-orientation |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | toolkit-debugging-playbook | toolkit-plugin-reference |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | null | toolkit-research-frontier |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | toolkit-skill-standards | toolkit-research-frontier |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | toolkit-failure-archaeology | toolkit-research-frontier |
| my yaml description has a colon and things broke | toolkit-skill-standards | toolkit-failure-archaeology | toolkit-skill-standards |
| update the readme wording for the install section | workflow | null | workflow |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | workflow | workflow |

## Flaky cases (37 — hit in some trials, missed in others)

| query | expected | hits |
|---|---|---|
| any security issues in this change? | code-review | 2/3 |
| was the approach in this diff right? | code-review | 2/3 |
| lgtm? | code-review | 2/3 |
| find n+1 queries in this diff | code-review | 2/3 |
| fix the critical findings from the review | workflow | 2/3 |
| resume the design we started yesterday | discovery | 1/3 |
| found an existing design doc for this, continue from it | discovery | 2/3 |
| the plan needs revision per the review feedback | draft-plan | 1/3 |
| quick inline plan for a medium sized task | workflow | 2/3 |
| something like plannotator? | plan-review | 1/3 |
| any debug logs left behind? | preflight | 2/3 |
| npm unpublish the broken version | release | 1/3 |
| 3 fixes failed already, whats the next idea | root-cause-analysis | 2/3 |
| dispatch all three coders in the same message | subagent-deployment | 2/3 |
| use the coder agent to implement the plan | subagent-execution | 2/3 |
| update the spec for wan-config | technical-spec | 1/3 |
| the test is failing so just fix the test | test-first-development | 2/3 |
| add tests for the existing legacy code | workflow | 1/3 |
| whats the checklist before I commit toolkit changes | toolkit-change-control | 2/3 |
| can I call this done? skill md written and synced | toolkit-change-control | 2/3 |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | 1/3 |
| my react app crashes on load | root-cause-analysis | 2/3 |
| debug this failing jest test in my project | root-cause-analysis | 2/3 |
| browser devtools show a network error on my site | null | 1/3 |
| has this happened before | toolkit-failure-archaeology | 2/3 |
| we should try monorepo plan paths | toolkit-failure-archaeology | 2/3 |
| why are there two rename commits a605be9 and 0b88ab2 | toolkit-failure-archaeology | 2/3 |
| what frontmatter fields are actually parsed vs just convention | toolkit-plugin-reference | 1/3 |
| is argument-hint a real frontmatter field | toolkit-plugin-reference | 2/3 |
| where did we leave the trigger-eval work | toolkit-research-frontier | 1/3 |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | 1/3 |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | 1/3 |
| my yaml description has a colon and things broke | toolkit-skill-standards | 1/3 |
| lint my typescript code | null | 2/3 |
| route this task | workflow | 2/3 |
| update the readme wording for the install section | workflow | 1/3 |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | 2/3 |

