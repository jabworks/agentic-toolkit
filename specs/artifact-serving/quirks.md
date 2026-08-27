# Quirks — Artifact Serving

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | A served artifact runs same-origin and can forge steer decisions | serving agent-authored HTML without an origin boundary | high | yes — `CSP: sandbox`, script-dead (D2) |
| Q2 | `sandbox allow-scripts` still permits CSRF-shaped simple POSTs | relaxing the sandbox "because artifacts might want JS" | high | yes — allow-scripts rejected outright; blueprint's kits permit no JS |
| Q3 | Git-root-relative citations cannot resolve as served hrefs | mixing the 2.26.0 citation form with working links | medium | yes — D4: one served-root-relative string as href and label |
| Q4 | The manual-mode decision bar implied a live listener | submitting a decision outside steer mode | low | yes — D5 mode-aware bar |

## Q1 — A served artifact runs same-origin and can forge steer decisions

**Discovered:** 2026-08-27 (design, before implementation)

**Symptom:** none yet — identified at design time, which is the point.
**Trigger:** serving sibling HTML from the annotate server's origin with no response-header boundary.
**Cause:** same origin means a served page's scripts can call `/api/*` — including the steer-mode decision channel, where a forged Approve tells the agent to proceed. Under the ratified threat model (own repos + agent output), a prompt-injected agent writing a poisoned artifact is the realistic attacker.
**Mitigation:** yes — `Content-Security-Policy: sandbox` with no `allow-*` flags: opaque origin and no script execution at all. Legitimate blueprint artifacts lose nothing (their kits ban JS and external assets). The mitigation depends on that kit contract staying script-free — if blueprint ever ships interactive artifacts, this decision reopens; note it in any such design.

## Q2 — `sandbox allow-scripts` still permits CSRF-shaped simple POSTs

**Discovered:** 2026-08-27 (design)

**Symptom:** hypothetical relaxation analyzed and rejected.
**Trigger:** granting `allow-scripts` so artifacts could run JS.
**Cause:** an opaque origin blocks credentialed same-origin fetches, but simple requests (form-encoded POST) fire without preflight; whether they land depends on how forgivingly the endpoint parses bodies — a boundary made of parser strictness is not a boundary.
**Mitigation:** yes — by construction: allow-scripts is rejected (D2), so the question never arises at runtime.

## Q3 — Git-root-relative citations cannot resolve as served hrefs

**Discovered:** 2026-08-27 (design — the §3/§4 reconciliation)

**Symptom:** the 2.26.0 interim contract cites `.condux/designs/...` from the git root; as an href that path would 404 because the served root is the plan/spec directory, not the git root.
**Trigger:** turning the interim citations into links without changing their form.
**Cause:** two different resolution bases — filesystem-from-git-root for human readers vs URL-from-served-root for the browser.
**Mitigation:** yes — D4 standardizes on the served-root-relative form for both label and href; inside a spec dir that equals doc-relative, so promoted links also work on GitHub.

## Q4 — The manual-mode decision bar implied a live listener

**Discovered:** 2026-08-27 (field observation by the owner, during this design's own preview)

**Symptom:** the bar renders Approve / Request Revisions as if submitting acts now; in manual mode the decision lands in `review.feedback.md`, which nothing watches until the agent's next checkpoint.
**Trigger:** submitting a decision from a manual-mode preview mid-discovery.
**Cause:** the template has no mode signal — only `{{PLAN_NAME}}` is injected — so the client cannot present the deferred semantics it actually has.
**Mitigation:** yes — D5: `{{MODE}}` injection, "Record decision" labeling and deferred-read sub-line in manual mode, toast echoing the API's `mode` field.
