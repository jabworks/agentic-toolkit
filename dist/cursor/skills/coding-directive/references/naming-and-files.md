# Naming & Files

## Filenames (Tier 1 — enforced)

- **All filenames: kebab-case** (`unicorn/filename-case`, error).
  `log-trail.tsx`, `use-log-store.ts`, `ansi-parser.ts` — including component
  files. The component inside is PascalCase; the file is not.

## Naming semantics _(Medium)_

- Booleans read as predicates: `isLoading`, `hasAccess`, `canEdit`,
  `shouldRetry` — never bare `loading`, `access`.
- Event props are `onX` (the callback prop); internal handlers are `handleX`
  (`<Button onClick={handleSubmit} />`).
- Collections are plural (`users`, `parsedLines`); maps/records name the
  relationship (`userById`).
- No abbreviations beyond a small sanctioned allowlist: `id`, `url`, `db`,
  `env`, `config`, `props`, `ref`, `params`, `args`. Spell out the rest
  (`request` not `req` in app code; `_req` acceptable in Node handler
  signatures).
- Constants that are true module-level immutables: `SCREAMING_SNAKE_CASE`
  (`TYPESCRIPT_FILES`); everything else camelCase.
- Hooks: `use-*.ts` file, `useX` export (`use-log-store.ts` → `useLogStore`).
