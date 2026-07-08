# Trigger-routing baseline — 2026-07-08

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 392 (392 scored, 0 failed batches)
Overall routing accuracy: **298/392 = 76.0%**

## Per expected skill

| expected | accuracy |
|---|---|
| subagent-execution | 6/15 |
| workflow | 16/32 |
| finalize | 8/15 |
| plan-review | 10/17 |
| draft-plan | 10/17 |
| toolkit-change-control | 12/18 |
| toolkit-research-frontier | 11/16 |
| test-first-development | 9/13 |
| subagent-deployment | 13/18 |
| discovery | 11/15 |
| git-operations | 3/4 |
| plugin-foundry | 3/4 |
| toolkit-debugging-playbook | 17/21 |
| toolkit-orientation | 9/11 |
| technical-spec | 12/14 |
| toolkit-skill-standards | 15/17 |
| preflight | 16/18 |
| code-review | 17/19 |
| root-cause-analysis | 17/19 |
| (null) | 43/47 |
| toolkit-failure-archaeology | 15/16 |
| toolkit-plugin-reference | 17/18 |
| git-commit | 2/2 |
| spec-browser | 4/4 |
| adapting-skills | 2/2 |

## Misses (94)

| query | expected | got | corpus file |
|---|---|---|---|
| auto review every commit from now on | code-review | null | code-review |
| keep reviewing in a loop until its perfect | code-review | null | code-review |
| review the spec folder | plan-review | spec-browser | code-review |
| i have a rough idea for an activity feed | discovery | null | discovery |
| surface some alternatives for the state management approach | discovery | null | discovery |
| brainstorm ideas for the notifications feature | discovery | null | discovery |
| design a database schema for multi-tenancy | discovery | null | discovery |
| write the implementation plan | draft-plan | workflow | draft-plan |
| create the docs/plans file for this feature | draft-plan | technical-spec | draft-plan |
| we havent designed this yet but write a plan anyway | draft-plan | discovery | draft-plan |
| sketch the code for task 3 in the plan | draft-plan | workflow | draft-plan |
| whats the task card format again | draft-plan | null | draft-plan |
| how big should a task be, one function or the whole feature | draft-plan | null | draft-plan |
| can I edit the plan file after saving it | draft-plan | null | draft-plan |
| is the build green | finalize | null | finalize |
| prettier rewrote 3 files during the check, is that ok | finalize | null | finalize |
| should I run lint after every file edit | finalize | null | finalize |
| whats the projects test command, AGENTS.md has it maybe | finalize | null | finalize |
| tests failing, keep looping until green | finalize | null | finalize |
| run the full suite twice just to be sure | finalize | null | finalize |
| fix this type error in the component | workflow | null | finalize |
| run the steer mode review loop | plan-review | null | plan-review |
| review the spec directory with per-file notes | plan-review | spec-browser | plan-review |
| the exitplanmode hook isnt opening the browser | plan-review | null | plan-review |
| install the codex stop hook for plan review | plan-review | null | plan-review |
| why didnt the review tab reload after the revision | plan-review | null | plan-review |
| something like plannotator? | plan-review | null | plan-review |
| I tested it manually, ship it | preflight | git-commit | preflight |
| double check my work on this feature | preflight | code-review | preflight |
| just patch it quickly, we can investigate later | root-cause-analysis | null | root-cause-analysis |
| what does this stack trace mean | root-cause-analysis | null | root-cause-analysis |
| is it safe to parallelize these two tasks | subagent-deployment | null | subagent-deployment |
| spawn a generic subagent with this custom prompt | subagent-deployment | null | subagent-deployment |
| these fixes are related, one might fix the other — split them anyway? | subagent-deployment | null | subagent-deployment |
| whats the safety checklist for parallel dispatch | subagent-deployment | null | subagent-deployment |
| integrate the results from the agent batch | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| set up the deployment pipeline for staging | null | workflow | subagent-deployment |
| parallelize the test suite in ci | null | workflow | subagent-deployment |
| map reduce over these records | null | workflow | subagent-deployment |
| use the coder agent to implement the plan | subagent-execution | null | subagent-execution |
| resume plan execution from the ledger | subagent-execution | session-handoff | subagent-execution |
| whats in spawn-rules for picking an agent | subagent-execution | null | subagent-execution |
| prepare a task brief for task 4 | subagent-execution | null | subagent-execution |
| build the review package for the implementer's commits | subagent-execution | null | subagent-execution |
| which model should the coder agent get for this task | subagent-execution | null | subagent-execution |
| we compacted mid-plan, where were we with the agents | subagent-execution | session-handoff | subagent-execution |
| dont re-dispatch tasks that are already done | subagent-execution | null | subagent-execution |
| sdd the plan | subagent-execution | technical-spec | subagent-execution |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| scaffold a spec folder for this feature | technical-spec | null | technical-spec |
| whats the format for quirks.md | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| update the failing test to match the new behavior | test-first-development | null | test-first-development |
| the test is failing so just fix the test | test-first-development | null | test-first-development |
| should I tdd ui components | test-first-development | null | test-first-development |
| you already asked once, dont re-ask each cycle right? | test-first-development | null | test-first-development |
| add tests for the existing legacy code | workflow | null | test-first-development |
| write e2e tests with playwright for the flow | workflow | null | test-first-development |
| run the tests | finalize | null | test-first-development |
| I added a new skill folder but forgot if I need to touch marketplace.json too | toolkit-change-control | toolkit-orientation | toolkit-change-control |
| which manifest gets the version field, marketplace or plugin.json | toolkit-change-control | toolkit-plugin-reference | toolkit-change-control |
| did the dist mirror get updated when I edited the skill | toolkit-change-control | toolkit-debugging-playbook | toolkit-change-control |
| retire the spec-browser skill, what do I remove | toolkit-change-control | toolkit-orientation | toolkit-change-control |
| quick temp skill, skip the marketplace bit for now | toolkit-change-control | adapting-skills | toolkit-change-control |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | toolkit-failure-archaeology | toolkit-change-control |
| scaffold a brand new skill for me | plugin-foundry | adapting-skills | toolkit-change-control |
| publish my npm package | null | toolkit-change-control | toolkit-change-control |
| user reports the old bug is still there after the fix shipped | toolkit-debugging-playbook | root-cause-analysis | toolkit-debugging-playbook |
| skill shows up with an empty description in the picker | toolkit-debugging-playbook | toolkit-skill-standards | toolkit-debugging-playbook |
| node --test failing on manifest parity | toolkit-debugging-playbook | toolkit-change-control | toolkit-debugging-playbook |
| we should try monorepo plan paths | toolkit-failure-archaeology | toolkit-research-frontier | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| how is this repo organized | toolkit-orientation | null | toolkit-orientation |
| im new to this repo, give me the lay of the land | toolkit-orientation | null | toolkit-orientation |
| what does the condux workflow tier system do | workflow | null | toolkit-orientation |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| is manifest parity enforced now or still open | toolkit-research-frontier | toolkit-failure-archaeology | toolkit-research-frontier |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | toolkit-debugging-playbook | toolkit-research-frontier |
| docs catalog test — worth adding? | toolkit-research-frontier | null | toolkit-research-frontier |
| we shoud probly test frontmater yaml strictly | toolkit-research-frontier | workflow | toolkit-research-frontier |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | null | toolkit-research-frontier |
| fix this failing test right now | toolkit-debugging-playbook | workflow | toolkit-research-frontier |
| my yaml description has a colon and things broke | toolkit-skill-standards | toolkit-debugging-playbook | toolkit-skill-standards |
| what belongs in references vs scripts dir of a skill | toolkit-skill-standards | toolkit-orientation | toolkit-skill-standards |
| quick typo fix in the header | workflow | null | workflow |
| update the readme wording for the install section | workflow | null | workflow |
| whats the difference between the workflow tiers | workflow | null | workflow |
| how does condux work | workflow | null | workflow |
| explain the soft gates | workflow | null | workflow |
| can I skip workflow and just start | workflow | null | workflow |
| what are the four named agents | workflow | null | workflow |
| who wins, my CLAUDE.md or condux rules | workflow | null | workflow |
| why does condux ban mid-task test runs | workflow | null | workflow |

