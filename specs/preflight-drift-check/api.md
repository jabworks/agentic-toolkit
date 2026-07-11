# API — preflight output contract

No code API; the contract is preflight's rendered output.

## Checklist line

The preflight Output block gains one line:

```
□ Spec drift           ✓ / ✗ / N/A [notes]
```

- `✓` — spec dir found, all existing concern files consistent with the
  implementation
- `✗` — at least one finding (see table)
- `N/A` — no spec dir for this task (silent skip, no commentary)

## Findings table (only when ✗)

```
| concern file | spec says | implementation does | decision |
|---|---|---|---|
| api.md | error shape {code,msg} | throws bare string | fix code |
| quirks.md | retries on 429 | no retry | update spec |
```

The `decision` column is filled by the **user**, one of:
`fix code` · `update spec` · `accept` — collected via a single batched
question (AskUserQuestion where available), never auto-filled.

## Spec-dir lookup

Same resolution as the `/workflow` router step-2 lookup:
nearest package root's `specs/<pkg-relpath>/<slug>/`, then
`<git-root>/specs/<slug>/`; nearest match wins. Fuzzy kebab-case match of
the task subject.
