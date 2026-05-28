# agentic-toolkit

Personal collection of agentic coding skills. Compatible with Claude Code, Codex, OpenCode, Cursor, Gemini CLI, and [40+ other tools](https://github.com/vercel-labs/skills) via `npx skills add`.

## Skills

| Skill | Description |
|---|---|
| [session-handoff](./skills/session-handoff/) | Preserve and restore session context across agentic coding sessions |
| [plugin-foundry](./skills/plugin-foundry/) | Create and maintain skills in this toolkit |
| [adapting-skills](./skills/adapting-skills/) | Developer profile priors for adapting skills to Harvey's stack *(personal — useful to collaborators)* |

## Install

`npx skills add` auto-detects the running agent and installs to the right directory:

```bash
npx skills add jabworks/agentic-toolkit
```

This works inside Claude Code, Codex, OpenCode, Cursor, and most other agentic tools — no flags needed.

### Claude Code — plugin marketplace

Alternatively, register as a plugin marketplace to install individual skills:

```text
/plugin marketplace add jabworks/agentic-toolkit
/plugin install session-handoff@agentic-toolkit
/plugin install plugin-foundry@agentic-toolkit
```

### Manual fallback

If running outside an agent environment, clone and copy to your tool's skills directory:

| Tool | Skills directory |
|---|---|
| Claude Code | `~/.claude/skills/` |
| Codex | `~/.codex/skills/` |
| OpenCode | `~/.config/opencode/skills/` |
| Cursor | `~/.cursor/skills/` |
| Gemini CLI | `~/.gemini/skills/` |
| Most others | `.agents/skills/` (project-local) |

```bash
git clone https://github.com/jabworks/agentic-toolkit /tmp/agentic-toolkit
cp -r /tmp/agentic-toolkit/skills/<name> <skills-directory>/
```

## Structure

```text
skills/<name>/          # Editable source
dist/plugins/<name>/    # Install source for npx skills add
.claude-plugin/
  marketplace.json      # Plugin registry
```
