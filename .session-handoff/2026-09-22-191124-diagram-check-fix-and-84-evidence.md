---
created: 2026-09-22 19:11:24
branch: main (handoff committed direct; PRs #166 and #167 merged, nothing open)
repo: jabworks/agentic-toolkit (root)
task: diagram-check-fix-and-84-evidence
continues-from: 2026-09-20-103908-prd-authoring-shipped.md (pruned in the same commit; every step it listed is done or carried below)
workstream: docket sweep: #84 evidence, gate checks on the Someday items, diagram-check 2.32.1
---

## Immediate next steps

1. **Nothing is left in flight: condux 2.32.1 is fully released.** On Harvey's instruction ("Merge the PRs for me", 2026-09-22), the agent merged PR #166 (`03785e4`: the `distBoxToSegment` fix, its regression test, the uncrossed section-loop label, docket #85) and then Version Packages PR #167 (`9b94793`). Every workflow is green. Tags `condux--v2.32.1` and `@jabworks/condux@0.25.1` exist. npm `latest` is **0.25.1**, visible about 165 s after the Release log said published. That instruction covered those two PRs only; the next merge waits for his word again. The next session starts at step 2.
2. **#84 closes only on a *feature* discovery run that keeps the spec write-back.** Its last criterion is still a `specs/<slug>/prd.md` written at sign-off, then one task whose preflight drift check reads that row. Half of it is now observed in a real run (pocket-haven, 2026-09-21; see the 2026-09-22 status block under #84 in `docket/DOCKET.md`). When Harvey reports a run: synthesize the evidence into `specs/prd-authoring/verification/` (a public repo, so copy nothing), cite no path inside any repo's `.condux/`, and close with `docket_close 84 --note "…"`. A miss is a wording fix in the skill, never in the test.
3. **Period 3 for #65/#67: re-check around mid-October 2026**, earlier than the old November estimate. On 2026-09-22 there were 51 in-scope Claude Code sessions since the 2026-08-28 cut: agentic-toolkit 17, terminus 21, pocket-haven 13 (new; personal and non-synthetic, so in scope). That's +21 in 8 days, against a target of ~100. Codex in scope: 0. The counting recipe is under Key discoveries. Once it reaches ~100, run the miner `.condux/scratch/period2-digests/mine.mjs` with `FROM` = 2026-08-28. A verdict on #65 is a finding to report and does not authorise a hook.
4. **Still parked on Harvey, and unchanged by today's gate checks.** #74 needs his paid-model spend call. #75, #79 and #82 have no real case: the 2026-09-22 sweep found no decorative line read as an edge, and no halo or strip overlap visible in any render. #85 should be built together with #79 (same halo-identification rule). Also still waiting on him: the Codex trigger check for the blueprint visual language (recipe in `specs/blueprint/verification/2026-09-10-codex-trigger-check/report.md`), the history-rewrite decision, and keep-or-replace for the third-party remember plugin.

## Blockers

Nothing is stuck. Every open item is waiting on a decision, a merge, or data accumulating, all listed above.

## Current State Summary

This session closed out the 2026-09-20 handoff and then swept the docket. The npm publish of `@jabworks/condux@0.25.0` is verified. The 2026-09-20 outage was the Cloudflare One VPN, not WSL. PR #164 (five stale lines in `specs/prd-authoring/`) and PR #165 (#84 evidence note) are merged. Harvey asked to check the other sessions for #84's run. One real LARGE discovery ran on pocket-haven on 2026-09-21, with the §0 card correct in every observable respect, but it opted out of the spec write-back in a signed-off section (a review, no contracts), so no `prd.md` exists and #84 stays open. On "move on to the other docket items": each Someday item's own gate was checked instead of building speculative rules. The diagram sweep found a real checker bug and a real diagram defect, both fixed in PR #166, and a blind spot filed as #85. On Harvey's word the agent merged #166 and Version Packages #167: condux 2.32.1 and npm 0.25.1 are released and verified. The suite is 535/535. main is clean and nothing is open: no PRs, and `main` is the only branch on origin.

## Stack snapshot

- **Package / app:** repo root (`skills/`, `dist/`, `specs/`, `tests/`, `docket/`) plus `packages/condux-opencode`
- **Layer:** Tooling
- **Docker Compose:** N/A
- **Dev server:** not running
- **DB migrations in flight:** none

## Architecture context

### Critical files

| File | Why it matters |
|---|---|
| `skills/blueprint/references/diagram-check.mjs` → `distBoxToSegment` / `distPointToBox` | the fix: box-to-segment distance is the nearer of corner-to-segment and endpoint-to-box |
| `skills/blueprint/references/diagram-check.mjs` → the "Each free text's own edge" loop and rule 5 `unlabeled-edge` | one label is claimed by exactly one edge, the nearest; `edge-through-label` skips an edge's own label, which is #85's mechanism |
| `tests/diagram-check.test.mjs` | the new two-sided regression test sits right after the mark-as-path test |
| `specs/discovery-presentation/section-loop.html` | the real diagram behind both A and C; checks `clean` since PR #166 |
| `docket/DOCKET.md` → #84 (status 2026-09-20 and 2026-09-22), #85 | what #84 still needs; what #85 proposes |
| `specs/prd-authoring/decisions.md` | three build departures, bolded at §2 Consequences and §3 Consequences; PRDs are scoped to features |
| `skills/discovery/references/spec-integration.md` → "At sign-off" | the write-back is default-on with an opt-out; that's why pocket-haven's run is not a miss |

### Key discoveries

- **Cloudflare One blocks outbound TCP while DNS still resolves.** The signature looks exactly like a broken WSL NAT. Ask about the VPN before anything that restarts WSL. (Memory: `feedback_vpn_blocks_tcp.md`.)
- **Searching transcripts for a skill run:** grepping for Skill tool calls misses skills the user typed as slash commands, and sessions after a `/clear`. Grep for the artifact instead (for discovery, the design file's `## §0 · requirements` heading). The directories under `~/.claude/projects/` start with `-`, and `find` is aliased to `bfs`, so both read them as flags: prefix `./`. `ctx_execute` shell was not at fault.
- **Counting period-3 sessions:** top-level `*.jsonl` per project, excluding `agent-*` (subagents) and `-tmp` (eval harness), with `-newermt '2026-08-28'` and `-size +0`. For Codex, read only the `cwd` from the first line of each `~/.codex/sessions/**/rollout-*.jsonl`. Other-repo rollouts are counted, never read.
- **Diagram sweep recipe (for the next #75/#79/#82 check):** `grep -rl --include=*.html --include=*.svg --include=*.md '<svg' specs skills .condux`, then run `node skills/blueprint/references/diagram-check.mjs <file> --json` on each. Findings are under `.findings[].code`. Ignore `specs/blueprint/verification/2026-09-08-routing-gate/as-drawn.html` (the intentionally broken specimen), Markdown that only mentions `<svg>`, and the 24×24 icon in `specs/surface-kit/style-guide.html`. The checker was never meant for icons. Confirm any visual claim with `google-chrome --headless=new --screenshot`.
- **Probing checker internals:** only `checkSvg` is exported. Copy the file to the scratchpad and insert a `console.error` probe there. Text boxes are `{x0,y0,x1,y1,ax,ay}`, not `x/y/w/h`.
- The `rtk` wrapper decorates `git diff` output. For raw diff lines use `/usr/bin/git --no-pager diff --no-color -U0`.
- `--write-changelog` again collapsed a shipped version's branch commits (2.32.0, toolkit-ops 1.7.21) into their squash subject (#162). That's normal output.

## Completed work

### Tasks finished

- [x] Rebased and pushed the 2026-09-20 handoff commit; verified npm 0.25.0 published and #163's workflows green
- [x] PR #164 merged: five stale lines in `specs/prd-authoring/` plus a dated #84 status note
- [x] Checked session logs and pocket-haven's spec tree for #84's run, with Harvey's go-ahead; recorded as PR #165 (merged)
- [x] Gate checks on #65/#67 (51 of ~100 sessions) and #75/#79/#82 (no case found)
- [x] Fixed the checker's label-distance bug (A) and section-loop's crossed label (C); filed the blind spot as #85 (B); condux 2.32.1 in PR #166
- [x] Memories: `feedback_vpn_blocks_tcp.md` (new) and `project_prd_authoring.md` (updated twice)

### Files modified

| File | Change | Why |
|---|---|---|
| `specs/prd-authoring/{index,implementation,decisions}.md` | count two → three, §0 stamp, drift-row wording, changelog | stale after the #162 build (PR #164) |
| `docket/DOCKET.md` | #84 status 2026-09-20 and 2026-09-22; #85 filed | evidence, and the new blind spot |
| `skills/blueprint/references/diagram-check.mjs` + 4 mirrors | `distPointToBox`; endpoints join the corner minimum | fix A (PR #166) |
| `tests/diagram-check.test.mjs` | two-sided regression test | proves A; failed before the fix |
| `specs/discovery-presentation/section-loop.html` | return label moved to x 290, y 328 | fix C |
| `specs/blueprint/index.md` | stamp PR #166, changelog line | the spec records checker behaviour changes |
| `dist/plugins/condux/.{claude,codex}-plugin/plugin.json`, `CHANGELOG.md`, `.changeset/diagram-check-label-distance.md` | 2.32.1, regenerated changelog, patch changeset | release |

## Decisions made

| Decision | Options considered | Chosen | Rationale |
|---|---|---|---|
| pocket-haven's missing `prd.md` | skill miss · legitimate opt-out | legitimate opt-out | its §4, signed off by Harvey, declines the write-back, and `spec-integration.md` allows exactly that |
| #84 after the pocket-haven run | close · leave open | leave open, with a status note | its criterion needs a `prd.md` the drift check reads |
| "Move on to the other docket items" | build the candidate rules · check each item's own gate | check the gates | #75/#79/#82 carry Harvey's doctrine: a rule invented before the case is a guess |
| The sweep's three findings (Harvey) | fix all · fix some · docket all | fix A and C now; file B as #85 | A and C are demonstrated and simple; B needs #79's halo rule |
| Where the moved label goes | above the run, one line · two lines · below the run | below the run at x 290, y 328 | the space above is 440 wide against a 436-wide estimate; below, it's nearest its own edge (about 10) and clear of the arrow (27) |
| Bump size | patch · minor | patch, 2.32.1 | a bug fix, no new capability |
| `design.md:77` "written at creation" (in PR #164) | fix · keep | keep | it records the design as agreed; departures live in `decisions.md` |

## Important context

- **Other repos are read only when Harvey asks in that turn.** He did for pocket-haven's logs and spec tree on 2026-09-22. That doesn't carry forward. Nothing from another repo is copied into this public one, and no path inside another repo's `.condux/` may be cited (`durable-citations.test.mjs` rejects it anyway).
- **Merges wait for Harvey, and npm publishes most of all.** He merged #164 and #165 himself, and told the agent to merge #166 and #167. That instruction was for those two PRs; it is not standing permission.
- **Any condux skill edit needs a bump (the bump commit last on `dist/plugins/condux/`), `--write-changelog`, and a changeset.** The pre-commit hook stages `dist/` but not `packages/`, so run `git add packages` yourself.
- Workflow tiers this session were stated and confirmed. Harvey answers the menus when they're shown, so show them.
- Handoffs are committed straight to main with `git add -f`, no PR, pruning the consumed one in the same commit.

## Deferred / out of scope

- **The write-back's all-or-nothing behaviour** (declining it for want of contracts also drops a PRD that has real content). Recorded as an open question in #84's 2026-09-22 note. Offered as a docket item; Harvey didn't take that option, so it isn't filed.
- A checker rule for #85, which waits to be built together with #79's halo identification.
- Pointing diagram-check at non-diagram SVG such as icons: out of the tool's scope, so no rule.
- Everything the previous handoff deferred: realigning discovery's step box, PRDs for SMALL/MEDIUM tasks, per-product PRDs, backfilling `prd.md` into existing specs.
