---
created: 2026-06-30 15:29:04
branch: main
repo: agentic-toolkit (condux bundle — skills/plan-review)
task: plan-review-codex-support-and-toolbar-ui
continues-from: none
workstream: interactive-plan-review
---

## Current State Summary

Extended the `plan-review` skill (part of the `condux` plugin) so it works with
**both Claude Code and Codex**, and reworked its annotation UI. All work is
**committed and pushed** to `main` as `4ad0bfd` (condux bumped to **v1.6.0**).
Working tree is clean except one pre-existing, untouched untracked file
(`skills/skills-overview.md`). Nothing is in flight; the next session's job is to
**test the two hooks against real agents** and adjust if needed.

## Stack snapshot

- **Package / app:** `skills/plan-review/` (source) mirrored to `dist/plugins/condux/skills/condux/plan-review/`
- **Layer:** Tooling (Claude Code / Codex skill + plugin)
- **Docker Compose:** N/A
- **Dev server:** not running — a demo `annotate-server.js` was used during the session and has been stopped
- **DB migrations in flight:** none

## Architecture context

### Critical files

| File | Why it matters |
|---|---|
| `skills/plan-review/references/annotate-server.js` | Local stdlib server. Three modes: `--hook` (Claude ExitPlanMode), `--codex-stop` (Codex Stop), and a file-path manual mode. `resolveDecision()` has per-mode output branches; the bottom dispatch reads stdin and gates Codex on `permission_mode === 'plan'`. `readCodexTranscriptPlan()` is the best-effort fallback. |
| `skills/plan-review/references/plan-review-template.html` | Self-contained review UI. Toolbar logic: `.popover`/`.chip` CSS, and JS `placePopover()` / `openToolbar()` + the `mouseup` listener. `.expanded` class drives the two-step reveal. `.doc { margin: 0 auto }` centers the plan. |
| `skills/plan-review/references/install-codex-hook.sh` | Registers the Codex `Stop` hook in `$CODEX_HOME` + sets `[features] hooks = true`. Idempotent. |
| `dist/plugins/condux/hooks/hooks.json` | Plugin-level Claude Code hook registration (`PreToolUse`/`ExitPlanMode` → `--hook`), auto-discovered on install. |
| `skills/plan-review/SKILL.md` | Skill docs — "Two/Three ways in", review-surface diagram, Files table. |

### Key discoveries

- **Codex has no `ExitPlanMode`.** Plan review there must ride Codex's experimental `Stop` hook (post-render), gated on `permission_mode === 'plan'`. Output `{"decision":"block","reason":…}` continues the turn (= revise); `{}` lets it complete (= approve).
- **Claude Code also has a `Stop` event** — so a shared `Stop` hook would misfire in Claude. That's why the two hooks are kept physically separate (see Important context).
- Codex *does* support plugin-bundled `hooks/hooks.json` and sets `CLAUDE_PLUGIN_ROOT` for compat, but the `[features] hooks = true` flag can't be set by a plugin — hence the install script.
- Codex provides `last_assistant_message` + `transcript_path` on the Stop payload, so the plan rarely needs transcript parsing.

## Completed work

### Tasks finished

- [x] Diagnosed why plan-review never fired: condux shipped **no hooks** at all (manual `settings.json` wiring was the only path). Fixed by shipping `dist/plugins/condux/hooks/hooks.json`.
- [x] Added Codex support: `annotate-server.js --codex-stop` mode + `install-codex-hook.sh`.
- [x] Reworked comment popover into a **two-step categorized toolbar** (menubar of Comment/Issue/Question/Suggestion/Nitpick → expands to note input on category pick), anchored **above** the selection with a below-fallback.
- [x] Enlarged the note input to 6 rows (`min-height: 132px`, `rows="6"`).
- [x] Centered the rendered plan; clear orphaned notes on plan revision; removed all emojis (incl. `✕` → `×`).
- [x] Updated `SKILL.md` + `README.md`; bumped condux to 1.6.0; committed `4ad0bfd` and pushed to `main`.

### Files modified

| File | Change | Why |
|---|---|---|
| `dist/plugins/condux/hooks/hooks.json` | new — Claude ExitPlanMode hook | auto-fire plan-review on install |
| `skills/plan-review/references/annotate-server.js` | `--codex-stop` mode, category in feedback md | Codex support + categorized notes |
| `skills/plan-review/references/install-codex-hook.sh` | new | register Codex Stop hook |
| `skills/plan-review/references/plan-review-template.html` | toolbar UI, centering, notes-clear, no emoji | the UX rework |
| `skills/plan-review/SKILL.md`, `README.md` | docs | reflect new behavior |
| `dist/plugins/condux/.{claude,codex}-plugin/plugin.json` | v1.5.5 → 1.6.0 | version bump convention |

## Decisions made

| Decision | Options considered | Chosen | Rationale |
|---|---|---|---|
| How to deliver the Codex hook | plugin-bundled hooks.json vs install script | install script | Codex needs the `[features] hooks=true` flag a plugin can't set; also keeps Codex `Stop` out of the plugin to avoid Claude collision |
| Claude vs Codex hook placement | one shared hooks.json vs separate | separate | Claude Code's own `Stop` event would make a shared `Stop` hook misfire |
| Build an MCP server for the toolkit? | yes vs no | **no** | The skills *are* the product; an MCP server would duplicate them with no concrete non-skill consumer. Deferred unless a real consumer appears. |
| Toolbar default category | pre-select "Comment" vs none | none until chosen | user wants menubar-only first, input revealed only after a category pick |

## Immediate next steps

1. **Test Claude Code path:** reinstall/update the condux plugin (or restart Claude Code) so `dist/plugins/condux/hooks/hooks.json` loads, then enter+exit plan mode and confirm the review UI opens and Approve/Deny steers the agent.
2. **Test Codex path:** run `bash skills/plan-review/references/install-codex-hook.sh`, restart Codex, **trust** the hook when prompted, then verify a planning turn opens the UI and Request-Revisions continues the turn. (WSL/Linux/macOS only — experimental, disabled on Windows.)
3. **Validate `readCodexTranscriptPlan()`** (`annotate-server.js`, the bottom dispatch helper) against a real Codex session — the transcript format is not a stable interface; adjust the JSONL parsing if `last_assistant_message` is ever empty.
4. Decide what to do with the untracked `skills/skills-overview.md` (commit, move, or delete) — it predates this work and was deliberately left out of `4ad0bfd`.

## Blockers

| Blocker | Context | Workaround tried |
|---|---|---|
| Can't fully verify hooks from this session | Hook registration only takes effect after a plugin reinstall / agent restart, which the agent can't do for the user | Verified server `--hook`/`--codex-stop` output and UI via headless browser + unit-style gating tests instead |

## Important context

- **`dist/` is a verbatim mirror of `skills/`.** Never edit `dist/` directly. Sync with `scripts/sync.sh <name>`; a **pre-commit hook auto-syncs** all skills (it ran on `4ad0bfd`). Plugin-root files (`plugin.json`, `hooks/hooks.json`) live only in `dist` and are hand-edited there.
- **Two hooks, kept separate on purpose:** Claude's `ExitPlanMode` is in the plugin (`hooks/hooks.json`); Codex's `Stop` is installed into `~/.codex/hooks.json` by the script. Do NOT add a `Stop` entry to the plugin hooks.json — it would fire on every Claude Code turn end.
- **`annotate-server.js` keeps stdout clean JSON in `--hook`/`--codex-stop`** (all logs go to stderr). Codex requires valid JSON on stdout on exit 0 even when doing nothing (emits `{}`).
- **Commit convention:** `feat:`/`fix:`/`chore:` prefix, `git commit -s` (Hieu Vi <hieu1871998@gmail.com>), **no `Co-Authored-By`**, end with `Claude-Session:` trailer. Bump `plugin.json` version on any plugin change.
- When invoking toolkit skills, read from `skills/<name>/SKILL.md` (local source is authoritative), not the plugin cache.

## Install & use (quick reference)

Full docs in `skills/plan-review/SKILL.md`. Three entry points:

**Claude Code (auto, via plugin):**
```
/plugin marketplace add jabworks/agentic-toolkit   # if not already added
/plugin install condux@jabworks-agentic-toolkit    # installs the bundle + hooks/hooks.json
# restart Claude Code so the ExitPlanMode hook loads
```
Then just plan as normal — on exiting plan mode the review UI opens automatically and blocks until you decide. Approve → agent implements; Request Revisions/Deny → feedback goes back and it replans.
Standalone (no plugin): add a `PreToolUse`/`ExitPlanMode` hook to `~/.claude/settings.json` pointing at the absolute `annotate-server.js` path with `--hook` (see SKILL.md).

**Codex (auto, via install script):**
```
bash skills/plan-review/references/install-codex-hook.sh   # honors $CODEX_HOME, default ~/.codex
# restart Codex, then TRUST the hook when prompted
```
Sets `[features] hooks = true` and registers the `Stop` hook. A planning turn ending then opens the review UI. Experimental; WSL/Linux/macOS only (disabled on Windows).

**Manual (any agent, any markdown file):**
```
node skills/plan-review/references/annotate-server.js <plan-or-spec.md>
```
Opens the UI on `127.0.0.1`; writes your decision to `<file>.feedback.md`; stays running until Ctrl+C.

**Using the review UI:** select text → a toolbar opens above it → pick a category (Comment/Issue/Question/Suggestion/Nitpick) → the note input appears → Save. Or message the agent in the right rail. Then Approve / Request Revisions / Deny.

## Deferred / out of scope

- **MCP server for the toolkit** — investigated and decided against (see Decisions). Revisit only if a concrete non-skill host needs these tools, or to render session-report charts as live in-chat widgets.
- Approve-with-notes on Codex: Codex `Stop` has no approve-with-context channel, so approving just completes the turn (notes are logged, not injected). Claude path supports it via `additionalContext`.
- Centering the caret on the selection (currently fixed 18px from the popover's left edge) and single-line input variant — offered to the user, not requested.
