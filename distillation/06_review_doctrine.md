# 06 — Doctrine review (Reviewer 2, independent agent, 2026-07-08)

Repo state at review: `node --test` 13/13 green; manifest-parity test exists and
passes; install-hooks.sh exists; all 7 evals valid JSON with negatives; all 16 cited
commit hashes resolve; toolkit-ops registered and mirrored.

## Findings

BLOCKING: none.

### IMPORTANT (1)

1. `toolkit-plugin-reference` (description row) + `health-campaign.md` B2 assert
   only `description` may differ between the two manifests of a pair. False three
   ways: (a) the parity test's own doctrine comment allows description AND
   `interface` content to carry platform wording; (b) the same reference file's
   `hooks` row names a second by-design divergence; (c) disk reality — `interface`
   content diverges in 5 of 9 live pairs. `plugin-foundry` ("identical structure;
   change only the description prefix") carries the same inaccuracy. Unenforced, so
   cannot corrupt the repo — but a reviewer applying the stated rule would wrongly
   flag 5 existing pairs. Fix: state the enforced rule — identity fields
   (name/version/skills) must match; description + interface content may carry
   platform wording; hooks codex-only.

### MINOR (3)

1. plugin-reference says "present in all 16 manifests" — stale post-toolkit-ops
   (18 manifests / 9 pairs). Drop the hard number.
2. research-frontier open-problem #5 + campaign C3 treat the fresh-clone README
   setup note as missing — but README/CLAUDE.md already carry it (added by this
   same audit, per D1). Mark that half of C3 done; reword #5 to "documented but not
   enforced/automated."
3. plugin-foundry Common Mistakes cell still reads as "the hook syncs
   automatically" — conflicts with the same file's "Never assume the hook is
   present" (matches Reviewer 3's IMPORTANT #2).

## Explicitly clean

Trigger-contract compliance of all 7 new + 3 edited skills; CLAUDE.md invariant
wording vs test enforcement (exact match); publish checklist / sync command / commit
style identical across CLAUDE.md, plugin-foundry, change-control, orientation;
version-bump rules consistent (though see Reviewer 3 on duplication); single
definition of "shipped" (change-control), no competing copy; skills-path rule
consistent and test-enforced; no skill routes around mirror/pairing/registration;
"looks synced" substitution prohibited everywhere it could occur; no unbacked
"verified/enforced/guaranteed" claims — every DONE marker in the health campaign
confirmed against repo state.

Counts: BLOCKING 0 / IMPORTANT 1 / MINOR 3.
