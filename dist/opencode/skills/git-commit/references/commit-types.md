# Conventional Commit — types, scopes, templates

## Types

| Type | Use for | Example subject |
|---|---|---|
| `feat` | A new feature or capability | `feat(auth): add OAuth login` |
| `fix` | A bug fix | `fix(api): handle null user id` |
| `docs` | Documentation only | `docs(readme): clarify setup steps` |
| `style` | Formatting, whitespace — no behavior change | `style: run formatter` |
| `refactor` | Code change that neither fixes a bug nor adds a feature | `refactor(cache): extract key builder` |
| `perf` | Performance improvement | `perf(query): batch db reads` |
| `test` | Adding or fixing tests | `test(user): cover edge cases` |
| `build` | Build system, dependencies, tooling | `build: bump vite to 5.2` |
| `ci` | CI configuration and scripts | `ci: add coverage gate` |
| `chore` | Maintenance that doesn't touch src or tests | `chore: update .gitignore` |
| `revert` | Reverting a previous commit | `revert: feat(auth): add OAuth login` |

## Scope

- Optional. A noun naming the area touched: a package, module, or subsystem (`auth`, `api`, `parser`).
- Keep it short and consistent with scopes already used in the repo — check `git log --oneline` first.
- Omit the scope rather than invent a vague one (`feat: …` is fine).

## Subject line

- Imperative mood: "add", "fix", "remove" — not "added" / "fixes".
- ≤ ~50 characters, no trailing period.
- Lowercase after the colon (unless a proper noun).

## Body

- Separate from the subject by one blank line.
- Explain **why** the change was made and any context a reviewer needs — not a line-by-line restatement of the diff.
- Wrap at ~72 columns.
- Optional for trivial changes.

## Footer

- `Refs: #123` / `Fixes: #123` — issue references.
- `BREAKING CHANGE: <description>` — required for incompatible changes (or use `!` after type/scope: `feat(api)!: …`).
- Nothing else unless the user asks. No `Co-Authored-By`, no tool attribution.

## Templates

### Simple, single-line

```
type(scope): imperative subject
```

### With body and issue ref

```
type(scope): imperative subject

Why this change is needed and what it enables. Wrap at ~72 cols.
Note any tradeoff or follow-up.

Refs: #123
```

### Breaking change

```
type(scope)!: imperative subject

What changed and the migration path for consumers.

BREAKING CHANGE: describe the incompatible change and how to adapt.
```
