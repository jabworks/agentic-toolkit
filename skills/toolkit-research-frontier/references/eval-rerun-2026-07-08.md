# Trigger-routing run — 2026-07-08

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 373 cold-trigger cases scored (19 in-context cases excluded; 0 failed batches). Hits include per-case `accept` alternates.
Overall routing accuracy: **320/373 = 85.8%**

## Per expected skill

| expected | accuracy |
|---|---|
| plan-review | 10/16 |
| toolkit-change-control | 13/18 |
| git-operations | 3/4 |
| test-first-development | 9/12 |
| plugin-foundry | 3/4 |
| preflight | 14/18 |
| discovery | 12/15 |
| toolkit-failure-archaeology | 13/16 |
| toolkit-research-frontier | 13/16 |
| toolkit-plugin-reference | 15/18 |
| workflow | 27/32 |
| draft-plan | 11/13 |
| technical-spec | 11/13 |
| subagent-deployment | 12/14 |
| toolkit-debugging-playbook | 18/21 |
| subagent-execution | 13/15 |
| toolkit-skill-standards | 15/17 |
| finalize | 8/9 |
| root-cause-analysis | 18/19 |
| (null) | 46/47 |
| code-review | 17/17 |
| git-commit | 2/2 |
| spec-browser | 4/4 |
| toolkit-orientation | 11/11 |
| adapting-skills | 2/2 |

## Misses (53)

| query | expected | got | corpus file |
|---|---|---|---|
| review the spec folder | plan-review | spec-browser | code-review |
| brainstorm ideas for the notifications feature | discovery | null | discovery |
| resume the design we started yesterday | discovery | session-handoff | discovery |
| found an existing design doc for this, continue from it | discovery | draft-plan | discovery |
| create the docs/plans file for this feature | draft-plan | technical-spec | draft-plan |
| quick inline plan for a medium sized task | workflow | draft-plan | draft-plan |
| run the steer mode review loop | plan-review | null | plan-review |
| review the spec directory with per-file notes | plan-review | spec-browser | plan-review |
| open live preview of specs/wan-config | plan-review | null | plan-review |
| the exitplanmode hook isnt opening the browser | plan-review | null | plan-review |
| install the codex stop hook for plan review | plan-review | null | plan-review |
| write the plan first | draft-plan | workflow | plan-review |
| any debug logs left behind? | preflight | code-review | preflight |
| I tested it manually, ship it | preflight | finalize | preflight |
| only changed one line, can we skip the checks | preflight | null | preflight |
| double check my work on this feature | preflight | code-review | preflight |
| just patch it quickly, we can investigate later | root-cause-analysis | null | root-cause-analysis |
| batch these lookups together | subagent-deployment | null | subagent-deployment |
| spawn a generic subagent with this custom prompt | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| which model should the coder agent get for this task | subagent-execution | null | subagent-execution |
| sdd the plan | subagent-execution | null | subagent-execution |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| scaffold a spec folder for this feature | technical-spec | null | technical-spec |
| bump the index.md changelog for the spec | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| update the failing test to match the new behavior | test-first-development | null | test-first-development |
| the test is failing so just fix the test | test-first-development | null | test-first-development |
| should I tdd ui components | test-first-development | null | test-first-development |
| run the tests | finalize | null | test-first-development |
| jest config setup for the monorepo | null | workflow | test-first-development |
| I added a new skill folder but forgot if I need to touch marketplace.json too | toolkit-change-control | toolkit-plugin-reference | toolkit-change-control |
| which manifest gets the version field, marketplace or plugin.json | toolkit-change-control | toolkit-plugin-reference | toolkit-change-control |
| did the dist mirror get updated when I edited the skill | toolkit-change-control | toolkit-debugging-playbook | toolkit-change-control |
| retire the spec-browser skill, what do I remove | toolkit-change-control | null | toolkit-change-control |
| quick temp skill, skip the marketplace bit for now | toolkit-change-control | adapting-skills | toolkit-change-control |
| scaffold a brand new skill for me | plugin-foundry | adapting-skills | toolkit-change-control |
| review my description wording | toolkit-skill-standards | null | toolkit-change-control |
| user reports the old bug is still there after the fix shipped | toolkit-debugging-playbook | root-cause-analysis | toolkit-debugging-playbook |
| node --test failing on manifest parity | toolkit-debugging-playbook | toolkit-change-control | toolkit-debugging-playbook |
| why do we never edit dist directly, whats the story | toolkit-failure-archaeology | toolkit-orientation | toolkit-failure-archaeology |
| we should try monorepo plan paths | toolkit-failure-archaeology | toolkit-research-frontier | toolkit-failure-archaeology |
| why is grep -P banned here | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| explain the two install channels, npx skills add vs plugin install | toolkit-plugin-reference | toolkit-orientation | toolkit-orientation |
| skills path — ./skills or ./skills/name? | toolkit-plugin-reference | toolkit-orientation | toolkit-plugin-reference |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | toolkit-debugging-playbook | toolkit-plugin-reference |
| do our trigger evals actually get executed anywhere | toolkit-research-frontier | null | toolkit-research-frontier |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | null | toolkit-research-frontier |
| docs catalog test — worth adding? | toolkit-research-frontier | null | toolkit-research-frontier |
| fix this failing test right now | toolkit-debugging-playbook | null | toolkit-research-frontier |
| my yaml description has a colon and things broke | toolkit-skill-standards | toolkit-debugging-playbook | toolkit-skill-standards |
| update the readme wording for the install section | workflow | null | workflow |

