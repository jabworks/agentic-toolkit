# Docket — Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Bundle of two skills, not one | trigger shapes split cleanly (item-level vs whole-backlog); the routing-collision cost is mitigated by disjoint phrasing | accepted |
| 2 | Bare skill names in the namespace (`docket:record`, `docket:groom`) | condux-style naming; source dirs must equal skill names, so top-level dirs are `skills/record/` and `skills/groom/` | accepted |
| 3 | Layout A: readable core + yearly archive inside `docket/` | keeps whole-backlog skimability while fixing the observed 202K single-archive pain; `docket.json` makes id allocation collision-proof | accepted |
| 4 | CLI core, MCP as wrapper | the CLI is the single source of truth and degrades to Bash on any host; hand-rolled stdio JSON-RPC keeps the no-dependency rule | accepted |
| 5 | Installer ships as the reference implementation of a toolkit convention | detect → register → verify → report generalizes; condux and concord adopt later | accepted |
| 6 | Browser as CLI subcommand, not a third skill | `docket.mjs browse` adds zero routing surface; both skills invoke it | accepted |
| 7 | Git tie-in documented, never coupled | the close flow suggests a commit subject; the git-commit skill stays independent per the no-deps rule | accepted |
| 8 | Board as columns, read-only, lede + fold | a standalone file has nowhere to persist a drag; bodies of 100–200 words cannot stay open in a column | accepted |

## Bundle, not single skill

User-chosen (approach B). Two skills split by trigger shape: item-level
lifecycle vs whole-backlog advisory. Each gets a trigger contract that fits
its budget; the known cost is intra-bundle routing collision risk, mitigated
by disjoint trigger phrasing (see quirks.md).

## Skill naming: bare names in the namespace

`docket:record` and `docket:groom` (condux-style: `condux:workflow`), not
toolkit-ops-style prefixed names. Source dirs must equal skill names (test
invariant), so top-level dirs are `skills/record/` and `skills/groom/`.
`record` is slightly generic as a shared-tree dir name — accepted at
sign-off.

## Layout A: readable core + yearly archive, everything inside `docket/`

- `DOCKET.md` keeps the terminus virtue: skim the whole open backlog in one
  read.
- Yearly archive rotation fixes the observed pain: terminus's single archive
  reached 202K.
- `docket.json` makes id allocation O(1) and collision-proof instead of
  "grep both files and hope".
- Rejected: per-item files (cleanest moves, worst skimability; N reads cost
  agents more than one); minimal folder (inherits the giant-archive problem);
  repo-root files (user: everything inside `docket/`).

## Machinery: CLI core, MCP as wrapper — not the reverse, not a hook

- The CLI is the single source of truth; MCP wraps it. Skills degrade
  gracefully: MCP if registered, else `node docket.mjs` via Bash — so all
  three hosts work the day the plugin installs.
- Hand-rolled stdio JSON-RPC, no `@modelcontextprotocol/sdk` — the toolkit's
  no-dependency rule; nothing to npm-publish for the server itself.
- SessionStart capture hook rejected: taxes every session in every repo for
  a skill only some repos adopt.
- MCP-only rejected: breaks hosts without registration.

## Installer as a toolkit convention

`INSTALL.md` (agent-followable) + `install.sh` (idempotent script) ship with
docket as the *reference implementation* of a generalizable contract:
detect host → register → verify → report. condux (OpenCode npm story) and
concord (Codex hooks) are follow-up adopters — explicitly out of scope here.

## Browser as CLI subcommand, not a third skill

`docket.mjs browse` adds zero routing surface; both skills invoke it.
Follows the toolkit's HTML lineage (spec-browser, plan-review annotate
server, session-report): self-contained, no egress, light-then-dark.
No MCP browse tool — opening browsers is host-side.

## Git tie-in: convention documented, no coupling

Close flow suggests `docs(docket): close #N`; git-commit skill stays
independent (no-deps rule). Rejected: full cross-link, no git involvement.

## Out of scope

GitHub/tracker sync · hooks · priority/estimate fields beyond section
semantics · editing other repos' backlogs · installers for condux/concord
(convention + follow-up only).

## Board as columns, read-only (2026-08-21, docket #45)

The board renders one column per `DOCKET.md` section, side by side, instead of
stacked `<section>` blocks. Chosen from three rendered directions — board /
ledger / split — by picker; [board-direction-a.html](board-direction-a.html) is
the signed-off render. Ledger was the most scan-first but is not a board, and
split's rail is doc-site chrome the lanes make redundant.

- **Read-only.** `docket browse` writes a standalone file opened with no server
  (surface-kit Q9); a card dragged there has nowhere to persist. A
  `--serve`-only write-back would make the same artifact behave differently by
  how it was opened. Moving an item stays a `DOCKET.md` edit or a CLI op.
  Rejected: drag-to-move served-only; drag-in-both with silent degradation.
- **Title + lede, fold for the rest.** Bodies run 100–200 words; a column
  cannot hold them open. The first block renders as a 3-line lede; the rest
  sits in a `<details>` ("Read on · N more") so it works offline without JS.
  Rejected: full body always (forces ≤2 wide columns); title-only (hides the
  content the board exists to show).
- **Scope pills retired; the columns are the scopes.** The facet-count client
  JS goes with them. Tag pills stay, rendered only when a docket uses tags.
- **Archive is a collapsed drawer** under the board: rows (id · title · year)
  that expand to the full body. Not a peer column — 35 closed against 9 open
  would dominate.
- **Empty section = a quiet dashed slot, kept.** "Nothing committed" is
  information (closes #44 by decision: zero-count sections render).
- **Unbounded section count scrolls horizontally** with scroll-snap; columns
  are `minmax(21rem, 28rem)`. Under 48rem the lanes stack.
- **Layout PR only** (surface-kit D5/D6 step 2 for docket): per-surface CSS
  and markup outside the three kit markers; no core-token change.
