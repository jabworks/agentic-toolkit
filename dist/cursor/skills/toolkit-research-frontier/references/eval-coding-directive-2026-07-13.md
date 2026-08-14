# Trigger-routing run — 2026-07-13

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 447 cold-trigger cases scored (20 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 90.4% / 89.9% / 91.7% · mean **90.7% ± 2.3pp** (95% CI, t-dist) · flaky cases: 39
Overall routing accuracy: **410/447 = 91.7%**

## Per expected skill

| expected | accuracy |
|---|---|
| subagent-execution | 11/16 |
| workflow | 24/33 |
| subagent-deployment | 11/14 |
| git-operations | 4/5 |
| toolkit-research-frontier | 13/16 |
| toolkit-change-control | 16/18 |
| toolkit-plugin-reference | 17/19 |
| finalize | 9/10 |
| preflight | 19/21 |
| toolkit-orientation | 10/11 |
| test-first-development | 11/12 |
| technical-spec | 14/15 |
| toolkit-failure-archaeology | 15/16 |
| code-review | 16/17 |
| (null) | 53/56 |
| root-cause-analysis | 19/20 |
| adapting-skills | 11/11 |
| toolkit-foundry | 5/5 |
| toolkit-skill-standards | 18/18 |
| toolkit-debugging-playbook | 22/22 |
| plan-review | 16/16 |
| coding-directive | 9/9 |
| git-commit | 3/3 |
| discovery | 15/15 |
| session-handoff | 16/16 |
| draft-plan | 13/13 |
| release | 16/16 |
| spec-browser | 4/4 |

## Misses (37)

| query | expected | got | corpus file |
|---|---|---|---|
| any security issues in this change? | code-review | null | code-review |
| fix the critical findings from the review | workflow | code-review | code-review |
| quick inline plan for a medium sized task | workflow | draft-plan | draft-plan |
| I tested it manually, ship it | preflight | release | preflight |
| only changed one line, can we skip the checks | preflight | null | preflight |
| add error handling to this function | workflow | null | root-cause-analysis |
| batch these lookups together | subagent-deployment | null | subagent-deployment |
| spawn a generic subagent with this custom prompt | subagent-deployment | null | subagent-deployment |
| dispatch all three coders in the same message | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| parallelize the test suite in ci | null | workflow | subagent-deployment |
| map reduce over these records | null | workflow | subagent-deployment |
| whats in spawn-rules for picking an agent | subagent-execution | workflow | subagent-execution |
| which model should the coder agent get for this task | subagent-execution | null | subagent-execution |
| we compacted mid-plan, where were we with the agents | subagent-execution | session-handoff | subagent-execution |
| dont re-dispatch tasks that are already done | subagent-execution | null | subagent-execution |
| sdd the plan | subagent-execution | technical-spec | subagent-execution |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| scaffold a spec folder for this feature | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| bug: prove it with a failing test then fix it | test-first-development | root-cause-analysis | test-first-development |
| add tests for the existing legacy code | workflow | null | test-first-development |
| write e2e tests with playwright for the flow | workflow | null | test-first-development |
| run the tests | finalize | null | test-first-development |
| quick temp skill, skip the marketplace bit for now | toolkit-change-control | toolkit-foundry | toolkit-change-control |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | toolkit-failure-archaeology | toolkit-change-control |
| we should try monorepo plan paths | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| wheres the marketplace json and what reads it | toolkit-orientation | toolkit-plugin-reference | toolkit-orientation |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | null | toolkit-plugin-reference |
| is argument-hint a real frontmatter field | toolkit-plugin-reference | toolkit-skill-standards | toolkit-plugin-reference |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | null | toolkit-research-frontier |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | toolkit-skill-standards | toolkit-research-frontier |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | null | toolkit-research-frontier |
| lint my typescript code | null | finalize | toolkit-skill-standards |
| update the readme wording for the install section | workflow | null | workflow |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | workflow | workflow |

## Flaky cases (39 — hit in some trials, missed in others)

| query | expected | hits |
|---|---|---|
| convert this superpowers skill for our toolkit | adapting-skills | 1/3 |
| the skill in .codex/skills never fires, fix its frontmatter | adapting-skills | 2/3 |
| any security issues in this change? | code-review | 1/3 |
| fix the critical findings from the review | workflow | 1/3 |
| update the npm packages to latest | null | 2/3 |
| design a database schema for multi-tenancy | discovery | 2/3 |
| run tests and lint before I commit | finalize | 2/3 |
| something like plannotator? | plan-review | 2/3 |
| only changed one line, can we skip the checks | preflight | 1/3 |
| draft release notes from the commits | release | 2/3 |
| npm unpublish the broken version | release | 2/3 |
| the app broke after the last deploy | root-cause-analysis | 2/3 |
| just patch it quickly, we can investigate later | root-cause-analysis | 1/3 |
| what does this stack trace mean | root-cause-analysis | 2/3 |
| add error handling to this function | workflow | 2/3 |
| batch these lookups together | subagent-deployment | 1/3 |
| map reduce over these records | null | 2/3 |
| scaffold a spec folder for this feature | technical-spec | 1/3 |
| bump the index.md changelog for the spec | technical-spec | 2/3 |
| design the feature first before documenting | discovery | 2/3 |
| bug: prove it with a failing test then fix it | test-first-development | 1/3 |
| add tests for the existing legacy code | workflow | 2/3 |
| write e2e tests with playwright for the flow | workflow | 2/3 |
| jest config setup for the monorepo | workflow | 2/3 |
| publish my npm package | null | 2/3 |
| my react app crashes on load | root-cause-analysis | 2/3 |
| browser devtools show a network error on my site | null | 2/3 |
| has this happened before | toolkit-failure-archaeology | 2/3 |
| why is grep -P banned here | toolkit-failure-archaeology | 1/3 |
| when did the invariant tests get added and why | toolkit-failure-archaeology | 2/3 |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | 2/3 |
| why are there two rename commits a605be9 and 0b88ab2 | toolkit-failure-archaeology | 2/3 |
| im new to this repo, give me the lay of the land | toolkit-orientation | 2/3 |
| where should I NOT write files in this repo | toolkit-orientation | 2/3 |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | 1/3 |
| fix this failing test right now | toolkit-debugging-playbook | 2/3 |
| my yaml description has a colon and things broke | toolkit-skill-standards | 2/3 |
| check my new skill against the house style | toolkit-skill-standards | 1/3 |
| lint my typescript code | null | 2/3 |

