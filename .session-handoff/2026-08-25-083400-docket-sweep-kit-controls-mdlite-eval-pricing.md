---
created: 2026-08-25 08:34:00
branch: main
repo: agentic-toolkit (repo root)
task: clear the committed docket — #52, #51-followup, #40, #41, #43, #14
continues-from: 2026-08-24-100659-docket-47-surface-kit-quirks-rail-bug.md
workstream: docket-sweep-and-research-pricing
---

## Immediate next steps

<!-- Ordered and specific. "Fix auth" is not acceptable. -->

1. **Nothing is in flight.** `main` is clean at `10655fe`, 348/348 green, zero open
   PRs, every merged version tagged and released. This is a clean stopping point —
   start the next session by picking an item, not by finishing one.
2. **Docket #53** (`docket/DOCKET.md`, Someday) — add a per-case optional
   `disallowed: ["skill-a"]` to `skills/*/evals/trigger_eval.json`, scored by
   `scripts/eval-triggers.mjs` alongside `expected_skill`. This is the one portable
   finding salvaged from #14 and the cheap version of #10's question. Decide when
   picked up whether a violation is a hard fail or a separate metric — it changes
   what A3's ~89–92% band means, and that band is the number the campaign is judged
   on.
3. **Docket #10** — reopen A4 collision detection semantically. Wants its own
   session. Blocked on one upfront decision the item names: does the accept-list
   live in GitHub issues (upstream's model, needs issue read access) or in-repo as
   the existing registry in `scripts/collision-scan.mjs` (our model, no egress,
   needs a review ritual). Decide that before building anything.
4. **Docket #54** — re-run #14's 12-case probe on Sonnet (~$0.30). Only tightens an
   already-honest record; A3b states the Haiku-only limitation in its own text.
5. **Docket #7** — not actionable. Declined, re-check on trigger, not on schedule.

## Blockers

<!-- .kit-empty: nothing stuck at handoff time -->
None. Nothing half-finished, nothing awaiting review, nothing uncommitted.

## Current State Summary

Cleared four committed docket items and the one loose follow-up, across five merged
PRs (#110, #112, #113, #114, plus the changesets bot's #111) and one direct-to-main
commit. #52 (plan-review's `?` button) turned out to be a kit-wide backwards default
rather than a plan-review quirk, and was fixed at the root. #51's follow-up became a
Q-citation guard in `durable-citations.test.mjs`. #40 and #41 were resolved together
after an audit showed both premises were stale in opposite directions — #41 was
already fixed, and #40's install had moved from repo-local to global. #43 gave mdLite
pipe-table support plus the board's first table CSS. #14 was priced and **declined**,
with the going-in hypothesis falsified by a $0.35 probe. Two new items filed (#53,
#54) from findings that had no home. Six plugin releases shipped: condux 2.21.1,
session-handoff 1.9.1, session-report 1.11.1, docket 0.11.0, toolkit-ops 1.7.7, npm
`@jabworks/condux` 0.14.1. Docket is down to four items, none committed.

## Stack snapshot

- **Package / app:** repo root (`jabworks/agentic-toolkit` — a skills toolkit, not an
  app with a dev server)
- **Layer:** Tooling / docs / research
- **Docker Compose:** N/A
- **Dev server:** N/A. Two surfaces were driven live this session and both are
  stopped: `annotate-server.js` (ports 7801/7802, killed) and the MCP-managed Chrome
  (`~/.cache/chrome-devtools-mcp/chrome-profile`)
- **DB migrations in flight:** none

## Architecture context

### Critical files

| File | Why it matters |
|---|---|
| `scripts/tokens/kit.css:196-202` | `.kit-controls > .kit-theme` is now `flex: none`. Growth is **opt-in** — a host that wants the group to fill its row says so itself. Read the comment before changing it back |
| `specs/surface-kit/style-guide.html:~549` | The only opt-in consumer: `.kit-controls > .themebar { flex: 1 1 auto }`. The `.kit-controls >` prefix is load-bearing (0,2,0 vs the kit's 0,2,0, source order decides). Sits **outside** the kit region, which ends at line 477 — `check-tokens.mjs --fix` would wipe it otherwise |
| `skills/record/server/docket-render.mjs` (`tableBlock`, `cellsOf`, `TABLE_DELIM`) | mdLite's table support. Detection is **lookahead**, not buffering — see Important context |
| `skills/record/server/board-shell.html` (`.tbl` block, after `ul{padding-left:1.2rem}`) | The board's first table CSS. Wrapper scrolls so a ~450px card never stretches |
| `tests/durable-citations.test.mjs` | Now guards two rot classes: path citations into gitignored working state (#34) and `Q<n>` citations with no matching quirk heading (#51) |
| `skills/toolkit-research-frontier/references/health-campaign.md` (A3b) | The #14 write-up — vally unnecessary, $0.027/run measured, corpus not portable, and the failed hypothesis recorded on purpose |
| `~/.agents/retired-skills-2026-08-25.tar.gz` | 520K, 13 skills. **The only copy** of `gpt-taste` and `ui-ux-pro-max` — no known reinstall source. Do not delete casually |

### Key discoveries

- **Four of five items were mis-scoped in their own filing, the same way each time:
  the filed description was the symptom.** #52 read as a plan-review CSS quirk and
  was a kit-wide default. #41 was already fixed *and* wrong about why. #43 scoped a
  parser and also needed CSS the board never had. #14's stated experiment was
  uninterpretable as designed. Re-ground a docket item against reality before
  working it — several were filed weeks earlier.
- **The `local-hooks.test.mjs` failure was never "pre-existing and unrelated".** Two
  sessions wrote it off. It was a stale pre-commit hook, cleared by
  `bash scripts/install-hooks.sh`. Suspect the cheap fix before discounting a
  failure as background noise.
- **A real-content render is not a test.** mdLite's first implementation split a
  paragraph containing pipes into two. The dogfood board rendered perfectly, because
  no real item has that shape. Only a test asserting the *old* behaviour caught it.
- **Skill activation is directly observable** in `claude -p --output-format
  stream-json` as a `Skill` tool_use block, with `result` carrying
  `total_cost_usd` / `duration_ms` / `num_turns` / `usage`. That is the whole of what
  vally's grader needed, which is why #14 declined the dependency.
- **This shell is zsh, which does not word-split unquoted variables.** A `for s in
  $LIST` loop silently treats the list as one word. It hit a dry run this session; in
  an `rm` loop it would have failed silently and looked like success. Use
  `bash -c '...'` for word-splitting loops.

## Completed work

### Tasks finished

- [x] docket #52 — `.kit-controls > .kit-theme` → `flex: none` in `kit.css`, guide
      opts back in, plan-review's rail margin moved to `.kit-controls`; propagated to
      4 surfaces + the guide; 4 plugin bumps — PR #110, merged
- [x] docket #51 follow-up — Q-citation guard in `durable-citations.test.mjs`, with
      range expansion, cross-spec qualifiers, prose-heading exemption and a
      quarter-vs-quirk rule; 4 mutations verified — PR #112, merged
- [x] docket #41 — audited; **already resolved** (0 dangling links, 18 populated
      targets); removed the orphaned `tech-spec` — direct commit `a103ae6`
- [x] docket #40 — retired 12 third-party skills (not 10) globally, backed up first
      — same commit
- [x] docket #43 — mdLite pipe tables + board table CSS + the first mdLite tests;
      docket 0.10.3 → **0.11.0** (minor: new block type) — PR #113, merged
- [x] docket #14 — priced and **declined**; recorded as A3b; ~$0.40 spent — PR #114,
      merged
- [x] Filed #53 (`disallowed` primitive) and #54 (Sonnet re-check)
- [x] Cleared the stale `local-hooks` failure — suite is 348/348 for the first time
      in several sessions

### Files modified

| File | Change | Why |
|---|---|---|
| `scripts/tokens/kit.css` | `flex: 1 1 auto` → `flex: none`, comment rewritten | docket #52 root cause |
| `specs/surface-kit/style-guide.html` | `.kit-controls > .themebar` opt-in | preserve the one host that wants growth |
| `skills/plan-review/references/plan-review-template.html` | rail margin `.kit-theme` → `.kit-controls` | flex centres the margin box (~6px skew) |
| `skills/{session-handoff,session-report}/…`, `skills/record/server/board-shell.html` | kit region propagated | byte change only, visually inert |
| `specs/surface-kit/{quirks.md,index.md}` | Q26 + changelog | #52 mechanism recorded |
| `tests/durable-citations.test.mjs` | +2 tests, +helpers | #51 follow-up |
| `CLAUDE.md` | documented `durable-citations.test.mjs` | it was never in the test list |
| `skills/record/server/docket-render.mjs` | `tableBlock`, `cellsOf`, `TABLE_DELIM`, lookahead in `mdBlocks` | #43 |
| `skills/record/server/board-shell.html` | `.tbl` styling | #43 — board had no table CSS |
| `tests/docket-cli.test.mjs` | +3 mdLite tests | first ever mdLite coverage |
| `specs/docket/{quirks.md,index.md}` | table decisions recorded | #43 |
| `skills/toolkit-research-frontier/references/health-campaign.md` | A3b section | #14 |
| `docket/DOCKET.md`, `docket/archive/2026.md`, `docket/docket.json` | 5 closes, 2 adds, #43 title stamp fixed | bookkeeping |

## Decisions made

| Decision | Options considered | Chosen | Rationale |
|---|---|---|---|
| Fix #52 at the kit default vs a plan-review-local override | local override (SMALL) vs kit default (MEDIUM, 4 plugins) | kit default | The local fix works and leaves the trap armed for the next block-flow host. Only consumer of the stretch was a spec artifact opting in via its own class |
| #43: parser vs list convention | convention vs ~25-line parser | parser | 8 of 9 tables are in the **archive** — a convention means rewriting the record of closed work |
| docket 0.11.0 (minor) not 0.10.4 | patch vs minor | minor | change-control: "patch, minor if new capability". mdLite gained a block type |
| Q-citation guard is one-directional | citation→heading only vs both | one-directional | Q3/Q4 are uncited and legitimately so. The reverse fails on day one or grandfathers exceptions |
| Guard lives in `durable-citations.test.mjs` | new file vs extend | extend | Same rot family (#34), reuses the spec-tree walk |
| #14 declined without buying vally | adopt vally vs reimplement vs decline | decline | The signal is already in `claude -p` output; the corpus is the blocker, not the grader |
| Retire all 12 taste skills globally | keep some + fork triggers vs retire all | retire all | None fired in ~2 months; keeping any means forking to write a trigger contract. Backed up first |

## Important context

<!-- MUST READ. Things the next agent gets wrong without knowing this. -->

- **mdLite's table detection is lookahead by necessity, not preference.** The first
  implementation buffered pipe lines and emitted the not-a-table fallback as its own
  block, which split a paragraph merely *containing* pipes into two. If you refactor
  it back to buffering, that regression returns and **no real docket content will
  show it** — only `tests/docket-cli.test.mjs`'s "leaves pipe text that is not a
  table alone" case.
- **`data-search` on a docket card carries the RAW body**, delimiter rows included —
  deliberately, so search matches what the author typed. Any "this must not appear in
  the output" assertion has to strip `data-search="…"` first or it reads its own
  search index back. Two of my tests failed on exactly this.
- **The pre-commit hook auto-stages all of `dist/` from the working tree, not the
  index.** Splitting a mixed tree into separate commits needs the other concern
  stashed out first. Verify with `git show --stat` immediately after any split
  commit. (Carried forward from the previous handoff; still true, and the hook is now
  freshly installed so it also gates frontmatter and token cores.)
- **`~/.claude/skills` now holds exactly 5 symlinks**, all resolving, 1:1 with
  `~/.agents/skills`. If a skill seems missing globally it was retired on purpose
  (docket #40) — restore from `~/.agents/retired-skills-2026-08-25.tar.gz` rather
  than reinstalling from upstream, since two of them have no known source.
- **A3's ~89–92% band is the number the health campaign is judged on.** Docket #53
  changes what that band means if a `disallowed` violation is scored as a hard fail.
  Decide that explicitly rather than by implementation accident.
- **`skills/toolkit-research-frontier/references/` ships inside toolkit-ops.** Editing
  it is a skill edit — it needs `bash scripts/sync.sh` and a plugin version bump, or
  `dist-mirror`/`cursor-dist`/`opencode-dist` fail. Caught me once this session.

## Deferred / out of scope

- **Single quotes in frontmatter** on the two surviving global skills
  (`~/.agents/skills/adapting-skills`, `migrate-oxlint`) — the class this repo bans
  first-party because Codex's parser rejects it. Noted in #41's close note,
  deliberately **not filed**: they are third-party copies outside this repo's
  governance, and the user chose not to track it.
- **session-handoff and session-report were never rendered** during #52's live
  verification — both need a real transcript. The docket board was used as the
  empirical stand-in for that host shape. Stated in the PR and the verification
  report rather than counted as verified.
- **`plan-review-direction-d.html` and the other signed-off specimens still carry the
  old `flex: 1 1 auto`** — they are frozen snapshots outside `DOC_SURFACES`, so
  `check-tokens.mjs` does not touch them. Correct, but it means the specimen still
  shows the #52 bug.
- **#52's verification evidence** lives in `.condux/verification/2026-08-25-docket-52-kit-controls/`
  (6 screenshots + report). Gitignored — promote it into `specs/` before citing it
  from anything committed.
