# 05 — Factual review (Reviewer 1, independent agent, 2026-07-08)

Verified: all 15 cited git hashes exist and match their characterizations; all named
paths exist (and asserted absences hold); schema/field claims accurate against all 18
manifests; counts (27 skills, 9 plugins, 13 tests, 98 commits, 500/1024 budgets)
correct; every quoted command runs — except the `rg` ones below.

## Findings

BLOCKING: none.

### IMPORTANT (3)

1. `toolkit-research-frontier` attributes tests/dist-mirror.test.mjs to eb2b5b5 —
   it was added in d4118ae ("SDD/CI hardening v1.11.0"); eb2b5b5 added
   skill-invariants.test.mjs. Point stands, hash wrong. Fix: cite d4118ae.
2. `toolkit-plugin-reference` says "present in all 16 manifests" — there are 18
   (9 pairs) now; the file's own provenance loop returns 18. Fix the count.
   (Matches doctrine reviewer's MINOR #1.)
3. `toolkit-skill-standards` + `toolkit-change-control` provenance commands use
   `rg`, which is NOT on PATH in this checkout (`which rg` → exit 1) — and the
   incident ledger's own dc1e221 doctrine says portable tools only. Fix: grep.

### MINOR (3)

1. plugin-reference lists `capabilities` as if universal in the codex interface
   block — present in only 4 of 9 codex manifests (absent from condux, its own
   example). Fix: "optionally capabilities".
2. change-control's ba69d2b trap reads as if the FIX was asymmetric; the commit
   touched both manifests, correcting an uneven edit. Reword.
3. README internal inconsistency (pre-existing): line 3 "40+ other tools" vs
   line ~152 "68+ agents" for the same ecosystem. Unverifiable here — documented,
   not fixed.

## Explicitly clean

Git hashes (15/15, incl. paired narratives b782719→dc1e221, a4f4aa8 re-release,
b63f01b+4c3df61 absorption, 0b88ab2+a605be9 renames); paths incl. correct absences
(no dist/plugins/technical-spec, no .claude/skills/); skills-path rule
"./skills/<dir>" in all 18 manifests; interface in both variants of all 9 pairs;
condux hooks asymmetry matches 95425c8; marketplace field set exact; the three
edited condux skills carry when_to_use; sync.sh/install-hooks.sh behavior as
described; README validate.sh ghost gone; both catalogs list all 9 plugins.

Note: the "7 of 8 pairs disagreed / 5 Claude manifests lacked interface" pre-audit
claim couldn't be independently reproduced from git (no single normalization commit
— it happened in this uncommitted working tree); internally consistent, not flagged.

Counts: BLOCKING 0 / IMPORTANT 3 / MINOR 3.
