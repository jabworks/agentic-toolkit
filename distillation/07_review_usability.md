# 07 — Usability review (Reviewer 3, independent agent, 2026-07-08)

Scope: 7 new toolkit-ops skills (82–114 lines each) + references + evals, judged
against the 20 pre-existing skills' trigger contracts. Verdicts: scannability PASS
(max 114 lines), output-artifact clarity PASS all 7, copy-paste mostly PASS.

## Findings

BLOCKING: none.

### IMPORTANT (7)

1. `toolkit-orientation` (When-not-to-use + Related): omits `toolkit-skill-standards`
   — the zero-context path (orientation → plugin-foundry) never routes through the
   content/collision bar. Fix: add the routing line + Related entry.
2. `plugin-foundry` Common Mistakes row "Forgetting to sync → the pre-commit hook
   syncs automatically" — stale claim contradicting the same file's own corrected
   hook honesty (and change-control + incident ledger). Fix: rewrite the cell.
3. Version-bump rule stated normatively in THREE skills (change-control,
   plugin-reference, plugin-foundry) with circular ownership pointers; a4f4aa8 cited
   5×. Fix: change-control = single home; others cross-reference.
4. Marketplace field set duplicated as two authoritative schemas (plugin-foundry
   table + plugin-reference list). Fix: plugin-reference = schema home;
   plugin-foundry keeps its actionable template but defers authority.
5. change-control publish-checklist block embeds `<p>` placeholders a weaker model
   pastes literally. Fix: glob form.
6. archaeology + frontier evals lack cross-repo hard negatives for their generic
   phrases ("has this happened before", "roadmap"); archaeology lacks a
   change-control collision case. Fix: add negatives/collision cases.
7. change-control vs condux preflight on bare "am I done?" — preflight owns the
   literal phrase; change-control should lead with the disambiguating object
   ("done shipping this skill/plugin").

### MINOR (7)

1. plugin-reference is an inline catalog, in tension with skill-standards' own
   "catalogs → references/" rule (within budget; accept or move).
2. skills-path rule restated in plugin-foundry and plugin-reference.
3. frontier eval uses skill-internal vocabulary ("front A", "phase A3") a cold user
   wouldn't type; thin sibling coverage.
4. frontier points ongoing campaign outputs at `distillation/` (a dated audit dir) —
   name a durable location.
5. archaeology cites ephemeral pointers (PLAN.md task 1, "distillation/02") beside
   the durable commit hashes.
6. orientation eval claims "explain the two install channels" but plugin-reference is
   the stronger textual owner — eval and descriptions disagree.
7. plugin-foundry templates disagree on author (`jabworks` in plugin.json vs
   `Hieu Vi` in marketplace) — pre-existing, on the tested path; also "no version
   field in marketplace" restated 3×.

## Highest-risk collision prompts (ranked)

1. "create a skill and register it" — 3-way foundry/standards/change-control.
2. bare "am I done?" — preflight vs change-control.
3. "skill isn't triggering, wording looks fine" — playbook vs standards.
4. "what fields does a marketplace entry need" — reference vs foundry vs
   change-control.
5. "what version do I bump" — three-way (circular ownership).
6. "has this dist-drift thing happened before" — archaeology vs playbook.
7. "explain the two install channels" — orientation vs reference.
8. "should we add a dist-drift check" — frontier vs archaeology.

Counts: BLOCKING 0 / IMPORTANT 7 / MINOR 7.
