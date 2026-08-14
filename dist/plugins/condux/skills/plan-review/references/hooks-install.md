# Hook Install + Troubleshooting

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

**Installed via the condux plugin?** The `Stop` hook ships with it. The Codex
manifest (`.codex-plugin/plugin.json`) sets `"hooks": "./hooks/codex-hooks.json"`,
which Codex loads **instead of** the default `hooks/hooks.json` (that one is
Claude's `ExitPlanMode` hook, inert on Codex). Just enable `[features] hooks =
true` in `$CODEX_HOME/config.toml`, then **restart Codex** and **trust the hook**
when prompted — no installer needed.

**Standalone (no plugin)?** Run the installer once — it writes `~/.codex/hooks.json`
+ sets the feature flag, then restart Codex and trust the hook:

```bash
bash /PATH/TO/plan-review/references/install-codex-hook.sh
# or, after a plugin install:
find ~/.codex ~/.claude -name install-codex-hook.sh -path '*plan-review*' 2>/dev/null | head -1 | xargs bash
```

| Your decision | Hook output | Codex behavior |
|---|---|---|
| **Approve** (no notes) | `{}` (turn completes) | plan accepted, turn ends |
| **Approve** (with notes) | `{"decision":"block","reason":<approved + notes>}` | continues the turn; agent implements while addressing the notes |
| **Request Revisions** | `{"decision":"block","reason":<revise + feedback>}` | revises the plan in the same turn (re-triggers on next stop) |
| **Reject** | `{"decision":"block","reason":<do not implement, reconsider + feedback>}` | stops; reconsiders whether the feature should be built, or proposes a different approach |

Caveats: Codex hooks are **experimental and disabled on Windows**; the review is
**post-render** (after Codex prints the plan), not a pre-interception like Claude
Code. The plugin hook invokes bare `node` (resolved via `${PLUGIN_ROOT}`, the
variable Codex substitutes in plugin hook commands — it does **not** set Claude's
`${CLAUDE_PLUGIN_ROOT}`, so never use that in `codex-hooks.json`) — if Codex
Desktop can't find `node` on `PATH`, fall back to the installer, which bakes in
an **absolute** node path.
