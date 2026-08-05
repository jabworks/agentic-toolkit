# Docket — Decisions

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
