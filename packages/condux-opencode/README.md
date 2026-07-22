# @jabworks/condux

OpenCode plugin for the [condux](https://github.com/jabworks/agentic-toolkit)
workflow toolkit. Complements the condux skills (installed separately, see
below) with the pieces OpenCode cannot pick up from a skill tree:

- **Agents** — injects the four condux specialist agents (`coder`, `explorer`,
  `planner`, `researcher`) as subagents via the `config` hook. If your
  `opencode.json` already defines an agent with the same name, yours wins —
  injection is skip-if-present.
- **Plan-review listener (opt-in)** — with `CONDUX_PLAN_REVIEW=1`, when the
  primary `plan` agent finishes a turn, spawns the plan-review annotate server
  from your installed condux skills. Best-effort: OpenCode does not await event
  hooks, so this cannot block the next turn on the review outcome (unlike the
  Codex Stop hook).

## Install

```jsonc
// opencode.json
{
  "plugin": ["@jabworks/condux"]
}
```

Install the condux skills alongside it (OpenCode-facing variants, with trigger
conditions folded into each description):

```sh
npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode
```

## Notes

- Injected agents carry no model pin — they inherit your session default. To
  restore the toolkit's tiering (e.g. a cheap model for `explorer`), override in
  `opencode.json`: `"agent": { "explorer": { "model": "anthropic/<model-id>" } }`.
- The plan-review listener needs the `plan-review` skill installed in a
  discoverable skill tree (`.opencode/skills/`, `.agents/skills/`,
  `.claude/skills/`, or their global equivalents) — it runs
  `plan-review/references/annotate-server.js` from there.
- OpenCode caches npm plugins under `~/.cache/opencode/`. If an upgrade seems
  to have no effect, clear that cache and restart OpenCode.
- The agent definitions in `agents/` are generated from the toolkit's canonical
  sources — edit them in `skills/subagent-execution/agents/` in the toolkit
  repo, not here.
