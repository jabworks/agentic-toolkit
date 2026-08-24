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

## condux 2.21.0 — 2026-08-24

- chore(condux): version 2.21.0

## condux 2.20.3 — 2026-08-24

- fix(plan-review): write the feedback file atomically (#104)

## session-report 1.11.0 — 2026-08-23

- feat(session-report): the cockpit surface (D9) (#103)

## session-report 1.10.0 — 2026-08-22

- feat(session-report): categorical ramp in the core, one hue per project (#97)

## session-handoff 1.9.0 — 2026-08-22

- feat(session-handoff): a rail, hoisted next steps, and a real measure (D8) (#101)

## session-handoff 1.8.2 — 2026-08-22

- feat(session-report): categorical ramp in the core, one hue per project (#97)

## docket 0.10.1 — 2026-08-22

- feat(session-report): categorical ramp in the core, one hue per project (#97)

## condux 2.20.2 — 2026-08-22

- feat(session-report): categorical ramp in the core, one hue per project (#97)

## session-report 1.9.1 — 2026-08-21

- fix(surface-kit): board density, readable items, and a discoverable ? overlay (#91)

## session-report 1.9.0 — 2026-08-21

- feat(surface-kit): one design system across all four HTML surfaces (#89)

## session-handoff 1.8.1 — 2026-08-21

- fix(surface-kit): board density, readable items, and a discoverable ? overlay (#91)

## session-handoff 1.8.0 — 2026-08-21

- feat(surface-kit): one design system across all four HTML surfaces (#89)

## docket 0.10.0 — 2026-08-21

- feat(docket): board as columns, lede-first cards, archive drawer (#45) (#93) (#95)

## docket 0.9.1 — 2026-08-21

- fix(surface-kit): board density, readable items, and a discoverable ? overlay (#91)

## docket 0.9.0 — 2026-08-21

- feat(surface-kit): one design system across all four HTML surfaces (#89)

## condux 2.20.1 — 2026-08-21

- fix(surface-kit): board density, readable items, and a discoverable ? overlay (#91)

## condux 2.20.0 — 2026-08-21

- fix(plugins): stop the root Agent Plugins manifest from killing Codex hooks (#92)

## condux 2.19.0 — 2026-08-21

- feat(surface-kit): one design system across all four HTML surfaces (#89)

## concord 0.6.0 — 2026-08-21

- fix(plugins): stop the root Agent Plugins manifest from killing Codex hooks (#92)
- fix(condux): OpenCode routing enforcement, close 4 of 5 contract gaps from #37's triage (#38, #39)

## toolkit-ops 1.7.6 — 2026-08-20

- fix(condux): reconcile trigger-eval oracles with routing doctrine (#42) (#87)

## condux 2.18.1 — 2026-08-20

- fix(condux): reconcile trigger-eval oracles with routing doctrine (#42) (#87)

## condux 2.18.0 — 2026-08-20

- feat(condux): add blueprint design-mockup skill (#85)
- fix(condux): OpenCode routing enforcement, close 4 of 5 contract gaps from #37's triage (#38, #39)

## coding-directive 1.3.0 — 2026-08-20

- fix(condux): reconcile trigger-eval oracles with routing doctrine (#42) (#87)

## toolkit-ops 1.7.5 — 2026-08-17

- fix(evals): triage the sibling-miss cases — 19 accept alternates and one oracle flip (#37)

## release 1.3.1 — 2026-08-17

- fix(evals): triage the sibling-miss cases — 19 accept alternates and one oracle flip (#37)

## condux 2.17.3 — 2026-08-17

- fix(evals): triage the sibling-miss cases — 19 accept alternates and one oracle flip (#37)

## condux 2.17.2 — 2026-08-17

- fix(condux): let test-first-development claim the advisory questions and the fix-the-test requests it already owned (#37)

## condux 2.17.1 — 2026-08-17

- fix(condux): route subagent-deployment on the fan-out being asked for, and fix the eval oracle that punished the router (#32) (#81)

## adapting-skills 1.4.1 — 2026-08-17

- fix(evals): triage the sibling-miss cases — 19 accept alternates and one oracle flip (#37)

## toolkit-ops 1.7.4 — 2026-08-16

- fix(sync): count a failed copy instead of reporting "0 failed" (#31) (#75)

## spec-browser 1.1.2 — 2026-08-16

- feat(condux,spec-browser): a purpose slot that survives the catalog, and a rule about which way a citation may point (#33, #35) (#79)

## spec-browser 1.1.1 — 2026-08-16

- fix(spec-browser): stop reporting scaffold bookkeeping as a spec's purpose (#77)

## condux 2.17.0 — 2026-08-16

- feat(condux,spec-browser): a purpose slot that survives the catalog, and a rule about which way a citation may point (#33, #35) (#79)

## toolkit-ops 1.7.3 — 2026-08-15

- feat(git-worktree): native-first worktree isolation router (#26) (#73)

## git-worktree 1.0.1 — 2026-08-15

- fix(git-worktree): ship the 'parallel checkout' trigger fix as 1.0.1 (#74)

## git-worktree 1.0.0 — 2026-08-15

- feat(git-worktree): native-first worktree isolation router (#26) (#73)

## git-operations 1.1.1 — 2026-08-15

- feat(git-worktree): native-first worktree isolation router (#26) (#73)

## toolkit-ops 1.7.2 — 2026-08-14

- docs(toolkit-ops): document the root plugin.json and both MCP dialects (#30) (#72)

## toolkit-ops 1.7.1 — 2026-08-14

- docs(toolkit-ops): four-channel docs + docket-doctor cursor probe (#28) (#71)

## toolkit-ops 1.7.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## toolkit-ops 1.6.4 — 2026-08-14

- feat(build): declare plugin composition as data, generate the catalogs (#64)

## spec-browser 1.1.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## session-report 1.8.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## session-handoff 1.7.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## release 1.3.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## git-operations 1.1.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## git-commit 1.1.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## docket 0.8.0 — 2026-08-14

- docs(toolkit-ops): four-channel docs + docket-doctor cursor probe (#28) (#71)

## docket 0.7.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## docket 0.6.0 — 2026-08-14

- feat(cursor): fourth distribution channel + docket cursor target (#66)

## condux 2.16.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## concord 0.5.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## coding-directive 1.2.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## adapting-skills 1.4.0 — 2026-08-14

- feat(plugins): Agent Plugins spec conformance across all 12 plugins (#68)

## session-report 1.7.0 — 2026-08-13

- feat(session-report): sticky section nav — chips, scroll-spy, smooth jump (1.7.0) (#62)

## condux 2.15.0 — 2026-08-13

- feat(plan-review): directory mode grows a doc-site — tree, filter, breadcrumb, prev/next (2.15.0) (#59)

## condux 2.14.2 — 2026-08-13

- docs(plan-review): directory mode walks the tree, not just top-level (2.14.2) (#57)

## session-report 1.6.5 — 2026-08-12

- feat(tokens,docket): one colour core with a checker, and a board that filters (2.14.1, 0.5.0, 1.6.5, 1.6.8) (#54)

## session-handoff 1.6.8 — 2026-08-12

- feat(tokens,docket): one colour core with a checker, and a board that filters (2.14.1, 0.5.0, 1.6.5, 1.6.8) (#54)

## docket 0.5.0 — 2026-08-12

- feat(tokens,docket): one colour core with a checker, and a board that filters (2.14.1, 0.5.0, 1.6.5, 1.6.8) (#54)

## docket 0.4.0 — 2026-08-12

- feat(condux,docket,concord): the removal half of the ease-of-install convention (2.14.0, 0.4.0, 0.4.2) (#51)

## docket 0.3.2 — 2026-08-12

- docs(docket,concord): plugin-level INSTALL.md front doors (0.3.2, 0.4.1) (#50)

## condux 2.14.1 — 2026-08-12

- feat(tokens,docket): one colour core with a checker, and a board that filters (2.14.1, 0.5.0, 1.6.5, 1.6.8) (#54)

## condux 2.14.0 — 2026-08-12

- feat(condux,docket,concord): the removal half of the ease-of-install convention (2.14.0, 0.4.0, 0.4.2) (#51)

## condux 2.13.0 — 2026-08-12

- feat(condux): warn when a competing skill library is installed (2.13.0) (#48)

## concord 0.4.2 — 2026-08-12

- feat(condux,docket,concord): the removal half of the ease-of-install convention (2.14.0, 0.4.0, 0.4.2) (#51)

## concord 0.4.1 — 2026-08-12

- docs(docket,concord): plugin-level INSTALL.md front doors (0.3.2, 0.4.1) (#50)

## condux 2.12.0 — 2026-08-11

- feat(condux): an install front door that wraps its scattered installers (2.12.0) (#46)

## toolkit-ops 1.6.3 — 2026-08-09

- docs(toolkit-ops): survey awesome-copilot's maintenance machinery, reopen A4 as a question (1.6.3) (#40)

## session-report 1.6.4 — 2026-08-09

- feat(tests): supply-chain lint over every skill, and two templates stop phoning home (#41)

## session-handoff 1.6.7 — 2026-08-09

- feat(tests): supply-chain lint over every skill, and two templates stop phoning home (#41)

## toolkit-ops 1.6.2 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## toolkit-ops 1.6.1 — 2026-08-06

- docs(toolkit-ops): ledger the --target release incident, note #5's second payoff (1.6.1) (#35)

## toolkit-ops 1.6.0 — 2026-08-06

- feat: per-plugin doctors, concord bundle conversion, and a generated release channel (#32)

## toolkit-ops 1.5.2 — 2026-08-06

- docs(toolkit-ops): dependency ladder in toolkit-skill-standards (1.5.2) (#31)

## spec-browser 1.0.6 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## session-report 1.6.3 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## session-handoff 1.6.6 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## session-handoff 1.6.5 — 2026-08-06

- feat: per-plugin doctors, concord bundle conversion, and a generated release channel (#32)

## release 1.2.2 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## release 1.2.1 — 2026-08-06

- fix(release): repair stranded releases, drop --target, fix the CI runner (1.2.1) (#34)

## release 1.2.0 — 2026-08-06

- feat: per-plugin doctors, concord bundle conversion, and a generated release channel (#32)

## git-operations 1.0.5 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## git-commit 1.0.5 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## docket 0.3.1 — 2026-08-06

- feat(concord): installer verifies what it registers, doctor can repair it (0.4.0) (#39)

## docket 0.3.0 — 2026-08-06

- feat(docket): qualified ids reference a parent instead of allocating (0.3.0) (#37)

## docket 0.2.1 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## docket 0.2.0 — 2026-08-06

- feat: per-plugin doctors, concord bundle conversion, and a generated release channel (#32)

## condux 2.11.1 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## condux 2.11.0 — 2026-08-06

- feat: per-plugin doctors, concord bundle conversion, and a generated release channel (#32)

## concord 0.4.0 — 2026-08-06

- feat(concord): installer verifies what it registers, doctor can repair it (0.4.0) (#39)

## concord 0.3.1 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## concord 0.3.0 — 2026-08-06

- feat: per-plugin doctors, concord bundle conversion, and a generated release channel (#32)

## coding-directive 1.1.4 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## adapting-skills 1.3.5 — 2026-08-06

- feat(plugins): plugin homepages with a real source of truth (#36)

## toolkit-ops 1.5.1 — 2026-08-05

- fix: make Codex-breaking SKILL.md frontmatter unwritable (4th occurrence) (#23)

## session-handoff 1.6.4 — 2026-08-05

- fix: make Codex-breaking SKILL.md frontmatter unwritable (4th occurrence) (#23)

## docket 0.1.1 — 2026-08-05

- feat(docket): trigger eval cases for record/groom (0.1.1) + dogfood backlog (#30)

## docket 0.1.0 — 2026-08-05

- feat(docket): file-based backlog plugin — record/groom skills, CLI, MCP, board (#29)

## condux 2.10.2 — 2026-08-05

- feat(docket): trigger eval cases for record/groom (0.1.1) + dogfood backlog (#30)

## condux 2.10.1 — 2026-08-05

- perf(condux): trim duplicated frontmatter prose (v2.10.1) + eval progress reporting (#28)

## condux 2.10.0 — 2026-08-05

- feat(condux): ship the routing rule as a SessionStart hook (v2.10.0) (#26)

## condux 2.9.2 — 2026-08-05

- fix: make Codex-breaking SKILL.md frontmatter unwritable (4th occurrence) (#23)

## toolkit-ops 1.4.2 — 2026-08-04

- docs(toolkit-ops): close the contract-adherence blind spot the re-eval exposed (#22)

## toolkit-ops 1.4.1 — 2026-08-04

- fix: 2026-08-04 re-eval — staleness sweep, trigger guards, design-review Reject fix, disclosure cleanups (#16)
- fix: check light mode before dark; de-personalize skill text for public use (#14)

## spec-browser 1.0.5 — 2026-08-04

- fix: 2026-08-04 re-eval — staleness sweep, trigger guards, design-review Reject fix, disclosure cleanups (#16)

## session-report 1.6.2 — 2026-08-04

- fix: 2026-08-04 re-eval — staleness sweep, trigger guards, design-review Reject fix, disclosure cleanups (#16)

## session-handoff 1.6.3 — 2026-08-04

- fix(session-handoff): win the wrap-up moment against generic memory skills (#19)

## session-handoff 1.6.2 — 2026-08-04

- fix: 2026-08-04 re-eval — staleness sweep, trigger guards, design-review Reject fix, disclosure cleanups (#16)

## release 1.1.1 — 2026-08-04

- fix: 2026-08-04 re-eval — staleness sweep, trigger guards, design-review Reject fix, disclosure cleanups (#16)

## git-operations 1.0.4 — 2026-08-04

- fix: 2026-08-04 re-eval — staleness sweep, trigger guards, design-review Reject fix, disclosure cleanups (#16)

## condux 2.9.1 — 2026-08-04

- fix(condux): CP-1 must always present the full menu — subagent options were being dropped (#20)

## condux 2.9.0 — 2026-08-04

- fix: 2026-08-04 re-eval — staleness sweep, trigger guards, design-review Reject fix, disclosure cleanups (#16)

## condux 2.8.1 — 2026-08-04

- fix: check light mode before dark; de-personalize skill text for public use (#14)

## concord 0.2.2 — 2026-08-04

- fix(concord): derive session_id from the rollout filename when the payload omits it (#18)

## concord 0.2.1 — 2026-08-04

- fix: 2026-08-04 re-eval — staleness sweep, trigger guards, design-review Reject fix, disclosure cleanups (#16)

## coding-directive 1.1.3 — 2026-08-04

- fix: 2026-08-04 re-eval — staleness sweep, trigger guards, design-review Reject fix, disclosure cleanups (#16)

## coding-directive 1.1.2 — 2026-08-04

- fix: check light mode before dark; de-personalize skill text for public use (#14)

## adapting-skills 1.3.4 — 2026-08-04

- fix: 2026-08-04 re-eval — staleness sweep, trigger guards, design-review Reject fix, disclosure cleanups (#16)

## adapting-skills 1.3.3 — 2026-08-04

- fix: check light mode before dark; de-personalize skill text for public use (#14)

## toolkit-ops 1.4.0 — 2026-07-30

- feat: close the friction gaps found in 102 sessions of transcripts (#11)

## release 1.1.0 — 2026-07-30

- feat: close the friction gaps found in 102 sessions of transcripts (#11)

## condux 2.8.0 — 2026-07-30

- feat: close the friction gaps found in 102 sessions of transcripts (#11)
- docs(condux): add a plugin-root README for directory submission

## concord 0.2.0 — 2026-07-30

- feat: close the friction gaps found in 102 sessions of transcripts (#11)

## coding-directive 1.1.0 — 2026-07-30

- feat: close the friction gaps found in 102 sessions of transcripts (#11)

## toolkit-ops 1.3.3 — 2026-07-29

- fix(plugins): move interface to the codex manifest so --strict passes
- chore: add MIT LICENSE to the repo, all plugins, and the npm package

## spec-browser 1.0.4 — 2026-07-29

- fix(plugins): move interface to the codex manifest so --strict passes
- chore: add MIT LICENSE to the repo, all plugins, and the npm package

## session-report 1.6.1 — 2026-07-29

- fix(plugins): move interface to the codex manifest so --strict passes
- chore: add MIT LICENSE to the repo, all plugins, and the npm package

## session-handoff 1.6.1 — 2026-07-29

- fix(plugins): move interface to the codex manifest so --strict passes
- chore: add MIT LICENSE to the repo, all plugins, and the npm package

## release 1.0.1 — 2026-07-29

- fix(plugins): move interface to the codex manifest so --strict passes
- chore: add MIT LICENSE to the repo, all plugins, and the npm package
- feat(toolkit-ops): absorb plugin-foundry as toolkit-foundry (v1.2.0)

## git-operations 1.0.3 — 2026-07-29

- fix(plugins): move interface to the codex manifest so --strict passes
- chore: add MIT LICENSE to the repo, all plugins, and the npm package

## git-commit 1.0.4 — 2026-07-29

- fix(plugins): move interface to the codex manifest so --strict passes
- chore: add MIT LICENSE to the repo, all plugins, and the npm package

## condux 2.7.2 — 2026-07-29

- fix(plugins): move interface to the codex manifest so --strict passes
- chore: add MIT LICENSE to the repo, all plugins, and the npm package

## concord 0.1.1 — 2026-07-29

- fix(plugins): move interface to the codex manifest so --strict passes
- chore: add MIT LICENSE to the repo, all plugins, and the npm package
- fix(concord): exclude today from recent.md to stop duplicate recall

## concord 0.1.0 — 2026-07-29

- feat(concord): continuous memory for Codex (#8)

## coding-directive 1.0.2 — 2026-07-29

- fix(plugins): move interface to the codex manifest so --strict passes
- chore: add MIT LICENSE to the repo, all plugins, and the npm package

## adapting-skills 1.3.2 — 2026-07-29

- fix(plugins): move interface to the codex manifest so --strict passes
- chore: add MIT LICENSE to the repo, all plugins, and the npm package

## toolkit-ops 1.3.2 — 2026-07-23

- feat(opencode): publish @jabworks/condux with provenance attestations
- docs(toolkit-ops): drop the Pi channel from known uncertainty

## toolkit-ops 1.3.1 — 2026-07-23

- fix(toolkit-ops): document three-channel repo layout

## spec-browser 1.0.3 — 2026-07-23

- fix: ship commonjs manifests with skill reference scripts

## condux 2.7.1 — 2026-07-23

- fix: ship commonjs manifests with skill reference scripts

## toolkit-ops 1.3.0 — 2026-07-22

- fix(toolkit-ops): portable publish checklist, push gate (v1.3.0)
- feat: adopt .<plugin-name>/ for skill working state
- feat(condux): move working artifacts to .condux/ (v2.6.0)

## session-report 1.6.0 — 2026-07-22

- feat(session-report): prefer upstream prices over bundled (v1.6.0)

## session-report 1.5.0 — 2026-07-22

- feat: adopt .<plugin-name>/ for skill working state

## session-handoff 1.6.0 — 2026-07-22

- feat: adopt .<plugin-name>/ for skill working state

## condux 2.7.0 — 2026-07-22

- feat(condux): load coding-directive before implementation (v2.7.0)

## condux 2.6.0 — 2026-07-22

- feat(condux): move working artifacts to .condux/ (v2.6.0)

## coding-directive 1.0.1 — 2026-07-22

- fix(coding-directive): add semicolons to non-negotiables digest (v1.0.1)

## condux 2.5.2 — 2026-07-16

- fix(code-review): allow model invocation so a 'yes' to the review offer works (v2.5.2)

## toolkit-ops 1.2.7 — 2026-07-13

- docs(toolkit-ops): record the coding-directive trigger-routing eval round (v1.2.7)

## coding-directive 1.0.0 — 2026-07-13

- feat(coding-directive): ship house-style skill as standalone plugin (v1.0.0)

## toolkit-ops 1.2.6 — 2026-07-12

- feat(adapting-skills): own skill improvement in any project (v1.3.0)

## toolkit-ops 1.2.5 — 2026-07-12

- docs(toolkit-ops): record the design-resume seam fix eval round (v1.2.5)

## adapting-skills 1.3.1 — 2026-07-12

- fix(adapting-skills): accept doctrine-correct workflow routes in eval negatives (v1.3.1)

## adapting-skills 1.3.0 — 2026-07-12

- feat(adapting-skills): own skill improvement in any project (v1.3.0)

## toolkit-ops 1.2.4 — 2026-07-11

- docs(toolkit-ops): eval record for post-discovery-rewrite trials (v1.2.4)

## session-report 1.4.4 — 2026-07-11

- fix(session-report): price the GPT-5.6 family (sol/terra/luna)

## session-handoff 1.5.3 — 2026-07-11

- fix(condux,session-handoff): sharpen the design-resume routing seam

## condux 2.5.1 — 2026-07-11

- fix(condux,session-handoff): sharpen the design-resume routing seam

## condux 2.5.0 — 2026-07-11

- feat(condux): preflight spec drift-check (v2.5.0)

## condux 2.4.0 — 2026-07-11

- feat(condux): two-round discovery questioning, default-on spec write-back

## toolkit-ops 1.2.3 — 2026-07-10

- fix(condux): use Codex's PLUGIN_ROOT in the Stop hook

## toolkit-ops 1.2.2 — 2026-07-10

- fix(toolkit): harden local tooling boundaries

## spec-browser 1.0.2 — 2026-07-10

- fix(toolkit): harden local tooling boundaries

## session-report 1.4.3 — 2026-07-10

- fix(toolkit): harden local tooling boundaries

## condux 2.3.3 — 2026-07-10

- fix(condux): use Codex's PLUGIN_ROOT in the Stop hook

## condux 2.3.2 — 2026-07-10

- fix(toolkit): harden local tooling boundaries

## adapting-skills 1.2.2 — 2026-07-10

- fix(toolkit): harden local tooling boundaries

## toolkit-ops 1.2.1 — 2026-07-09

- docs(toolkit-ops): post-foundry eval trials — 88.6% +/- 3.8pp (v1.2.1)

## toolkit-ops 1.2.0 — 2026-07-09

- feat(toolkit-ops): absorb plugin-foundry as toolkit-foundry (v1.2.0)

## toolkit-ops 1.1.0 — 2026-07-09

- feat(toolkit-ops): porting guide — stand up a new toolkit from this one (v1.1.0)

## toolkit-ops 1.0.8 — 2026-07-09

- docs(toolkit-ops): clean 3-trial verdict — 88.7% ± 4.7pp (v1.0.8; condux 2.3.1)

## toolkit-ops 1.0.7 — 2026-07-09

- feat: resolve frontier items — A4 falsified, D2 + CI dry-run shipped (toolkit-ops 1.0.7)

## toolkit-ops 1.0.6 — 2026-07-09

- docs(toolkit-ops): trials addendum — 3 measurements cluster 90-92% (v1.0.6)

## session-handoff 1.5.2 — 2026-07-09

- fix(session-handoff): quote when_to_use — frontmatter was silently dropped (v1.5.2)

## git-operations 1.0.2 — 2026-07-09

- fix(git-skills): drop owner-local rtk prefix from shipped skill docs

## git-commit 1.0.3 — 2026-07-09

- fix(git-skills): drop owner-local rtk prefix from shipped skill docs

## condux 2.3.1 — 2026-07-09

- docs(toolkit-ops): clean 3-trial verdict — 88.7% ± 4.7pp (v1.0.8; condux 2.3.1)

## toolkit-ops 1.0.5 — 2026-07-08

- feat(toolkit-ops): A3 complete — 91.7% routing, criterion met (v1.0.5)

## toolkit-ops 1.0.4 — 2026-07-08

- chore(toolkit-ops): retire-a-skill trigger + one-hop accepts (v1.0.4)

## toolkit-ops 1.0.3 — 2026-07-08

- feat(toolkit-ops): scorer semantics + C3 warn-test closed (v1.0.3)

## toolkit-ops 1.0.2 — 2026-07-08

- docs(toolkit-ops): ledger entry for the browser-popup incident (v1.0.2)

## toolkit-ops 1.0.1 — 2026-07-08

- feat(toolkit-ops): trigger-routing harness + A3 baseline 76.0% (v1.0.1)

## toolkit-ops 1.0.0 — 2026-07-08

- feat: library audit — toolkit-ops bundle, manifest parity, condux 2.1.0

## spec-browser 1.0.1 — 2026-07-08

- feat: library audit — toolkit-ops bundle, manifest parity, condux 2.1.0

## session-report 1.4.2 — 2026-07-08

- feat: library audit — toolkit-ops bundle, manifest parity, condux 2.1.0
- fix(ui): apply Terminus UI palette + 4px radius across all skill templates

## session-handoff 1.5.1 — 2026-07-08

- feat: library audit — toolkit-ops bundle, manifest parity, condux 2.1.0

## release 1.0.0 — 2026-07-08

- feat: add release skill — machinery router, dry-run first, rollback paths

## git-operations 1.0.1 — 2026-07-08

- feat: library audit — toolkit-ops bundle, manifest parity, condux 2.1.0

## git-commit 1.0.2 — 2026-07-08

- feat: add release skill — machinery router, dry-run first, rollback paths

## git-commit 1.0.1 — 2026-07-08

- feat: library audit — toolkit-ops bundle, manifest parity, condux 2.1.0

## condux 2.3.0 — 2026-07-08

- feat: add release skill — machinery router, dry-run first, rollback paths

## condux 2.2.5 — 2026-07-08

- feat(condux): A3 round-2 contract fixes; keep "rationalization" (v2.2.5)

## condux 2.2.4 — 2026-07-08

- refactor(condux): purge remaining superpowers vocabulary (v2.2.4)

## condux 2.2.3 — 2026-07-08

- refactor(condux): rename visual-companion → mockup-picker (v2.2.3)

## condux 2.2.2 — 2026-07-08

- chore(condux): tag in-context eval cases + doctrine accepts (v2.2.2)

## condux 2.2.1 — 2026-07-08

- fix(condux): plan-review server gains --no-open; tests stop popping Chrome (v2.2.1)

## condux 2.2.0 — 2026-07-08

- feat(condux): trim agents, Codex agent installer, contract fixes (v2.2.0)

## condux 2.1.0 — 2026-07-08

- feat: library audit — toolkit-ops bundle, manifest parity, condux 2.1.0
- feat(condux): rename skills → root-cause-analysis + test-first-development
- docs(condux): correct technical-spec boundary — bundled, not separate
- feat(condux): planner reads discovery's saved design artifact

## adapting-skills 1.2.1 — 2026-07-08

- feat: library audit — toolkit-ops bundle, manifest parity, condux 2.1.0

## condux 2.0.0 — 2026-07-07

- feat(condux): rename skills off superpowers vocab; tighten pipeline (v2.0.0)

## git-operations 1.0.0 — 2026-07-04

- feat: add git-commit and git-operations skills

## git-commit 1.0.0 — 2026-07-04

- feat: add git-commit and git-operations skills

## condux 1.27.0 — 2026-07-03

- feat(condux): auto-wire Codex plan-review Stop hook via plugin manifest (v1.27.0)

## condux 1.26.0 — 2026-07-03

- fix(condux): deliver Approve-with-notes to Codex via continuation prompt (v1.26.0)

## condux 1.25.0 — 2026-07-03

- fix(condux): remove hook-mode temp plan file on exit (v1.25.0)

## spec-browser 1.0.0 — 2026-07-02

- feat: spec-browser skill + recursive plan-review directory mode

## session-handoff 1.5.0 — 2026-07-02

- feat(session-handoff): prune workflow for stale handoffs (v1.5.0)
- fix(ui): apply Terminus UI palette + 4px radius across all skill templates

## condux 1.24.0 — 2026-07-02

- feat(condux): spec review is accept-or-fix — hide Reject in directory mode (v1.24.0)

## condux 1.23.0 — 2026-07-02

- fix(condux): restore doc-management block + spec catalog link navigation (v1.23.0)

## condux 1.22.0 — 2026-07-02

- fix(condux): harden plan-review markdown renderer (v1.22.0)

## condux 1.21.0 — 2026-07-02

- fix(condux): render GFM tables in plan-review/spec preview (v1.21.0)

## condux 1.20.0 — 2026-07-02

- feat: spec-browser skill + recursive plan-review directory mode

## condux 1.19.0 — 2026-07-02

- feat(condux): plan code sketches + align MEDIUM quick-plan (v1.19.0)

## condux 1.18.0 — 2026-07-02

- feat(condux): plan-template scaffold + top-level task headings for review nav (v1.18.0)

## condux 1.17.0 — 2026-07-02

- feat(condux): fold spec review into plan-review — directory mode + Files tab (v1.17.0)

## condux 1.16.0 — 2026-07-02

- feat(condux): plan-review bottom decision bar (v1.16.0)

## condux 1.15.0 — 2026-07-02

- fix(condux): acronym-safe spec slugs + root-mirrored monorepo spec layout (v1.15.0)

## condux 1.14.0 — 2026-07-02

- feat(condux): plan-review action rework — grouped rows + real Reject decision (v1.14.0)

## condux 1.13.0 — 2026-07-01

- feat(condux): plan-review revision diff + immediate-clear + sent-state UX (v1.13.0)

## condux 1.12.0 — 2026-07-01

- chore(condux): bump to v1.12.0
- feat(condux): interactive click-to-select picker for brainstorm mockups
- refactor(condux): drop redundant static HTML visual from brainstorm
- refactor(condux): drop redundant HTML output from write-plan

## condux 1.11.0 — 2026-07-01

- feat(condux): parallel subagent-deployment, SDD/CI hardening (v1.11.0)

## condux 1.8.0 — 2026-06-30

- feat(condux): interactive phase checkpoints in workflow (v1.8.0)

## condux 1.7.0 — 2026-06-30

- feat(plan-review): agent-steering iterative loop via long-lived --steer server

## condux 1.6.0 — 2026-06-30

- feat(plan-review): Codex Stop-hook support + two-step annotation toolbar (v1.6.0)
- fix(ui): apply Terminus UI palette + 4px radius across all skill templates
- feat(plan-review): style review UI after the Terminus UI design system

## condux 1.5.5 — 2026-06-30

- feat(plan-review): rework interactive planning into a self-contained skill

## condux 1.5.4 — 2026-06-30

- feat: add interactive planning system skill set (plan-review, html-artifacts, enhanced code-review)

## condux 1.5.3 — 2026-06-29

- feat: bump plugin version to 1.5.3
- feat: merge stashed changes into technical-spec skill

## session-report 1.4.1 — 2026-06-26

- chore: bump plugin versions after Terminus UI token sync (condux v1.5.1, session-handoff v1.4.1, session-report v1.4.1)
- feat(templates): adopt Terminus UI design system tokens across all HTML templates
- feat: automate skills→dist sync with scripts/sync.sh and pre-commit hook
- feat(skills): augment with Claude Code + Codex frontmatter fields
- fix(session-report): correctly track Codex tool calls from response_item events
- fix(session-report): add model breakdown, efficiency score, prompt histogram, cost/day to Codex analyzer

## session-handoff 1.4.1 — 2026-06-26

- chore: bump plugin versions after Terminus UI token sync (condux v1.5.1, session-handoff v1.4.1, session-report v1.4.1)
- feat(templates): adopt Terminus UI design system tokens across all HTML templates
- docs: update README and session-handoff README
- feat(skills): augment with Claude Code + Codex frontmatter fields

## condux 1.5.2 — 2026-06-26

- feat(condux): enforce /workflow as mandatory entry point, add technical-spec companion prompt (v1.5.2)

## condux 1.5.1 — 2026-06-26

- chore: bump plugin versions after Terminus UI token sync (condux v1.5.1, session-handoff v1.4.1, session-report v1.4.1)
- feat(templates): adopt Terminus UI design system tokens across all HTML templates

## condux 1.5.0 — 2026-06-25

- feat(condux): absorb technical-spec into condux bundle (v1.5.0)
- fix(skills): revert write-plan monorepo paths, fix grep -P portability
- feat(monorepo): co-locate specs and plans with their package
- feat: automate skills→dist sync with scripts/sync.sh and pre-commit hook

## condux 1.4.0 — 2026-06-25

- feat(skills): augment with Claude Code + Codex frontmatter fields

## condux 1.3.3 — 2026-06-25

- feat(technical-spec+condux): fields mapping, spec integration, and spec-aware workflow

## condux 1.3.1 — 2026-06-18

- fix(condux): quote YAML description in systematic-debugging skill, bump to v1.3.1

## condux 1.3.0 — 2026-06-15

- feat(condux): add systematic-debugging + visual-companion, bump to v1.3.0

## session-report 1.4.0 — 2026-06-11

- feat(session-report): add model usage, tool calls, efficiency score, prompt histogram, cost per day
- fix(session-report): prevent non-JSON content in report-data script tag

## session-report 1.3.5 — 2026-06-08

- fix(session-report): re-release as 1.3.5 — 1.3.4 cache was stale

## session-report 1.3.4 — 2026-06-08

- fix(session-report): fix Codex cost estimation and update model prices

## session-handoff 1.4.0 — 2026-06-06

- feat(session-handoff): add option to generate both md and html

## condux 1.2.1 — 2026-06-06

- docs(condux): credit obra/superpowers as inspiration

## condux 1.2.0 — 2026-06-06

- feat(condux): add using-condux skill documenting workflow and agents
- docs: remove condux: prefix from skill invocation references
- fix: increase border-radius and clarify Claude/Codex detection in session-report

## session-report 1.3.3 — 2026-06-04

- feat: show cached token count in hero, move cost breakdown to top, remove from summary

## session-report 1.3.2 — 2026-06-04

- fix: remove 14-day hardcap on session timeline so full range is shown

## session-report 1.3.1 — 2026-06-04

- fix: prefix session-report tmp file with tool name to prevent stale cache collision

## session-report 1.3.0 — 2026-06-04

- feat: add cost breakdown to session-report summary section
- fix: increase border-radius and clarify Claude/Codex detection in session-report

## session-report 1.2.0 — 2026-06-04

- fix: Codex detection in session-report and bump plugin versions
- refactor: replace macOS dot chrome with pill badge in all HTML templates

## session-report 1.1.0 — 2026-06-04

- feat: add cost estimation to session-report

## session-report 1.0.1 — 2026-06-04

- feat: apply Terminus Portal design system to all HTML templates
- fix: session-report codex analyzer script

## session-report 1.0.0 — 2026-06-04

- feat: add session-report plugin to marketplace and dist

## session-handoff 1.3.0 — 2026-06-04

- fix: Codex detection in session-report and bump plugin versions
- refactor: replace macOS dot chrome with pill badge in all HTML templates

## session-handoff 1.2.1 — 2026-06-04

- feat: apply Terminus Portal design system to all HTML templates

## condux 1.1.0 — 2026-06-04

- fix: Codex detection in session-report and bump plugin versions
- refactor: replace macOS dot chrome with pill badge in all HTML templates

## condux 1.0.1 — 2026-06-04

- feat: apply Terminus Portal design system to all HTML templates
- fix: resolve condux plugin install failures in Codex and Claude

## condux 1.0.0 — 2026-06-04

- feat: add condux plugin with agents, fix manifest issues, restyle HTML templates

## session-handoff 1.2.0 — 2026-05-28

- feat: add .claude-plugin/plugin.json to all dist plugins
- feat: enrich Codex plugin.json manifests and add root aggregate plugin
- feat: add HTML handoff format option to session-handoff skill
- fix: add Codex plugin.json to all plugins and document in plugin-foundry
- feat: add plugin-foundry skill and attribute session-handoff to softaworks
- refactor: make session-handoff tool-agnostic
- refactor: remove project-specific references from session-handoff skill
- feat: add session-handoff skill

## adapting-skills 1.2.0 — 2026-05-28

- feat: add .claude-plugin/plugin.json to all dist plugins
- feat: enrich Codex plugin.json manifests and add root aggregate plugin
- fix: add Codex plugin.json to all plugins and document in plugin-foundry
- feat: add adapting-skills profile skill
