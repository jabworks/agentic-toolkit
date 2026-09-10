# blueprint — Tech Spec

> condux skill producing dependency-free visual clarity artifacts at design
> time — HTML wireframes and renders for UI in the surface-kit token
> language (two modes, one skeleton), inline-SVG system diagrams for BE.

**Last updated:** 2026-09-10
**Commit:** 3e31e7f
**Status:** draft

## Contents

- [decisions.md](decisions.md) — approach choice, name, fidelity bar, rejected alternatives
- [implementation.md](implementation.md) — skill layout, kits, integration edits, dist ripple
- [quirks.md](quirks.md) — edge cases: headless hosts, non-git repos, citation promotion
- [verification/2026-09-08-routing-gate/report.md](verification/2026-09-08-routing-gate/report.md) — live verification of the routing gate: the motivating diagram as drawn vs re-routed
- [verification/2026-09-10-font-size-calibration/report.md](verification/2026-09-10-font-size-calibration/report.md) — the checker's width estimate measured against three real diagrams rendered in Chrome; the font-size cascade it must mirror
- [verification/2026-09-10-codex-trigger-check/report.md](verification/2026-09-10-codex-trigger-check/report.md) — three Codex trials on the shipped 2.30.0: does the agent run the checker unprompted before delivering, and does the base font size land on the `<svg>` tag

## Changelog
- 2026-09-10 (design, unshipped): visual language signed off — role tint, kind marks, protocol dash,
  legend, boundary title strips across all four families; accent rule rewritten — see D9, Q10, Q11
- 2026-09-10 (3e31e7f): `diagram-check.mjs` resolves font size as the browser cascades it
  (class rule, `text` rule, attribute, inherited, 16px default) instead of assuming 13px;
  new `text-overflows-box` finding; kit states the sizing rule and halo budget — see Q9
- 2026-09-08 (eb8cd83): Layout and routing rules in diagram-kit.md and the `diagram-check.mjs`
  collision gate before Deliver — see Q8 and decision #8
- 2026-08-26 (1d1c39f): Grayscale dialect retired — wireframe/render modes on the
  surface-kit token core; see the scoped fidelity decision in decisions.md
- 2026-08-20 (ca92d16): Initial spec — discovery sign-off
