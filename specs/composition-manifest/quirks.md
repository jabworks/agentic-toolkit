# Quirks and edge cases

## Q1 — Byte-identity cutover

The refactor changes how `dist/` is produced, never what it contains. After
seeding composition.json from today's state and running a full sync,
`git diff dist/` must be empty. Any diff means the declaration was seeded
wrong, not that dist needs updating.

## Q2 — Marketplace description divergence is load-bearing

Descriptions in marketplace.json were deliberately allowed to diverge from
SKILL.md (ratified 2026-08-04, PR #16). Seed them verbatim; the generator
must never "helpfully" re-derive them from SKILL.md.

## Q3 — Silent SKIP becomes a hard error

Today a skill with no dist target prints `SKIP` and syncs nothing — the exact
quiet failure #11 exists to kill. After cutover an undeclared skill fails the
sync. Scaffolding a new skill therefore includes a composition.json edit
(data edit, not code edit) — update toolkit-foundry's checklist.

## Q4 — Pre-commit hook staging

Settled 2026-08-13: the pre-commit hook (scripts/install-hooks.sh) stages
`dist/` plus the generated surfaces outside it — `.claude-plugin/
marketplace.json`, `README.md`, `CLAUDE.md` — and `composition.json` itself.
Side effect inherited from the existing dist/ behavior: unstaged hand edits
to README/CLAUDE.md get swept into a commit that triggers regeneration.

## Q5 — README table normalization (one-time, at cutover)

The README Skills table carried irregular column padding no renderer would
reproduce. The generator emits compact style (`| a | b |`, `|---|---|`) for
all blocks, so that table's whitespace changed once at cutover — rendering
identical, cell content byte-identical.

## Q6 — Marker blocks

`<!-- catalog:begin <id> -->` / `<!-- catalog:end <id> -->` HTML comments are
invisible in rendered markdown. Everything outside them is hand-written and
untouched by the generator; regeneration replaces only the block interior.
A missing or unpaired marker is a generator error, not a silent no-op.

## Q7 — Two writers, one file

sync_plugin_files copies `plugins/<name>/*` files into dist; pluginDirs copy
directories. Keep the existing rule: no dest may have two writers — validated
in composition.mjs (no pluginDir dest collides with a copied file name).
