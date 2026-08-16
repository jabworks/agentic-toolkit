# PreflightDriftCheck — Tech Spec

> Preflight's drift check: compare the implementation against the task's spec
> before finalize and surface both directions of drift as soft-gate findings,
> so a spec and its code cannot silently diverge.

**Last updated:** 2026-07-11
**Commit:** 6cfa3a1
**Status:** draft

## Contents

- [decisions.md](decisions.md) — approach B, bidirectional drift, soft-gate findings, out-of-scope
- [api.md](api.md) — preflight output contract: checklist line, findings table, spec-dir lookup
- [quirks.md](quirks.md) — no-spec silent skip, missing/scaffold concern files, accept semantics
- [implementation.md](implementation.md) — files touched, patterns, evals, version bump

## Changelog
- 2026-07-11 (6cfa3a1): Initial spec — signed-off discovery design (fields.md n/a: no data mappings)
