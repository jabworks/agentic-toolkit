# HTML surface tokens and navigation

**Date:** 2026-08-12 · **Status:** signed off · **Supersedes:** docket #20
(split into #21 / #22 / #23)

## What and why

Four plugins in this toolkit render HTML, each having built its own answer.
Docket #20 recorded this as "four templates, four answers, and the answers
disagree about the basics" and proposed a shared shell.

Measurement contradicts the premise. The design below is what the files
actually support.

## Measured ground truth

Token sets, counted as unique `--name:` definitions per file:

| Surface | Lines | Tokens | Relationship |
|---|---|---|---|
| `session-report/template.html` | 1442 | 56 | **identical set** to handoff |
| `session-handoff/references/handoff-template.html` | 603 | 56 | **identical set** to session-report |
| `plan-review/references/plan-review-template.html` | 732 | 35 | 32 shared; 3 unique (`--hl`, `--hl-active`, `--radius-md`) |
| `record/server/docket-render.mjs` | 266 | 7 | own dialect (`--bg/--fg/--line/--chip`), no overlap in names |

So: a **32-token common core**, plus genuine per-surface extensions —
annotation highlights for the reviewer, `-foreground`/`-solid` triads, hover
states, named colors (`--blue`, `--clay`, `--ivory`) and `--term-bg/--term-fg`
for the report. Not four disagreeing answers; three copies of one answer plus
one outlier.

Navigation, by contrast, genuinely is unshared:

| Surface | nav | TOC | search | sticky |
|---|---|---|---|---|
| plan-review | 2 `<nav>`, 30 anchors | yes | **none** | n/a — `100vh` pane app |
| session-report | none, 29 anchors | none | **none** (arrow-key day select only) | table headers only |
| session-handoff | none, 11 anchors | none | none | none |
| docket board | none | **none** | filter input | sticky header |

Theme fallback also differs: the three document surfaces are dark-base with a
`prefers-color-scheme: light` override; docket is light-base with a `dark`
override. Both honour the OS — only the no-preference fallback differs.

## Decisions

### D1 — Scope: split into three, in this order

| Id | Work | Why separate |
|---|---|---|
| #21 | Token core + checker, docket conversion, and the #4 chip fix | Mechanical, all four files, no design left |
| #22 | Spec-site navigation in plan-review's `DIR_MODE` | The pain that raised #20 |
| #23 | Long-document navigation (session-report first, handoff second) | Different document class, different pattern |

One item would mean a single PR bumping condux, docket, session-report and
session-handoff together, plus a changeset for the npm channel — fighting the
per-plugin release automation. And #20's own third bullet concedes the design
does not unify: "One pattern will not serve all three."

### D2 — Mechanism: a checker with `--fix` over the 32-token core. No shared shell, no generator.

The canonical core lives in one file. `scripts/check-tokens.mjs` asserts each
surface's marker-delimited region matches it; `--fix` rewrites the region.
Guarded by a test, gating `sync.sh` the way `check-frontmatter.mjs` already
does (`sync.sh:30-34` pre-build, `:169-176` post-build).

Per-surface extensions are declared and live outside the marked region.

**Why a checker and not a generator.** As a generator, the marked region is
build output and hand-editing it is a bug — that makes `skills/` partly
generated, against "edit `skills/`, it is the source of truth". As a checker,
the region is authored and merely *must match*; hand-writing it correctly is
legal and `--fix` only normalizes. This is the `check-frontmatter.mjs`
category exactly: a **gate**, not a copy arm — so it adds nothing to the
surface docket #11 wants to fix, whose complaint is about copy decisions
(bundle membership probed from `dist/`, hardcoded name→dest checks).

**Why no shared shell.** The four consumption models are incompatible:
a server-substituted SPA (`annotate-server.js:284` reads the template, `:303`
substitutes `{{PLAN_NAME}}`), a JS string-builder with an SSE live mode
(`renderHtml()` at `docket-render.mjs:12`), an agent-`Edit`ed copy carrying a
JSON data island, and a hand-filled static document. A runtime shell is barred
twice — no egress, and no cross-plugin dependencies. A build-time shell would
have to emit four structurally different layouts, which is four templates with
extra indirection.

### D3 — spec-browser stays HTML-free; plan-review's `DIR_MODE` is the doc-site

Ownership was already ratified before #20 was written:
`technical-spec/SKILL.md:100-107` routes spec preview to plan-review's annotate
server in directory mode, and `plan-review/SKILL.md:53` records that
technical-spec's own preview server was **retired into it**.

`DIR_MODE` is not a hack bolted onto a reviewer — `listDocs()`
(`annotate-server.js:96`) walks every `*.md` in the tree grouped by folder, the
client builds a folder-grouped sidebar with per-doc TOC, and cross-doc relative
links resolve specifically so a spec catalog's `index.md` renders. It is a
doc-site server that grew a verdict strip, not the reverse.

Giving spec-browser its own renderer would create a fifth HTML surface — the
disease #20 diagnoses. spec-browser stays rung 1 of the dependency ladder: the
agent-readable `index.md` catalog, working with zero servers and zero condux.
The cross-reference stays descriptive, never a dependency.

### D4 — docket's palette is unowned; convert it

Ratified 2026-08-12. Two things make this not a find-and-replace:

- `--muted` means the opposite thing in the two vocabularies. docket's
  `--muted: #6a6f76` is a muted *foreground* (used as `color:` on `.stats`);
  the core's `--muted: #222221` is a surface, with `--muted-foreground` for
  text. A mechanical rename silently inverts the role.
- Converting flips the no-preference theme fallback from light to dark.
  Near-invisible in practice, but it is a change.

## Rejected alternatives

| Rejected | Why |
|---|---|
| One shared shell for all four | Four incompatible consumption models; no-egress and no-cross-plugin-deps bar the runtime form; the build-time form degenerates into four templates plus indirection |
| Generator writing into `skills/` | Makes `skills/` partly a build artifact; adds a copy mechanism of exactly the kind #11 is filed against |
| Contract + drift test with no tooling | Viable, and the cheapest option — rejected only because a palette change then costs four hand-edits with no fixer; the checker is a ~40-line delta over it |
| spec-browser gets its own renderer | Creates a fifth HTML surface and duplicates a doc-site server that already exists and is already the ratified owner |
| Keep #20 whole | Four plugins, three release channels, one PR against per-plugin release automation |

## Constraints

- **No egress.** Every artifact stays self-contained — no CDN, no external
  font. Enforced repo-wide by `scripts/check-supply-chain.mjs` over `skills/`
  and `plugins/`. Two of these templates were fetching Google Fonts until
  2026-08-09; the constraint is recently earned.
- **Byte-mirror.** Each of the four files is byte-identical in 2–3 dist
  locations (`dist/plugins/`, `dist/opencode/`, `packages/condux-opencode/`).
  Anything shared must be committed, self-contained, in `skills/`.
- **No cross-plugin dependencies.** The four surfaces span four
  independently-installed plugins.
- **The fixer touches marker-delimited regions only**, never code structure —
  it edits a CSS block inside a JS template literal in `docket-render.mjs`.

## Out of scope

- Any visual redesign beyond token unification. #21 is mechanical.
- session-handoff navigation may need nothing at all — it is a fill-in
  document whose markdown twin has no navigation either. #23 decides.
- The four surfaces' layouts. The uniform four-feature table in #20 reads as a
  defect list but is not one: "sticky: no" on a `100vh` pane app and "TOC: no"
  on a fill-in doc are correct outcomes, not gaps.

## Corrections owed to the docket

Five factual errors in #20, all verified against the files:

1. plan-review "search: yes" — false. Zero `<input>` elements; `annotate-server.js` injects none.
2. session-report "search: one" — false. Only arrow-key day selection (`:1153-1161`).
3. docket "TOC: minimal" — unsupported. The only lexical `toc` hit is the substring inside `autocomplete` (`:42`).
4. "Only `prefers-color-scheme` is common to all four" — understates it badly. Three of four already share a 32-token core; session-report and handoff are identical.
5. Adjacent defect, filed separately: `plan-review/SKILL.md:49` and `:101` say directory mode lists "every top-level `*.md`", but `annotate-server.js:96` walks the tree recursively.

## Open questions

- **#22 has no design yet.** Whether spec browsing needs a sidebar redesign, a
  search index, or only grouping fixes is undecided — it needs its own
  discovery before planning.
- **Where the canonical core file lives** is deferred to #21's plan. It must
  sit outside every skill tree (it is not itself a shipped skill asset), which
  makes it a sibling of `scripts/`, but the exact path is a planning detail.
- **Spec concern files were not written.** This is repo-maintenance design with
  no API contracts, field mappings, or upstream failure modes, so
  `technical-spec` write-back was skipped rather than scaffolded empty.
