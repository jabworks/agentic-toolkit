# Trigger-routing run — 2026-07-09

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 394 cold-trigger cases scored (20 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 89.8% / 86.5% / 89.8% · mean **88.7% ± 4.7pp** (95% CI, t-dist) · flaky cases: 44
Overall routing accuracy: **354/394 = 89.8%**

## Per expected skill

| expected | accuracy |
|---|---|
| subagent-execution | 11/15 |
| toolkit-research-frontier | 12/16 |
| git-operations | 4/5 |
| discovery | 12/15 |
| workflow | 27/33 |
| technical-spec | 11/13 |
| finalize | 8/9 |
| toolkit-change-control | 16/18 |
| root-cause-analysis | 17/19 |
| toolkit-plugin-reference | 17/19 |
| toolkit-debugging-playbook | 19/21 |
| toolkit-orientation | 10/11 |
| (null) | 45/49 |
| draft-plan | 12/13 |
| subagent-deployment | 13/14 |
| toolkit-failure-archaeology | 15/16 |
| code-review | 16/17 |
| toolkit-skill-standards | 16/17 |
| preflight | 17/18 |
| plan-review | 16/16 |
| git-commit | 3/3 |
| spec-browser | 4/4 |
| release | 15/15 |
| test-first-development | 12/12 |
| plugin-foundry | 4/4 |
| adapting-skills | 2/2 |

## Misses (40)

| query | expected | got | corpus file |
|---|---|---|---|
| any security issues in this change? | code-review | null | code-review |
| resume the design we started yesterday | discovery | session-handoff | discovery |
| found an existing design doc for this, continue from it | discovery | draft-plan | discovery |
| create the docs/plans file for this feature | draft-plan | technical-spec | draft-plan |
| release the package to npm | null | release | finalize |
| review this google doc proposal | null | discovery | plan-review |
| only changed one line, can we skip the checks | preflight | null | preflight |
| just patch it quickly, we can investigate later | root-cause-analysis | null | root-cause-analysis |
| spawn a generic subagent with this custom prompt | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| which model should the coder agent get for this task | subagent-execution | null | subagent-execution |
| we compacted mid-plan, where were we with the agents | subagent-execution | session-handoff | subagent-execution |
| dont re-dispatch tasks that are already done | subagent-execution | null | subagent-execution |
| sdd the plan | subagent-execution | null | subagent-execution |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| scaffold a spec folder for this feature | technical-spec | null | technical-spec |
| bump the index.md changelog for the spec | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| design the feature first before documenting | discovery | null | technical-spec |
| add tests for the existing legacy code | workflow | null | test-first-development |
| run the tests | finalize | null | test-first-development |
| jest config setup for the monorepo | workflow | null | test-first-development |
| quick temp skill, skip the marketplace bit for now | toolkit-change-control | adapting-skills | toolkit-change-control |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | null | toolkit-change-control |
| publish my npm package | null | release | toolkit-change-control |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | toolkit-skill-standards | toolkit-debugging-playbook |
| browser devtools show a network error on my site | null | root-cause-analysis | toolkit-debugging-playbook |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | toolkit-orientation | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| wheres the marketplace json and what reads it | toolkit-orientation | toolkit-plugin-reference | toolkit-orientation |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | toolkit-debugging-playbook | toolkit-plugin-reference |
| where did we leave the trigger-eval work | toolkit-research-frontier | null | toolkit-research-frontier |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | null | toolkit-research-frontier |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | toolkit-skill-standards | toolkit-research-frontier |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | null | toolkit-research-frontier |
| fix this failing test right now | toolkit-debugging-playbook | null | toolkit-research-frontier |
| my yaml description has a colon and things broke | toolkit-skill-standards | toolkit-debugging-playbook | toolkit-skill-standards |
| update the readme wording for the install section | workflow | null | workflow |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | workflow | workflow |

## Flaky cases (44 — hit in some trials, missed in others)

| query | expected | hits |
|---|---|---|
| any security issues in this change? | code-review | 2/3 |
| was the approach in this diff right? | code-review | 2/3 |
| resume the design we started yesterday | discovery | 1/3 |
| the plan needs revision per the review feedback | draft-plan | 1/3 |
| quick inline plan for a medium sized task | workflow | 1/3 |
| open live preview of specs/wan-config | plan-review | 1/3 |
| review this google doc proposal | null | 1/3 |
| any debug logs left behind? | preflight | 2/3 |
| did we cover the edge cases | preflight | 2/3 |
| I tested it manually, ship it | preflight | 1/3 |
| only changed one line, can we skip the checks | preflight | 1/3 |
| whats in the next release | release | 2/3 |
| npm unpublish the broken version | release | 2/3 |
| batch these lookups together | subagent-deployment | 2/3 |
| use the coder agent to implement the plan | subagent-execution | 2/3 |
| whats in spawn-rules for picking an agent | subagent-execution | 1/3 |
| which model should the coder agent get for this task | subagent-execution | 1/3 |
| we compacted mid-plan, where were we with the agents | subagent-execution | 1/3 |
| dont re-dispatch tasks that are already done | subagent-execution | 1/3 |
| ill implement the plan myself top to bottom | workflow | 1/3 |
| update the spec for wan-config | technical-spec | 2/3 |
| bump the index.md changelog for the spec | technical-spec | 1/3 |
| design the feature first before documenting | discovery | 1/3 |
| should I tdd ui components | test-first-development | 2/3 |
| write e2e tests with playwright for the flow | workflow | 1/3 |
| scaffold a brand new skill for me | plugin-foundry | 1/3 |
| publish my npm package | null | 1/3 |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | 1/3 |
| my react app crashes on load | root-cause-analysis | 2/3 |
| debug this failing jest test in my project | root-cause-analysis | 2/3 |
| browser devtools show a network error on my site | null | 1/3 |
| has this happened before | toolkit-failure-archaeology | 2/3 |
| why are there two rename commits a605be9 and 0b88ab2 | toolkit-failure-archaeology | 2/3 |
| wheres the marketplace json and what reads it | toolkit-orientation | 1/3 |
| add a new skill to the toolkit | plugin-foundry | 2/3 |
| what frontmatter fields are actually parsed vs just convention | toolkit-plugin-reference | 2/3 |
| is argument-hint a real frontmatter field | toolkit-plugin-reference | 2/3 |
| is manifest parity enforced now or still open | toolkit-research-frontier | 2/3 |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | 1/3 |
| fix this failing test right now | toolkit-debugging-playbook | 1/3 |
| my yaml description has a colon and things broke | toolkit-skill-standards | 1/3 |
| route this task | workflow | 1/3 |
| update the readme wording for the install section | workflow | 1/3 |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | 1/3 |

