# Trigger-routing run — 2026-08-20

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 598 cold-trigger cases scored (24 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 92.3% / 93.8% / 93.8% · mean **93.3% ± 2.2pp** (95% CI, t-dist) · flaky cases: 51
Overall routing accuracy: **561/598 = 93.8%**

## Per expected skill

| expected | accuracy |
|---|---|
| draft-plan | 9/13 |
| toolkit-research-frontier | 12/16 |
| workflow | 29/38 |
| technical-spec | 13/15 |
| discovery | 13/15 |
| toolkit-failure-archaeology | 15/17 |
| release | 15/17 |
| plan-review | 16/18 |
| git-operations | 9/10 |
| root-cause-analysis | 18/20 |
| toolkit-change-control | 17/18 |
| toolkit-plugin-reference | 18/19 |
| (null) | 78/82 |
| toolkit-debugging-playbook | 24/25 |
| adapting-skills | 11/11 |
| toolkit-foundry | 5/5 |
| toolkit-skill-standards | 18/18 |
| blueprint | 11/11 |
| code-review | 19/19 |
| coding-directive | 9/9 |
| finalize | 12/12 |
| git-commit | 4/4 |
| concord-doctor | 6/6 |
| remember | 3/3 |
| session-handoff | 16/16 |
| condux-doctor | 7/7 |
| groom | 16/16 |
| docket-doctor | 11/11 |
| record | 18/18 |
| subagent-execution | 16/16 |
| preflight | 23/23 |
| git-worktree | 16/16 |
| subagent-deployment | 13/13 |
| live-verification | 14/14 |
| spec-browser | 4/4 |
| test-first-development | 12/12 |
| toolkit-orientation | 11/11 |

## Misses (37)

| query | expected | got | corpus file |
|---|---|---|---|
| fix the critical findings from the review | workflow | code-review | code-review |
| my redis cache keeps evicting keys | null | root-cause-analysis | concord-doctor |
| design a database schema for multi-tenancy | discovery | blueprint | discovery |
| skip discovery, just plan it | draft-plan | workflow | discovery |
| create the .condux/plans file for this feature | draft-plan | null | draft-plan |
| we havent designed this yet but write a plan anyway | draft-plan | null | draft-plan |
| quick inline plan for a medium sized task | workflow | draft-plan | draft-plan |
| open live preview of specs/wan-config | plan-review | spec-browser | plan-review |
| something like plannotator? | plan-review | null | plan-review |
| write the plan first | draft-plan | null | plan-review |
| draft release notes from the commits | release | null | release |
| npm unpublish the broken version | release | null | release |
| just patch it quickly, we can investigate later | root-cause-analysis | null | root-cause-analysis |
| what does this stack trace mean | root-cause-analysis | null | root-cause-analysis |
| hand off the project to another team | null | session-handoff | session-handoff |
| fix these 3 unrelated failing test files at once | workflow | subagent-deployment | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| set up the deployment pipeline for staging | null | workflow | subagent-deployment |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| record the decision rationale for future sessions | technical-spec | remember | technical-spec |
| bump the index.md changelog for the spec | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| design the feature first before documenting | discovery | null | technical-spec |
| add tests for the existing legacy code | workflow | null | test-first-development |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | toolkit-orientation | toolkit-change-control |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | toolkit-skill-standards | toolkit-debugging-playbook |
| fix the 502 on my nginx server | null | workflow | toolkit-debugging-playbook |
| what mistakes did past sessions make in this repo | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | toolkit-orientation | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| whats still open after the audit | toolkit-research-frontier | null | toolkit-research-frontier |
| where did we leave the trigger-eval work | toolkit-research-frontier | null | toolkit-research-frontier |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | null | toolkit-research-frontier |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | null | toolkit-research-frontier |
| route this task | workflow | null | workflow |
| update the readme wording for the install section | workflow | null | workflow |

## Flaky cases (51 — hit in some trials, missed in others)

| query | expected | hits | got when missed |
|---|---|---|---|
| plot signups per week as a bar chart | null | 2/3 | dataviz |
| the specialist agents are missing after I updated the plugin | condux-doctor | 2/3 | toolkit-debugging-playbook |
| design a database schema for multi-tenancy | discovery | 1/3 | blueprint |
| skip discovery, just plan it | draft-plan | 1/3 | workflow |
| docket_add isn't available anymore, what happened | docket-doctor | 1/3 | toolkit-debugging-playbook |
| create the .condux/plans file for this feature | draft-plan | 1/3 | null |
| break this down into tasks with dependencies | draft-plan | 2/3 | workflow |
| write-plan for checkout v2 | draft-plan | 2/3 | workflow |
| the plan needs revision per the review feedback | draft-plan | 2/3 | null |
| quick inline plan for a medium sized task | workflow | 1/3 | null, draft-plan |
| make a project timeline gantt chart | null | 2/3 | dataviz |
| why is this one test failing | root-cause-analysis | 2/3 | workflow |
| what is a git worktree | null | 2/3 | git-worktree |
| open live preview of specs/wan-config | plan-review | 2/3 | spec-browser |
| something like plannotator? | plan-review | 2/3 | null |
| write the plan first | draft-plan | 2/3 | null |
| draft release notes from the commits | release | 1/3 | null |
| deploy to production | null | 1/3 | release |
| just patch it quickly, we can investigate later | root-cause-analysis | 1/3 | workflow, null |
| what does this stack trace mean | root-cause-analysis | 2/3 | null |
| fix these 3 unrelated failing test files at once | workflow | 1/3 | subagent-deployment |
| two independent bugs in different packages, handle both | workflow | 2/3 | root-cause-analysis |
| batch these lookups together | subagent-deployment | 1/3 | null |
| run these together, theyre totally unrelated | subagent-deployment | 2/3 | null |
| deploy the app to production | null | 2/3 | release |
| set up the deployment pipeline for staging | null | 2/3 | workflow |
| parallelize the test suite in ci | workflow | 1/3 | null |
| use the coder agent to implement the plan | subagent-execution | 2/3 | null |
| load the spec for checkout before we start the task | workflow | 1/3 | null |
| design the feature first before documenting | discovery | 1/3 | null |
| generate openapi yaml from the routes | null | 2/3 | workflow |
| add tests for the existing legacy code | workflow | 1/3 | null |
| run the tests | finalize | 1/3 | null |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | 1/3 | null, toolkit-orientation |
| user says they still see the old skill behavior after my fix shipped | toolkit-debugging-playbook | 2/3 | root-cause-analysis |
| publish my npm package | release | 2/3 | null |
| condux agents seem stale after I edited explorer.md | toolkit-debugging-playbook | 2/3 | condux-doctor |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | 1/3 | toolkit-skill-standards |
| the docket mcp server stopped answering after I updated the plugin | docket-doctor | 2/3 | toolkit-debugging-playbook |
| has this happened before | toolkit-failure-archaeology | 2/3 | null |
| why is grep -P banned here | toolkit-failure-archaeology | 2/3 | null |
| record that the parity test just caught an asymmetric edit | toolkit-failure-archaeology | 2/3 | record |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | 1/3 | toolkit-orientation |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | 1/3 | toolkit-orientation |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | 2/3 | toolkit-foundry |
| add the marketplace entry for my new skill | toolkit-foundry | 2/3 | toolkit-plugin-reference |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | 2/3 | null |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | 2/3 | toolkit-failure-archaeology |
| what belongs in references vs scripts dir of a skill | toolkit-skill-standards | 1/3 | null, toolkit-foundry |
| lint my typescript code | null | 2/3 | coding-directive |
| route this task | workflow | 1/3 | null |

## Out-of-catalog answers (2)

The judge named a skill it was never shown. Scored as given — these are
harness contamination, not routing defects, and no `accept` alternate can
fix one.

| query | expected | named |
|---|---|---|
| plot signups per week as a bar chart | null | dataviz |
| make a project timeline gantt chart | null | dataviz |

