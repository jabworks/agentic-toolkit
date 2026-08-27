---
"@jabworks/condux": minor
---

The plan-review annotate server serves enumerated sibling blueprint artifacts (`.html`/`.svg`) at root-relative paths, script-dead (`Content-Security-Policy: sandbox`), so design docs and specs can link artifacts and the click works; discovery and blueprint flip from inline-code citations to served-root-relative links (label = href); the manual-mode decision bar stops implying a live listener ("Record decision" + deferred-read copy via a `{{MODE}}` injection). Resolves docket #59; spec at `specs/artifact-serving/`.
