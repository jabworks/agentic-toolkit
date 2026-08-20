# Trigger-routing run — 2026-08-20

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 598 cold-trigger cases scored (24 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 93.6% / 92.1% / 94.3% · mean **93.4% ± 2.8pp** (95% CI, t-dist) · flaky cases: 50
Overall routing accuracy: **564/598 = 94.3%**

## Per expected skill

| expected | accuracy |
|---|---|
| workflow | 30/38 |
| git-operations | 8/10 |
| toolkit-failure-archaeology | 14/17 |
| toolkit-research-frontier | 14/16 |
| toolkit-plugin-reference | 17/19 |
| docket-doctor | 10/11 |
| toolkit-debugging-playbook | 23/25 |
| draft-plan | 12/13 |
| subagent-deployment | 12/13 |
| (null) | 76/82 |
| technical-spec | 14/15 |
| discovery | 14/15 |
| release | 16/17 |
| toolkit-skill-standards | 17/18 |
| toolkit-change-control | 17/18 |
| root-cause-analysis | 19/20 |
| adapting-skills | 11/11 |
| toolkit-foundry | 5/5 |
| blueprint | 11/11 |
| code-review | 19/19 |
| plan-review | 18/18 |
| coding-directive | 9/9 |
| finalize | 12/12 |
| git-commit | 4/4 |
| concord-doctor | 6/6 |
| remember | 3/3 |
| session-handoff | 16/16 |
| condux-doctor | 7/7 |
| groom | 16/16 |
| record | 18/18 |
| subagent-execution | 16/16 |
| preflight | 23/23 |
| git-worktree | 16/16 |
| live-verification | 14/14 |
| spec-browser | 4/4 |
| test-first-development | 12/12 |
| toolkit-orientation | 11/11 |

## Misses (34)

| query | expected | got | corpus file |
|---|---|---|---|
| plot signups per week as a bar chart | null | dataviz | blueprint |
| build the settings page from the approved design | null | workflow | blueprint |
| implement this Figma design as a React component | null | workflow | blueprint |
| fix the critical findings from the review | workflow | code-review | code-review |
| my redis cache keeps evicting keys | null | root-cause-analysis | concord-doctor |
| design a database schema for multi-tenancy | discovery | blueprint | discovery |
| docket_add isn't available anymore, what happened | docket-doctor | toolkit-debugging-playbook | docket-doctor |
| create the .condux/plans file for this feature | draft-plan | null | draft-plan |
| quick inline plan for a medium sized task | workflow | draft-plan | draft-plan |
| bisect to find the bad commit | null | git-operations | git-worktree |
| npm unpublish the broken version | release | null | release |
| push my branch up | git-operations | null | release |
| deploy to production | null | release | release |
| just patch it quickly, we can investigate later | root-cause-analysis | null | root-cause-analysis |
| batch these lookups together | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| parallelize the test suite in ci | workflow | null | subagent-deployment |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| bump the index.md changelog for the spec | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| add tests for the existing legacy code | workflow | null | test-first-development |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | toolkit-debugging-playbook | toolkit-change-control |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | toolkit-skill-standards | toolkit-debugging-playbook |
| did we ever try per-package spec paths | toolkit-failure-archaeology | toolkit-research-frontier | toolkit-failure-archaeology |
| what mistakes did past sessions make in this repo | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| record that the parity test just caught an asymmetric edit | toolkit-failure-archaeology | record | toolkit-failure-archaeology |
| my skill is broken right now help | toolkit-debugging-playbook | root-cause-analysis | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| whats still open after the audit | toolkit-research-frontier | null | toolkit-research-frontier |
| where did we leave the trigger-eval work | toolkit-research-frontier | null | toolkit-research-frontier |
| what belongs in references vs scripts dir of a skill | toolkit-skill-standards | toolkit-orientation | toolkit-skill-standards |
| update the readme wording for the install section | workflow | null | workflow |

## Flaky cases (50 — hit in some trials, missed in others)

| query | expected | hits | got when missed |
|---|---|---|---|
| plot signups per week as a bar chart | null | 2/3 | dataviz |
| fix the critical findings from the review | workflow | 1/3 | code-review |
| does this component file follow my style guide | coding-directive | 2/3 | null |
| review this component for style conformance | coding-directive | 2/3 | null |
| my redis cache keeps evicting keys | null | 1/3 | root-cause-analysis |
| the specialist agents are missing after I updated the plugin | condux-doctor | 2/3 | toolkit-debugging-playbook |
| design a database schema for multi-tenancy | discovery | 1/3 | blueprint |
| big refactor, unclear boundaries — where do we even start | discovery | 2/3 | workflow |
| docket_add isn't available anymore, what happened | docket-doctor | 2/3 | toolkit-debugging-playbook |
| create the .condux/plans file for this feature | draft-plan | 1/3 | null |
| the plan needs revision per the review feedback | draft-plan | 2/3 | plan-review |
| my worktree directory got committed into the repo | git-worktree | 2/3 | git-operations |
| bisect to find the bad commit | null | 2/3 | git-operations |
| something like plannotator? | plan-review | 1/3 | null |
| verify this | preflight | 1/3 | live-verification |
| I tested it manually, ship it | preflight | 2/3 | null |
| only changed one line, can we skip the checks | preflight | 2/3 | null |
| push my branch up | git-operations | 1/3 | null |
| just patch it quickly, we can investigate later | root-cause-analysis | 1/3 | workflow, null |
| hand off the project to another team | null | 2/3 | session-handoff |
| set up the deployment pipeline for staging | null | 2/3 | workflow |
| parallelize the test suite in ci | workflow | 1/3 | null |
| use the coder agent to implement the plan | subagent-execution | 2/3 | workflow |
| record the decision rationale for future sessions | technical-spec | 2/3 | remember |
| load the spec for checkout before we start the task | workflow | 1/3 | null |
| design the feature first before documenting | discovery | 2/3 | null |
| tdd this feature | test-first-development | 2/3 | workflow |
| test-first for the parser module | test-first-development | 2/3 | workflow |
| write failing tests before implementing | test-first-development | 2/3 | workflow |
| red green refactor cycle please | test-first-development | 2/3 | workflow |
| can you do this test driven | test-first-development | 2/3 | workflow |
| write unit tests for the date helpers before you code them | test-first-development | 2/3 | workflow |
| bug: prove it with a failing test then fix it | test-first-development | 2/3 | workflow |
| tets first plz | test-first-development | 2/3 | workflow |
| add tests for the existing legacy code | workflow | 1/3 | null |
| run the tests | finalize | 2/3 | null |
| why is this test flaky | root-cause-analysis | 2/3 | workflow |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | 1/3 | toolkit-skill-standards |
| fix the 502 on my nginx server | null | 1/3 | root-cause-analysis, workflow |
| did we ever try per-package spec paths | toolkit-failure-archaeology | 2/3 | toolkit-research-frontier |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | 2/3 | null |
| why are there two rename commits a605be9 and 0b88ab2 | toolkit-failure-archaeology | 2/3 | null |
| my skill is broken right now help | toolkit-debugging-playbook | 1/3 | null, root-cause-analysis |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | 1/3 | toolkit-orientation |
| add the marketplace entry for my new skill | toolkit-foundry | 2/3 | toolkit-plugin-reference |
| is it worth adding yaml validation to the tests | toolkit-research-frontier | 2/3 | null |
| is manifest parity enforced now or still open | toolkit-research-frontier | 2/3 | null |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | 1/3 | toolkit-skill-standards, null |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | 1/3 | toolkit-failure-archaeology |
| what belongs in references vs scripts dir of a skill | toolkit-skill-standards | 1/3 | toolkit-orientation |

## Out-of-catalog answers (1)

The judge named a skill it was never shown. Scored as given — these are
harness contamination, not routing defects, and no `accept` alternate can
fix one.

| query | expected | named |
|---|---|---|
| plot signups per week as a bar chart | null | dataviz |

