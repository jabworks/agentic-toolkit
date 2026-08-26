# Trigger-routing run — 2026-08-26

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 599 cold-trigger cases scored (24 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 92.5% / 91.5% / 93.0% · mean **92.3% ± 1.9pp** (95% CI, t-dist) · flaky cases: 58
Overall routing accuracy: **557/599 = 93.0%**
Disallowed violations: **0/17** cases carrying `disallowed` (0 occurrences across all trials). Reported separately — not included in the accuracy above.

## Per expected skill

| expected | accuracy |
|---|---|
| workflow | 30/38 |
| technical-spec | 12/15 |
| git-operations | 8/10 |
| discovery | 12/15 |
| root-cause-analysis | 16/20 |
| toolkit-research-frontier | 13/16 |
| adapting-skills | 9/11 |
| toolkit-failure-archaeology | 14/17 |
| git-worktree | 14/16 |
| subagent-deployment | 12/13 |
| (null) | 76/82 |
| release | 16/17 |
| toolkit-skill-standards | 17/18 |
| toolkit-change-control | 17/18 |
| toolkit-plugin-reference | 18/19 |
| preflight | 22/23 |
| toolkit-foundry | 5/5 |
| toolkit-debugging-playbook | 25/25 |
| blueprint | 12/12 |
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
| draft-plan | 13/13 |
| docket-doctor | 11/11 |
| record | 18/18 |
| subagent-execution | 16/16 |
| live-verification | 14/14 |
| spec-browser | 4/4 |
| test-first-development | 12/12 |
| toolkit-orientation | 11/11 |

## Misses (42)

| query | expected | got | corpus file |
|---|---|---|---|
| the skill in .codex/skills never fires, fix its frontmatter | adapting-skills | toolkit-skill-standards | adapting-skills |
| plot signups per week as a bar chart | null | dataviz | blueprint |
| fix the critical findings from the review | workflow | code-review | code-review |
| scaffold a new package the way we usually structure things | adapting-skills | workflow | coding-directive |
| update the npm packages to latest | null | workflow | coding-directive |
| my redis cache keeps evicting keys | null | root-cause-analysis | concord-doctor |
| design a database schema for multi-tenancy | discovery | blueprint | discovery |
| big refactor, unclear boundaries — where do we even start | discovery | workflow | discovery |
| quick inline plan for a medium sized task | workflow | draft-plan | draft-plan |
| what does the no-unused-vars eslint rule mean | null | coding-directive | finalize |
| give the agent its own sandbox tree to work in | git-worktree | subagent-deployment | git-worktree |
| my worktree directory got committed into the repo | git-worktree | git-operations | git-worktree |
| only changed one line, can we skip the checks | preflight | null | preflight |
| npm unpublish the broken version | release | null | release |
| push my branch up | git-operations | null | release |
| just patch it quickly, we can investigate later | root-cause-analysis | workflow | root-cause-analysis |
| what does this stack trace mean | root-cause-analysis | null | root-cause-analysis |
| session timeout bug in the auth flow | root-cause-analysis | workflow | session-handoff |
| two independent bugs in different packages, handle both | workflow | subagent-deployment | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| set up the deployment pipeline for staging | null | workflow | subagent-deployment |
| parallelize the test suite in ci | workflow | null | subagent-deployment |
| three independent bugs, fix them concurrently | subagent-deployment | workflow | subagent-execution |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| orchestrate the ci pipeline stages | null | workflow | subagent-execution |
| scaffold a spec folder for this feature | technical-spec | null | technical-spec |
| record the decision rationale for future sessions | technical-spec | remember | technical-spec |
| bump the index.md changelog for the spec | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| design the feature first before documenting | discovery | null | technical-spec |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | toolkit-orientation | toolkit-change-control |
| when did the invariant tests get added and why | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| what mistakes did past sessions make in this repo | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| record that the parity test just caught an asymmetric edit | toolkit-failure-archaeology | remember | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| skills path — ./skills or ./skills/name? | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| whats still open after the audit | toolkit-research-frontier | null | toolkit-research-frontier |
| where did we leave the trigger-eval work | toolkit-research-frontier | null | toolkit-research-frontier |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | null | toolkit-research-frontier |
| improve this skill's description | toolkit-skill-standards | adapting-skills | toolkit-research-frontier |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | workflow | workflow |
| who wins, my CLAUDE.md or condux rules | workflow | null | workflow |

## Flaky cases (58 — hit in some trials, missed in others)

| query | expected | hits | got when missed |
|---|---|---|---|
| the skill in .codex/skills never fires, fix its frontmatter | adapting-skills | 2/3 | toolkit-skill-standards |
| any security issues in this change? | code-review | 2/3 | null |
| set up prettier and tsconfig with my usual settings | coding-directive | 2/3 | null |
| scaffold a new package the way we usually structure things | adapting-skills | 2/3 | workflow |
| update the npm packages to latest | null | 1/3 | workflow |
| big refactor, unclear boundaries — where do we even start | discovery | 1/3 | workflow |
| why does checkout 500 on submit | root-cause-analysis | 2/3 | workflow |
| make a project timeline gantt chart | null | 2/3 | dataviz |
| why is this one test failing | root-cause-analysis | 1/3 | workflow |
| what does the no-unused-vars eslint rule mean | null | 2/3 | coding-directive |
| git worktree add isn't working | git-worktree | 2/3 | workflow |
| give the agent its own sandbox tree to work in | git-worktree | 2/3 | subagent-deployment |
| my worktree directory got committed into the repo | git-worktree | 2/3 | git-operations |
| what is a git worktree | null | 2/3 | git-worktree |
| bisect to find the bad commit | null | 1/3 | git-operations, root-cause-analysis |
| are all the plan steps covered | preflight | 2/3 | plan-review |
| review the code quality here | code-review | 2/3 | simplify |
| something like plannotator? | plan-review | 2/3 | null |
| verify the deployment is healthy in prod | null | 2/3 | live-verification |
| whats in the next release | release | 2/3 | null |
| draft release notes from the commits | release | 2/3 | null |
| 3 fixes failed already, whats the next idea | root-cause-analysis | 2/3 | null |
| what does this stack trace mean | root-cause-analysis | 2/3 | null |
| session timeout bug in the auth flow | root-cause-analysis | 2/3 | workflow |
| fix these 3 unrelated failing test files at once | workflow | 2/3 | subagent-deployment |
| two independent bugs in different packages, handle both | workflow | 1/3 | subagent-deployment |
| batch these lookups together | subagent-deployment | 2/3 | null |
| set up the deployment pipeline for staging | null | 1/3 | workflow |
| parallelize the test suite in ci | workflow | 1/3 | null |
| whats in spawn-rules for picking an agent | subagent-execution | 2/3 | workflow |
| orchestrate the ci pipeline stages | null | 1/3 | workflow |
| scaffold a spec folder for this feature | technical-spec | 2/3 | null |
| load the spec for checkout before we start the task | workflow | 1/3 | null |
| design the feature first before documenting | discovery | 1/3 | null |
| generate openapi yaml from the routes | null | 2/3 | workflow |
| run the tests | finalize | 2/3 | null |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | 2/3 | toolkit-orientation |
| user says they still see the old skill behavior after my fix shipped | toolkit-debugging-playbook | 2/3 | root-cause-analysis |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | 2/3 | toolkit-skill-standards |
| my react app crashes on load | root-cause-analysis | 2/3 | workflow |
| debug this failing jest test in my project | root-cause-analysis | 2/3 | workflow |
| fix the 502 on my nginx server | null | 2/3 | root-cause-analysis |
| we should try monorepo plan paths | toolkit-failure-archaeology | 2/3 | null |
| why is grep -P banned here | toolkit-failure-archaeology | 2/3 | null |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | 2/3 | null |
| why are there two rename commits a605be9 and 0b88ab2 | toolkit-failure-archaeology | 2/3 | null |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | 2/3 | toolkit-orientation |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | 1/3 | null, toolkit-orientation |
| should we add a script that fails when dist drifts | toolkit-research-frontier | 2/3 | null |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | 1/3 | null |
| is manifest parity enforced now or still open | toolkit-research-frontier | 2/3 | null |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | 1/3 | null, toolkit-skill-standards |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | 1/3 | null |
| improve this skill's description | toolkit-skill-standards | 2/3 | adapting-skills |
| route this task | workflow | 2/3 | null |
| i want to explore ideas for a notification system | discovery | 2/3 | workflow |
| write the plan for the feature we just designed | draft-plan | 2/3 | workflow |
| who wins, my CLAUDE.md or condux rules | workflow | 2/3 | null |

## Out-of-catalog answers (3)

The judge named a skill it was never shown. Scored as given — these are
harness contamination, not routing defects, and no `accept` alternate can
fix one.

| query | expected | named |
|---|---|---|
| plot signups per week as a bar chart | null | dataviz |
| make a project timeline gantt chart | null | dataviz |
| review the code quality here | code-review | simplify |

