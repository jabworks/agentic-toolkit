# Implementation

## Flattening (bundles only)

`scripts/composition.mjs` dest rule: bundle skills mirror to
`dist/plugins/<bundle>/skills/<skill>` (was `…/skills/<bundle>/<skill>`).
Single-skill plugins keep `skills/<name>` — already spec-shaped.

Path references that move with it:
- Bundle manifests × 2 hosts: `"skills": "./skills"`
- `skills/workflow/hooks/codex-hooks.json` — annotate-server path
  (`${PLUGIN_ROOT}/skills/plan-review/references/annotate-server.js`)
- concord codex manifest `hooks` path → `./skills/remember/hooks/codex-hooks.json`
- `scripts/build-opencode.mjs` `CONDUX_BUNDLE_DIR` → `dist/plugins/condux/skills`
- Tests encoding the nested shape (plugin-doctor fixture, condux-hooks,
  any dist-mirror bespoke assertions)

Old nested trees are deleted in the same sync; composition.test's
no-undeclared guard proves nothing stale remains.

## Manifest generator

New step (housed with the catalog generator, run by sync): for each plugin
in composition.json, read `dist/plugins/<name>/.claude-plugin/plugin.json`,
emit `dist/plugins/<name>/plugin.json` with the spec's closed field set
(see fields.md). Docket additionally gets `mcp.json` sourced from
`plugins/docket/mcp.json` via `sync_plugin_files`.

## Tests

- Generator parity: every root plugin.json matches generator output byte
  for byte; name pattern + closed-field-set asserted.
- Spec-shape guard: every plugin's `skills/` children each contain a
  SKILL.md (immediate-child discovery yields the full skill set).
- Existing suites updated where they encode the nested layout.

## Verification

Cursor's documented local-test flow: copy docket + condux + one
single-skill plugin to Windows `~/.cursor/plugins/local/<name>`, reload,
confirm components load (skills listed, docket MCP starts).
