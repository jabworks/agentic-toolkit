# Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Declaration lives in a repo-level `composition.json` | a plugin.json field would duplicate into both host manifests or privilege one; per-plugin files scatter cross-plugin facts | accepted |
| 2 | marketplace.json generated whole; doc catalogs via marker blocks | README/CLAUDE.md are crafted docs, not catalogs — only the tables are generated | accepted |
| 3 | One generic composition test; bespoke tests keep behavior only | mirror assertions belong to the declaration; wire-format and behavior checks stay with their skills | accepted |
| 4 | Divergent marketplace descriptions stay declared input | deriving them from SKILL.md would silently revert the 2026-08-04 ratification (PR #16) | accepted |

## D1 — Declaration lives in a repo-level `composition.json`

**Decided:** one committed file at the repo root declares every plugin — bundle membership, plugin-level dir mappings, marketplace description, catalog rows.
**Because:** cross-plugin facts need one home that neither host manifest owns.

| Alternative | Why not |
|---|---|
| Field inside `plugin.json` (awesome-copilot's model) | We ship *two* manifests per plugin (`.claude-plugin/` + `.codex-plugin/`), so the field would either duplicate into both (drift risk, `manifest-parity.test.mjs` entanglement) or privilege one host. Their one-manifest advantage doesn't transfer |
| Per-plugin `plugins/<name>/composition.json` | Scatters cross-plugin facts (bundle membership) across 12 files; sync and generator must glob |

## D2 — Generate marketplace.json fully; doc catalogs via marker blocks

**Decided:** `.claude-plugin/marketplace.json` is written whole by the generator; `README.md` / `CLAUDE.md` keep their hand-written prose, with only the catalog tables inside `<!-- catalog:begin/end -->` markers regenerated.
**Because:** ours is a crafted doc, not a catalog.

| Alternative | Why not |
|---|---|
| Full-file README generation | The README is a crafted doc; generating it whole sacrifices the prose to save the tables |

## D3 — One generic composition test; bespoke tests keep behavior only

**Decided:** `tests/composition.test.mjs` asserts: every declared source→dest pair mirrors byte-for-byte, no undeclared plugin-level dir exists in `dist/plugins/*/`, marketplace.json + both doc blocks match generator output, and the declaration is schema-valid. `condux-hooks.test.mjs`, the agents check in `skill-invariants.test.mjs`, and `docket-server.test.mjs` drop only their mirror assertions; wire-format / host-variable / server-behavior checks stay. `docs-catalog.test.mjs` retires (presence is implied by generated blocks).
**Because:** mirror assertions belong to the declaration; behavior checks belong with their skills.

## D4 — Divergent marketplace descriptions are declared input

**Decided:** the generator reads `plugins.<name>.marketplace.description` from the declaration and never derives it from SKILL.md.
**Because:** the 2026-08-04 ratification (PR #16) that marketplace descriptions may diverge from SKILL.md descriptions is preserved — flattening the two back together would silently revert a ratified decision.

## Out of scope

`build-opencode.mjs` (keeps its own discovery; may read composition later), release machinery, npm channel, skill content changes, per-bundle README prose.
