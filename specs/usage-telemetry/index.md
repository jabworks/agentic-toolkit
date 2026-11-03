# usage-telemetry — Tech Spec

> Durable, local usage tracking: a `usage-trace` plugin copies Claude and Codex session data into a private store, and session-report measures against it.

**Last updated:** 2026-11-02
**Commit:** PR #211
**Status:** draft

## Contents

| File | Answers |
|---|---|
| [PRD](prd.md) | what is being built, for whom, and how success is measured |
| [Decisions](decisions.md) | why it works this way, and what was rejected |
| [Fields](fields.md) | the versioned store format session-report reads |
| [Quirks](quirks.md) | what will bite you, and whether it is mitigated |

## Changelog
- 2026-11-02 (PR #211): Period comparison (plan Task 10) — report JSON gains `periods[]`, the store's coverage gains `earliest`
- 2026-10-30 (PR #210): session-report reads the store, with dated prices (plan Task 9)
- 2026-10-30 (PR #209): Initial spec
