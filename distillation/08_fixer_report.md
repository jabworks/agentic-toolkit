# 08 — Fixer report (2026-07-08)

Input: distillation/05 (factual: 0B/3I/3M), 06 (doctrine: 0B/1I/3M), 07 (usability:
0B/7I/7M). Rule: all BLOCKING and IMPORTANT fixed; MINOR fixed where cheap, otherwise
documented here. Verification after all fixes: `bash scripts/sync.sh` + `node --test`
→ 13/13 pass; eval corpus recounted at 150 queries.

## IMPORTANT — all 11 fixed

| # | Finding (reviewer) | Fix applied |
|---|---|---|
| 1 | dist-mirror test misattributed to eb2b5b5 (factual) | frontier now cites d4118ae, notes eb2b5b5 as the later suite growth |
| 2 | "all 16 manifests" stale (factual + doctrine-minor) | plugin-reference: "every manifest (18 at the 2026-07-08 audit)" |
| 3 | `rg` commands on a machine without rg (factual) | skill-standards + change-control provenance switched to `grep` |
| 4 | "description is the ONLY field allowed to differ" false 3 ways (doctrine) | plugin-reference row, health-campaign B2, and plugin-foundry's Claude-manifest line all restated as: identity fields must match; description + interface content may carry platform wording; hooks codex-only |
| 5 | orientation never routes to skill-standards (usability) | added to When-not-to-use and Related skills |
| 6 | plugin-foundry Common Mistakes still said hook "syncs automatically" (usability + doctrine-minor) | cell rewritten: run sync manually; hook only if installed; never assume present |
| 7 | version-bump rule triple-homed with circular ownership (usability) | change-control = single normative home; plugin-foundry reduced to short form + pointer; plugin-reference version row points to change-control; a4f4aa8 citations reduced |
| 8 | marketplace field set double-homed (usability) | plugin-reference = schema of record; plugin-foundry keeps only its actionable template + pointer |
| 9 | `<p>` placeholders in change-control's runnable checklist (usability) | replaced with a glob loop over all manifests |
| 10 | archaeology/frontier evals lacked cross-repo negatives + collision cases (usability) | 4 queries added, 2 unrealistic ones replaced (150 total now) |
| 11 | bare "am I done?" favors preflight over change-control (usability) | change-control description now leads with "am I done shipping this skill/plugin" |

## MINOR — fixed (8 of 13)

- capabilities marked optional in the codex interface enumeration (factual).
- ba69d2b trap reworded — the commit corrected an uneven edit, wasn't itself
  asymmetric (factual).
- frontier open-problem #5 + campaign C3 updated: README/CLAUDE.md setup notes exist
  (that half DONE); only the warn-test remains open (doctrine).
- frontier's ongoing-results location moved from `distillation/` to the campaign
  reference itself (usability).
- archaeology's ephemeral pointers tightened: PLAN.md named as the design doc,
  "distillation/02" expanded to the full filename (usability).
- orientation eval's install-channels query relabeled to plugin-reference (usability).
- frontier eval's skill-internal vocabulary replaced with natural phrasing (usability).
- author-value convention (jabworks in plugin.json vs Hieu Vi in marketplace)
  documented in plugin-reference instead of left implicit (usability).

## MINOR — intentionally not fixed (documented per the rule)

1. **plugin-reference is an inline catalog** (usability): accepted — it is a
   reference skill; the catalog IS the runbook, it fits one scan (≤130 lines), and
   splitting it into references/ would add a hop to every schema lookup.
2. **skills-path rule also appears in plugin-foundry's Common Mistakes row**
   (usability): kept — it's an actionable fix cell, not a second schema; authority
   stays with plugin-reference.
3. **README "40+ tools" (line 3) vs "68+ agents" (Structure section)** (factual):
   both pre-existing claims about the vercel-labs/skills ecosystem; unverifiable from
   this repo — logged in the uncertainty register for Hiếu instead of guessing a
   number.
4. **3-way "create a skill" trigger crowding (foundry/standards/change-control)**
   (usability risk list): structural to having build/bar/gate as separate skills; all
   three cross-reference each other, so any routing lands one hop from the right
   answer. Revisit if campaign A3 shows real misroutes.

Post-fix verification: `node --test` 13/13 pass after re-sync (mirror includes all
eval and SKILL.md changes).
