# @jabworks/condux

OpenCode plugin for the [condux](https://github.com/jabworks/agentic-toolkit)
workflow toolkit. It provides two pieces that OpenCode cannot pick up from a
skill tree alone:

- **Agents** — injects the four condux specialist agents (`coder`, `explorer`,
  `planner`, `researcher`) as subagents via the `config` hook, carrying the tool
  restrictions their canonical definitions declare: `explorer` and `researcher`
  are read-only (no `edit`, `write`, or `bash`) and `planner` cannot run shell
  commands. If your `opencode.json` already defines an agent with the same name,
  yours wins — injection is skip-if-present.
- **Plan-review listener (opt-in)** — with `CONDUX_PLAN_REVIEW=1`, when the
  primary `plan` agent finishes a turn, spawns the plan-review annotate server
  from your installed condux skills. Best-effort: OpenCode does not await event
  hooks, so this cannot block the next turn on the review outcome (unlike the
  Codex Stop hook).

## Install

### 1. Install skills

Install the OpenCode-facing skill variants (trigger conditions folded into each
description):

```sh
npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode
```

This copies skills into `~/.config/opencode/skills/`.

### 2. Add the plugin

Add `@jabworks/condux` to your `opencode.json`:

```jsonc
// opencode.json
{
  "plugin": ["@jabworks/condux"]
}
```

Restart OpenCode after adding the plugin.

## Notes

- Injected agents carry no model pin — they inherit your session default. To
  restore the toolkit's tiering (e.g. a cheap model for `explorer`), override in
  `opencode.json`: `"agent": { "explorer": { "model": "anthropic/<model-id>" } }`.
- Restrictions are expressed as OpenCode `permission` denials, not the deprecated
  `tools` map — `tools` is folded into permissions while the config file is
  parsed, which is over before a plugin's `config` hook runs, so a `tools` map
  injected there has no effect. Only the `bash` and `edit` gates cross over
  (`edit` covers edit/write/patch). Read-side tools keep OpenCode's defaults,
  because the Claude allowlists omit `Grep`/`Glob` while the prompts still expect
  to search — denying those would break the agents rather than constrain them.
- The plan-review listener needs the `plan-review` skill installed in a
  discoverable skill tree (`.opencode/skills/`, `.agents/skills/`,
  `.claude/skills/`, or their global equivalents) — it runs
  `plan-review/references/annotate-server.js` from there.
- OpenCode caches npm plugins under `~/.cache/opencode/`. If an upgrade seems
  to have no effect, clear that cache and restart OpenCode.
- The agent definitions in `agents/` are generated from the toolkit's canonical
  sources — edit them in `skills/subagent-execution/agents/` in the toolkit
  repo, not here.
