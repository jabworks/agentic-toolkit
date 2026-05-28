# agentic-toolkit

Personal collection of agentic coding skills for Claude Code, Codex, OpenCode, and other tools that support the SKILL.md format.

## Skills

| Skill | Description |
|---|---|
| [session-handoff](./skills/session-handoff/) | Preserve and restore session context across agentic coding sessions |
| [plugin-foundry](./skills/plugin-foundry/) | Create and maintain skills in this toolkit |
| [adapting-skills](./skills/adapting-skills/) | Developer profile priors for adapting skills to Harvey's stack *(personal — useful to collaborators)* |

## Install

### Claude Code — `npx skills add`

```bash
npx skills add jabworks/agentic-toolkit
```

Or register as a plugin marketplace and install individual skills:

```text
/plugin marketplace add jabworks/agentic-toolkit
/plugin install session-handoff@agentic-toolkit
/plugin install plugin-foundry@agentic-toolkit
```

### Codex

Codex loads skills from `~/.agents/skills/`. Clone and copy the skill you want:

```bash
git clone https://github.com/jabworks/agentic-toolkit /tmp/agentic-toolkit
cp -r /tmp/agentic-toolkit/skills/session-handoff ~/.agents/skills/
```

### Other tools (manual)

Each skill is a self-contained directory with a `SKILL.md`. Copy it to wherever your tool looks for skills:

```bash
git clone https://github.com/jabworks/agentic-toolkit /tmp/agentic-toolkit
cp -r /tmp/agentic-toolkit/skills/<name> /path/to/your/tool/skills/
```

## Structure

```text
skills/<name>/          # Editable source
dist/plugins/<name>/    # Install source for npx skills add
.claude-plugin/
  marketplace.json      # Plugin registry
```
