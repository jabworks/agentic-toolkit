---
name: remember
description: Continuous memory for Codex — write explicit remembers, and recall from Concord's own tiers when a question reaches past what session start injected.
when_to_use: Trigger on "remember that…", "note for next time", "keep this in mind", "what did we do last time", or a question about Concord's memory files, tiers, or hooks. Not for saving state to resume a task mid-flight — that is session-handoff. Not for open-ended retrospective questions, even about this project — "what mistakes did past sessions make", "what did the audit leave open", "has this happened before" in another project — Concord holds a session log, not a mistake ledger or audit index; a toolkit mistake in this project is toolkit-failure-archaeology, and there is no skill for the rest.
---

# Concord

Continuous memory for Codex. Three hooks capture each session into aging tiers,
and the relevant slice is injected back at the start of the next one.

Capture is automatic and needs nothing from you. This file covers the two things
that **are** yours: writing down what the user explicitly asks you to remember,
and searching the tiers when injected recall is not enough.

## Where memory lives

Project tier, at the git root (main worktree — branches share one memory):

```
.concord/
  buffer.md            current session, not yet promoted
  days/YYYY-MM-DD.md   per-day detail
  recent.md            derived view of the last 7 days
  archive.md           older, compressed
  pinned.md            explicit remembers — never auto-compressed
  state.json           machine state; do not hand-edit
```

Global tier, at `${CODEX_HOME:-~/.codex}/concord/global/notes.md`.

A directory that is not a git repo gets a bucket under
`${CODEX_HOME:-~/.codex}/concord/projects/<slug>/` instead.

**`.concord/` ignores itself.** It is created with a `.gitignore` containing `*`,
so nothing in it can be committed and the repo's own `.gitignore` is left alone.
This is handled in code, not by you — but the tiers hold verbatim prompts and
tool output, so if you ever see `.concord/` staged for commit, stop and say so.

## Writing an explicit remember

When the user says "remember that…", "note this for next time", or similar,
append one line to the right file. Do it directly with your file tools — no
subprocess, no LLM call, no cost.

**Route by what the fact is about:**

| Fact | Goes to |
|---|---|
| Anything about *this* project — architecture, gotchas, decisions, URLs, people | `.concord/pinned.md` |
| Anything about *the user* — preferences, conventions, how they like to work | global `notes.md` |

Format: `- YYYY-MM-DD <the fact>` — one fact per line, appended, newest last.

**When it is genuinely ambiguous, ask.** A project fact written to the global
tier leaks into every other repo the user opens, including clients' — that is
the one mistake here worth a question. "Should that apply everywhere, or just
this project?" costs a sentence; a leak costs trust.

Do not restate the fact back at length. "Noted." is enough.

## Reading further back

Session start injects pinned, preferences, recent, and today — budgeted to a few
thousand characters. When a question reaches past that, search rather than guess:

```bash
grep -ri "<term>" .concord/archive.md .concord/days/
```

`recent.md` is **derived** from the day files and is rebuilt on every promotion —
read it, never write to it. Edits there are silently discarded on the next
session.

If the user asks something you have no memory of, say so plainly. Inventing a
recollection is far worse than admitting the tier does not go back that far.

## What is not yours

- **Capture** — the hooks do it. Never append session transcript content to
  `buffer.md` by hand; the rollout is the single source of truth and manual
  writes double-count.
- **Promotion** — deterministic and automatic on session end.
- **Resuming an interrupted task** — that is `session-handoff`, not this.

## When memory looks wrong

Nothing being injected usually means the hooks are not wired. Codex hooks are
experimental and need both `~/.codex/hooks.json` and `[features] hooks = true`
in `~/.codex/config.toml`. Run `references/install-codex-hook.sh` to register
both (it verifies afterwards), or follow `references/INSTALL.md` by hand when
bash is not available. `concord-doctor` reports what is actually wired, and
`concord-doctor --fix` runs that installer for you. Hook failures
never surface in the session by design — they are logged to `.concord/logs/hook.log`,
which is the first place to look.
