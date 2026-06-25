---
name: session-handoff
description: Creates and resumes handoff documents for seamless agentic coding session transitions.
when_to_use: Trigger when context approaches capacity (>80%), at natural pauses, when switching workstreams, or when resuming prior work. Trigger phrases: "save state", "handoff", "wrap up", "resume", "continue from last session".
---

# Session Handoff Skill

Preserve and restore session context across agentic coding sessions.

## Trigger conditions

**Create a handoff when:**
- User says "save state", "handoff", "wrap up", or "context is full"
- Context window approaching capacity (>80%)
- Logical milestone complete before switching workstreams
- Switching between workstreams or projects

**Resume from a handoff when:**
- User says "resume", "pick up from", or "continue from last session"
- Starting a session on a branch that has handoffs in `handoffs/`

## Create workflow

1. **Gather state** — run these inline:
   ```bash
   git branch --show-current
   git log --oneline -5
   git status --short
   git diff --name-only HEAD
   ls -lt handoffs/ 2>/dev/null | head -10
   ```
2. **Ask the user:** "Save handoff as **markdown** (.md), **HTML** (.html), or **both**? Default: markdown."
3. **Scaffold** using the chosen template — `references/handoff-template.md` or `references/handoff-template.html`. For **both**, fill the markdown template once, then mirror the same content into the HTML template — identical sections, no divergence. Fill every section — no `[FILL]` placeholders left.
4. **Validate** before saving:
   - No `[FILL]` markers remain
   - No credentials, tokens, API key values, or env var values
   - Three required sections present and substantive (>50 chars each):
     "Current State Summary", "Important Context", "Immediate Next Steps"
   - Referenced file paths exist on disk
   - Next steps are specific (file:line, not "fix the auth")
5. **Save** to `handoffs/YYYY-MM-DD-HHMMSS-[slug].[md|html]`. For **both**, save the two files under the *same* `YYYY-MM-DD-HHMMSS-[slug]` stem, differing only in extension.
6. Confirm: "Handoff saved: `handoffs/<filename>`" (list both paths when **both** was chosen)

## Resume workflow

1. **List and pick** the relevant handoff:
   ```bash
   ls -lt handoffs/ | head -10
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

`handoffs/YYYY-MM-DD-HHMMSS-[slug].md` and/or `handoffs/YYYY-MM-DD-HHMMSS-[slug].html`. When **both** formats are saved, they share one timestamp-slug stem and differ only in extension.

If continuing prior work, set `continues-from` in the metadata header and reference the predecessor filename.

---

*Adapted from [softaworks/agent-toolkit `session-handoff`](https://github.com/softaworks/agent-toolkit/tree/main/skills/session-handoff)*
