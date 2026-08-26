# Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Own tree (`dist/cursor/skills/`), not a pointer at the opencode tree | one tree per channel — coupling breaks the moment either host needs a host-specific tweak | accepted |
| 2 | Shared builder, not a forked script | one fold transform to test; inter-tree drift impossible until a host deliberately diverges | accepted |
| 3 | Docket installer gains a `cursor` target | scope widened at sign-off; global `~/.cursor/mcp.json` is the installer surface, project-level stays a documented snippet | accepted |
| 4 | Host-feature gaps are documented, not built | hooks and named agents have no Cursor surface; the README states what works, degrades, and is absent | accepted |

## 1. Own tree over reuse — 2026-08-14

**Decided:** `dist/cursor/skills/` is its own emitted tree, not a pointer at `dist/opencode/skills/`, even though the transform is identical today.
**Because:** the repo's channel philosophy is one tree per channel — coupling breaks the moment either host needs a host-specific tweak (Cursor's `paths` / `disable-model-invocation`, or an OpenCode-only change).

| Alternative | Why not |
|---|---|
| Reuse the opencode tree | Channel coupling |
| Fold triggers into `description` at source | Abandons the `when_to_use` convention; blows Claude's 500-char description / 1024-char frontmatter budgets |

**Consequences**
- Duplicated generated dirs — already the accepted pattern for `dist/`.

## 2. Shared builder, not a forked script

**Decided:** the fold transform (when_to_use → description, drop the field) is extracted from `scripts/build-opencode.mjs` and both trees are emitted from one builder run.
**Because:** one transform to test; drift between trees becomes impossible until a host deliberately diverges.

## 3. Docket installer gains a cursor target

**Decided:** `install.sh` learns `cursor`, writing the stdio server entry into `~/.cursor/mcp.json` (global; project-level `.cursor/mcp.json` is a documented manual snippet, not an installer target). Documented in docket INSTALL.md.
**Because:** scope widened at design sign-off.

**Consequences**
- Docket plugin bumped 0.5.0 → 0.6.0 (minor: new installer target).

## 4. Host-feature gaps are documented, not built

**Decided:** the README compat row states what works, what degrades (routing falls back to catalog inference, ~80% in evals), and what is absent.
**Because:** the condux SessionStart routing hook, plan-review ExitPlanMode/Stop hooks, and named agents have no Cursor surface — there is nothing to build against.
