# Environment, Formatting & Compiler Settings

Tier 1 — extracted from the `github.com/jabworks/style-guide` configs
(Prettier/oxfmt, TypeScript). Mechanically enforced; violations fail CI.

## Toolchain assumptions

- **Always latest / bleeding-edge versions**, especially in personal projects.
  Do not pin conservative versions or assume an older API surface. Verify
  current tool behavior instead of relying on pretrained assumptions.
- **ESM everywhere.** `"type": "module"`, `.mjs` config files,
  `import`/`export` only. No CommonJS in new code.
- **Monorepo:** Turborepo + pnpm workspaces. Internal deps use the
  `workspace:*` protocol. Versioning via Changesets. Packages are scoped
  (`@jabworks/*`; `@haven/*` in Haven).
- **Dual lint/format toolchain, kept in parity:** ESLint + Prettier is the
  canonical pair; oxlint + oxfmt is the fast mirror. Both must produce
  equivalent results. When editing configs, any rule change in one toolchain
  must be ported (or explicitly noted as a gap) in the other.
- **Zero-warning policy.** Configs distinguish `error` vs `warn`, but CI runs
  deny-warnings (`oxlint --deny-warnings`, lint gates in GitHub Actions).
  Treat every warning as a failure. Never leave new warnings behind.
- **Testing:** Vitest (including browser mode) and Playwright. Run Vitest with
  `--run` (no watch mode) in automation.

## Formatting (Prettier / oxfmt — identical settings)

```
printWidth: 120          tabWidth: 2 (spaces, never tabs)
semi: true               singleQuote: true
jsxSingleQuote: true     quoteProps: 'as-needed'
trailingComma: 'all'     arrowParens: 'avoid'
bracketSpacing: true     bracketSameLine: false
singleAttributePerLine: true
endOfLine: 'lf'
```

Consequences to internalize:

- Lines may run long — 120, not 80. Don't wrap prematurely.
- Single-arg arrow functions have **no parens**: `x => x + 1`.
- Every JSX attribute goes on **its own line** when there's more than one.
- JSX attributes use **single quotes**.
- Trailing commas everywhere, including function args and generics.
- Strings: single quotes; double quotes only to avoid escaping; template
  literals always allowed.
- Ternary/binary wrapping: break **after** operators, but **before** `?`
  and `:`.

Plugins (always active): Tailwind class sorting
(`prettier-plugin-tailwindcss` / `sortTailwindcss`), alphabetical JSON key
sorting for non-`package.json` JSON files, `package.json` field ordering
(`prettier-plugin-packagejson` / `sortPackageJson`). Never hand-order Tailwind
classes or JSON keys — the formatter owns that.

## TypeScript compiler settings

Base (`@jabworks/typescript-config/base.json`):

- `strict: true` plus `noUncheckedIndexedAccess: true` — indexed access
  returns `T | undefined`; handle it, don't assert it away.
- `isolatedModules: true`, `moduleDetection: "force"` — every file is a
  module; use `export type` / inline type imports correctly.
- `module` / `moduleResolution`: `NodeNext` (base, Node packages), `ESNext` +
  `Bundler` (Next.js apps).
- `target: ES2022`, lib includes DOM.
- Libraries emit `declaration` + `declarationMap`.
- Variants: `nextjs` (`jsx: preserve`, `allowJs`, `noEmit`), `react-library`
  (`jsx: react-jsx`).
