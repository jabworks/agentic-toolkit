#!/usr/bin/env bash
# Run this from inside a freshly cloned jabworks/agentic-toolkit repo.
# Creates all skill files, commits, and pushes.
set -euo pipefail

mkdir -p \
  .claude-plugin \
  skills/session-handoff/references \
  dist/plugins/session-handoff/skills/session-handoff/references

# ── .claude-plugin/marketplace.json ──────────────────────────────────────────
cat > .claude-plugin/marketplace.json << 'EOF'
{
  "name": "jabworks-agentic-toolkit",
  "version": "1.0.0",
  "plugins": [
    {
      "name": "session-handoff",
      "description": "Creates and resumes handoff documents for seamless Claude Code session transitions. Use when context window approaches capacity or a work session is ending.",
      "source": "./dist/plugins/session-handoff",
      "strict": false,
      "skills": [
        "./skills/session-handoff"
      ],
      "category": "development",
      "keywords": [
        "handoff",
        "context",
        "session",
        "resume",
        "development"
      ]
    }
  ]
}
EOF

# ── README.md ─────────────────────────────────────────────────────────────────
cat > README.md << 'EOF'
# agentic-toolkit

Personal collection of Claude Code skills.

## Install

```bash
npx skills add jabworks/agentic-toolkit
```

Or register as a plugin marketplace in Claude Code:

```
/plugin marketplace add jabworks/agentic-toolkit
```

Then install individual plugins:

```
/plugin install session-handoff@agentic-toolkit
```

## Skills

| Skill | Description |
|---|---|
| [session-handoff](./skills/session-handoff/) | Preserve and restore session context across Claude Code sessions |
EOF

# ── skills/session-handoff/SKILL.md ──────────────────────────────────────────
cat > skills/session-handoff/SKILL.md << 'EOF'
---
name: session-handoff
description: Creates and resumes handoff documents for seamless Claude Code session transitions. Triggered when context approaches capacity, at natural pauses, or when resuming prior work.
---

# Session Handoff Skill

Preserve and restore session context across Claude Code sessions.

## Trigger conditions

**Create a handoff when:**
- User says "save state", "handoff", "wrap up", or "context is full"
- Context window approaching capacity (>80%)
- Logical milestone complete before switching workstreams
- Switching between jabworks, AXON, and FitLens work

**Resume from a handoff when:**
- User says "resume", "pick up from", or "continue from last session"
- Starting a session on a branch that has handoffs in `.claude/handoffs/`

## Create workflow

1. **Gather state** — run these inline:
   ```bash
   git branch --show-current
   git log --oneline -5
   git status --short
   git diff --name-only HEAD
   ls -lt .claude/handoffs/ 2>/dev/null | head -10
   ```
2. **Scaffold** the document using `references/handoff-template.md`. Fill every section — no `[FILL]` placeholders left.
3. **Validate** before saving:
   - No `[FILL]` markers remain
   - No credentials, tokens, API key values, or env var values
   - Three required sections present and substantive (>50 chars each):
     "Current State Summary", "Important Context", "Immediate Next Steps"
   - Referenced file paths exist on disk
   - Next steps are specific (file:line, not "fix the auth")
4. **Save** to `.claude/handoffs/YYYY-MM-DD-HHMMSS-[slug].md`
5. Confirm: "Handoff saved: `.claude/handoffs/<filename>`"

## Resume workflow

1. **List and pick** the relevant handoff:
   ```bash
   ls -lt .claude/handoffs/ | head -10
   ```
2. **Check freshness** relative to the handoff timestamp:
   ```bash
   git log --oneline --after="<handoff-date>"
   git diff --name-only <handoff-branch>...HEAD
   ```
3. **Read** the full handoff document
4. **Run the resume checklist** at `references/resume-checklist.md`
5. **Report** staleness level and any red flags to the user before touching code
6. Begin at "Immediate Next Steps §1"

## Staleness scoring

| Commits since | Age | Files changed | Level | Action |
|---|---|---|---|---|
| 0 | <1 day | 0–5 | Fresh | Proceed |
| 1–5 | 1–7 days | 5–20 | Slightly stale | Note gaps, proceed |
| 6–20 | 7–30 days | 20+ | Stale | Surface delta, confirm |
| >20 | >30 days | — | Very stale | Reference only; re-explore first |

## Quality gates (block handoff if any fail)

- [ ] No `[FILL]` markers
- [ ] No secrets or credential values
- [ ] Required sections present and substantive
- [ ] Next steps include file paths and/or line numbers
- [ ] Each decision includes rationale, not just the choice

## Storage

`.claude/handoffs/YYYY-MM-DD-HHMMSS-[slug].md`

If continuing prior work, set `continues-from` in the metadata header and reference the predecessor filename.
EOF

# ── skills/session-handoff/README.md ─────────────────────────────────────────
cat > skills/session-handoff/README.md << 'EOF'
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
EOF

# ── skills/session-handoff/references/handoff-template.md ────────────────────
cat > skills/session-handoff/references/handoff-template.md << 'EOF'
---
created: YYYY-MM-DD HH:MM:SS
branch: [output of: git branch --show-current]
repo: [monorepo package or app, e.g. apps/web, packages/oxlint-config]
task: [slug — what were you doing]
continues-from: [previous handoff filename | none]
workstream: [jabworks-personal | axon-work | fitlens | other]
---

## Current State Summary

<!-- One paragraph: where things stand right now. What just finished, what's in flight. -->

[FILL]

## Stack snapshot

- **Package / app:** `@jabworks/...` or `apps/...`
- **Layer:** [Frontend (Next.js) | Backend (NestJS+tRPC) | API (Go/AXON) | Infra | Tooling | FitLens]
- **Docker Compose:** [up / down / partial — list which services]
- **Dev server:** [running on port X | not running]
- **Drizzle schema changes:** [pending migration | committed | none]
- **tRPC router changes:** [describe | none]
- **DB migrations in flight:** [describe | none]

## Architecture context

### Critical files

| File | Why it matters |
|---|---|
| `path/to/file.ts:42` | [what it does and why it's relevant now] |

### Key discoveries

- [Non-obvious thing learned or confirmed this session]

## Completed work

### Tasks finished

- [x] [Specific task — e.g. "Implemented `user.update` router in `packages/trpc/src/routers/user.ts:88`"]

### Files modified

| File | Change | Why |
|---|---|---|
| `path/to/file.ts` | [what changed] | [rationale] |

## Decisions made

| Decision | Options considered | Chosen | Rationale |
|---|---|---|---|
| [What was decided] | [A vs B vs C] | [A] | [The constraint, tradeoff, or intent] |

## Immediate next steps

<!-- Ordered and specific. "Fix auth" is not acceptable. "Add `refreshToken` to `auth.schema.ts:12` and run `pnpm drizzle-kit generate`" is. -->

1. [Step 1 — include file:line where applicable]
2. [Step 2]
3. [Step 3]

## Blockers

| Blocker | Context | Workaround tried |
|---|---|---|
| [What's stuck] | [Why] | [What was attempted] |

## Important context

<!-- MUST READ. Things the next agent gets wrong without knowing this. -->

- [Critical invariant, hidden constraint, or gotcha]
- [Known pitfall to avoid]

## OpenCode agent context

<!-- Fill if using OpenCode with AGENTS.md -->

- **Active role:** [coder | reviewer | plan | researcher | N/A]
- **Relevant AGENTS.md section:** [quote key lines or "N/A"]
- **In-flight plan:** [link or brief summary | none]

## FitLens / local AI context

<!-- Only fill if this session involved FitLens or llama.cpp work -->

- **Text model:** [name + quant, e.g. Qwen2.5-14B UD-IQ4_XS]
- **Vision model:** [name + quant]
- **VRAM state:** [comfortable | approaching 16GB ceiling — note specifics]
- **llama.cpp server:** [running | stopped | config changed]

## Deferred / out of scope

- [Thing that came up but was intentionally left for later]
EOF

# ── skills/session-handoff/references/resume-checklist.md ────────────────────
cat > skills/session-handoff/references/resume-checklist.md << 'EOF'
# Resume Checklist

Run through this before touching any code.

## 1. Read the full handoff

- [ ] Read every section — no skimming
- [ ] Note `workstream`, `branch`, and `continues-from`

## 2. Verify project state

```bash
git branch --show-current       # matches handoff branch?
git log --oneline -5            # what happened since?
git status --short              # unexpected uncommitted changes?
```

- [ ] On the correct branch
- [ ] Aware of commits since handoff
- [ ] No unexpected in-flight changes

## 3. Assess staleness

See SKILL.md staleness table. If stale or very stale, surface the delta to the user before acting.

## 4. Validate assumptions

For each item in "Important context":
- [ ] Constraint / invariant still holds?

For each file in "Critical files":
- [ ] File still exists at that path?
- [ ] Line numbers approximately correct?

## 5. Check services (if relevant)

- [ ] Docker Compose services needed are running
- [ ] Dev server running if needed
- [ ] Drizzle migration state matches handoff (`pnpm drizzle-kit status`)
- [ ] llama.cpp server running if FitLens work

## 6. Red flags — pause and confirm with user before proceeding

- [ ] Files listed in handoff are missing from disk
- [ ] Branch has diverged substantially (>20 commits)
- [ ] An assumption in "Important context" is now false
- [ ] A blocker is now causing active failures
- [ ] Architecture in files doesn't match what the handoff describes

## 7. Resume

- Start at "Immediate Next Steps §1"
- Don't re-litigate decisions in "Decisions made" without a reason
- If you discover major new context mid-session, update this handoff before the session ends
EOF

# ── dist/ — copy from skills/ ─────────────────────────────────────────────────
DIST=dist/plugins/session-handoff/skills/session-handoff
cp skills/session-handoff/SKILL.md "$DIST/SKILL.md"
cp skills/session-handoff/README.md "$DIST/README.md"
cp skills/session-handoff/references/handoff-template.md "$DIST/references/handoff-template.md"
cp skills/session-handoff/references/resume-checklist.md "$DIST/references/resume-checklist.md"

# ── commit & push ─────────────────────────────────────────────────────────────
git add -A
git commit -m "feat: add session-handoff skill

Tailored to jabworks stack: Next.js/NestJS/tRPC/Drizzle/Go, Turborepo+pnpm,
oxlint, OpenCode agent roles, and FitLens dual-model llama.cpp setup.

No Python scripts — validation and git introspection run inline via Claude
Code's Bash access. Follows softaworks agent-toolkit plugin format for
npx skills add / /plugin install compatibility."

git push -u origin main
echo "Done. Install anywhere with: npx skills add jabworks/agentic-toolkit"
