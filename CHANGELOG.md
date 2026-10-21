# Changelog

Every plugin version that has shipped, newest first. Generated from git
history by `scripts/release-plugins.mjs --write-changelog` — do not edit by
hand.

Versions from the seeding release onward also have a `<plugin>--v<version>`
tag and a GitHub release. Earlier ones shipped before that channel existed
and are recorded only here — which is the reason this file is generated from
history rather than from the tags.

The `@jabworks/condux` npm package has its own changelog at
`packages/condux-opencode/CHANGELOG.md`, maintained by changesets.

## condux 2.39.0 — 2026-10-21

- feat(condux): the `/condux` board gets its desktop look — each plan row carries a rounded progress bar, count, status pill and age on the right; an open plan shows how alive the agent looks (ledger updated, quiet after 10 minutes, stalled after 30), its tier, branch, PR, BASE and commit badges, a pipeline stepper (tasks, then review, preflight, verify, commit as ghost steps until reached) and a dependency graph; a filter box on the desktop; Claude Code only

## condux 2.38.0 — 2026-10-20

- feat(condux): a Claude Code mod — `/condux` opens a live, read-only board of plans and their progress (tasks as done / next ready / ready / blocked, wrap-up lines, plans with no ledger shown as "state unknown"), and a status line shows the open plan and its next task; Claude Code only

## docket 0.12.2 — 2026-10-20

- fix(docket): pane dividers no longer wrap into a stub line on the desktop app; feat: a progress bar of done / committed / someday / loose threads over everything ever logged; on the desktop also an SVG done-ring, a 12-week sparkline of closes and a filter box, rounded, non-overlapping progress segments and donut, and section colours that no longer repeat

## docket 0.12.1 — 2026-10-20

- fix(docket): /docket no longer hangs where the surface never answers ui.open — it times out and prints the board as text

## condux 2.37.0 — 2026-10-19

- feat(workflow): a triggered strategic track — condux 2.37.0

## docket 0.12.0 — 2026-10-14

- feat(docket): a /docket pane for Claude Code — docket 0.12.0 (#185)

## condux 2.36.0 — 2026-10-10

- feat(live-verification): a native-app path for Android — condux 2.36.0 (#89) (#183)

## condux 2.35.0 — 2026-10-08

- feat(research): condux:research and the scout agent — condux 2.35.0 (#98) (#180)

## condux 2.34.1 — 2026-10-08

- fix(subagent-execution): honour another skill's mandated spawn type — condux 2.34.1 (#96) (#179)

## condux 2.34.0 — 2026-10-07

- feat(subagent-execution): refresh subagent model tiers — condux 2.34.0 (#177)

## toolkit-ops 1.7.24 — 2026-09-25

- fix: prompt-audit corrections — agent contracts and dated skill text (#175)

## release 1.3.2 — 2026-09-25

- fix: prompt-audit corrections — agent contracts and dated skill text (#175)

## git-operations 1.1.2 — 2026-09-25

- fix: prompt-audit corrections — agent contracts and dated skill text (#175)

## condux 2.33.1 — 2026-09-25

- fix: prompt-audit corrections — agent contracts and dated skill text (#175)

## condux 2.33.0 — 2026-09-25

- feat(finalize): native-change check for mobile apps — condux 2.33.0 (#88) (#173)

## toolkit-ops 1.7.23 — 2026-09-24

- docs(toolkit-ops): mobile prior-art survey for #88–#92 (1.7.23) (#169)

## toolkit-ops 1.7.22 — 2026-09-24

- docs(toolkit-ops): mobile-development eval; file #86–#93 (1.7.22) (#168)

## condux 2.32.2 — 2026-09-24

- fix(workflow): live context fails open; five-row menus fit a four-option tool — condux 2.32.2 (#86, #87) (#170)

## coding-directive 1.4.0 — 2026-09-24

- feat(coding-directive): React Native and Expo coverage — 1.4.0 (#91) (#172)

## condux 2.32.1 — 2026-09-22

- fix(blueprint): diagram-check label distance; uncross section-loop — condux 2.32.1 (#166)

## toolkit-ops 1.7.21 — 2026-09-19

- feat(condux): PRD authoring — prd.md concern file, authored by discovery (#84) (#162)

## condux 2.32.0 — 2026-09-19

- feat(condux): PRD authoring — prd.md concern file, authored by discovery (#84) (#162)

## condux 2.31.1 — 2026-09-12

- chore: resanitize the 2026-09-08 specimen; close #80 (PR stamps) and #81 (task-brief heading) — condux 2.31.1 (#157)

## condux 2.31.0 — 2026-09-10

- feat(blueprint): diagram visual language — role tint, kind marks, protocol dash — close #78 (2.31.0) (#155)

## condux 2.30.0 — 2026-09-10

- feat(blueprint): diagram-check resolves font size as the browser does; text-overflows-box — close #76 (2.30.0) (#153)

## toolkit-ops 1.7.20 — 2026-09-08

- chore(toolkit-ops): version 1.7.20

## spec-browser 1.1.2 — 2026-09-08

- chore(spec-browser): version 1.1.2

## session-report 1.11.1 — 2026-09-08

- chore(session-report): version 1.11.1

## session-handoff 2.0.0 — 2026-09-08

- chore(session-handoff): version 2.0.0

## release 1.3.1 — 2026-09-08

- chore(release): version 1.3.1

## git-worktree 1.0.2 — 2026-09-08

- chore(git-worktree): version 1.0.2

## git-operations 1.1.1 — 2026-09-08

- chore(git-operations): version 1.1.1

## git-commit 1.1.0 — 2026-09-08

- chore(git-commit): version 1.1.0

## docket 0.11.1 — 2026-09-08

- chore(docket): version 0.11.1

## condux 2.29.0 — 2026-09-08

- chore(condux): version 2.29.0

## concord 0.6.1 — 2026-09-08

- chore(concord): version 0.6.1

## coding-directive 1.3.0 — 2026-09-08

- chore(coding-directive): version 1.3.0

## adapting-skills 1.4.1 — 2026-09-08

- chore(adapting-skills): version 1.4.1
