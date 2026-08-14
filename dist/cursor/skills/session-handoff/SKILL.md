---
name: session-handoff
description: "Creates and resumes handoff documents for seamless agentic coding session transitions. Trigger on \"wrap up\", \"wrap up this session\", \"save state\", \"handoff\", \"resume from handoff\", \"continue from last session\", \"clear handoffs\", \"prune handoffs\" — and when context approaches capacity (>80%), at natural pauses, or when switching workstreams. Wrap-up routes here even when a generic memory/remember skill is installed: the handoff document is the continuation artifact, and hook-based auto-memory still runs on its own. Not for resuming work on a design or plan artifact — that is discovery/draft-plan territory. Not for resuming an in-flight plan from the .condux/progress/ ledger — that is subagent-execution. Not for a usage/cost report — that is session-report. Not for remembering facts across Codex sessions — that is concord:remember."
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
- Starting a session on a branch that has handoffs in `.session-handoff/`

## Create workflow

1. **Gather state** — run these inline:
   ```bash
   git branch --show-current
   git log --oneline -5
   git status --short
   git diff --name-only HEAD
   ls -lt .session-handoff/ 2>/dev/null | head -10
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
5. **Save** to `.session-handoff/YYYY-MM-DD-HHMMSS-[slug].[md|html]`. For **both**, save the two files under the *same* `YYYY-MM-DD-HHMMSS-[slug]` stem, differing only in extension.
6. Confirm: "Handoff saved: `.session-handoff/<filename>`" (list both paths when **both** was chosen)
7. **Retention check** — after saving, run the Prune workflow below on the remaining files: flag the new handoff's `continues-from` predecessor chain as superseded, plus anything very stale, and offer to delete them.

## Resume workflow

1. **List and pick** the relevant handoff:
   ```bash
   ls -lt .session-handoff/ | head -10
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
7. **After the resume has landed** (next steps under way or superseded by new direction), offer to delete the consumed handoff — and any older handoffs it chains to via `continues-from`. A resumed handoff is spent: its context now lives in the session and the next handoff.

## Prune workflow

Handoffs are disposable by design — once consumed or superseded, delete them.
Runs after a resume (step 7), after a create (step 7), or on request
("clear handoffs", "prune handoffs").

1. **Identify candidates** in `.session-handoff/`:
   - **Consumed** — resumed in this session and the work has moved on
   - **Superseded** — a newer handoff names it (directly or transitively) in `continues-from`
   - **Very stale** — >30 days old or >20 commits behind (see Staleness scoring)
   - **Overflow** — beyond the 5 most recent stems, oldest first
2. **Present the list** with one reason per file and ask for a single yes/no
   confirmation for the whole batch (the user can exclude items). Never delete
   without asking; never ask file-by-file.
3. **Delete** confirmed files with `rm`. Twin formats share a stem — always
   remove `.md` and `.html` together. If the file is tracked in git, use
   `git rm` so the deletion is staged.
4. Report what was removed and what was kept.

Never prune: the handoff just created, anything the user excluded, or the
only handoff for a branch with uncommitted work it describes.

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

`.session-handoff/YYYY-MM-DD-HHMMSS-[slug].md` and/or `.session-handoff/YYYY-MM-DD-HHMMSS-[slug].html`. When **both** formats are saved, they share one timestamp-slug stem and differ only in extension.

Handoffs are gitignored working state, not project docs — they're disposable
by design (see Prune workflow). The directory lives at the git root and is
created on demand. Before the first write in a repo, run the bootstrap once:

1. Resolve the root with `git rev-parse --show-toplevel`. Not a git repo →
   fall back to CWD and say so once.
2. `git check-ignore -q .session-handoff/` — already ignored, proceed silently.
3. Otherwise ask once: "Handoffs are scratch — add `.session-handoff/` to
   `.gitignore` so they stay out of your commits?" On yes, append it. If the
   user would rather not touch a tracked file, write it to
   `.git/info/exclude` instead. Never edit either file without asking.

Check `AGENTS.md` for a project-specific override; an explicit path wins.

**Migrating an existing repo:** older handoffs may sit in `handoffs/` at the
repo root (the pre-2.0 location) and may be committed. On resume, check both
paths. Offer to move them once — `git mv handoffs/ .session-handoff/` if
tracked, plain `mv` otherwise — but never move them silently.

If continuing prior work, set `continues-from` in the metadata header and reference the predecessor filename.

---

*Adapted from [softaworks/agent-toolkit `session-handoff`](https://github.com/softaworks/agent-toolkit/tree/main/skills/session-handoff)*
