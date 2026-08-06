# @jabworks/condux

OpenCode plugin for the [condux](https://github.com/jabworks/agentic-toolkit)
workflow toolkit. One plugin line installs everything condux needs:

- **Skills** — bundles the 14 condux workflow skills (`workflow`, `discovery`,
  `draft-plan`, `test-first-development`, `subagent-execution`,
  `subagent-deployment`, `finalize`, `live-verification`, `code-review`,
  `preflight`, `root-cause-analysis`, `plan-review`, `technical-spec`,
  `condux-doctor`) and registers them on
  `config.skills.paths` via the `config` hook — no separate `npx skills add`
  step. A skill you install yourself under the same name still wins; OpenCode
  dedupes by name.
- **Agents** — injects the four condux specialist agents (`coder`, `explorer`,
  `planner`, `researcher`) as subagents via the same hook, carrying the tool
  restrictions their canonical definitions declare: `explorer` and `researcher`
  are read-only (no `edit`, `write`, or `bash`) and `planner` cannot run shell
  commands. If your `opencode.json` already defines an agent with the same name,
  yours wins — injection is skip-if-present.
- **Plan-review listener (opt-in)** — with `CONDUX_PLAN_REVIEW=1`, when the
  primary `plan` agent finishes a turn, spawns the plan-review annotate server
  (from the bundled skills, or any discoverable skill tree). Best-effort:
  OpenCode does not await event hooks, so this cannot block the next turn on the
  review outcome (unlike the Codex Stop hook).

## Install

Add `@jabworks/condux` to your `opencode.json` and restart OpenCode:

```jsonc
// opencode.json
{
  "plugin": ["@jabworks/condux"]
}
```

That's the whole install — skills and agents come with the plugin. The other
agentic-toolkit skills (git-commit, session-handoff, release, spec-browser, …)
are not part of condux; install those separately if you want them:

```sh
npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode
```

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
- The plan-review listener finds `plan-review/references/annotate-server.js` in
  the bundled skills first, then any discoverable skill tree (`.opencode/skills/`,
  `.agents/skills/`, `.claude/skills/`, or their global equivalents).
- OpenCode caches npm plugins under `~/.cache/opencode/`. If an upgrade seems
  to have no effect, clear that cache and restart OpenCode.
- The `agents/` and `skills/` trees are generated from the toolkit's canonical
  sources by `scripts/build-opencode.mjs` — edit the sources in the toolkit repo
  (`skills/subagent-execution/agents/` and `skills/<name>/`), not here.
