# research-orchestration — Tech Spec

> Research-mode parity for condux: a lead skill (`condux:research`) and a `scout` worker agent that produce cited, dev-tuned research reports on every host.

**Last updated:** 2026-10-09
**Commit:** PR #182
**Status:** draft

## Contents

| File | Answers |
|---|---|
| [PRD](prd.md) | why this exists, for whom, and where the scope boundary sits |
| [Decisions](decisions.md) | why it works this way, and what was rejected |
| [API](api.md) | the scout contract and the plan, notes, and report shapes |
| [Quirks](quirks.md) | what will bite you, and whether it is mitigated |
| [Implementation](implementation.md) | which files change, including the four-agents ripple |
| [Verification](verification.md) | the quality baseline, the depth-gate check, and the Haiku scout A/B |

## Changelog
- 2026-10-08 (PR #180): Initial spec, from the signed-off discovery (docket #98)
- 2026-10-08 (PR #180): Depth gate (decision 7); verification.md; pass threshold set from the baseline
- 2026-10-09 (PR #182): Q4 re-checked — context-mode skips its WebFetch redirect inside subagents, so scouts fetch fine; the baseline's disabled-plugin note corrected
