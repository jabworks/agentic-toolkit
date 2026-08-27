# Implementation — Artifact Serving

## Files

| File | Change |
|---|---|
| `skills/plan-review/references/annotate-server.js` | `listArtifacts()` walk (mirror `listDocs()`'s skip rules, `.html`/`.svg` members); artifact branch in the request handler before the 404 (membership check → read → content-type + `CSP: sandbox`); `{{MODE}}` in the template render |
| `skills/plan-review/references/plan-review-template.html` | mode-aware decision bar (D5): manual → "Record decision" + sub-line; toast echoes `mode` from `/api/feedback` |
| `skills/discovery/SKILL.md` + `references/design-template.md` | D4 link contract (supersedes the 2.26.0 inline-code wording) |
| `skills/blueprint/SKILL.md` | D4 link contract in DELIVER/CITE steps and the Inside-the-Workflow bullet |
| `specs/discovery-presentation/quirks.md` | discovery-presentation Q5 mitigation flips to closed, supersession recorded |
| `docket/DOCKET.md` | #59 closes on ship |

## Patterns to follow

- **Membership, not sanitization:** the artifact route must mirror
  `readPlan()`'s guard (`annotate-server.js:127`) — refuse anything not in
  the enumeration; never `path.join` the raw URL and check afterwards.
- **Dependency-free:** two content types, hardcoded; no mime library.
- Dist flows via `bash scripts/sync.sh plan-review` (+ discovery,
  blueprint); never edit `dist/` directly.

## Tests (`tests/annotate-server.test.mjs`)

- Traversal (plain `../`, URL-encoded) → 404 — asserted via the allowlist
  refusing, matching the mechanism built.
- Un-enumerated extension / dotfile / `*.feedback.*` → 404.
- Enumerated `.html` and `.svg` → 200, correct content-type, and
  `Content-Security-Policy: sandbox` present.
- `{{MODE}}` injected: `steer` under `--steer`, `manual` otherwise.
- Existing doc-serving and `/api/*` contracts unchanged.

## Versioning

condux 2.26.0 → 2.27.0 (minor — new serving capability), both host
manifests, plus a `pnpm changeset` (minor) for `@jabworks/condux`.
