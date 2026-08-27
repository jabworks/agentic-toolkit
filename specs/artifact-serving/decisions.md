# Decisions — Artifact Serving

| # | Decision | Because | Status |
|---|---|---|---|
| D1 | Serve, not embed, not status quo | only option meeting "click opens artifact" without widening the shared renderer boundary | ratified 2026-08-27 |
| D2 | Allowlist membership + `CSP: sandbox` | membership is the only door (no path resolution); script-dead closes decision forgery | ratified 2026-08-27 |
| D3 | Root-relative serving, renderer untouched | root-relative hrefs resolve naturally; `safeHref()` already passes them | ratified 2026-08-27 |
| D4 | Link contract: one served-root-relative string | label = href kills two-paths drift; supersedes the 2.26.0 interim citation | ratified 2026-08-27 |
| D5 | Mode-aware decision bar | manual mode's mechanism is deferred; the presentation must say so | ratified 2026-08-27; amended at preflight (three buttons, live-mode injection) |

## D1 — Serve, not embed, not status quo (2026-08-27)

The annotate server gains an allowlisted artifact route; the markdown
renderer is untouched. Serve is the only option that meets the reader goal
("click opens artifact") without widening the `esc()`/`safeHref()` boundary
shared by plan review, design review, and spec preview.

Rejected: **embed** (audited SVG/HTML passthrough — widens the shared
renderer boundary, SVG carries script, exceeds the goal); **status quo**
(inline-code citation — reader goal unmet; the 2.26.0 contract was
explicitly interim, see docket #59).

Threat model ratified with the owner: own repos + agent output — an
agent-authored artifact is semi-trusted, since a prompt-injected agent can
write a poisoned artifact.

## D2 — Allowlist membership + `Content-Security-Policy: sandbox` (2026-08-27)

Two layers. (1) Only files enumerated by a `listArtifacts()` walk are
servable — the same membership shape as `listDocs()` (`readPlan` refuses
non-members; the request URL is never path-resolved), which structurally
closes traversal, dotfiles, and feedback files. (2) Every served artifact
carries `Content-Security-Policy: sandbox` — opaque origin, all script
execution dead, so `/api/*` is unreachable and steer-mode decision forgery
is inert.

Rejected: **`sandbox allow-scripts`** (opaque origin still permits
simple-request POSTs — CSRF-shaped; script-dead is strictly safer and free
because blueprint's kits permit no JS); **second server/port** (real origin
isolation, but a second process for a threat the header already closes).

## D3 — Root-relative serving, renderer untouched (2026-08-27)

An enumerated artifact is served at its root-relative path under the
directory the server already owns (dir mode → the spec dir; single-file
mode → the plan file's directory). The review page lives at `/`, so
root-relative hrefs resolve naturally and `safeHref()` — which already
passes relative hrefs — needs no change. Types: `.html` and `.svg` only.

## D4 — Link contract: one served-root-relative string (2026-08-27)

Discovery and blueprint write markdown links whose href AND label are the
same served-root-relative string: `[mockups/flow.html](mockups/flow.html)`.
Supersedes the condux 2.26.0 interim rule (inline-code, git-root-relative)
— that form cannot resolve as an href. Unchanged: promote-on-cite (a
spec-referenced artifact is copied into the spec dir and cited by its
committed path — which now also renders as a working link on GitHub) and
the no-inlined-copies rule. Outside the preview, the label still names the
path, so nothing degrades without a server.

## D5 — Mode-aware decision bar (2026-08-27)

The server injects `{{MODE}}` into the template alongside `{{PLAN_NAME}}`,
using the same mode names `/api/feedback` reports (`steer`/`hook`/`codex`/
`manual`) — hook and codex modes are live listeners too, so only true
`manual` carries the deferred presentation. In manual mode the bar's summary
line says decisions are recorded for the agent to read at its next
checkpoint, and each decision button gains a "Record …" label — "Record
approval" / "Record revisions" / "Record rejection" (the bar has three
buttons, not one; amended at implementation preflight 2026-08-27 from the
ratified "the submit button reads Record decision"). Live modes are
unchanged. The post-submit toast follows the `mode` field `/api/feedback`
returns, falling back to the injected constant.

Rejected: **hiding the bar in manual mode** (sign-off's Design Review Loop
depends on submitting from manual mode); **live-polling manual mode** (the
mechanism — a deferred file write — is correct; only the presentation lied).
