# Decisions

## D1 — Declaration lives in a repo-level `composition.json`

One committed file at the repo root declares every plugin: bundle membership,
plugin-level dir mappings, marketplace description, catalog rows.

Rejected:
- **Field inside `plugin.json`** (awesome-copilot's model): we ship *two*
  manifests per plugin (`.claude-plugin/` + `.codex-plugin/`), so the field
  would either duplicate into both (drift risk, `manifest-parity.test.mjs`
  entanglement) or privilege one host. Their one-manifest advantage doesn't
  transfer.
- **Per-plugin `plugins/<name>/composition.json`**: scatters cross-plugin
  facts (bundle membership) across 12 files; sync and generator must glob.

## D2 — Generate marketplace.json fully; doc catalogs via marker blocks

`.claude-plugin/marketplace.json` is written whole by the generator.
`README.md` / `CLAUDE.md` keep their hand-written prose; only the catalog
tables sit inside `<!-- catalog:begin/end -->` markers and are regenerated.
Full-file README generation rejected — ours is a crafted doc, not a catalog.

## D3 — One generic composition test; bespoke tests keep behavior only

New `tests/composition.test.mjs` asserts: every declared source→dest pair
mirrors byte-for-byte, no undeclared plugin-level dir exists in
`dist/plugins/*/`, marketplace.json + both doc blocks match generator output,
declaration is schema-valid. `condux-hooks.test.mjs`, the agents check in
`skill-invariants.test.mjs`, and `docket-server.test.mjs` drop only their
mirror assertions; wire-format / host-variable / server-behavior checks stay.
`docs-catalog.test.mjs` retires (presence is implied by generated blocks).

## D4 — Divergent marketplace descriptions are declared input

The 2026-08-04 ratification (PR #16) that marketplace descriptions may diverge
from SKILL.md descriptions is preserved: the generator reads
`plugins.<name>.marketplace.description` from the declaration and never
derives it from SKILL.md. Flattening the two back together would silently
revert a ratified decision.

## Out of scope

`build-opencode.mjs` (keeps its own discovery; may read composition later),
release machinery, npm channel, skill content changes, per-bundle README
prose.
