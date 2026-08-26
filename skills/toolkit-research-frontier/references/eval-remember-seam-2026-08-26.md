# Trigger-routing run — 2026-08-26

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 599 cold-trigger cases scored (24 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 93.0% / 93.2% / 93.2% · mean **93.1% ± 0.2pp** (95% CI, t-dist) · flaky cases: 58
Overall routing accuracy: **558/599 = 93.2%**
Disallowed violations: **0/19** cases carrying `disallowed` (0 occurrences across all trials). Reported separately — not included in the accuracy above.

## Per expected skill

| expected | accuracy |
|---|---|
| workflow | 25/38 |
| toolkit-failure-archaeology | 13/17 |
| discovery | 12/15 |
| toolkit-research-frontier | 13/16 |
| subagent-deployment | 11/13 |
| root-cause-analysis | 17/20 |
| git-operations | 9/10 |
| finalize | 11/12 |
| toolkit-debugging-playbook | 23/25 |
| draft-plan | 12/13 |
| technical-spec | 14/15 |
| (null) | 77/82 |
| plan-review | 17/18 |
| preflight | 22/23 |
| adapting-skills | 11/11 |
| toolkit-foundry | 5/5 |
| toolkit-skill-standards | 18/18 |
| blueprint | 12/12 |
| code-review | 19/19 |
| coding-directive | 9/9 |
| git-commit | 4/4 |
| concord-doctor | 6/6 |
| remember | 3/3 |
| session-handoff | 16/16 |
| condux-doctor | 7/7 |
| groom | 16/16 |
| docket-doctor | 11/11 |
| record | 18/18 |
| subagent-execution | 16/16 |
| release | 17/17 |
| git-worktree | 16/16 |
| live-verification | 14/14 |
| spec-browser | 4/4 |
| toolkit-change-control | 18/18 |
| test-first-development | 12/12 |
| toolkit-plugin-reference | 19/19 |
| toolkit-orientation | 11/11 |

## Misses (41)

| query | expected | got | corpus file |
|---|---|---|---|
| plot signups per week as a bar chart | null | dataviz | blueprint |
| my redis cache keeps evicting keys | null | root-cause-analysis | concord-doctor |
| how do condux tiers work? | workflow | null | condux-doctor |
| big refactor, unclear boundaries — where do we even start | discovery | workflow | discovery |
| quick inline plan for a medium sized task | workflow | draft-plan | draft-plan |
| something like plannotator? | plan-review | null | plan-review |
| just patch it quickly, we can investigate later | root-cause-analysis | workflow | root-cause-analysis |
| what does this stack trace mean | root-cause-analysis | null | root-cause-analysis |
| batch these lookups together | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| parallelize the test suite in ci | workflow | null | subagent-deployment |
| three independent bugs, fix them concurrently | subagent-deployment | workflow | subagent-execution |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| orchestrate the ci pipeline stages | null | workflow | subagent-execution |
| bump the index.md changelog for the spec | technical-spec | null | technical-spec |
| design the feature first before documenting | discovery | null | technical-spec |
| run the tests | finalize | null | test-first-development |
| user says they still see the old skill behavior after my fix shipped | toolkit-debugging-playbook | root-cause-analysis | toolkit-change-control |
| condux agents seem stale after I edited explorer.md | toolkit-debugging-playbook | condux-doctor | toolkit-debugging-playbook |
| browser devtools show a network error on my site | null | workflow | toolkit-debugging-playbook |
| fix the 502 on my nginx server | null | workflow | toolkit-debugging-playbook |
| when did the invariant tests get added and why | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| what mistakes did past sessions make in this repo | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| why are there two rename commits a605be9 and 0b88ab2 | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| whats still open after the audit | toolkit-research-frontier | null | toolkit-research-frontier |
| where did we leave the trigger-eval work | toolkit-research-frontier | null | toolkit-research-frontier |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | toolkit-skill-standards | toolkit-research-frontier |
| new endpoint for order history | workflow | condux:workflow | workflow |
| can you wire the onSave prop through | workflow | condux:workflow | workflow |
| implement dark mode | workflow | condux:workflow | workflow |
| quick typo fix in the header | workflow | condux:workflow | workflow |
| treat this as LARGE: migrate sessions to redis | workflow | condux:workflow | workflow |
| route this task | workflow | condux:workflow | workflow |
| implemnt a serch bar in the navbar | workflow | condux:workflow | workflow |
| update the readme wording for the install section | workflow | condux:workflow | workflow |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | condux:workflow | workflow |
| i want to explore ideas for a notification system | discovery | condux:discovery | workflow |
| write the plan for the feature we just designed | draft-plan | condux:draft-plan | workflow |
| am I done? verify this | preflight | condux:preflight | workflow |

## Flaky cases (58 — hit in some trials, missed in others)

| query | expected | hits | got when missed |
|---|---|---|---|
| plot signups per week as a bar chart | null | 1/3 | dataviz |
| update the npm packages to latest | null | 1/3 | workflow |
| design a database schema for multi-tenancy | discovery | 2/3 | blueprint |
| big refactor, unclear boundaries — where do we even start | discovery | 1/3 | workflow |
| why is this one test failing | root-cause-analysis | 2/3 | workflow |
| my worktree directory got committed into the repo | git-worktree | 1/3 | git-operations |
| add a submodule to this repo | null | 1/3 | git-operations |
| bisect to find the bad commit | null | 1/3 | root-cause-analysis, git-operations |
| something like plannotator? | plan-review | 1/3 | null |
| verify this | preflight | 2/3 | live-verification |
| I tested it manually, ship it | preflight | 2/3 | git-commit |
| only changed one line, can we skip the checks | preflight | 1/3 | null |
| npm unpublish the broken version | release | 2/3 | null |
| push my branch up | git-operations | 2/3 | null |
| just patch it quickly, we can investigate later | root-cause-analysis | 1/3 | null, workflow |
| what does this stack trace mean | root-cause-analysis | 2/3 | null |
| fix the bug — I already know exactly whats wrong | workflow | 2/3 | root-cause-analysis |
| fix these 3 unrelated failing test files at once | workflow | 2/3 | subagent-deployment |
| two independent bugs in different packages, handle both | workflow | 2/3 | subagent-deployment |
| one small task, just do it yourself | workflow | 2/3 | null |
| deploy the app to production | null | 2/3 | workflow |
| set up the deployment pipeline for staging | null | 1/3 | workflow |
| parallelize the test suite in ci | workflow | 2/3 | null |
| three independent bugs, fix them concurrently | subagent-deployment | 1/3 | workflow |
| load the spec for checkout before we start the task | workflow | 2/3 | null |
| design the feature first before documenting | discovery | 2/3 | null |
| generate openapi yaml from the routes | null | 2/3 | workflow |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | 2/3 | toolkit-debugging-playbook |
| user says they still see the old skill behavior after my fix shipped | toolkit-debugging-playbook | 2/3 | root-cause-analysis |
| condux agents seem stale after I edited explorer.md | toolkit-debugging-playbook | 2/3 | condux-doctor |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | 1/3 | toolkit-skill-standards |
| browser devtools show a network error on my site | null | 2/3 | workflow |
| fix the 502 on my nginx server | null | 1/3 | root-cause-analysis, workflow |
| why is grep -P banned here | toolkit-failure-archaeology | 1/3 | null |
| when did the invariant tests get added and why | toolkit-failure-archaeology | 1/3 | null |
| record that the parity test just caught an asymmetric edit | toolkit-failure-archaeology | 1/3 | record, remember |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | 1/3 | toolkit-orientation, null |
| my skill is broken right now help | toolkit-debugging-playbook | 2/3 | root-cause-analysis |
| skills path — ./skills or ./skills/name? | toolkit-plugin-reference | 1/3 | toolkit-orientation |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | 1/3 | toolkit-orientation, null |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | 1/3 | toolkit-orientation, null |
| whats still open after the audit | toolkit-research-frontier | 1/3 | null |
| should we add a script that fails when dist drifts | toolkit-research-frontier | 2/3 | null |
| is it worth adding yaml validation to the tests | toolkit-research-frontier | 2/3 | null |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | 2/3 | null |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | 2/3 | toolkit-failure-archaeology |
| my yaml description has a colon and things broke | toolkit-skill-standards | 2/3 | toolkit-failure-archaeology |
| what belongs in references vs scripts dir of a skill | toolkit-skill-standards | 2/3 | null |
| new endpoint for order history | workflow | 2/3 | condux:workflow |
| can you wire the onSave prop through | workflow | 2/3 | condux:workflow |
| implement dark mode | workflow | 2/3 | condux:workflow |
| quick typo fix in the header | workflow | 2/3 | condux:workflow |
| treat this as LARGE: migrate sessions to redis | workflow | 2/3 | condux:workflow |
| implemnt a serch bar in the navbar | workflow | 2/3 | condux:workflow |
| update the readme wording for the install section | workflow | 2/3 | condux:workflow |
| i want to explore ideas for a notification system | discovery | 2/3 | condux:discovery |
| write the plan for the feature we just designed | draft-plan | 2/3 | condux:draft-plan |
| am I done? verify this | preflight | 2/3 | condux:preflight |

## Out-of-catalog answers (13)

The judge named a skill it was never shown. Scored as given — these are
harness contamination, not routing defects, and no `accept` alternate can
fix one.

| query | expected | named |
|---|---|---|
| plot signups per week as a bar chart | null | dataviz |
| new endpoint for order history | workflow | condux:workflow |
| can you wire the onSave prop through | workflow | condux:workflow |
| implement dark mode | workflow | condux:workflow |
| quick typo fix in the header | workflow | condux:workflow |
| treat this as LARGE: migrate sessions to redis | workflow | condux:workflow |
| route this task | workflow | condux:workflow |
| implemnt a serch bar in the navbar | workflow | condux:workflow |
| update the readme wording for the install section | workflow | condux:workflow |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | condux:workflow |
| i want to explore ideas for a notification system | discovery | condux:discovery |
| write the plan for the feature we just designed | draft-plan | condux:draft-plan |
| am I done? verify this | preflight | condux:preflight |

