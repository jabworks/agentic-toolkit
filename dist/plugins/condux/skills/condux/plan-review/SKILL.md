---
name: plan-review
description: Render a plan in a local browser for inline annotation, then return an approve / request-revisions / deny decision to the agent. Auto-captures the plan via an ExitPlanMode hook, or runs manually on any markdown file. Self-contained — no network egress, no third-party runtime deps.
when_to_use: When the agent finishes planning (ExitPlanMode) and you want to review/annotate before it implements, or when you invoke /plan-review on a markdown plan/spec.
---

# /plan-review

Interactive plan review. The agent's plan opens in a local browser; you select
any text to attach an inline comment, chat with the agent, then submit a decision.
The decision flows back to the agent — **Approve** lets it proceed, **Request
Revisions** / **Deny** sends your notes back so it revises and re-presents.

Inspired by [Plannotator](https://github.com/backnotprop/plannotator), rebuilt
in-house so it carries **no third-party runtime dependency** and makes **no
network calls** — safe for strict environments.

## Two ways in

### Auto — ExitPlanMode hook (the real workflow)

Wire a `PreToolUse` hook so every time the agent exits plan mode, the plan is
captured and the review UI opens automatically. The hook blocks until you decide:

```json
// settings.json (project .claude/settings.json or ~/.claude/settings.json)
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "node /ABSOLUTE/PATH/TO/plan-review/references/annotate-server.js --hook"
          }
        ]
      }
    ]
  }
}
```

Find the absolute path after install:

```bash
find ~/.claude ~/.codex ~/.agents -name annotate-server.js -path '*plan-review*' 2>/dev/null | head -1
```

What the hook returns to the agent:

| Your decision | Hook output | Agent behavior |
|---|---|---|
| **Approve** | `permissionDecision: "allow"` (+ notes as `additionalContext` if any) | proceeds to implement |
| **Request Revisions** | `permissionDecision: "deny"`, reason = your feedback | revises the plan, re-enters plan mode (re-triggers the hook) |
| **Deny** | `permissionDecision: "deny"`, reason = your feedback | reworks the approach |

### Manual — on any file

```bash
node /PATH/TO/plan-review/references/annotate-server.js <plan-or-spec.md>
```

Serves the file, writes your decision to `<file>.feedback.md`, and stays running
(Ctrl+C to stop). Use this for ad-hoc review of a spec or a written plan when you
are not in plan mode. After submitting, read `<file>.feedback.md` to action it.

## The review surface

A three-pane layout: a **Contents** outline (left, with per-section note counts),
the rendered plan (center), and a **Review** rail (right) listing your notes and
messages above the decision buttons.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 1  RENDER     Plan renders in the browser, with a TOC.      │
│  Step 2  ANNOTATE   Select text → inline comment (highlighted).   │
│                     Or message the agent in the Review rail.      │
│  Step 3  DECIDE     Approve / Request Revisions / Deny.            │
│  Step 4  RETURN     Decision + notes (each quoting the text it    │
│                     anchors to) go back to the agent.             │
└──────────────────────────────────────────────────────────────────┘
```

Selecting text highlights it and anchors the comment; clicking a highlight or a
note cross-links the two. The page live-reloads if the plan file changes on disk
(SSE + `fs.watch`).

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
| `references/annotate-server.js` | Local server. `--hook` for ExitPlanMode, or a file path for manual mode. |
| `references/plan-review-template.html` | Self-contained review UI (renderer + annotation surface). |

## Related skills

- `write-plan` — produces the plan this skill reviews.
- `technical-spec` — persists decisions/API/quirks; ships the live-preview pattern this server mirrors.
