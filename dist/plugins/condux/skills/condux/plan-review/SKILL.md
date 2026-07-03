---
name: plan-review
description: Render a plan in a local browser for inline annotation, then return an approve / request-revisions / deny decision to the agent. Auto-captures the plan via a Claude Code ExitPlanMode hook or a Codex Stop hook, or runs manually on any markdown file or spec directory. Self-contained — no network egress, no third-party runtime deps.
when_to_use: When the agent finishes planning (Claude Code ExitPlanMode, or a Codex planning turn) and you want to review/annotate before it implements, or when you invoke /plan-review on a markdown plan/spec.
---

# /plan-review

Interactive plan review. The agent's plan opens in a local browser; you select
any text to attach an inline comment, chat with the agent, then submit a decision.
The decision flows back to the agent — **Approve** lets it proceed, **Request
Revisions** sends your notes back so it revises and re-presents, and **Reject**
tells it not to implement — reconsider whether the feature should be built.

Inspired by [Plannotator](https://github.com/backnotprop/plannotator), rebuilt
in-house so it carries **no third-party runtime dependency** and makes **no
network calls** — safe for strict environments.

## Ways in

### Auto — ExitPlanMode hook (the real workflow)

When installed as part of the **condux plugin**, this hook ships in the plugin
(`hooks/hooks.json`) and is auto-registered — no setup. Every time the agent
exits plan mode, the plan is captured and the review UI opens automatically. The
hook blocks until you decide. The plugin entry is:

```json
// dist/plugins/condux/hooks/hooks.json (shipped — for reference)
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/skills/condux/plan-review/references/annotate-server.js\" --hook"
          }
        ]
      }
    ]
  }
}
```

**Standalone (no plugin)?** Wire the same hook by hand in your
`settings.json` (project `.claude/settings.json` or `~/.claude/settings.json`),
swapping `${CLAUDE_PLUGIN_ROOT}/skills/condux/plan-review` for the absolute path:

```bash
find ~/.claude ~/.codex ~/.agents -name annotate-server.js -path '*plan-review*' 2>/dev/null | head -1
```

What the hook returns to the agent:

| Your decision | Hook output | Agent behavior |
|---|---|---|
| **Approve** | `permissionDecision: "allow"` (+ notes as `additionalContext` if any) | proceeds to implement |
| **Request Revisions** | `permissionDecision: "deny"`, reason = *revise this plan* + feedback | revises the plan, re-enters plan mode (re-triggers the hook) |
| **Reject** | `permissionDecision: "deny"`, reason = *do not implement, reconsider* + feedback | stops; reconsiders whether the feature should be built, or proposes a different approach |

### Auto — Codex Stop hook

Codex has **no `ExitPlanMode`** interception point, so plan review runs off
Codex's experimental **`Stop` hook**. When a planning turn ends
(`permission_mode === "plan"`), `annotate-server.js --codex-stop` reads the plan
from the Stop payload (`last_assistant_message`, falling back to
`transcript_path`) and opens the same review UI. On any other turn it emits `{}`
and exits, leaving the turn untouched.

Run the installer once (writes `~/.codex/hooks.json` + sets the feature flag):

```bash
bash /PATH/TO/plan-review/references/install-codex-hook.sh
# or, after a plugin install:
find ~/.codex ~/.claude -name install-codex-hook.sh -path '*plan-review*' 2>/dev/null | head -1 | xargs bash
```

It enables `[features] hooks = true` in `$CODEX_HOME/config.toml` and merges a
`Stop` hook pointing at the absolute `annotate-server.js` path. Then **restart
Codex** and **trust the hook** when prompted.

| Your decision | Hook output | Codex behavior |
|---|---|---|
| **Approve** (no notes) | `{}` (turn completes) | plan accepted, turn ends |
| **Approve** (with notes) | `{"decision":"block","reason":<approved + notes>}` | continues the turn; agent implements while addressing the notes |
| **Request Revisions** | `{"decision":"block","reason":<revise + feedback>}` | revises the plan in the same turn (re-triggers on next stop) |
| **Reject** | `{"decision":"block","reason":<do not implement, reconsider + feedback>}` | stops; reconsiders whether the feature should be built, or proposes a different approach |

Caveats: Codex hooks are **experimental and disabled on Windows**; the review is
**post-render** (after Codex prints the plan), not a pre-interception like Claude
Code; use an **absolute** node/command path (Codex Desktop doesn't inherit `PATH`
— the installer handles this).

### Manual — on any file or spec directory

```bash
node /PATH/TO/plan-review/references/annotate-server.js <plan-or-spec.md>
node /PATH/TO/plan-review/references/annotate-server.js <spec-dir>
```

Serves the file, writes your decision to `<file>.feedback.md`, and stays running
(Ctrl+C to stop). Use this for ad-hoc review of a spec or a written plan when you
are not in plan mode. After submitting, read `<file>.feedback.md` to action it.

**Directory mode** reviews a whole spec folder (e.g. `specs/wan-config/` from
the `technical-spec` skill): every top-level `*.md` is listed in the sidebar,
notes are tagged with their source file, edits to any file live-reload (with a
per-file revision diff), and the decision lands in `<dir>/review.feedback.md`
grouped by file. Works in manual and `--steer` modes; this is also the live
preview surface for `technical-spec` (its old preview server is retired).

### Steer — agent-invoked loop (any agent, no hook needed)

When you want the review to actually **drive an agent** outside Claude's
`ExitPlanMode` / Codex `Stop` hooks — e.g. an agent that wrote a plan to a file
and wants you to gate it — run the server in `--steer` mode. The server is
**long-lived**: launch it once, and one browser tab stays open for the whole
review while the agent loops.

```bash
# 1. Launch once, in the background (default port 7777; override with --port).
node /PATH/TO/plan-review/references/annotate-server.js <plan.md> --steer &

# 2. Each round: block until you submit a decision (long-poll).
curl -s http://127.0.0.1:7777/api/decision
#   → {"decision":"Request Revisions","feedback":"<markdown>","feedbackFile":"<abs>.feedback.md"}
```

The agent runs the **iterative loop** off that decision:

1. Launch the server (step 1) — the review tab opens and stays open.
2. `GET /api/decision` — blocks until you decide; returns the decision JSON.
3. Branch on `decision`:
   - **Approve** → stop looping, implement the plan (use `feedback` as notes). The server exits.
   - **Request Revisions** → edit `<plan.md>` **in place**; the open tab live-reloads the new plan over SSE (orphaned notes auto-clear). **Go to 2.**
   - **Reject** → stop; do not implement — reconsider whether to build this, or surface the blocker. The server exits.

Same steering the hooks give you, available to any agent that can run a command
and read a file — at the cost of the agent orchestrating the loop itself rather
than a hook blocking inline. Because the server is long-lived, **the same tab
reflects every revision** — no new tab per round. The decision is also written to
`<plan.md>.feedback.md` as a record each round.

## The review surface

A three-pane layout over a **decision bar**: a left sidebar with two tabs —
**Contents** (heading outline with per-section note counts; in directory mode,
each document is a top-level node with its headings nested, click to switch
docs) and **Files** (paths the plan touches, parsed from inline code and
fences, badged **exists**/**new** against the repo; click jumps to the first
mention, repeat clicks cycle) — the centered rendered plan (middle), and a
**Review** rail (right) holding your notes and messages. The decisions live in
a fixed bar along the bottom — `[Reject] ——— [Request revisions] [Approve]` —
with a live summary of what rides along ("3 notes · 1 message will be sent").

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 1  RENDER     Plan renders centered in the browser, w/ TOC. │
│  Step 2  ANNOTATE   Select text → a toolbar opens above it. Pick  │
│                     a category (Comment / Issue / Question /       │
│                     Suggestion / Nitpick) → the note input opens.  │
│                     Or message the agent in the Review rail.       │
│  Step 3  DECIDE     Bottom bar: Approve / Request Revisions /     │
│                     Reject — with a note/message count summary.    │
│  Step 4  RETURN     Decision + notes (each tagged with its        │
│                     category and quoting its anchor) go back.     │
└──────────────────────────────────────────────────────────────────┘
```

Selecting text opens a floating **annotation toolbar** anchored above the
selection (it flips below when there's no room). It starts as a category
**menubar**; choosing a category expands it to reveal the note input and
Save/Cancel. Saving highlights the text and anchors the note; clicking a
highlight or a note cross-links the two. The page live-reloads when the plan
file changes on disk (SSE + `fs.watch`).

When the agent **revises** the plan, the tab doesn't silently swap the text: a
banner reports the change (`+adds / -dels lines`) with a **View changes** toggle
that shows a unified line diff (old vs. new, folding long unchanged runs), and
the now-orphaned notes clear so the next round starts clean. Submitting a
decision **clears your notes immediately** and replaces the decision bar's
content with a confirmation that states what the agent does next
(implement / revise / rework).

## Guarantees (why it passes review)

- **No egress.** Server binds `127.0.0.1` only; the HTML template embeds its own
  markdown renderer and uses a system monospace font — no CDN, no web fonts, no
  paste/share service. Audit: `grep -rE 'https?://' references/*.html` returns nothing.
- **No dependencies.** `annotate-server.js` is Node stdlib only.
- **Auditable.** One stdlib server + one self-contained HTML file. The UI is
  styled after the **Terminus UI** design system (Button, Badge, Card, Textarea,
  Popover) — adapted as vanilla CSS tokens + classes, no React, no bundle.

## Files

| File | Role |
|---|---|
| `references/annotate-server.js` | Local server. `--hook` (Claude ExitPlanMode), `--codex-stop` (Codex Stop), `<file> --steer` (agent-invoked blocking loop), or `<file|dir>` alone for manual mode. A directory argument reviews every top-level `*.md` in it. |
| `references/install-codex-hook.sh` | Registers the Codex `Stop` hook in `~/.codex` and enables the hooks feature flag. |
| `references/plan-review-template.html` | Self-contained review UI (renderer + annotation surface). |

## Related skills

- `write-plan` — produces the plan this skill reviews.
- `technical-spec` — persists decisions/API/quirks; this server (directory mode) is its live preview + review surface.
