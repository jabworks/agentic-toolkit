# Concord — Tech Spec

**Last updated:** 2026-08-06
**Commit:** 3a872c6 (initial spec; later entries in the changelog below)
**Status:** draft

Continuous memory for Codex — captures sessions, compresses them into aging
tiers, and injects the relevant slice back at every session start. Clean-room
MIT; `remember` keeps Claude Code.

## Contents

- [decisions.md](decisions.md) — clean-room rationale, Codex-only scope, capture model, tier boundary
- [api.md](api.md) — Codex hook payload contract, recall composition/budget, `state.json`
- [quirks.md](quirks.md) — worktree roots, subagent skip, rollout parsing hazards, failure modes
- [implementation.md](implementation.md) — layout, patterns to follow, tests, registration, phasing

## Changelog
- 2026-08-06 (docket #8): layout corrected — the health check is the sibling
  skill `skills/concord-doctor/`, not the `bin/doctor.mjs` this spec drafted
  (moved by docket #1); `references/` now also carries `INSTALL.md`, and the
  installer verifies what it registered (implementation).
- 2026-07-29 (3a872c6): Initial spec
