# Trigger-routing run — 2026-08-25

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 598 cold-trigger cases scored (24 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 93.8% / 93.8% / 92.5% · mean **93.4% ± 1.9pp** (95% CI, t-dist) · flaky cases: 51
Overall routing accuracy: **553/598 = 92.5%**
Disallowed violations: **0/17** cases carrying `disallowed` (0 occurrences across all trials). Reported separately — not included in the accuracy above.

## Per expected skill

| expected | accuracy |
|---|---|
| toolkit-research-frontier | 12/16 |
| toolkit-failure-archaeology | 13/17 |
| draft-plan | 10/13 |
| git-operations | 8/10 |
| workflow | 31/38 |
| release | 14/17 |
| technical-spec | 13/15 |
| toolkit-skill-standards | 16/18 |
| docket-doctor | 10/11 |
| toolkit-orientation | 10/11 |
| (null) | 75/82 |
| finalize | 11/12 |
| subagent-deployment | 12/13 |
| git-worktree | 15/16 |
| plan-review | 17/18 |
| toolkit-change-control | 17/18 |
| toolkit-plugin-reference | 18/19 |
| root-cause-analysis | 19/20 |
| preflight | 22/23 |
| toolkit-debugging-playbook | 24/25 |
| adapting-skills | 11/11 |
| toolkit-foundry | 5/5 |
| blueprint | 11/11 |
| code-review | 19/19 |
| coding-directive | 9/9 |
| git-commit | 4/4 |
| concord-doctor | 6/6 |
| remember | 3/3 |
| session-handoff | 16/16 |
| condux-doctor | 7/7 |
| groom | 16/16 |
| discovery | 15/15 |
| record | 18/18 |
| subagent-execution | 16/16 |
| live-verification | 14/14 |
| spec-browser | 4/4 |
| test-first-development | 12/12 |

## Misses (45)

| query | expected | got | corpus file |
|---|---|---|---|
| make this landing page look premium | null | frontend-design | blueprint |
| plot signups per week as a bar chart | null | dataviz | blueprint |
| pick a color palette and typography for the marketing site | null | frontend-design | blueprint |
| fix the critical findings from the review | workflow | code-review | code-review |
| my redis cache keeps evicting keys | null | root-cause-analysis | concord-doctor |
| skip discovery, just plan it | draft-plan | workflow | discovery |
| docket_add isn't available anymore, what happened | docket-doctor | toolkit-debugging-playbook | docket-doctor |
| create the .condux/plans file for this feature | draft-plan | null | draft-plan |
| the plan needs revision per the review feedback | draft-plan | plan-review | draft-plan |
| quick inline plan for a medium sized task | workflow | draft-plan | draft-plan |
| what does the no-unused-vars eslint rule mean | null | coding-directive | finalize |
| my worktree directory got committed into the repo | git-worktree | git-operations | git-worktree |
| something like plannotator? | plan-review | null | plan-review |
| only changed one line, can we skip the checks | preflight | null | preflight |
| draft release notes from the commits | release | null | release |
| merge the version packages PR | release | null | release |
| npm unpublish the broken version | release | null | release |
| push my branch up | git-operations | null | release |
| deploy to production | null | release | release |
| just patch it quickly, we can investigate later | root-cause-analysis | null | root-cause-analysis |
| batch these lookups together | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| parallelize the test suite in ci | workflow | null | subagent-deployment |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| record the decision rationale for future sessions | technical-spec | remember | technical-spec |
| bump the index.md changelog for the spec | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| run the tests | finalize | null | test-first-development |
| plugin install worked in claude code but codex cant see it | toolkit-debugging-playbook | toolkit-plugin-reference | toolkit-debugging-playbook |
| fix the 502 on my nginx server | null | root-cause-analysis | toolkit-debugging-playbook |
| whats the doctrine on version bumps and why does it exist | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| what mistakes did past sessions make in this repo | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| record that the parity test just caught an asymmetric edit | toolkit-failure-archaeology | record | toolkit-failure-archaeology |
| why are there two rename commits a605be9 and 0b88ab2 | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| what version do I bump for this change | toolkit-change-control | null | toolkit-failure-archaeology |
| how is this repo organized | toolkit-orientation | null | toolkit-orientation |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| whats still open after the audit | toolkit-research-frontier | null | toolkit-research-frontier |
| where did we leave the trigger-eval work | toolkit-research-frontier | remember | toolkit-research-frontier |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | toolkit-skill-standards | toolkit-research-frontier |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | toolkit-failure-archaeology | toolkit-research-frontier |
| what belongs in references vs scripts dir of a skill | toolkit-skill-standards | adapting-skills | toolkit-skill-standards |
| check my new skill against the house style | toolkit-skill-standards | adapting-skills | toolkit-skill-standards |
| update the readme wording for the install section | workflow | null | workflow |

## Flaky cases (51 — hit in some trials, missed in others)

| query | expected | hits | got when missed |
|---|---|---|---|
| the skill in .codex/skills never fires, fix its frontmatter | adapting-skills | 2/3 | toolkit-debugging-playbook |
| make this landing page look premium | null | 2/3 | frontend-design |
| plot signups per week as a bar chart | null | 1/3 | dataviz |
| pick a color palette and typography for the marketing site | null | 2/3 | frontend-design |
| review the spec folder | plan-review | 2/3 | null |
| update the npm packages to latest | null | 2/3 | workflow |
| my redis cache keeps evicting keys | null | 1/3 | root-cause-analysis |
| the specialist agents are missing after I updated the plugin | condux-doctor | 2/3 | toolkit-debugging-playbook |
| design a database schema for multi-tenancy | discovery | 1/3 | blueprint |
| big refactor, unclear boundaries — where do we even start | discovery | 2/3 | workflow |
| skip discovery, just plan it | draft-plan | 1/3 | workflow |
| we havent designed this yet but write a plan anyway | draft-plan | 2/3 | null |
| what does the no-unused-vars eslint rule mean | null | 2/3 | coding-directive |
| my worktree directory got committed into the repo | git-worktree | 1/3 | git-operations |
| verify this | preflight | 2/3 | live-verification |
| I tested it manually, ship it | preflight | 2/3 | null |
| draft release notes from the commits | release | 2/3 | null |
| merge the version packages PR | release | 2/3 | null |
| npm unpublish the broken version | release | 1/3 | null |
| push my branch up | git-operations | 2/3 | null |
| deploy to production | null | 1/3 | release |
| just patch it quickly, we can investigate later | root-cause-analysis | 1/3 | null |
| add error handling to this function | workflow | 2/3 | null |
| fix the bug — I already know exactly whats wrong | workflow | 2/3 | null |
| hand off the project to another team | null | 2/3 | session-handoff |
| run these together, theyre totally unrelated | subagent-deployment | 2/3 | workflow |
| parallelize the test suite in ci | workflow | 1/3 | null |
| whats in spawn-rules for picking an agent | subagent-execution | 2/3 | null |
| dont re-dispatch tasks that are already done | subagent-execution | 2/3 | null |
| ill implement the plan myself top to bottom | workflow | 1/3 | null |
| scaffold a spec folder for this feature | technical-spec | 2/3 | null |
| record the decision rationale for future sessions | technical-spec | 1/3 | remember |
| design the feature first before documenting | discovery | 2/3 | null |
| add tests for the existing legacy code | workflow | 1/3 | null |
| run the tests | finalize | 1/3 | null |
| jest config setup for the monorepo | workflow | 2/3 | null |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | 1/3 | toolkit-debugging-playbook, toolkit-orientation |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | 2/3 | toolkit-skill-standards |
| plugin install worked in claude code but codex cant see it | toolkit-debugging-playbook | 2/3 | toolkit-plugin-reference |
| whats the doctrine on version bumps and why does it exist | toolkit-failure-archaeology | 2/3 | null |
| why are there two rename commits a605be9 and 0b88ab2 | toolkit-failure-archaeology | 1/3 | null |
| what version do I bump for this change | toolkit-change-control | 2/3 | null |
| how is this repo organized | toolkit-orientation | 2/3 | null |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | 2/3 | toolkit-orientation |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | 2/3 | toolkit-orientation |
| whats still open after the audit | toolkit-research-frontier | 1/3 | null |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | 1/3 | null, toolkit-skill-standards |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | 2/3 | toolkit-failure-archaeology |
| improve this skill's description | toolkit-skill-standards | 2/3 | adapting-skills |
| what belongs in references vs scripts dir of a skill | toolkit-skill-standards | 2/3 | adapting-skills |
| check my new skill against the house style | toolkit-skill-standards | 2/3 | adapting-skills |

## Out-of-catalog answers (3)

The judge named a skill it was never shown. Scored as given — these are
harness contamination, not routing defects, and no `accept` alternate can
fix one.

| query | expected | named |
|---|---|---|
| make this landing page look premium | null | frontend-design |
| plot signups per week as a bar chart | null | dataviz |
| pick a color palette and typography for the marketing site | null | frontend-design |

