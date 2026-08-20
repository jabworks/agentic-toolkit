# Trigger-routing run — 2026-08-20

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 598 cold-trigger cases scored (24 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 93.1% / 92.8% / 92.3% · mean **92.8% ± 1.0pp** (95% CI, t-dist) · flaky cases: 55
Overall routing accuracy: **552/598 = 92.3%**

## Per expected skill

| expected | accuracy |
|---|---|
| toolkit-research-frontier | 12/16 |
| draft-plan | 10/13 |
| workflow | 30/38 |
| git-operations | 8/10 |
| docket-doctor | 9/11 |
| toolkit-failure-archaeology | 14/17 |
| discovery | 13/15 |
| release | 15/17 |
| (null) | 73/82 |
| toolkit-plugin-reference | 17/19 |
| preflight | 21/23 |
| finalize | 11/12 |
| subagent-deployment | 12/13 |
| technical-spec | 14/15 |
| subagent-execution | 15/16 |
| git-worktree | 15/16 |
| root-cause-analysis | 19/20 |
| toolkit-debugging-playbook | 24/25 |
| adapting-skills | 11/11 |
| toolkit-foundry | 5/5 |
| toolkit-skill-standards | 18/18 |
| blueprint | 11/11 |
| code-review | 19/19 |
| plan-review | 18/18 |
| coding-directive | 9/9 |
| git-commit | 4/4 |
| concord-doctor | 6/6 |
| remember | 3/3 |
| session-handoff | 16/16 |
| condux-doctor | 7/7 |
| groom | 16/16 |
| record | 18/18 |
| live-verification | 14/14 |
| spec-browser | 4/4 |
| toolkit-change-control | 18/18 |
| test-first-development | 12/12 |
| toolkit-orientation | 11/11 |

## Misses (46)

| query | expected | got | corpus file |
|---|---|---|---|
| improve the performance of this function | null | simplify | adapting-skills |
| fix the critical findings from the review | workflow | code-review | code-review |
| why is the checkout page returning 500 | null | workflow | coding-directive |
| my redis cache keeps evicting keys | null | root-cause-analysis | concord-doctor |
| big refactor, unclear boundaries — where do we even start | discovery | workflow | discovery |
| docket_add isn't available anymore, what happened | docket-doctor | toolkit-debugging-playbook | docket-doctor |
| write-plan for checkout v2 | draft-plan | workflow | draft-plan |
| we havent designed this yet but write a plan anyway | draft-plan | workflow | draft-plan |
| the plan needs revision per the review feedback | draft-plan | null | draft-plan |
| my worktree directory got committed into the repo | git-worktree | git-operations | git-worktree |
| add a submodule to this repo | null | git-operations | git-worktree |
| bisect to find the bad commit | null | git-operations | git-worktree |
| verify this | preflight | live-verification | preflight |
| only changed one line, can we skip the checks | preflight | null | preflight |
| npm unpublish the broken version | release | null | release |
| push my branch up | git-operations | null | release |
| deploy to production | null | release | release |
| hand off the project to another team | null | session-handoff | session-handoff |
| batch these lookups together | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| parallelize the test suite in ci | workflow | null | subagent-deployment |
| use the coder agent to implement the plan | subagent-execution | null | subagent-execution |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| bump the index.md changelog for the spec | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| design the feature first before documenting | discovery | null | technical-spec |
| add tests for the existing legacy code | workflow | null | test-first-development |
| run the tests | finalize | null | test-first-development |
| publish my npm package | release | null | toolkit-change-control |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | toolkit-skill-standards | toolkit-debugging-playbook |
| the docket mcp server stopped answering after I updated the plugin | docket-doctor | toolkit-debugging-playbook | toolkit-debugging-playbook |
| fix the 502 on my nginx server | null | root-cause-analysis | toolkit-debugging-playbook |
| what mistakes did past sessions make in this repo | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| record that the parity test just caught an asymmetric edit | toolkit-failure-archaeology | record | toolkit-failure-archaeology |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | toolkit-orientation | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| whats still open after the audit | toolkit-research-frontier | null | toolkit-research-frontier |
| where did we leave the trigger-eval work | toolkit-research-frontier | null | toolkit-research-frontier |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | null | toolkit-research-frontier |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | null | toolkit-research-frontier |
| write a good PR description | null | git-commit | toolkit-skill-standards |
| route this task | workflow | null | workflow |
| update the readme wording for the install section | workflow | null | workflow |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | workflow | workflow |

## Flaky cases (55 — hit in some trials, missed in others)

| query | expected | hits | got when missed |
|---|---|---|---|
| improve the performance of this function | null | 2/3 | simplify |
| plot signups per week as a bar chart | null | 2/3 | dataviz |
| review the spec folder | plan-review | 2/3 | null |
| why is the checkout page returning 500 | null | 2/3 | workflow |
| update the npm packages to latest | null | 1/3 | workflow |
| the specialist agents are missing after I updated the plugin | condux-doctor | 2/3 | toolkit-debugging-playbook |
| big refactor, unclear boundaries — where do we even start | discovery | 1/3 | workflow |
| skip discovery, just plan it | draft-plan | 2/3 | workflow |
| docket_add isn't available anymore, what happened | docket-doctor | 1/3 | toolkit-debugging-playbook |
| create the .condux/plans file for this feature | draft-plan | 2/3 | null |
| write-plan for checkout v2 | draft-plan | 2/3 | workflow |
| we havent designed this yet but write a plan anyway | draft-plan | 1/3 | null, workflow |
| quick inline plan for a medium sized task | workflow | 1/3 | draft-plan |
| git worktree add isn't working | git-worktree | 2/3 | null |
| my worktree directory got committed into the repo | git-worktree | 2/3 | git-operations |
| add a submodule to this repo | null | 1/3 | git-operations |
| bisect to find the bad commit | null | 1/3 | git-operations |
| found #18 still open but we shipped it last week | groom | 2/3 | null |
| something like plannotator? | plan-review | 1/3 | null |
| verify this | preflight | 1/3 | live-verification |
| npm unpublish the broken version | release | 1/3 | null |
| deploy to production | null | 2/3 | release |
| 3 fixes failed already, whats the next idea | root-cause-analysis | 2/3 | null |
| just patch it quickly, we can investigate later | root-cause-analysis | 1/3 | null, workflow |
| systematic debugging pls | root-cause-analysis | 2/3 | workflow |
| regression after the refactor, find the cause | root-cause-analysis | 2/3 | workflow |
| why is prod slower since tuesday | root-cause-analysis | 2/3 | workflow |
| what does this stack trace mean | root-cause-analysis | 2/3 | null |
| hand off the project to another team | null | 1/3 | session-handoff |
| set up the deployment pipeline for staging | null | 2/3 | workflow |
| parallelize the test suite in ci | workflow | 1/3 | null |
| use the coder agent to implement the plan | subagent-execution | 1/3 | null |
| the plan is fully implemented, verify it | preflight | 2/3 | finalize |
| record the decision rationale for future sessions | technical-spec | 2/3 | remember |
| design the feature first before documenting | discovery | 1/3 | null |
| add tests for the existing legacy code | workflow | 1/3 | null |
| run the tests | finalize | 1/3 | null |
| jest config setup for the monorepo | workflow | 2/3 | null |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | 2/3 | toolkit-orientation |
| publish my npm package | release | 2/3 | null |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | 1/3 | toolkit-skill-standards |
| the docket mcp server stopped answering after I updated the plugin | docket-doctor | 2/3 | toolkit-debugging-playbook |
| fix the 502 on my nginx server | null | 1/3 | workflow, root-cause-analysis |
| why does sync.sh special-case the agents dir | toolkit-failure-archaeology | 2/3 | toolkit-orientation |
| why is grep -P banned here | toolkit-failure-archaeology | 2/3 | coding-directive |
| record that the parity test just caught an asymmetric edit | toolkit-failure-archaeology | 2/3 | record |
| why are there two rename commits a605be9 and 0b88ab2 | toolkit-failure-archaeology | 2/3 | null |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | 2/3 | null |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | 1/3 | toolkit-skill-standards, null |
| fix this failing test right now | toolkit-debugging-playbook | 2/3 | null |
| write a good PR description | null | 2/3 | git-commit |
| route this task | workflow | 2/3 | null |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | 1/3 | workflow |
| i want to explore ideas for a notification system | discovery | 2/3 | workflow |
| write the plan for the feature we just designed | draft-plan | 2/3 | workflow |

## Out-of-catalog answers (2)

The judge named a skill it was never shown. Scored as given — these are
harness contamination, not routing defects, and no `accept` alternate can
fix one.

| query | expected | named |
|---|---|---|
| improve the performance of this function | null | simplify |
| plot signups per week as a bar chart | null | dataviz |

