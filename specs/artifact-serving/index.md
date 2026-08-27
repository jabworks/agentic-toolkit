# Artifact Serving — blueprint artifacts in the review preview

Resolves docket #59 (serve-or-embed). The plan-review annotate server serves
enumerated sibling artifacts (`.html`/`.svg`) at root-relative paths with a
script-dead sandbox, so design docs and specs can link blueprint artifacts
and the click actually works. Supersedes the condux 2.26.0 interim
citation-only contract via its own escape hatch. Folded in: the manual-mode
decision bar stops implying a live listener (`{{MODE}}` injection).

Designed 2026-08-27 (discovery, signed off same day). Ships in condux 2.27.0.

- `decisions.md` — the five ratified decisions with rejected alternatives
- `api.md` — serving routes, headers, 404 behavior, template injections
- `quirks.md` — threat model findings and contract mismatches
- `implementation.md` — files, mechanism reuse, test placement

Related: `specs/discovery-presentation/` (discovery-presentation Q2 and
discovery-presentation Q5 are the origin of this work), `specs/blueprint/`
(artifact locations and the no-JS kit contract).
