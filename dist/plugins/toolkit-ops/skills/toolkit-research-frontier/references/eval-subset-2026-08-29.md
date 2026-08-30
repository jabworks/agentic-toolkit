# Trigger-routing run — 2026-08-29

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 394 cold-trigger cases scored (0 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 87.3% / 89.3% / 88.6% · mean **88.4% ± 2.5pp** (95% CI, t-dist) · flaky cases: 69
Overall routing accuracy: **349/394 = 88.6%**

## Per expected skill

> **Corrected 2026-08-30 (docket #71).** As first written this table showed the
> FINAL run only, while the headline above is a 3-trial mean — the shape that
> made `toolkit-research-frontier` look like it had lost a quarter of its cases
> (it printed 8, the worst of 13 / 11 / 8). Recomputed from this run's own JSON,
> which carried every trial all along; no case was re-judged and the headline is
> unchanged. `eval-triggers.mjs` now emits this shape directly.

Mean hits per trial across 3 runs. **Compare these across reports only with the
spread in view** — a one-trial move on a small case set is usually noise.

| expected | accuracy | per-trial |
|---|---|---|
| toolkit-research-frontier | 10.7/16 | 13 / 11 / 8 |
| git-operations | 3.3/5 | 4 / 3 / 3 |
| root-cause-analysis | 14.0/19 | 11 / 16 / 15 |
| workflow | 26.0/33 | 23 / 27 / 28 |
| preflight | 15.3/18 | 16 / 16 / 14 |
| (null) | 41.0/48 | 40 / 39 / 44 |
| toolkit-failure-archaeology | 13.7/16 | 13 / 14 / 14 |
| subagent-deployment | 12.0/14 | 12 / 13 / 11 |
| subagent-execution | 13.0/15 | 12 / 13 / 14 |
| toolkit-plugin-reference | 16.7/19 | 15 / 18 / 17 |
| finalize | 8.0/9 | 8 / 8 / 8 |
| toolkit-change-control | 16.3/18 | 17 / 16 / 16 |
| release | 14.7/16 | 15 / 15 / 14 |
| discovery | 14.0/15 | 14 / 14 / 14 |
| toolkit-orientation | 10.3/11 | 11 / 10 / 10 |
| technical-spec | 12.3/13 | 13 / 12 / 12 |
| toolkit-debugging-playbook | 20.0/21 | 21 / 20 / 19 |
| test-first-development | 11.7/12 | 11 / 12 / 12 |
| code-review | 16.7/17 | 17 / 16 / 17 |
| toolkit-skill-standards | 16.7/17 | 16 / 17 / 17 |
| adapting-skills | 2.0/2 | 2 / 2 / 2 |
| draft-plan | 13.0/13 | 13 / 13 / 13 |
| git-commit | 3.0/3 | 3 / 3 / 3 |
| plan-review | 16.0/16 | 16 / 16 / 16 |
| spec-browser | 4.0/4 | 4 / 4 / 4 |
| toolkit-foundry | 4.0/4 | 4 / 4 / 4 |

## Misses (45)

| query | expected | got | corpus file |
|---|---|---|---|
| big refactor, unclear boundaries — where do we even start | discovery | workflow | discovery |
| quick inline plan for a medium sized task | workflow | draft-plan | draft-plan |
| add a task to my todo list | null | record | draft-plan |
| make a project timeline gantt chart | null | dataviz | draft-plan |
| finalize just apps/web | finalize | (missing) | finalize |
| verify this | preflight | live-verification | preflight |
| I tested it manually, ship it | preflight | release | preflight |
| only changed one line, can we skip the checks | preflight | null | preflight |
| merge the version packages PR | release | git-operations | release |
| npm unpublish the broken version | release | null | release |
| push my branch up | git-operations | null | release |
| 3 fixes failed already, whats the next idea | root-cause-analysis | null | root-cause-analysis |
| just patch it quickly, we can investigate later | root-cause-analysis | workflow | root-cause-analysis |
| fix these 3 unrelated failing test files at once | subagent-deployment | workflow | subagent-deployment |
| two independent bugs in different packages, handle both | subagent-deployment | workflow | subagent-deployment |
| batch these lookups together | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| sdd the plan | subagent-execution | technical-spec | subagent-execution |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| the plan is fully implemented, verify it | preflight | live-verification | subagent-execution |
| scaffold a spec folder for this feature | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | discovery | technical-spec |
| quick temp skill, skip the marketplace bit for now | toolkit-change-control | toolkit-foundry | toolkit-change-control |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | toolkit-failure-archaeology | toolkit-change-control |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | toolkit-skill-standards | toolkit-debugging-playbook |
| why does codex install fail with missing plugin.json | toolkit-debugging-playbook | toolkit-plugin-reference | toolkit-debugging-playbook |
| my react app crashes on load | root-cause-analysis | workflow | toolkit-debugging-playbook |
| debug this failing jest test in my project | root-cause-analysis | workflow | toolkit-debugging-playbook |
| browser devtools show a network error on my site | null | workflow | toolkit-debugging-playbook |
| has this happened before | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | toolkit-orientation | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| wheres the marketplace json and what reads it | toolkit-orientation | toolkit-plugin-reference | toolkit-orientation |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| whats still open after the audit | toolkit-research-frontier | null | toolkit-research-frontier |
| should we add a script that fails when dist drifts | toolkit-research-frontier | null | toolkit-research-frontier |
| how would we automate trigger collision detection | toolkit-research-frontier | null | toolkit-research-frontier |
| is it worth adding yaml validation to the tests | toolkit-research-frontier | null | toolkit-research-frontier |
| where did we leave the trigger-eval work | toolkit-research-frontier | null | toolkit-research-frontier |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | null | toolkit-research-frontier |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | toolkit-skill-standards | toolkit-research-frontier |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | null | toolkit-research-frontier |
| lint my typescript code | null | finalize | toolkit-skill-standards |
| who wins, my CLAUDE.md or condux rules | workflow | null | workflow |

## Flaky cases (69 — hit in some trials, missed in others)

| query | expected | hits | got when missed |
|---|---|---|---|
| any security issues in this change? | code-review | 2/3 | security-review |
| design a database schema for multi-tenancy | discovery | 2/3 | blueprint |
| big refactor, unclear boundaries — where do we even start | discovery | 2/3 | workflow |
| why does checkout 500 on submit | root-cause-analysis | 2/3 | workflow |
| plan my sprint for next week | null | 2/3 | groom |
| finalize just apps/web | finalize | 2/3 | (missing) |
| fix this type error in the component | workflow | 2/3 | root-cause-analysis |
| verify this | preflight | 1/3 | live-verification |
| I tested it manually, ship it | preflight | 1/3 | git-commit, release |
| only changed one line, can we skip the checks | preflight | 2/3 | null |
| merge the version packages PR | release | 2/3 | git-operations |
| push my branch up | git-operations | 1/3 | null |
| trace this bug to its root cause | root-cause-analysis | 2/3 | workflow |
| 3 fixes failed already, whats the next idea | root-cause-analysis | 1/3 | workflow, null |
| reproduce this issue first before touching anything | root-cause-analysis | 2/3 | workflow |
| systematic debugging pls | root-cause-analysis | 2/3 | workflow |
| regression after the refactor, find the cause | root-cause-analysis | 2/3 | workflow |
| why is prod slower since tuesday | root-cause-analysis | 2/3 | workflow |
| what does this stack trace mean | root-cause-analysis | 2/3 | null |
| two unrelated failures showed up, split the work | subagent-deployment | 2/3 | workflow |
| fix these 3 unrelated failing test files at once | subagent-deployment | 2/3 | workflow |
| batch these lookups together | subagent-deployment | 2/3 | null |
| one small task, just do it yourself | workflow | 1/3 | null |
| set up the deployment pipeline for staging | null | 2/3 | workflow |
| parallelize the test suite in ci | null | 2/3 | workflow |
| use the coder agent to implement the plan | subagent-execution | 2/3 | null |
| dont re-dispatch tasks that are already done | subagent-execution | 1/3 | null |
| orchestrate the ci pipeline stages | null | 2/3 | workflow |
| scaffold a spec folder for this feature | technical-spec | 2/3 | null |
| bump the index.md changelog for the spec | technical-spec | 2/3 | null |
| load the spec for checkout before we start the task | workflow | 1/3 | discovery |
| design the feature first before documenting | discovery | 2/3 | null |
| generate openapi yaml from the routes | null | 2/3 | workflow |
| write jsdoc comments for this module | null | 2/3 | workflow |
| bug: prove it with a failing test then fix it | test-first-development | 2/3 | root-cause-analysis |
| run the tests | finalize | 1/3 | null |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | 1/3 | toolkit-debugging-playbook, toolkit-failure-archaeology |
| publish my npm package | null | 1/3 | release |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | 2/3 | toolkit-skill-standards |
| why does codex install fail with missing plugin.json | toolkit-debugging-playbook | 2/3 | toolkit-plugin-reference |
| my react app crashes on load | root-cause-analysis | 2/3 | workflow |
| debug this failing jest test in my project | root-cause-analysis | 2/3 | workflow |
| fix the 502 on my nginx server | null | 2/3 | root-cause-analysis |
| what mistakes did past sessions make in this repo | toolkit-failure-archaeology | 1/3 | null |
| history of the technical-spec plugin, why is there no standalone dist for it | toolkit-failure-archaeology | 1/3 | toolkit-orientation |
| wheres the marketplace json and what reads it | toolkit-orientation | 1/3 | toolkit-plugin-reference |
| how does npx skills add find the skills in this repo | toolkit-plugin-reference | 1/3 | toolkit-orientation |
| what frontmatter fields are actually parsed vs just convention | toolkit-plugin-reference | 2/3 | toolkit-skill-standards |
| is argument-hint a real frontmatter field | toolkit-plugin-reference | 2/3 | toolkit-skill-standards |
| write an MCP server manifest | null | 2/3 | workflow |
| whats still open after the audit | toolkit-research-frontier | 1/3 | groom, null |
| should we add a script that fails when dist drifts | toolkit-research-frontier | 2/3 | null |
| how would we automate trigger collision detection | toolkit-research-frontier | 2/3 | null |
| is it worth adding yaml validation to the tests | toolkit-research-frontier | 2/3 | null |
| where did we leave the trigger-eval work | toolkit-research-frontier | 1/3 | null |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | 1/3 | null |
| is manifest parity enforced now or still open | toolkit-research-frontier | 1/3 | null |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | 1/3 | null |
| fix this failing test right now | toolkit-debugging-playbook | 2/3 | test-first-development |
| improve this skill's description | toolkit-skill-standards | 2/3 | adapting-skills |
| lint my typescript code | null | 1/3 | finalize |
| route this task | workflow | 2/3 | null |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | 2/3 | workflow |
| whats the difference between the workflow tiers | workflow | 2/3 | null |
| how does condux work | workflow | 2/3 | null |
| explain the soft gates | workflow | 2/3 | null |
| can I skip workflow and just start | workflow | 2/3 | null |
| what are the four named agents | workflow | 2/3 | null |
| why does condux ban mid-task test runs | workflow | 2/3 | null |

## Out-of-catalog answers (3)

The judge named a skill it was never shown. Scored as given — these are
harness contamination, not routing defects, and no `accept` alternate can
fix one.

| query | expected | named |
|---|---|---|
| any security issues in this change? | code-review | security-review |
| make a project timeline gantt chart | null | dataviz |
| finalize just apps/web | finalize | (missing) |

