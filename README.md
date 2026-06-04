# agentic-toolkit

Personal collection of agentic coding skills. Compatible with Claude Code, Codex, OpenCode, Cursor, Gemini CLI, and [40+ other tools](https://github.com/vercel-labs/skills) via `npx skills add`.

## Skills

| Skill                                        | Description                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [session-handoff](./skills/session-handoff/) | Preserve and restore session context across agentic coding sessions                                   |
| [plugin-foundry](./skills/plugin-foundry/)   | Create and maintain skills in this toolkit                                                            |
| [adapting-skills](./skills/adapting-skills/) | Developer profile priors for adapting skills to Harvey's stack _(personal — useful to collaborators)_ |

### Condux

Lean agentic workflow plugin (`condux`). Install all 8 skills as a unit via `/plugin install condux@agentic-toolkit`.

| Skill | Description |
|---|---|
| [condux:workflow](./skills/workflow/) | Tier router — infer Small/Medium/Large, confirm with user, load only the skills the tier needs |
| [condux:brainstorm](./skills/brainstorm/) | Design gate — clarifying questions, alternatives, section-by-section sign-off before planning |
| [condux:write-plan](./skills/write-plan/) | Lean task-card plan (what/why/gotchas/deps), Markdown or HTML, LARGE tasks only |
| [condux:test-driven-development](./skills/test-driven-development/) | Opt-in TDD — asks before writing tests, running tests, or updating specs |
| [condux:subagent-driven-development](./skills/subagent-driven-development/) | Named specialist agents for LARGE plans, only when justified, never to fill time |
| [condux:finalize](./skills/finalize/) | End-of-task quality gate — typecheck → lint → format → test, once, stop on first failure |
| [condux:code-review](./skills/code-review/) | On-request diagnostic report (Critical/Important/Minor), never auto-triggers, never fixes |
| [condux:verification](./skills/verification/) | "Am I actually done?" checklist before finalize — catches skipped steps and regressions |

## Install

`npx skills add` auto-detects the running agent and installs to the right directory:

```bash
npx skills add jabworks/agentic-toolkit
```

This works inside Claude Code, Codex, OpenCode, Cursor, and most other agentic tools — no flags needed.

### Claude Code — plugin marketplace

Alternatively, register as a plugin marketplace to install individual skills:

> Via CLI:

```bash
claude plugin marketplace add jabworks/agentic-toolkit
claude plugin install session-handoff@jabworks-agentic-toolkit # claude plugin install session-handoff
claude plugin install plugin-foundry@jabworks-agentic-toolkit # claude plugin install plugin-foundry
```

> Via Claude Code CLI:

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install session-handoff@jabworks-agentic-toolkit # /plugin install session-handoff
/plugin install session-handoff@jabworks-agentic-toolkit # /plugin install session-handoff
```

> Via Claude Code CLI plugin menu:

```bash
/plugin
-> Marketplaces tab -> Add Marketplace -> jabworks/agentic-toolkit
-> Discover tab -> Search plugin name
```

### Codex — plugin manifests

This repo is also Codex plugin compatible:

> Via CLI:

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add session-handoff@jabworks-agentic-toolkit
codex plugin add plugin-foundry@jabworks-agentic-toolkit
```

> Via Codex CLI plugins menu:

```bash
/plugins
-> Add Marketplace -> jabworks/agentic-toolkit
-> Select jabworks/agentic-toolkit tab to add plugins
```

### Manual fallback

If running outside an agent environment, clone and copy to your tool's skills directory:

| Tool        | Skills directory             |
| ----------- | ---------------------------- |
| Claude Code | `~/.claude/skills/`          |
| Codex       | `~/.codex/skills/`           |
| OpenCode    | `~/.config/opencode/skills/` |
| Cursor      | `~/.cursor/skills/`          |
| Gemini CLI  | `~/.gemini/skills/`          |
| Most others | `.agents/skills/`            |

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
