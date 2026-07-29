# Concord — Tech Spec

**Last updated:** 2026-07-29
**Commit:** 3a872c6
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
- 2026-07-29 (3a872c6): Initial spec
