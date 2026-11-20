---
created: 2026-11-20 10:34:36
branch: main
repo: jabworks/agentic-toolkit (skills/workflow/hooks/mod, skills/record/pane)
task: mod-motion-shipped — /condux board and /docket pane chrome + micro-interactions shipped, released and installed on both hosts
continues-from: none
workstream: mod-surfaces
---

## Immediate next steps

1. **Look at the release in the desktop app.** Quit and reopen Claude desktop, start a NEW session (the 2026-11-20 session ran session-scoped dev copies from `~/.claude/dev-mods/90eeef2c-…/`, not the install). Open `/condux` and `/docket` and check:
   - the spinning blue arc on the worked task (`skills/workflow/hooks/mod/board/glyph-svg.ts:64`);
   - solid section tags in status/bar colour;
   - chart focus-dim on hover (`skills/record/pane/hooks/charts.ts`, `focusDim`);
   - the chevron turn on expand/collapse.

   Check once in a WSL session and once in a native Windows session, since both installs were updated separately.
2. **Decide on the remote branch.** `origin/feat/mod-motion` still exists (PR #215 is squash-merged as `b807493`). Delete it via the PR's "Delete branch" button or `git push origin --delete feat/mod-motion`. It was left alone deliberately because only local cleanup was asked for.
3. **Decide on the two stray working-tree changes on `main`:**
   - `AGENTS.md` is untracked. It is a 269-line Codex-flavoured copy of CLAUDE.md, origin unknown to this session, so ask Harvey before committing or deleting it.
   - ` D .session-handoff/2026-09-25-183312-mobile-track-89-next.md` is an uncommitted deletion of a tracked handoff. Commit it with `git rm` (direct to main, per the handoff convention) if Harvey agrees it is spent.
4. **Optional:** stale local branches `feat/89-live-verification-native`, `feat/session-report-store`, `feat/usage-trace`, `fix/codex-when-to-use-fold`. Check with `git branch --merged main` before deleting any.
5. The separate usage-telemetry workstream is still open in `.session-handoff/2026-11-03-070256-usage-trace-codex-check-on-laptop.md` (work-laptop Codex check, Tasks 11–12). This handoff does not supersede it.

## Blockers

Nothing blocks work. Step 1 needs a person at the desktop app, because the mod surfaces can't be seen from a headless session.

## Current State Summary

PR #215 merged to `main` as `b807493`, and CI, Release and Plugin Release all passed. That released condux 2.43.0 and docket 0.13.0, each tagged `<plugin>--v<version>` with a GitHub release; the npm channel needed no changeset because `packages/condux-opencode` was untouched.

The PR gave both mods:
- even padding;
- a solid neutral rule and pane border;
- equal-width rows that cut long titles with an ellipsis;
- right-aligned ages;
- blue for in-progress;
- solid section tags;
- checklist-style task glyphs drawn as SVG, with a spinner;
- hover dimming on the charts;
- a chevron that turns;
- a count pop with no overshoot;
- graph edges that draw in, with hover focus.

Installed on both Claude installs:

| Install | condux | docket | usage-trace | session-report |
|---|---|---|---|---|
| WSL `~/.claude` | 2.43.0 | 0.13.0 | 0.1.1 | 1.13.1 |
| Windows `C:\Users\hieu1\.claude` (via `/mnt/c/Users/hieu1/.local/bin/claude.exe`) | 2.43.0 | 0.13.0 | 0.1.1 (was 0.1.0) | 1.13.1 (was 1.12.0) |

Checks on both installs: `claude plugin validate` passes, and `claude plugin list` shows the new versions. On the WSL installed copies, `claude plugin test` passes (condux 232/232, docket 138/138).

The local feature branches for this work are deleted.

## Stack snapshot

- **Package / app:** `dist/plugins/condux`, `dist/plugins/docket` (Claude Code mods)
- **Layer:** Frontend (Claude Code mod surfaces: terminal + desktop)
- **Docker Compose:** N/A
- **Dev server:** N/A
- **DB migrations in flight:** none

## Architecture context

### Critical files

| File | Why it matters |
|---|---|
| `skills/record/pane/hooks/charts.ts` | Shared drawing kit: colour tokens, `pillSvg`, `ruleSvg`, `chevronSvg`, `focusDim`, `motionStyle`. Must stay byte-identical with `skills/workflow/hooks/mod/kit/charts.ts` |
| `skills/workflow/hooks/mod/board/glyph-svg.ts` | Desktop task glyphs (filled check, spinning arc, dashed rings), with alts like `Task 2: under way` that tests read |
| `skills/workflow/hooks/mod/board/board.tsx` | condux board: sections, plan rows, task rows, the `turned` set for chevron turn-back |
| `skills/record/pane/hooks/register.tsx` | docket pane: item rows (chevron / id / grow button / age columns) |
| `specs/condux-mod/quirks.md` | Q18–Q19: desktop paint and motion facts |
| `specs/docket/quirks.md` | Q13–Q14: same facts for docket |

### Key discoveries

These desktop limits were found live and are recorded in the quirks:
- Only an interactive `Svg` runs CSS animation or `:hover`. Boxes and Buttons never animate.
- A row `Box`'s `hover` never paints on the desktop; only a `Button`'s does.
- A `Button` can't be widened, so equal-width rows put it in a `flexGrow` column with a `wrap='truncate-end'` Text.
- A JS-staged reveal using `$.clock.after` steps redraws the whole pane at every step and read as lag, so expand/collapse has no motion beyond the chevron.
- SVG scale overshoot is clipped at the drawing's bounds, so pops end at scale 1 with no bounce.

## Completed work

### Tasks finished

- [x] Chrome round, motion round and checklist glyphs: PR #215, squash-merged as `b807493`.
- [x] Reordered the branch so the version bump is the last commit touching `dist/`, then regenerated `CHANGELOG.md`.
- [x] Fixed CI's release dry run: `scripts/validate-plugins.sh` now knows the `surface modules:` report line.
- [x] Released condux 2.43.0 and docket 0.13.0.
- [x] Installed condux and docket on WSL and Windows; brought usage-trace and session-report up to date on Windows.
- [x] Deleted the local branches `feat/mod-motion` and `backup/mod-motion-pre-reorder`.

### Files modified

| File | Change | Why |
|---|---|---|
| (all in PR #215) | see `git show b807493 --stat` | Shipped feature |
| `~/.claude/plugins/*`, `C:\Users\hieu1\.claude\plugins\*` | plugin updates | Install the release |

## Decisions made

| Decision | Options considered | Chosen | Rationale |
|---|---|---|---|
| Expand/collapse motion | staged JS reveal vs. chevron only | Chevron only | The staged reveal redraws the whole pane per step, so it lagged on the desktop (Harvey: "too laggy") |
| Pill pop | spring overshoot vs. plain ease | No overshoot | The overshoot was clipped by the Svg bounds |
| Remote branch | delete with the local branches vs. keep | Kept | Only local cleanup was asked for, and auto mode blocked the combined command |

## Important context

- Mods can't read light or dark mode, so the colours are low-alpha neutral greys (`#8a8a85` + alpha). Dark mode was checked from Harvey's screenshots. Don't add colours that only work in one scheme.
- `claude plugin list` warns that the copies of `condux@synced` and `docket@synced` from claude.ai are "not loaded". That's expected: the locally installed copies take precedence.
- When refreshing session dev-mod copies, use `rsync -a --exclude tsconfig.json --exclude '/.claude-plugin/types'`. The anchored exclude matters, because a bare `--exclude types` also drops each mod's own state contract.
- The version bump must be the LAST commit touching `dist/plugins/<plugin>/`, or `--write-changelog` credits the commits after it to the next version.

## Deferred / out of scope

- The H1 routing wrapper and H7 agent examples are still held for an eval A/B (from the mobile track, not this session).
