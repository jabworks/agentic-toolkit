---
created: 2026-11-03 07:02:56
branch: main
repo: jabworks/agentic-toolkit (skills/usage-trace, skills/session-report)
task: usage-trace-codex-check-on-laptop — period comparison shipped; confirm usage-trace capture on Codex from the work laptop
continues-from: 2026-10-30-175139-usage-trace-task-9-merged.md
workstream: usage-telemetry
---

## Immediate next steps

1. **Pull and set up the laptop clone.** `git pull` on `main` (head `9e0c05f` or later), then `pnpm install` and `bash scripts/install-hooks.sh`. Note: `.condux/` is gitignored and does not travel, so the plan file `.condux/plans/2026-10-30-usage-telemetry.md` is NOT on the laptop. The Task 11 and 12 cards are copied under "Remaining plan" below.
2. **Install usage-trace on Codex** and confirm the hook fires:
   ```bash
   codex plugin marketplace add jabworks/agentic-toolkit
   codex plugin add usage-trace@jabworks-agentic-toolkit
   ```
   Start a Codex session and send one prompt. The `SessionStart` hook runs `${PLUGIN_ROOT}/skills/usage-trace/hooks/session-start.mjs` (from `dist/plugins/usage-trace/hooks/codex-hooks.json`), which spawns a detached `ingest`. It prints nothing, so verify through the store, not the console.
3. **Check capture with the CLI** (find it with `find ~/.codex -name usage-trace.mjs`):
   ```bash
   node <path>/skills/usage-trace/bin/usage-trace.mjs status
   ```
   Pass: `last_run` is recent with 0 failures, and `grep -c '"host":"codex"'` over the month file in `~/.usage-trace/events/` (use `zcat` for `.gz` months) is non-zero. Codex limit fields can be empty, so "no limit data" is a valid result and not a failure (SKILL.md rule 3).
4. **If the hook does not fire**, suspect hook loading before the plugin: Codex picks its loader by root `plugin.json` presence, and usage-trace ships hooks, so it must have no root `plugin.json` (`agent-plugins.test.mjs` asserts this). Upstream `openai/codex#39895` is open. Debug through the script body, not the command string. Also check the Codex hooks setting in `~/.codex/config.toml`.
5. **Chase the Codex human-message zero.** On the WSL machine the Codex report shows `human msgs: 0` for the last 28 days on BOTH sources (store and transcripts), with or without `--compare`. The store holds only 50 Codex `turn` events in total (the sample I saw dates to 2026-09-24), against 37,562 `api_call` events. `parse-codex.mjs:119` emits a `turn` only for `event_msg` records with `payload.type === 'user_message'`, so recent Codex rollouts probably carry the prompt in a different record. On the laptop, list the record types in a fresh rollout under `~/.codex/sessions/` (for example `grep -o '"payload":{"type":"[a-z_]*"'`) and find where the user's prompt lives. Fix `skills/usage-trace/lib/parse-codex.mjs` and the transcript path in `skills/session-report/analyze-codex.mjs:extractText`, then file or close a docket item for it.
6. **Render a real report from store data** (never done): update the session-report plugin to 1.13.0 (`/plugin`), run it with `--compare weekly`, and open the HTML. A headless render of the new section passed with no console errors, but nobody has looked at it as a person.
7. After that, **Task 11** (outcomes enrichment), then **Task 12** (remaining report views, limit burn first). Both cards are below.

## Blockers

Nothing blocks work. Step 3 depends on the laptop having Codex and network access to the marketplace.

## Current State Summary

Plan Task 10 (period comparison) shipped as PR #211 (session-report 1.13.0, release `session-report--v1.13.0` published), with follow-up docs in #212 (catalog blurbs) and #213 (README: flagship badges for condux, docket and usage-trace, routing badge refreshed to 93.1% ± 0.2pp from `eval-remember-seam-2026-08-26.md`, new Usage-trace section). `main` is at `9e0c05f` with 623 tests passing. `--compare weekly|<N>d|<N>h` (plus `--periods N` and `--compare-end <ISO>`) works in both analyzers from the store or transcripts; on the WSL store it agreed with transcripts to about 0.1–1% on tokens and cost. Codex capture on the work laptop has not been verified, which is the point of this handoff.

## Stack snapshot

- **Package / app:** `skills/usage-trace`, `skills/session-report`
- **Layer:** Tooling
- **Docker Compose:** N/A
- **Dev server:** not running
- **DB migrations in flight:** none

## Architecture context

### Critical files

| File | Why it matters |
|---|---|
| `skills/session-report/lib/periods.mjs` | Window building, `periodAt` bucketing, `summarizePeriods` (partial rule), text table, flag validation |
| `skills/session-report/lib/read-store.mjs` | `earliestTs` feeds `coverage.earliest`; `applyStoreEvents` takes a `periodAt` callback |
| `skills/session-report/analyze-claude.mjs`, `analyze-codex.mjs` | Push each call's period bucket into the same `targets` list as the overall bucket, so a period gets every overall figure |
| `skills/usage-trace/lib/parse-codex.mjs:119` | Only `user_message` becomes a `turn`; suspect for the Codex zero |
| `dist/plugins/usage-trace/hooks/codex-hooks.json` | The Codex `SessionStart` hook that must fire on the laptop |
| `tests/session-report-store.test.mjs` | Period tests anchor on `--compare-end` so none depends on today's date |
| `specs/usage-telemetry/` | Spec; `index.md` changelog is current through PR #211, status still `draft` |

### Key discoveries

- A live shields.io badge cannot show a plugin name as the label and the bare version as the value: it shows the whole release name or tag, and both carry the plugin prefix. Release titles are already clean (`condux v2.42.3`), so the badges filter on the release name with `display_name=release` and an empty label. A two-tone badge would need versions generated in sync from `plugin.json`; Harvey chose to keep single-colour.
- `coverage.earliest` is read from the store ignoring `--since`; for transcripts the earliest timestamp is read before the `--since` cut. Without that, a window's oldest period would always read as partial.
- `--compare` widens `--since` to cover every period, so a narrower `--since` cannot cut one short.
- WSL store, last 4 weeks: tokens 5.30B / 8.94B / 5.24B / 6.98B for the weeks starting 10-04 / 10-11 / 10-18 / 10-25.

## Completed work

### Tasks finished

- [x] Plan Task 10: period comparison (PR #211)
- [x] Docs for the new plugin pair (#212, #213)
- [x] Three merged local branches deleted

### Files modified

| File | Change | Why |
|---|---|---|
| `skills/session-report/lib/periods.mjs` | New | Shared period logic for both analyzers |
| `skills/session-report/analyze-claude.mjs`, `analyze-codex.mjs`, `lib/read-store.mjs` | `--compare` hooks | Bucket calls, active time, messages and breaks per period |
| `skills/session-report/template.html`, `SKILL.md` | "period comparison" section, flags documented | The section removes itself when the JSON has no `periods` |
| `tests/session-report-surface.test.mjs` | `SECTION_ORDER` gained "period comparison" | The D9 order guard otherwise fails |
| `scripts/supply-chain-allowlist.json` | `lib/periods.mjs` entry | Required by the supply-chain checker |
| `README.md`, `plugins/*/README.md`, `composition.json`, `specs/usage-telemetry/index.md` | Docs and badges | #212, #213 |

## Decisions made

| Decision | Options considered | Chosen | Rationale |
|---|---|---|---|
| Window shape | Calendar weeks vs trailing windows | Trailing windows ending now | Unambiguous and the same for any width; `--compare-end` moves the anchor |
| Partial period | Flag on empty vs flag when data starts after the window start | Data starts after window start | Matches the plan card: earliest data falls inside it |
| Test clock | Real `Date.now()` vs a flag | `--compare-end <ISO>` | Also useful for comparing past weeks |
| Badge fix | Generate in sync vs single colour | Single colour | Harvey's call; generator change not worth it |
| usage-trace version | Bump for the README change vs leave | Left at 0.1.0 | Docs only; installed copies get the README at the next release |

## Important context

- Handoffs are committed to `main` with `git add -f` and no PR, for cross-machine resume. This one is committed that way.
- `.condux/` is gitignored working state, so plans, ledgers and scratch do not reach the laptop.
- The app cannot bind this repo's PRs to a session. Read CI with `gh pr checks <n>` or `gh run list`.
- Tests and manual runs that touch the store must use a temporary store, never the real wrapper or `~/.usage-trace`.
- The laptop's store is separate from the WSL machine's. The laptop starts with its own backfill, and numbers will not match WSL.
- Commit with `-s`, no `Co-Authored-By`, and keep the version bump as the last commit touching `dist/plugins/<plugin>/`.

## Remaining plan

**Task 11: Outcomes enrichment.** Add opt-in `usage-trace outcomes --gh`, which fetches merge state, CI result, time to merge and revert PRs for recorded PRs and stores only derived values under the hashed PR id. Files: create `skills/usage-trace/lib/outcomes.mjs` and `tests/usage-trace-outcomes.test.mjs`; modify `skills/usage-trace/bin/usage-trace.mjs` and `specs/usage-telemetry/fields.md`. Produces `outcome` events `{ pr, merged, ci, merge_ms, reverted }`. Gotchas: the store holds only hashes, so the command rereads `pr-link` records from transcripts that still exist (pruned PRs stay unenriched, so enrich soon after the fact); a `gh` failure or missing auth skips that PR and is counted in `status`; never run it from the hook, since it uses the network.

**Task 12: Remaining report views.** Add limit burn vs work, workflow payoff, friction, time and habits, context pressure, rework, routing, effort and model fit, and coverage views, each hidden when its data is absent, plus matching checks in the `SKILL.md` optimization checklist. Files: `skills/session-report/lib/read-store.mjs`, `template.html`, `SKILL.md`, `tests/session-report-store.test.mjs`, `specs/usage-telemetry/index.md`. Produces report JSON `limit_burn`, `payoff`, `friction`, `habits`, `context`, `rework`, `routing`, `model_fit`, `coverage`. Gotchas: limit burn is account level only, and a jump with no local usage is shown as such (quirk Q2); routing can report which skill fired and turns with none, but whether it was the right skill needs an oracle, so that goes to the PRD's open questions; each view can ship as its own PR, limit burn first; run the `dataviz` skill before writing any chart.

## Deferred / out of scope

- `cleanupPeriodDays` is still unset and awaits Harvey's decision. Prompt text exists only in transcripts, so raising it is recommended.
- The plugin is not installed on the Windows side (`C:\Users\hieu1\.claude`), so Windows-hosted sessions are not captured.
- The store has 809 distinct project hashes, probably temp directories from test runs. Unconfirmed; check before building project views.
- Real price history: no dated price changes have been entered; every model has a placeholder 2020-01-01 entry.
- Codex store vs transcripts still differ in session count (62 vs 49 over 28 days) and subagent tokens. Unresolved.
- Local branches `feat/89-live-verification-native`, `feat/session-report-store`, `feat/usage-trace` and `fix/codex-when-to-use-fold` look merged but were not checked.
- The unstaged deletion of `.session-handoff/2026-09-25-183312-mobile-track-89-next.md` is an old tracked handoff; it is left out of this commit.
