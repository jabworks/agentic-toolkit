# Grooming checklist

Run top to bottom; each step names its evidence source. Report findings as
item → evidence → proposed action. Groom proposes; `record` (and the user)
disposes.

## 1. Shipped-but-open (the ghost-work sweep)

For each item in **Committed**: does the work already exist? Evidence to
check, cheapest first:

- `git log --oneline --grep "#<id>"` — the id convention makes this precise
- recent `#### Status` blocks claiming "done pending X" where X has happened
- the feature itself (file, endpoint, flag) present in the tree

Confirmed shipped → propose `close <id> --note "<evidence>"`. Uncertain →
propose a `#### Status` block recording what was found, not a close.

## 2. Stale Committed

Committed items with no status update and no matching commits for ~a month
are commitments in name only. Propose: demote to Someday (a status block
records why), split out the still-real part, or close as `❌ DROPPED` with a
reason. Never silently delete.

## 3. Someday decay

Ideas overtaken by events — the dependency got replaced, the feature got
built another way, the itch went away. Propose `❌ DROPPED` closes in batch;
these are cheap wins that keep the board readable.

## 4. Loose threads promotion/pruning

A loose bullet that keeps coming up wants an id (`add`); one nobody can
explain anymore wants deletion. Both are one-line proposals.

## 5. Integrity

Finish with `check` and triage its findings (typed list in the skill body).
A clean sweep ends with: counts per section, oldest open item, and the
sweep's proposals as a single actionable list.
