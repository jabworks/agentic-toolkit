# Docket — Implementation Notes

## Repo layout

```
skills/record/                 # docket:record source
  SKILL.md
  references/                  # scaffold templates (DOCKET.md, archive header), capture playbook
skills/groom/                  # docket:groom source
  SKILL.md
  references/                  # grooming checklist, pick-next rubric
skills/record/server/          # plugin-level machinery source (see sync note)
  docket.mjs                   # CLI core
  mcp-server.mjs               # stdio wrapper over the same core module
  install.sh
  INSTALL.md
dist/plugins/docket/
  skills/docket/record/ … groom/
  server/                      # mirrored from skills/record/server/
  .claude-plugin/plugin.json   # + .mcp.json registration for the MCP server
  .codex-plugin/plugin.json
```

(Exact home for `server/` source — under `skills/record/` like
`workflow/hooks/`, or a shared top-level — is a draft-plan decision; the
invariant is: one source, one sync.sh case, one mirror test.)

## Patterns to follow

- `skills/workflow/hooks/` + its `sync.sh` case + `condux-hooks.test.mjs` —
  the template for plugin-level non-skill dirs.
- `plan-review/references/annotate-server.js` — self-contained local HTTP +
  SSE, no-egress renderer.
- session-report HTML templates — styling/token conventions, light-first.
- toolkit-foundry checklist — scaffold, manifests, marketplace, catalogs.

## Tests (extend the existing suites; add docket-specific)

- Mirror test for `dist/plugins/docket/server/` (byte-for-byte).
- CLI unit tests: next-id/add/close/check/scaffold/migrate against fixture
  dockets, including legacy-layout fixtures and drift/dupe cases.
- MCP smoke test: initialize round-trip + one tool call over stdio.
- Frontmatter grammar + budgets pick both new skills up automatically;
  manifest parity and docs-catalog tests will fail until registration is
  complete — use them as the checklist.

## Distribution

- Marketplace: new `docket` entry in `.claude-plugin/marketplace.json`.
- `npx skills add` picks up `skills/record`, `skills/groom` (names `record`
  / `groom` — verify no collision in the flat skill namespace).
- OpenCode: `build-opencode.mjs` output; MCP registration via installer.

## Phasing (draft-plan input)

1. CLI core + tests (the contract in api.md/fields.md)
2. Skills (SKILL.md × 2, references, trigger contracts + eval cases)
3. MCP wrapper + .mcp.json
4. Browser (`browse`, then `--serve`)
5. Installer (INSTALL.md + install.sh) — convention doc included
6. Registration, sync, catalogs, changeset

## Board columns (2026-08-21)

- `skills/record/server/board-shell.html` — per-surface CSS, shell markup and
  client JS outside the kit markers; `docket-render.mjs` — `renderHtml` emits
  a `.col` per section, card markup with lede + `<details>`, the archive
  drawer, and drops `scopePills` plus the facet-count client JS.
- Signed-off render: [board-direction-a.html](board-direction-a.html) —
  rendered from this repo's live `DOCKET.md` with the kit regions inlined.
- Tests: rewrite the render contract in `tests/docket-cli.test.mjs`; the
  mirror/region suites (`dist-mirror`, `composition`, `token-core`) catch
  drift as before. `bash scripts/sync.sh record` after editing.
- Release: docket minor (new layout) + `CHANGELOG.md` entry via
  `node scripts/release-plugins.mjs --write-changelog`.
