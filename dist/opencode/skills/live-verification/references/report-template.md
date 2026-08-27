# Verification Report Template

The shape of `report.md` — one per run, at
`<git-root>/.condux/verification/<YYYY-MM-DD>-<slug>/report.md`. This file is
the canonical home of the report shape; SKILL.md's Output Format points here.

The terminal report **is** this file: write `report.md` first, then print its
content as the report. One fact, one home — a separate terminal shape and file
shape would drift.

```markdown
# Live verification: <change>

| | |
|---|---|
| Date | YYYY-MM-DD |
| Target | <url or command> (<how it was started>) |
| Diff | <branch or commit under test> |
| Themes | light ✓ dark ✓ |

| Claim | Evidence | Verdict |
|---|---|---|
| <behavior asserted, one line> | <file in this dir, or —> | ✓ / ✗ <what actually happened> |

Also seen: <console errors, failed requests, off-feature breakage — or "nothing">

<n> claims failed. <fix + re-verify note, or "all green">
```

When nothing could be driven, the report is still written — an absent
`report.md` is indistinguishable from a run that never happened:

```markdown
# Live verification: <change>

| | |
|---|---|
| Date | YYYY-MM-DD |
| Target | none — <what was tried, what blocked it> |
| Verdict | NOT VERIFIED — <n> claims unchecked, listed below |

| Claim | Evidence | Verdict |
|---|---|---|
| <each enumerated claim> | — | unchecked |
```

## The rules

| Rule | Why |
|---|---|
| Everything a run produces lives inside its run dir — nothing at the verification root | Root-level orphans belonging to no run were observed in the wild; the dir is the unit of a run |
| Evidence files are named for the claim they support and referenced from the claim table | The table is the index — an evidence file it doesn't reference is uncontextualized in a week |
| Header keys are fixed: Date, Target, Diff, Themes (Themes only for UI surfaces) | Two runs of the same surface are diffable only when their headers line up |
| Every run writes `report.md`, including runs where nothing could be driven | Absence of a report must mean absence of a run, nothing else |
