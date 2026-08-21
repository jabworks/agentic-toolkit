# surface-kit — Tech Spec

> Shared design system for the toolkit's four self-contained HTML surfaces:
> extends the colour core into type, space, radius, motion and elevation, and
> generalizes `check-tokens.mjs` from one inlined region to three so state and
> behaviour are written once instead of four times.

**Last updated:** 2026-08-20
**Commit:** 46947a4
**Status:** draft

## Contents

- [decisions.md](decisions.md) — the six ratified calls and what was rejected
- [design.md](design.md) — the signed-off design this spec was written from
- [audit.md](audit.md) — the measured state of all four surfaces before the
  redesign, and which taste-skill recommendations the no-egress constraint rules out
- [style-guide.html](style-guide.html) — living style guide, rendered in the
  proposed tokens; the artifact the design was signed off against
- [api.md](api.md) — region grammar, checker CLI, and the three producer
  contracts the redesign must not break
- [quirks.md](quirks.md) — the template-literal corruption class, placeholder
  substitution, byte-mirror and release traps
- [implementation.md](implementation.md) — key files, phasing, tests, release surface

## Changelog
- 2026-08-20 (46947a4): Initial spec from signed-off design
  ([design.md](design.md))
