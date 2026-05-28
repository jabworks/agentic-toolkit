# session-handoff

Preserve and restore session context across Claude Code sessions.

## Install

```bash
npx skills add jabworks/agentic-toolkit
```

Or install a specific plugin:

```
/plugin install session-handoff@agentic-toolkit
```

## Usage

**Save state:**
> "Save state" / "Handoff" / "Context is getting full"

Claude will gather git state, scaffold a handoff document from the template,
validate it, and save it to `.claude/handoffs/`.

**Resume:**
> "Resume from last session" / "Pick up from the handoff"

Claude will list available handoffs, check staleness against git history, and
walk through the resume checklist before touching any code.

## What gets captured

- Git branch, recent commits, modified files
- Stack snapshot (which services, migration state, router changes)
- Critical files with line references
- Decisions made and their rationale
- Ordered next steps (specific, not vague)
- OpenCode agent context (role, AGENTS.md section)
- FitLens / llama.cpp model state (if applicable)

## Storage

Handoffs live in `.claude/handoffs/YYYY-MM-DD-HHMMSS-[slug].md` and support
chaining across long sessions.
