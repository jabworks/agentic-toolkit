# Imports, Exports & Monorepo Boundaries

## Import order & export rules (Tier 1 — enforced)

- **Import order** (auto-sorted by `simple-import-sort`, groups separated by
  blank lines):
  1. `react` (and `react-*`)
  2. External packages
  3. `@/` internal alias imports
  4. Relative imports (non-CSS)
  5. Anything else
  6. **CSS/SCSS imports last**
- Under the oxlint+oxfmt toolchain, `sortImports: true` is the fallback —
  order differs slightly from the custom groups; that's a known, accepted
  parity gap.
- **Named exports only. `import-x/no-default-export` is an `error`.** The
  _only_ exceptions are framework-mandated files, where a default export is
  _required_ (`prefer-default-export`): Next.js `page.tsx`, `layout.tsx`,
  `not-found.tsx`, `*error.tsx`, `opengraph-image.tsx`, `robots.ts`,
  `sitemap.ts`, `apple-icon.tsx`, `*.config.*`, `*.d.ts`, `*.stories.tsx`.
- All imports at the top of the file, blank line after the import block.
- **No extraneous dependencies:** every imported package (including type-only
  imports) must be declared in _that package's_ `package.json`. In the
  monorepo, never lean on hoisting.
- No mutable exports (`export let`), no self-imports, no absolute-path
  imports, no useless path segments (`./../foo`), no importing deprecated
  APIs.
- Relative imports that reach into a sibling package are flagged
  (`no-relative-packages`) — cross-package access goes through the package
  name.

## Monorepo boundaries _(High)_

- Cross-package imports go through the package name
  (`@haven/terminus-trpc`), never relative paths that escape the package,
  never deep file paths into another package's `src/`.
- Internal-only modules stay internal: if something is daemon-only (parsers,
  buffers), do not export it from a shared package.
- Apps depend on packages; packages never depend on apps; shared packages
  don't reach sideways into each other without a declared dependency.
- New shared code goes in the appropriate `packages/*` workspace, not copied
  between apps.

## Dependencies _(High)_

- **Do not add npm packages silently.** Check whether an equivalent already
  exists in the monorepo first; if a new package is genuinely needed, name it
  and say why.
- Prefer the platform and existing deps over new abstractions.
- Security-conscious: verify a package/MCP server before adopting (Harvey has
  vetted CVEs before choosing tools).
