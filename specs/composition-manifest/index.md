# CompositionManifest — Tech Spec

**Last updated:** 2026-08-13
**Commit:** f6e006c
**Status:** draft

## Contents

- [decisions.md](decisions.md) — repo-level declaration, generation scope, test consolidation, rejected alternatives
- [fields.md](fields.md) — composition.json schema and how each field feeds sync / marketplace / doc catalogs
- [quirks.md](quirks.md) — byte-identity constraint, PR #16 description divergence, pre-commit staging, silent-SKIP removal
- [implementation.md](implementation.md) — files touched, generator/validator split, tests trimmed and added

## Changelog
- 2026-08-13: Implemented — composition.json + composition.mjs + generate-catalogs.mjs landed; sync.sh cut over; composition.test.mjs replaces the three bespoke mirror assertions and docs-catalog.test.mjs; first run of the inverse guard caught dist/plugins/docket/.mcp.json shipping with no source (now plugins/docket/.mcp.json); toolkit-ops 1.6.4
- 2026-08-13 (f6e006c): Initial spec — signed-off discovery design for dockets #11 + #12 (api.md n/a: no external contracts)
