---
name: standup
description: Use when the user wants a daily standup update drafted from this repo's recorded work — "standup", "write my standup", "what did I do yesterday", "daily update", "status for standup". Not for saving or resuming session state (session-handoff), usage or cost reports (session-report), recalling past sessions (remember), or choosing what to work on next (groom).
argument-hint: "[since <date> | today | blockers]"
---

# standup

Draft a Yesterday / Today / Blockers update from the work recorded in **this repository**, ready to paste. Outcomes, not a commit dump — and nothing the sources don't support.

## Hard rules

| Rule | Why |
|---|---|
| Read only the git repo at the current working directory. Never scan other directories or repos on your own initiative | Other repos may be corporate and sensitive; "I only looked" is no defence |
| Several repos wanted → the user names each path; run the skill once per named repo | Naming the path is the consent |
| Read-only: never commit, comment, post to chat, or change tracker state | The user pastes the result themselves; a standup is theirs to send |
| Only the user's own work — never summarise other authors' commits | A standup reports one person |
| Never invent plans or blockers | A fabricated line in a status update is worse than a short one |

## Window

Start of the previous working day (on Monday: Friday), unless the user gives `since <date>`. `today` narrows to today; `blockers` outputs only that section. Print the window used at the top: `Window: 2026-11-24 → now`.

## Sources

Each is optional. A missing source is skipped and named in a one-line `Sources:` footer — it never fails the standup.

| Source | Command | Feeds |
|---|---|---|
| Commits | `git log --branches --since=<window> --author="$(git config user.email)" --no-merges --format='%h %ad %s' --date=short`. `--branches` is not optional, because plain `git log` follows HEAD only, and yesterday's work usually sits on another branch. If the user commits under more than one identity (a work email, a noreply address), pass one `--author` per identity | Yesterday |
| PRs (needs `gh`, authenticated) | `gh pr list --author @me --state all --search "updated:>=<date>" --json number,title,state,mergedAt,reviewDecision,statusCheckRollup,url` | Yesterday (opened/merged), Blockers (changes requested, failing checks) |
| Reviews given | `gh pr list --search "reviewed-by:@me updated:>=<date>" --state all --json number,title,url` | Yesterday |
| Docket closes | Items closed in the window in `docket/archive/<year>.md`, reading every year the window touches (a Monday in early January reaches back into last December's file). Closed items are headed `## <id>. Title (…) — ✅ DONE <date>`; match the `DONE` date against the window | Yesterday |
| Latest session handoff | Newest file in `.session-handoff/` (names start `YYYY-MM-DD-HHMMSS-`), **only if that date falls inside the window**. Read its `## Immediate next steps` and `## Blockers`. An older handoff is skipped and named in `Sources:` with its date, because its next steps are not today's plans | Today (next steps), Blockers |
| Open PRs awaiting review or CI | From the PR query above | Today |

## Composing

- **Yesterday** — outcomes. Group commits under their PR when one exists ("Shipped X (#123)"). Fold fixup and chore noise into the item it served. About 6 bullets or fewer.
- **Today** — only what a source supports: handoff next steps, open PRs needing action, in-progress docket items the user confirms. Then ask the user to add or strike items.
- **Blockers** — only evidenced: changes requested, red checks, handoff blockers. Otherwise write `None known`.
- **Output** — plain markdown, three headings (`Yesterday`, `Today`, `Blockers`), then the `Sources:` footer. On request, a one-line compact variant: `Y: … · T: … · B: …`.

## Edge cases

| Situation | Do |
|---|---|
| Not a git repo | Say so. Fall back to handoff and docket only, or ask what they worked on |
| No activity in the window | Say so; offer to widen it (`since <date>`) |
| `gh` missing or unauthenticated | Skip both PR rows and the open-PR source; name it in `Sources:` |
| Detached HEAD or brand-new repo | Run the commit query anyway; with no commits, treat it as no activity |
| No `user.email` configured | Ask which author to filter on; never fall back to all authors |

## What does NOT happen

- Nothing is posted, sent, commented, or committed.
- No other repo or directory is read unless the user names its path.
- No invented plans, blockers, or other people's work.
- No tracker state changes — closing docket items is `record`'s job.
