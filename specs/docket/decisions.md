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

## 1. Bundle, not single skill

**Decided:** docket ships as a bundle of two skills split by trigger shape —
item-level lifecycle (`record`) vs whole-backlog advisory (`groom`).
**Because:** the two trigger shapes split cleanly, and each gets a trigger
contract that fits its budget.

| Alternative | Why not |
|---|---|
| One skill carrying both shapes (approach A) | One trigger contract stretched over two disjoint verb sets — the budgets don't fit |

**Consequences**
- The known cost is intra-bundle routing collision risk, mitigated by disjoint
  trigger phrasing (see quirks Q5).

**Context** — approach B was user-chosen at sign-off.

## 2. Skill naming: bare names in the namespace

**Decided:** `docket:record` and `docket:groom`, condux-style
(`condux:workflow`) — not toolkit-ops-style prefixed names.
**Because:** the plugin namespace already disambiguates, and source dirs must
equal skill names (test invariant), so the top-level dirs are `skills/record/`
and `skills/groom/`.

| Alternative | Why not |
|---|---|
| Prefixed names (`docket-record` …) | The namespace already carries the prefix; toolkit-ops uses prefixes because its skills need them in the flat tree |

**Consequences**
- `record` is slightly generic as a shared-tree dir name — accepted at
  sign-off.

## 3. Layout A: readable core + yearly archive, everything inside `docket/`

**Decided:** `DOCKET.md` holds the open backlog, closed items rotate into
`archive/<year>.md`, and `docket.json` owns id allocation — all inside
`docket/`.
**Because:** `DOCKET.md` keeps the terminus virtue (skim the whole open
backlog in one read), yearly rotation fixes the observed pain (terminus's
single archive reached 202K), and `docket.json` makes id allocation O(1) and
collision-proof instead of "grep both files and hope".

| Alternative | Why not |
|---|---|
| Per-item files | Cleanest moves, worst skimability; N reads cost agents more than one |
| Minimal folder | Inherits the giant-archive problem |
| Repo-root files | User: everything inside `docket/` |

**Consequences**
- One shared, never-reused id space across the core and every archive year.

## 4. Machinery: CLI core, MCP as wrapper — not the reverse, not a hook

**Decided:** the CLI is the single source of truth; MCP wraps it. Skills
degrade gracefully: MCP if registered, else `node docket.mjs` via Bash — so
all three hosts work the day the plugin installs. The server is hand-rolled
stdio JSON-RPC.
**Because:** the CLI degrades to Bash on any host, and hand-rolling keeps the
toolkit's no-dependency rule.

| Alternative | Why not |
|---|---|
| MCP-only | Breaks hosts without registration |
| SessionStart capture hook | Taxes every session in every repo for a skill only some repos adopt |
| `@modelcontextprotocol/sdk` | The no-dependency rule; nothing to npm-publish for the server itself |

**Consequences**
- Nothing to npm-publish for the server; the MCP layer stays a thin wrapper
  over the same commands.

## 5. Installer as a toolkit convention

**Decided:** `INSTALL.md` (agent-followable) + `install.sh` (idempotent
script) ship with docket as the *reference implementation* of a generalizable
contract: detect host → register → verify → report.
**Because:** the contract generalizes beyond docket.

**Consequences**
- condux (OpenCode npm story) and concord (Codex hooks) are follow-up
  adopters — explicitly out of scope here.

## 6. Browser as CLI subcommand, not a third skill

**Decided:** `docket.mjs browse`; both skills invoke it.
**Because:** a subcommand adds zero routing surface.

| Alternative | Why not |
|---|---|
| A third skill | Routing surface for something neither skill needs to route |
| An MCP browse tool | Opening browsers is host-side |

**Consequences**
- Follows the toolkit's HTML lineage (spec-browser, plan-review annotate
  server, session-report): self-contained, no egress, light-then-dark.

## 7. Git tie-in: convention documented, no coupling

**Decided:** the close flow suggests `docs(docket): close #N`; the git-commit
skill stays independent.
**Because:** the no-deps rule — a documented convention costs nothing, a
coupling costs both skills their independence.

| Alternative | Why not |
|---|---|
| Full cross-link between the skills | Couples two plugins the no-deps rule keeps separate |
| No git involvement at all | Loses the convention that keeps commit history and docket ids aligned |

**Consequences**
- Commit subjects citing `#N` stay meaningful against the docket's id space.

## 8. Board as columns, read-only (2026-08-21, docket #45)

**Decided:** the board renders one column per `DOCKET.md` section, side by
side, read-only, each card as title + 3-line lede with the rest in a
`<details>` fold ("Read on · N more"). Chosen from three rendered directions —
board / ledger / split — by picker;
[board-direction-a.html](board-direction-a.html) is the signed-off render.
**Because:** `docket browse` writes a standalone file opened with no server
(surface-kit Q9), so a dragged card has nowhere to persist — and bodies of
100–200 words cannot stay open in a column.

| Alternative | Why not |
|---|---|
| Ledger direction | The most scan-first of the three, but not a board |
| Split direction | Its rail is doc-site chrome the lanes make redundant |
| Drag-to-move, served-only | The same artifact would behave differently by how it was opened |
| Drag in both modes with silent degradation | A write that sometimes lands and sometimes vanishes |
| Full body always open | Forces ≤2 wide columns |
| Title-only cards | Hides the content the board exists to show |

**Consequences**
- Moving an item stays a `DOCKET.md` edit or a CLI op.
- Scope pills retired — the columns *are* the scopes — and the facet-count
  client JS goes with them. Tag pills stay, rendered only when a docket uses
  tags.
- The archive is a collapsed drawer under the board: rows (id · title · year)
  that expand to the full body. Not a peer column — 35 closed against 9 open
  would dominate.
- Empty section = a quiet dashed slot, kept: "nothing committed" is
  information (closes #44 by decision — zero-count sections render).
- Unbounded section count scrolls horizontally with scroll-snap; columns are
  `minmax(21rem, 28rem)`; under 48rem the lanes stack.
- Layout PR only (surface-kit D5/D6 step 2 for docket): per-surface CSS and
  markup outside the three kit markers; no core-token change.

## Out of scope

GitHub/tracker sync · hooks · priority/estimate fields beyond section
semantics · editing other repos' backlogs · installers for condux/concord
(convention + follow-up only).
