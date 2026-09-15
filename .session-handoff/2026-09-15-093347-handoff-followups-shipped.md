---
created: 2026-09-15 09:33:47
branch: main
repo: jabworks/agentic-toolkit (root)
task: handoff-followups-shipped
continues-from: 2026-09-11-042200-visual-language-shipped.md (pruned in the same commit — resumed 2026-09-11, everything it listed is shipped or carried below)
workstream: blueprint-diagram-kit → repo hygiene → trigger-reliability
---

## Immediate next steps

1. **Codex trigger check for the visual language** (parked by Harvey 2026-09-11 and 2026-09-14 — do not start it unasked). When he says go: upgrade his Codex first (`codex plugin marketplace upgrade jabworks-agentic-toolkit && codex plugin add condux@jabworks-agentic-toolkit`; it is on 2.30.0, marketplace is 2.31.1), then rerun the 2026-09-10 recipe in `specs/blueprint/verification/2026-09-10-codex-trigger-check/report.md` (prompt, flags, scoring; `codex exec --json --sandbox workspace-write -c approval_policy="never" -C <dir> - < prompt.txt`, a fresh synthetic nine-service project per trial, three trials) and score four new things: role tints on every node (`fill-opacity="0.10"`), `<use href="#mark-…">` on stores/externals, an HTML `.legend` under the svg, a tinted title strip per boundary. Record under `specs/blueprint/verification/2026-09-11-codex-visual-language/` (or the date it runs). A miss is a kit-wording fix in `skills/blueprint/references/diagram-kit.md` → `## Visual Language`, not a checker fix.
2. **Period-3 re-measure for #67 (and #65)** — only when in-scope sessions approach period 2's 113 (roughly November 2026 at the current rate; 30 in-scope Claude sessions and zero in-scope Codex as of 2026-09-14). Re-run the period-2 miner, which lives in local scratch under `.condux/scratch/period2-digests/` (edit its `FROM`/`TO` window), under D5's corpus rules in `specs/trigger-reliability/decisions.md` (never read maestro-api-gateway, vedge-ui-v2, axon-*, lightweight-bff; exclude `-tmp` and `foundry-codex-eval-*` harness sessions). Baseline and method: `specs/trigger-reliability/period-2-report.md`. Write `period-3-report.md` beside it. The verdict is Harvey's judgement, never a threshold — `memory-stack-decision.md` → "Criterion voided" says why.
3. **Two decisions that are Harvey's, not the next agent's:** (a) the four real upstream-system names still exist in git history from before the 2026-09-11 resanitize of `specs/blueprint/verification/2026-09-08-routing-gate/` — only a history rewrite removes them; (b) whether to keep the third-party `remember` plugin (#67) once period 3 is in. Raise them only if he brings them up.
4. **#82, #75, #79 wait for a real case.** Do not pre-empt.

## Blockers

| Blocker | Context | Workaround tried |
|---|---|---|
| none | — | — |

## Current State Summary

Four PRs landed this session, all squash-merged by the agent on Harvey's instruction: PR #157 (resanitized the 2026-09-08 specimen; closed #80 with the `**Commit:** PR #N` convention and #81 with the task-brief heading fix; condux 2.31.1 tagged and released), PR #158 (Version Packages → `@jabworks/condux` 0.24.1 on npm, confirmed), PR #159 (the citation guard now covers every markdown file under `specs/`, with `owner/repo@hash` and `owner/repo#N` as the recognised foreign forms; it caught surface-kit citing never-merged PR #93 and cursor-channel citing a skills-CLI PR as if ours), and PR #160 (a status block under #67 recording that period 3 is not yet mineable like-for-like; Harvey chose to wait). Main is clean at the #160 squash; no branches, no open PRs, no servers running. Suite 524 green at every merge.

## Stack snapshot

- **Package / app:** repo root (skills/, dist/, specs/, tests/, docket/) + `packages/condux-opencode`
- **Layer:** Tooling
- **Docker Compose:** N/A
- **Dev server:** not running
- **DB migrations in flight:** none

## Architecture context

### Critical files

| File | Why it matters |
|---|---|
| `tests/durable-citations.test.mjs` | the #80 guard: every `specs/**/*.md` — a `**Commit:**` line opens with `PR #N` or a hash on origin/main; prose hashes (letter+digit, not `@`-prefixed) must be ancestors of main; `PR #N` must be merged (squash subject ends `(#N)`) or newer than every merged PR. `readStamp` / `prProblem` are exported and unit-tested |
| `tests/diagram-check.test.mjs` → `FORBIDDEN` / `phrases()` | specimen-hygiene guard by SHA-256 digest over tokens and adjacent-word pairs; scans `tests/fixtures/diagram-check/` and `specs/blueprint/verification/`; three canaries prove each shape fires. Never list a real identifier in plaintext again |
| `skills/subagent-execution/references/task-brief.sh` | reads `^##+ Task N:` and stops at the next card or any `## ` section; `tests/task-brief.test.mjs` pins it against `skills/draft-plan/references/plan-template.md` |
| `skills/technical-spec/references/scaffold.sh` (+ `templates.md`, `SKILL.md`) | writes `**Commit:** PR #pending`; output line is `created:<path> date:<d> commit:PR #pending` (commit moved last because the value has a space); a spec still stamped pending keeps its PR red |
| `docket/DOCKET.md` → #67 status 2026-09-14 | the accumulation numbers and the wait decision — do not re-derive |
| `specs/trigger-reliability/memory-stack-decision.md` | #67's whole decision space; both automatic closing conditions are void, Option B (port with summarization) is all that remains, decided by Harvey on period-3 evidence |
| `scripts/release-plugins.mjs:188` | notes for a version = commits touching `dist/plugins/<plugin>/` from the previous bump to this bump — so the bump commit must come LAST |

### Key discoveries

- The changelog generator attributes commits to the *next* version when they land after the bump commit; the 2.31.1 bump had to be reset and recommitted last. Saved as memory `changelog-bump-ordering`.
- Bot-opened Version Packages PRs never carry CI checks (#154, #156, #158 alike); a watcher that waits for checks on one loops forever.
- Four of the five "rotting" hashes in the trigger-reliability research note were pins into *other* repositories, not rot. The guard could not tell until the `owner/repo@hash` form existed.
- PR #93 shows MERGED on GitHub but its subject never reached main: it merged into the stacked #91 branch and re-landed as #95. "Merged" on GitHub is not "on main".
- The durable-citations guard (#34) applies to docket entries too — a status note citing a file under `.condux/scratch/` failed CI on #160; name the directory, not the file.
- Codex sessions since 2026-08-27 are 54/58 corporate (vedge-ui-v2 42, maestro-api-gateway 9, lightweight-bff 3) and 4 synthetic trial dirs — zero in-scope. Period 3 is Claude-Code-only unless that changes.
- The global `~/.claude/skills/` holds 36 real directories and no symlinks; the memory line about a symlink repair was stale and is corrected.

## Completed work

### Tasks finished

- [x] Resanitized `specs/blueprint/verification/2026-09-08-routing-gate/{routed,as-drawn}.html` (generic twins; checker output byte-identical); guard reshaped to digests and extended to the verification tree (PR #157)
- [x] #81 closed: task-brief.sh heading shapes + test (PR #157, condux 2.31.1)
- [x] #80 closed: `PR #N` stamp convention, guard, two orphaned stamps repaired (blueprint → PR #153 / PR #150, discovery-presentation → PR #120), technical-spec scaffold/templates/SKILL updated (PR #157)
- [x] Version Packages merged → npm 0.24.1 (PR #158)
- [x] Citation guard over the whole spec tree; foreign forms; four real repairs (PR #159)
- [x] #67: accumulation measured, status block written, Harvey chose wait (PR #160)
- [x] Memory index corrected: blueprint-skill "nothing pending", PR #152 merged, trigger-reliability wait target, changelog ordering rule added

### Files modified

| File | Change | Why |
|---|---|---|
| `specs/blueprint/verification/2026-09-08-routing-gate/*.html` | four upstream names → generic twins | Harvey: yes, resanitize |
| `tests/diagram-check.test.mjs` | digest-based hygiene guard, wider scan, canaries | names not committed in plaintext |
| `skills/subagent-execution/references/task-brief.sh` + mirrors, `tests/task-brief.test.mjs` | `^##+ Task N:`, stop at `## ` | #81 |
| `tests/durable-citations.test.mjs` | #80 stamp/hash/PR rules; then whole-tree + foreign forms | #80, PR #159 |
| `skills/technical-spec/{SKILL.md,references/scaffold.sh,references/templates.md}` + mirrors, `tests/scaffold.test.mjs` | `PR #pending` convention | #80 |
| `specs/blueprint/index.md`, `specs/discovery-presentation/index.md` | orphaned stamps → PR numbers | #80 |
| `specs/trigger-reliability/opencode-routing-{research,measurement}.md`, `specs/surface-kit/implementation.md`, `specs/cursor-channel/quirks.md` | foreign pins, PR #149 tip wording, PR #95, vercel-labs/skills#464 | PR #159 |
| `dist/plugins/condux/.{claude,codex}-plugin/plugin.json`, `CHANGELOG.md`, `.changeset/task-brief-heading-shape.md` (consumed by #158), `packages/condux-opencode/*` | 2.31.1 / 0.24.1 | release |
| `docket/DOCKET.md`, `docket/archive/2026.md`, `docket/docket.json` | #80, #81 closed; #67 status block | backlog |

## Decisions made

| Decision | Options considered | Chosen | Rationale |
|---|---|---|---|
| Resanitize the 09-08 specimen | yes · leave and close the question | yes (Harvey) | a corporate repo name in a public repo; the specimen-sanitize rule |
| #80 stamp convention | (a) `PR #N` · (b) hashes + ancestor test + pending fill-in | (a), plus the ancestor rule for prose hashes | the hash is wrong by construction (written before the PR exists); (b) is the shape that orphaned the #73 close |
| Placeholder for a fresh spec | none · `no-git` · `PR #pending` rejected by the test | `PR #pending`, rejected | the pre-commit hook does not run the suite, so the PR's CI goes red until filled — the forcing function lands before merge |
| Foreign citations | exempt list · scope guard to index.md only · a recognisable form | `owner/repo@hash` and `owner/repo#N` | a form is checkable and self-documenting; a list rots |
| #67 next step | wait · thin interim mine · decide the port without data · park | wait (Harvey 2026-09-14) | 30 vs 113 sessions; ~17 resume-shaped turns cannot compare to ~9% |
| Codex trigger check this session | run · skip | skip (Harvey, twice) | his call; recipe preserved in step 1 |

## Important context

- **Spec stamps are `PR #N`, never a hash** (#80). Hashes in spec prose must be on main; a commit in another repo is `owner/repo@hash`; a PR in another repo is `owner/repo#N`. `PR #pending` is what the scaffold writes and the test rejects.
- **Never list a forbidden identifier in plaintext** in `tests/diagram-check.test.mjs` — add its SHA-256 digest to `FORBIDDEN`. The four upstream names survive only in git history before PR #157.
- **Bump last.** In a multi-commit change the `chore(<plugin>): version X.Y.Z` commit must be the final one touching `dist/plugins/<plugin>/`, then `node scripts/release-plugins.mjs --write-changelog`, then commit that with the docket closes. Commit splits after a manual sync use `--no-verify` and add dist mirrors by path (the hook stages all of `dist/`).
- **Any condux skill edit needs a changeset** (`.changeset/*.md`, written directly, `patch` unless a new capability) — the npm channel publishes nothing without one.
- **Standing positions in the docket are not to be re-derived:** the toolkit ships no countermeasure for the suppression class (D2 retired, D7 declined upstream); explicit invocation is the supported path; #67 closes only on Harvey's judgement at period 3.
- **Harvey merges by asking** ("do the merge", "merge the PRs for me"); the agent squash-merges with `gh pr merge --squash --delete-branch`. Version Packages PRs have no checks — merge them once the release workflow on the preceding squash is green.
- **Handoffs are committed to main** for cross-machine resume and pruned in a later commit once consumed; this file replaces the 2026-09-11 one in the same commit.
- Preflight and finalize ran as skills this session (this repo's finalize is `node --test` only; no typecheck/lint/format scripts).

## Deferred / out of scope

- History rewrite to purge the four upstream names — Harvey's call, not raised again unless he does.
- A thin interim period-3 mine — declined 2026-09-14 in favour of waiting.
- Promoting the period-2 miner from local scratch into `specs/trigger-reliability/` (the #34 "promote on cite" shape) — only if a durable doc needs to cite it by file.
- Footprint-changing node shapes for blueprint diagrams; token-core edits — unchanged from the previous handoff, still later/never.
- #74 stays gated off; #65 rides on the same period 3 as #67.
