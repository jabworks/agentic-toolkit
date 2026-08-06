# Plugin doctor — Tech Spec

**Last updated:** 2026-08-06
**Commit:** 32c11d2 (design stage — pre-implementation)
**Status:** draft
**Docket item:** #1

A per-plugin health check for the three plugins with machinery beyond skill
files — condux, concord, docket. Each ships its own `doctor.mjs` and a doctor
skill, runs from the installed plugin's own files with no repo clone, probes
every registration that plugin depends on across Claude Code / Codex /
OpenCode, and reports `done` / `broken` / `absent` / `skipped` per host with
the fix printed. The standing form of docket `INSTALL.md`'s one-shot verify
step, and the second toolkit-wide convention after ease-of-install.

## Contents

- [decisions.md](decisions.md) — per-plugin vs shared vs standalone, naming, probe depth, offline stance, rejected alternatives
- [api.md](api.md) — `doctor.mjs` CLI contract, output grammar, exit codes, the convention other plugins adopt
- [fields.md](fields.md) — the probe matrix: what each probe reads and what maps to which status
- [quirks.md](quirks.md) — what a doctor cannot prove, stale-clone semantics, the trigger boundary, path-resolution asymmetry
- [implementation.md](implementation.md) — file layout across the three trees, sync surface, tests, phasing

## Changelog

- 2026-08-06 (implementation): three drift decisions, all corrections to
  design-time assumptions caught by checking. (1) `<skill-base>/server/…`
  **does** resolve in a marketplace install — sync copies docket's machinery
  to two depths, so there was no documentation bug to fix (quirks). (2)
  concord's `recall.mjs` is **not** read-only — it runs catch-up and calls
  `writeState`, so no concord hook is ever executed and the execution step is
  a module load instead (quirks, fields). (3) `absent` covers an unmade
  optional registration as well as a missing host, since the ladder says the
  skill still works a rung down (api).
- 2026-08-06: Initial spec from signed-off design (`.condux/designs/2026-08-06-plugin-doctor.md`)
