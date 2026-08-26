# Quirks and edge cases

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Cutover must be byte-identical | seeding composition.json from today's state | high | yes — `git diff dist/` empty is the acceptance test |
| Q2 | Marketplace description divergence is load-bearing | the generator "helpfully" re-deriving from SKILL.md | medium | yes — descriptions are declared input, seeded verbatim |
| Q3 | Silent SKIP becomes a hard error | scaffolding a skill without declaring it | medium | yes — undeclared skill fails the sync |
| Q4 | Pre-commit sweeps unstaged doc edits | hand edits to README/CLAUDE.md at commit time | low | no — inherited from the existing dist/ staging behavior |
| Q5 | README table normalization | the generator's compact table style | low | yes — one-time whitespace change at cutover, content byte-identical |
| Q6 | Marker blocks are the only generated region | missing or unpaired markers | medium | yes — a broken marker is a generator error, not a silent no-op |
| Q7 | Two writers, one file | a pluginDir dest colliding with a copied file name | medium | yes — validated in composition.mjs |

## Q1 — Byte-identity cutover

**Symptom:** `git diff dist/` non-empty after the cutover sync.
**Trigger:** seeding composition.json from today's state and running a full sync.
**Cause:** the refactor changes how `dist/` is produced, never what it contains — so any diff means the declaration was seeded wrong.
**Mitigation:** yes — the empty diff is the acceptance test; a diff is fixed in the declaration, never by updating dist.

## Q2 — Marketplace description divergence is load-bearing

**Symptom:** ratified descriptions silently replaced by SKILL.md text.
**Trigger:** the generator re-deriving descriptions from SKILL.md.
**Cause:** descriptions in marketplace.json were deliberately allowed to diverge from SKILL.md (ratified 2026-08-04, PR #16).
**Mitigation:** yes — seed them verbatim; the generator must never "helpfully" re-derive them.

## Q3 — Silent SKIP becomes a hard error

**Symptom:** before the cutover, a skill with no dist target printed `SKIP` and synced nothing — the exact quiet failure #11 exists to kill.
**Trigger:** scaffolding a new skill without a composition.json entry.
**Cause:** sync targets come from the declaration.
**Mitigation:** yes — after cutover an undeclared skill fails the sync. Scaffolding a new skill therefore includes a composition.json edit (data edit, not code edit) — toolkit-foundry's checklist carries it.

## Q4 — Pre-commit hook staging

**Symptom:** unstaged hand edits to README/CLAUDE.md swept into a commit that triggers regeneration.
**Trigger:** committing while those files carry unstaged edits.
**Cause:** settled 2026-08-13 — the pre-commit hook (scripts/install-hooks.sh) stages `dist/` plus the generated surfaces outside it (`.claude-plugin/marketplace.json`, `README.md`, `CLAUDE.md`) and `composition.json` itself.
**Mitigation:** no — a side effect inherited from the existing dist/ behavior; known and accepted.

## Q5 — README table normalization (one-time, at cutover)

**Symptom:** the README Skills table's whitespace changed at cutover.
**Trigger:** the generator emitting compact style (`| a | b |`, `|---|---|`) for all blocks.
**Cause:** the table carried irregular column padding no renderer would reproduce.
**Mitigation:** yes — a one-time change: rendering identical, cell content byte-identical.

## Q6 — Marker blocks

**Symptom:** generated content leaking outside its region, or a marker silently ignored.
**Trigger:** a missing or unpaired `<!-- catalog:begin <id> -->` / `<!-- catalog:end <id> -->` pair.
**Cause:** the markers are HTML comments, invisible in rendered markdown, so a broken pair has no visual tell.
**Mitigation:** yes — everything outside the markers is hand-written and untouched; regeneration replaces only the block interior, and a missing or unpaired marker is a generator error, not a silent no-op.

## Q7 — Two writers, one file

**Symptom:** a dist destination written by both the file copy and a directory copy.
**Trigger:** a pluginDir dest colliding with a copied file name.
**Cause:** `sync_plugin_files` copies `plugins/<name>/*` files into dist; pluginDirs copy directories.
**Mitigation:** yes — no dest may have two writers, validated in composition.mjs.
