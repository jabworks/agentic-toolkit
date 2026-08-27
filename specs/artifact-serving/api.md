# API — Artifact Serving

## Serving contract

| Request | Response |
|---|---|
| `GET /<root-relative-path>` where the path is a member of `listArtifacts()` | 200, body = file bytes; `Content-Type: text/html; charset=utf-8` (`.html`) or `image/svg+xml` (`.svg`); `Content-Security-Policy: sandbox` on both |
| `GET /<anything not enumerated>` | 404 (existing behavior, unchanged) |
| Traversal shapes (`/../x`, encoded `%2e%2e`, absolute) | 404 — they can never be members of the enumeration; the URL is never path-resolved against the filesystem |

Served root: dir mode → the spec directory; single-file mode → the plan
file's directory. Same root the server already watches.

## Enumeration (`listArtifacts()`)

- Walks the served root recursively, same skip rules as `listDocs()`:
  entries starting with `.` are skipped (files and directories), and
  `*.feedback.*` names are never included.
- Members: files matching `/\.(html|svg)$/i` only.
- Re-enumerated per request, so an artifact written mid-review is servable
  without a restart.

## Template injections

| Placeholder | Value | Purpose |
|---|---|---|
| `{{PLAN_NAME}}` | basename of the plan target | existing |
| `{{MODE}}` | `steer` \| `hook` \| `codex` \| `manual` — the same names `/api/feedback` reports; hook and codex ARE live listeners (a process blocks on the decision), so only true `manual` carries the deferred copy | decision-bar affordance (D5): the client treats exactly `manual` as deferred and everything else as live |

`POST /api/feedback` already returns `{ status, mode, file }`; the client
toast echoes that `mode` after submit. No API shape changes.

## Unchanged surfaces

- All `/api/*` routes keep their contracts.
- The markdown renderer (`esc()`, `safeHref()`) is byte-identical — relative
  hrefs already pass through it.
