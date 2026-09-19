# Trigger-routing run — 2026-09-19

Model: claude-haiku-4-5-20251001 · batch 12 · corpus 604 cold-trigger cases scored (24 in-context cases excluded; 1 injected-context cases scored separately; 0 failed batches). Hits include per-case `accept` alternates.

Trials: 3 · per-run: 92.9% / 93.5% / 92.1% · mean **92.8% ± 1.9pp** (95% CI, t-dist) · flaky cases: 68
Overall routing accuracy (final run of 3): **556/604 = 92.1%**
Disallowed violations: **0/21** cases carrying `disallowed` (0 occurrences across all trials). Reported separately — not included in the accuracy above.
Injected-context fires: **3/3** across 1 case replayed under a context preamble. Reported separately — not included in the accuracy above.

## Per expected skill

Mean hits per trial across 3 runs. **Compare these across reports only with the spread in view** — a one-trial move on a small case set is usually noise.

| expected | accuracy | per-trial |
|---|---|---|
| root-cause-analysis | 13.3/20 | 18 / 17 / 5 |
| workflow | 28.3/39 | 26 / 27 / 32 |
| git-operations | 8.7/10 | 9 / 8 / 9 |
| (null) | 73.3/82 | 73 / 73 / 74 |
| subagent-deployment | 11.7/13 | 12 / 12 / 11 |
| toolkit-failure-archaeology | 15.3/17 | 15 / 16 / 15 |
| discovery | 15.3/17 | 14 / 16 / 16 |
| finalize | 11.0/12 | 11 / 11 / 11 |
| toolkit-research-frontier | 14.7/16 | 15 / 15 / 14 |
| subagent-execution | 15.0/16 | 15 / 15 / 15 |
| technical-spec | 16.0/17 | 15 / 17 / 16 |
| toolkit-skill-standards | 17.0/18 | 16 / 17 / 18 |
| toolkit-change-control | 17.0/18 | 17 / 17 / 17 |
| toolkit-plugin-reference | 18.0/19 | 19 / 18 / 17 |
| preflight | 22.0/23 | 22 / 21 / 23 |
| git-worktree | 15.3/16 | 16 / 15 / 15 |
| release | 16.3/17 | 16 / 16 / 17 |
| coding-directive | 8.7/9 | 9 / 9 / 8 |
| adapting-skills | 10.7/11 | 11 / 11 / 10 |
| toolkit-orientation | 10.7/11 | 10 / 11 / 11 |
| plan-review | 17.7/18 | 17 / 18 / 18 |
| toolkit-debugging-playbook | 24.7/25 | 25 / 25 / 24 |
| toolkit-foundry | 5.0/5 | 5 / 5 / 5 |
| blueprint | 12.0/12 | 12 / 12 / 12 |
| code-review | 19.0/19 | 19 / 19 / 19 |
| git-commit | 4.0/4 | 4 / 4 / 4 |
| concord-doctor | 6.0/6 | 6 / 6 / 6 |
| remember | 3.0/3 | 3 / 3 / 3 |
| session-handoff | 16.0/16 | 16 / 16 / 16 |
| condux-doctor | 7.0/7 | 7 / 7 / 7 |
| groom | 16.0/16 | 16 / 16 / 16 |
| draft-plan | 13.0/13 | 13 / 13 / 13 |
| docket-doctor | 11.0/11 | 11 / 11 / 11 |
| record | 18.0/18 | 18 / 18 / 18 |
| live-verification | 14.0/14 | 14 / 14 / 14 |
| spec-browser | 4.0/4 | 4 / 4 / 4 |
| test-first-development | 12.0/12 | 12 / 12 / 12 |

## Misses (48)

_Final run of 3. See the flaky section for cases that vary between trials._

| query | expected | got | corpus file |
|---|---|---|---|
| plot signups per week as a bar chart | null | dataviz | blueprint |
| fix the critical findings from the review | workflow | code-review | code-review |
| why do we ban default exports | coding-directive | null | coding-directive |
| scaffold a new package the way we usually structure things | adapting-skills | null | coding-directive |
| my redis cache keeps evicting keys | null | root-cause-analysis | concord-doctor |
| design a database schema for multi-tenancy | discovery | blueprint | discovery |
| quick inline plan for a medium sized task | workflow | draft-plan | draft-plan |
| make a project timeline gantt chart | null | dataviz | draft-plan |
| why is this one test failing | root-cause-analysis | workflow | finalize |
| what does the no-unused-vars eslint rule mean | null | coding-directive | finalize |
| my worktree directory got committed into the repo | git-worktree | git-operations | git-worktree |
| add a submodule to this repo | null | git-operations | git-worktree |
| bisect to find the bad commit | null | git-operations | git-worktree |
| checkout crashes on empty cart | root-cause-analysis | workflow | root-cause-analysis |
| TypeError: cannot read property of undefined in the orders page | root-cause-analysis | workflow | root-cause-analysis |
| why does this test fail intermittently | root-cause-analysis | workflow | root-cause-analysis |
| debug the 500 on the orders endpoint | root-cause-analysis | workflow | root-cause-analysis |
| the app broke after the last deploy | root-cause-analysis | workflow | root-cause-analysis |
| trace this bug to its root cause | root-cause-analysis | workflow | root-cause-analysis |
| 3 fixes failed already, whats the next idea | root-cause-analysis | workflow | root-cause-analysis |
| reproduce this issue first before touching anything | root-cause-analysis | workflow | root-cause-analysis |
| just patch it quickly, we can investigate later | root-cause-analysis | workflow | root-cause-analysis |
| systematic debugging pls | root-cause-analysis | workflow | root-cause-analysis |
| regression after the refactor, find the cause | root-cause-analysis | workflow | root-cause-analysis |
| why is prod slower since tuesday | root-cause-analysis | workflow | root-cause-analysis |
| what does this stack trace mean | root-cause-analysis | null | root-cause-analysis |
| two unrelated failures showed up, split the work | subagent-deployment | workflow | root-cause-analysis |
| batch these lookups together | subagent-deployment | null | subagent-deployment |
| one small task, just do it yourself | workflow | null | subagent-deployment |
| set up the deployment pipeline for staging | null | workflow | subagent-deployment |
| dont re-dispatch tasks that are already done | subagent-execution | null | subagent-execution |
| ill implement the plan myself top to bottom | workflow | null | subagent-execution |
| bump the index.md changelog for the spec | technical-spec | null | technical-spec |
| load the spec for checkout before we start the task | workflow | null | technical-spec |
| run the tests | finalize | null | test-first-development |
| user says they still see the old skill behavior after my fix shipped | toolkit-debugging-playbook | root-cause-analysis | toolkit-change-control |
| fix the 502 on my nginx server | null | root-cause-analysis | toolkit-debugging-playbook |
| has this happened before | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| what mistakes did past sessions make in this repo | toolkit-failure-archaeology | null | toolkit-failure-archaeology |
| how do I use git bisect to find a bad commit | git-operations | null | toolkit-failure-archaeology |
| what version do I bump for this change | toolkit-change-control | null | toolkit-failure-archaeology |
| what is defaultPrompt for | toolkit-plugin-reference | toolkit-skill-standards | toolkit-plugin-reference |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | toolkit-change-control | toolkit-plugin-reference |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | null | toolkit-research-frontier |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | toolkit-failure-archaeology | toolkit-research-frontier |
| route this task | workflow | null | workflow |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | workflow | workflow |
| who wins, my CLAUDE.md or condux rules | workflow | null | workflow |

## Injected-context cases (1)

Each case is replayed with a preamble injected ahead of the message — the
condition a cold `(query, expected)` pair cannot reproduce (quirks Q4). A
case that fires routed correctly despite the injected context; one that
does not is the suppression signature. Scored separately from routing
accuracy — these cases never enter the band.

| query | expected | context | fired | routed to instead | corpus file |
|---|---|---|---|---|---|
| continue from last session | session-handoff | ctx-1 | 3/3 | — | session-handoff |

**ctx-1**

```
=== MEMORY ===
--- today-2026-01-14.md ---
## 09:20 | main
Wired the CSV export button on the invoice table; picked CSV over XLSX.
## 11:05 | main
Rate-limit retry landed behind a flag; follow-up: add backoff jitter.
--- recent.md ---
# Recent

## 2026-01-13
Shipped the settings page redesign; deferred the empty-state copy.
```

## Flaky cases (68 — hit in some trials, missed in others)

| query | expected | hits | got when missed |
|---|---|---|---|
| fix the critical findings from the review | workflow | 2/3 | code-review |
| why do we ban default exports | coding-directive | 2/3 | null |
| scaffold a new package the way we usually structure things | adapting-skills | 2/3 | null |
| update the npm packages to latest | null | 2/3 | workflow |
| my redis cache keeps evicting keys | null | 1/3 | root-cause-analysis |
| how do condux tiers work? | workflow | 1/3 | null |
| design a database schema for multi-tenancy | discovery | 1/3 | blueprint |
| big refactor, unclear boundaries — where do we even start | discovery | 1/3 | workflow |
| write a PRD for fixing the footer typo | workflow | 2/3 | null |
| fix this type error in the component | workflow | 2/3 | null |
| why is this one test failing | root-cause-analysis | 2/3 | workflow |
| what does the no-unused-vars eslint rule mean | null | 2/3 | coding-directive |
| my worktree directory got committed into the repo | git-worktree | 1/3 | git-operations |
| something like plannotator? | plan-review | 2/3 | null |
| verify this | preflight | 2/3 | live-verification |
| I tested it manually, ship it | preflight | 1/3 | git-commit |
| verify the deployment is healthy in prod | null | 2/3 | live-verification |
| npm unpublish the broken version | release | 1/3 | null |
| push my branch up | git-operations | 2/3 | null |
| checkout crashes on empty cart | root-cause-analysis | 2/3 | workflow |
| TypeError: cannot read property of undefined in the orders page | root-cause-analysis | 2/3 | workflow |
| why does this test fail intermittently | root-cause-analysis | 2/3 | workflow |
| debug the 500 on the orders endpoint | root-cause-analysis | 2/3 | workflow |
| the app broke after the last deploy | root-cause-analysis | 2/3 | workflow |
| trace this bug to its root cause | root-cause-analysis | 2/3 | workflow |
| 3 fixes failed already, whats the next idea | root-cause-analysis | 2/3 | workflow |
| reproduce this issue first before touching anything | root-cause-analysis | 2/3 | workflow |
| just patch it quickly, we can investigate later | root-cause-analysis | 1/3 | workflow |
| systematic debugging pls | root-cause-analysis | 2/3 | workflow |
| regression after the refactor, find the cause | root-cause-analysis | 2/3 | workflow |
| why is prod slower since tuesday | root-cause-analysis | 2/3 | workflow |
| what does this stack trace mean | root-cause-analysis | 2/3 | null |
| two unrelated failures showed up, split the work | subagent-deployment | 2/3 | workflow |
| session timeout bug in the auth flow | root-cause-analysis | 2/3 | workflow |
| one small task, just do it yourself | workflow | 2/3 | null |
| deploy the app to production | null | 2/3 | workflow |
| set up the deployment pipeline for staging | null | 1/3 | workflow |
| parallelize the test suite in ci | workflow | 2/3 | null |
| scaffold a spec folder for this feature | technical-spec | 2/3 | null |
| bump the index.md changelog for the spec | technical-spec | 1/3 | null |
| load the spec for checkout before we start the task | workflow | 1/3 | null |
| is it safe to hand-edit dist to hotfix this | toolkit-change-control | 1/3 | null, toolkit-orientation |
| user says they still see the old skill behavior after my fix shipped | toolkit-debugging-playbook | 2/3 | root-cause-analysis |
| my react app crashes on load | root-cause-analysis | 2/3 | workflow |
| debug this failing jest test in my project | root-cause-analysis | 2/3 | workflow |
| browser devtools show a network error on my site | null | 2/3 | workflow |
| has this happened before | toolkit-failure-archaeology | 1/3 | null |
| what mistakes did past sessions make in this repo | toolkit-failure-archaeology | 1/3 | null |
| record that the parity test just caught an asymmetric edit | toolkit-failure-archaeology | 2/3 | record |
| what version do I bump for this change | toolkit-change-control | 2/3 | null |
| how is this repo organized | toolkit-orientation | 2/3 | null |
| what is defaultPrompt for | toolkit-plugin-reference | 2/3 | toolkit-skill-standards |
| how do plugin caches refresh when I ship a fix | toolkit-plugin-reference | 1/3 | toolkit-orientation, toolkit-change-control |
| package.json exports field question | null | 2/3 | toolkit-plugin-reference |
| whats still open after the audit | toolkit-research-frontier | 2/3 | null |
| how do I check whether our skill descriptions route correctly on a real model | toolkit-research-frontier | 1/3 | toolkit-skill-standards, null |
| what did the 2026-07-08 audit leave open | toolkit-research-frontier | 2/3 | toolkit-failure-archaeology |
| improve this skill's description | toolkit-skill-standards | 2/3 | adapting-skills |
| my yaml description has a colon and things broke | toolkit-skill-standards | 1/3 | toolkit-debugging-playbook |
| lint my typescript code | null | 2/3 | workflow |
| update the readme wording for the install section | workflow | 2/3 | null |
| theres a bug where checkout crashes on empty cart | root-cause-analysis | 1/3 | workflow |
| i want to explore ideas for a notification system | discovery | 2/3 | workflow |
| whats the difference between the workflow tiers | workflow | 1/3 | null |
| how does condux work | workflow | 1/3 | null |
| explain the soft gates | workflow | 1/3 | null |
| can I skip workflow and just start | workflow | 1/3 | null |
| what are the four named agents | workflow | 1/3 | null |

## Out-of-catalog answers (5)

The judge named a skill it was never shown. Scored as given — these are
harness contamination, not routing defects, and no `accept` alternate can
fix one.

| query | expected | named |
|---|---|---|
| plot signups per week as a bar chart | null | dataviz |
| make a project timeline gantt chart | null | dataviz |
| scaffold a spec folder for this feature | technical-spec | null |
| bump the index.md changelog for the spec | technical-spec | null |
| load the spec for checkout before we start the task | workflow | null |

