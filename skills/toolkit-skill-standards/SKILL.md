---
name: toolkit-skill-standards
description: Use when writing or reviewing a SKILL.md for jabworks/agentic-toolkit — frontmatter budgets, the trigger contract ("Use when…" description or when_to_use field), progressive disclosure into references/, and keeping a new description out of existing skills' trigger space. Triggers include "review this skill description", "write the frontmatter", "does this collide with an existing skill", "where should this content live". Not for scaffold/sync mechanics; use toolkit-foundry.
---

# Toolkit Skill Standards

## Purpose

The content bar every SKILL.md in this repo must clear: budgets, trigger contract,
structure, and collision discipline.

## When to use

- Drafting or rewriting any SKILL.md frontmatter or body in this repo.
- Reviewing a proposed skill before it ships.
- A description "feels fine" but the skill under- or mis-triggers.

## When not to use

- Scaffolding/registering/syncing mechanics → `toolkit-foundry`.
- Adapting an externally-sourced skill template to the jabworks stack → `adapting-skills`
  (then return here for this repo's frontmatter/mirror requirements).
- Triage of a live triggering bug → `toolkit-debugging-playbook` first; it routes back
  here when the cause is wording.

## Inputs required

- The draft SKILL.md (or the skill name to review).
- The current library inventory: `ls skills/` + each sibling's description AND
  `when_to_use` (both fields form the trigger contract).

## Procedure

1. **Budgets (test-enforced):** description ≤ 500 chars; total frontmatter ≤ 1024;
   `name` kebab-case and identical to the directory name. Check:
   `node --test tests/skill-invariants.test.mjs`.

2. **Trigger contract (owner-ratified 2026-07-08):** the contract is
   description + `when_to_use` together.
   - Standalone skills / no `when_to_use`: description MUST start with "Use when…"
     and lead with trigger terms a user would actually type.
   - condux-style skills: description states what it does; `when_to_use` carries the
     trigger conditions ("Trigger when…"). Both fields count against the 1024 budget.

3. **Canonical frontmatter form (test-enforced).** "Quote YAML strings" was the old
   rule; it caused its own incident (`2026-08-05` — a single-quoted value with a bare
   apostrophe in `that's`). The rule is now a *shape*, not an instruction to quote:
   - Every line is `key: value` — one space after the colon, no lists, no block
     scalars.
   - **Plain (unquoted) when the value is safe**: it must not start with
     ``- ? : , [ ] { } # & * ! | > ' " % @ ` ``, contain `: ` or ` #`, or end with `:`.
   - **Double quotes otherwise**, escaped the way JSON escapes (`\"`, `\\`).
   - **Single quotes are banned outright.** YAML needs `''` for a literal
     apostrophe inside them, and that escape is the footgun. Nothing here needs them.

   Don't hand-fix a violation — run `node scripts/check-frontmatter.mjs --fix`, which
   rewrites illegal values and leaves legal ones byte-identical. Check with
   `node --test tests/frontmatter-canonical.test.mjs tests/frontmatter-yaml.test.mjs`.

   Why two gates: the canonical form makes the break unwritable, and the strict
   `yaml` parse proves the form's premise. Neither `claude plugin validate` nor the
   budget tests can do this — validate passed the file that broke Codex on
   2026-08-05 (Claude's frontmatter parser is lenient), and the budget tests
   regex-parse. See `toolkit-failure-archaeology` for all four incidents.

4. **Front-load trigger terms.** Most important phrases first; include the literal
   words users type ("sync dist", "am I done", "browse specs"). Workflow summaries
   belong in the body, not the description.

5. **Collision scan (mandatory).** Read every sibling description +
   `when_to_use`. If the new skill's trigger space overlaps, either merge into the
   sibling or add explicit mutual disambiguation — both skills name each other, the
   way subagent-deployment ("not for executing an ordered plan — that's
   subagent-execution") and subagent-execution ("not for ad-hoc independent tasks —
   that's subagent-deployment") do. Known hot zones to check against: the subagent
   pair, plan-review↔spec-browser ("spec directory"), preflight↔finalize ("am I
   done"), toolkit-foundry↔adapting-skills (skill creation vs adaptation),
   concord↔toolkit-failure-archaeology ("has this happened before").
   Enforcement: `tests/skill-routing-contracts.test.mjs` asserts each guarded pair
   names the other in frontmatter — **add every new pair there** so the guard can't
   silently erode. `scripts/collision-scan.mjs --check` exists but lexical scoring
   was falsified (5% recall, 2026-07-09) — the reading, and the test, are the scan.

6. **Progressive disclosure.** SKILL.md = concise runbook readable in one scan:
   purpose, when (not) to use, procedure, traps, related skills. Long archaeology,
   catalogs, templates, ledgers → `references/`. Executable helpers → `scripts/` or
   references (see plan-review's `references/annotate-server.js`).

7. **Every skill with a plausible sibling overlap must state when NOT to use it**
   and name that sibling instead. Keep unrelated skills concise; do not invent a
   false alternative merely to fill a section.

8. **Interaction contracts.** A skill that prescribes a user-facing menu or
   checkpoint must mark the option set as exhaustive ("present every row, every
   time") and state that behavioral defaults shape the *recommendation marker*,
   never which options appear — an un-defended menu erodes toward the default
   over sessions (CP-1 incident, `2cc080d`). If another skill's prompt can absorb
   the menu (e.g. a sign-off step doubling as the what-next menu), both skills
   carry the requirement, on both sides of the seam.

9. **Dependency ladder.** Anything the skill invokes beyond its own files must
   follow the ladder (section below): work from skill files alone, prefer
   detected richer surfaces, never depend across plugin boundaries.

10. **Health check.** A plugin with machinery beyond skill files — hooks, a
    server, a package registration — ships a doctor per the health-check
    convention (section below). Reviewing such a plugin without asking "how
    would a user find out this is broken?" is an incomplete review.

## Artifact location contract

Any skill that writes a file into the user's project follows this. Two tiers,
split by durability — not by which skill produced them.

| Tier | Where | Git |
|---|---|---|
| **Durable** — the user asked for this and will keep it | a normal project path (`specs/`, `docs/`) | committed |
| **Working state** — scaffolding the durable thing was built from | `<git-root>/.<plugin-name>/`, subdivided by artifact type | gitignored |

The directory is named for the **owning plugin**, never the skill and never the
artifact. condux has 13 skills and one `.condux/` — the install unit is the
plugin, so it's the thing that owns a directory and the thing a user removes to
stop the directory reappearing. `.handoffs/` names content, not owner: two
plugins can both produce handoffs, and the name doesn't say what to uninstall.

Current owners: `.condux/` (`designs/ plans/ progress/ scratch/ verification/`),
`.concord/`, `.session-handoff/`, `.session-report/`.

**Bootstrap** — the first write in a repo runs this, once:

1. Resolve `<git-root>` via `git rev-parse --show-toplevel`. Not a git repo →
   fall back to CWD and say so once.
2. `git check-ignore -q .<plugin-name>/` — if already ignored, proceed silently.
3. Otherwise ask once: "`<skill>` keeps its working files in
   `.<plugin-name>/` — add it to `.gitignore` so they stay out of your
   commits?" On yes, append. If the user would rather not touch a tracked file,
   write it to `.git/info/exclude` instead.
4. Never edit `.gitignore` or `.git/info/exclude` without asking.

**Override** — an explicit `AGENTS.md` path always beats these defaults.

Never write working state into the repo root, into CWD, or into a project's
`docs/`: those belong to the project, not to the tool.

## Dependency ladder

A shipped skill may *prefer* richer surfaces but must *require* nothing beyond
its own files. Three rungs:

| Rung | Surface | Present |
|---|---|---|
| 1 | Skill files — SKILL.md, `references/`, `scripts/` | always, on every channel |
| 2 | CLI bundled inside the skill dir (record's `server/docket.mjs`) | always — travels with the skill through `npx skills add`; needs only Node |
| 3 | Registered MCP server or hooks | host-dependent — exists only after plugin install and registration |

- **Function on rung 1 alone.** `npx skills add` ships bare skill trees with no
  plugin manifest — no `.mcp.json`, no hooks. A skill that requires rung 3 is
  broken on an entire distribution channel regardless of how good its installer is.
- **Prefer the highest rung you can detect; detect, never assume.** The
  reference phrasing is record's: "prefer the MCP tools when registered,
  otherwise run the bundled CLI."
- **Cross-plugin dependencies are banned at every rung.** A docket skill that
  needs condux — or any skill that leans on a third-party MCP like
  context-mode — breaks silently for everyone without that plugin, and no
  installer or doctor can fix a dependency the bundle doesn't ship.
- What makes rung 3 a first-class preferred path rather than a lucky bonus:
  `INSTALL.md` (detect → register → verify → report) makes it reliable to
  reach, and the health-check convention below reports which rung each plugin
  actually runs on per host.

Ratified 2026-08-05 (docket #6), graduating the older absolute "assume no
MCP/plugin is installed" rule after docket shipped the ladder in practice.

## Health-check convention

The standing counterpart to `INSTALL.md`: an installer verifies once, a
doctor verifies whenever you ask. Any plugin with machinery beyond skill
files — hooks, a server, a package registration — ships one.
`docket-doctor` is the reference implementation.

Four beats, the same shape as ease-of-install:

1. **Detect** — which hosts exist on this machine. Missing host is `absent`,
   not an error.
2. **Probe** — every registration the plugin depends on, per host. Static
   parse **and** execution: the registered path must exist and the thing it
   registers must answer. A manifest that parses while its server is dead is
   the failure the convention exists to catch.
3. **Report** — one row per probe, `host status detail`, nothing silent. A
   host that needs nothing is named with its reason.
4. **Fix** — print the repair for every broken row. Performing it is
   optional and belongs to the plugin's own installer; never reimplement
   registration inside a doctor.

Non-negotiables:

- **Probes must not mutate.** Every execution step answers "what does this
  write?" first. concord's `capture.mjs` writes to the memory store, so it is
  resolved and loaded but never invoked; an `initialize` round-trip mutates
  nothing, so it runs.
- **Offline.** Version comparison reads the local marketplace clone and
  prints that clone's own age. A doctor runs in degraded conditions by
  definition — one that hangs without network fails exactly when needed.
- **Own files only.** A doctor lives inside its own skill directory so
  `<skill-base>/doctor.mjs` resolves on every distribution channel, and it
  probes its own plugin. Cross-plugin doctors are banned for the same reason
  cross-plugin dependencies are.
- **Say what it cannot prove.** No child process can tell whether the host
  *invoked* a hook. The report states that probes are static-plus-executable
  so a green board is never misread as "the hook fired".

Statuses are exactly four — `done`, `broken`, `absent`, `skipped`. Only
`broken` fails the run: an unmade optional registration is `absent`, because
the ladder says the skill still works a rung down.

Ratified 2026-08-06 (docket #1).

## Routing-nudge convention

The named remedy for a **suppressed-class** trigger miss: the skill's declared
vocabulary matches the user's turn near-verbatim, the skill still doesn't
fire, and the cause is content already injected into context (a memory
digest, an index) that satisfies the information need before the trigger is
consulted. Measured in `specs/trigger-reliability/` — vocabulary rewrites
demonstrably cannot fix this class, so do not respond to it by fattening the
description. The remedy is a SessionStart hook injecting a short routing
directive; `session-handoff/hooks/` is the reference implementation, condux's
`workflow/hooks/routing.md` the precedent.

Non-negotiables, in priority order:

- **Conditional.** Inject only when the skill's trigger surface is live on
  disk (a handoff exists, the artifact is present). Nothing to route to →
  zero tokens injected. An unconditional nudge is catalog-shouting, and a
  toolkit of shouting plugins is worse than the miss.
- **Directive, never content.** The nudge says where a phrase routes; it
  never summarizes the artifact. A nudge that answers the question *is* the
  suppression it counters.
- **Demote the substitute.** Name the competing injected context as
  background, not the workflow.
- **Tiny.** ≤ 3 lines of prose in a payload `.md` beside the script, never
  inlined. condux's ~390-token routing payload is the ceiling, not the norm.
- **Fail open, both hosts.** Exit 0 on any error; per-host wire formats
  (`--claude` envelope, `--codex` raw stdout); only the host's own root
  variable in each manifest. A plugin gaining Codex `hooks` must not ship a
  root Agent Plugins `plugin.json` — the generator excludes it, the tests
  assert it.
- **Evidence first.** A nudge ships only against a measured suppressed-class
  verdict, never on the hunch that a skill "deserves more visibility."

Ratified 2026-08-28 (trigger-reliability D2).

## Evidence required

For "the description is fine": show budget numbers and the collision scan result
(which siblings were checked, why no overlap). For "this collides": quote the
overlapping phrases from both skills.

## Output artifact

A pass/fail review with specific rewrites, or ship-ready frontmatter.

## Common traps

- Judging only the `description` and missing that 14+ skills carry their triggers in
  `when_to_use` — you'll "fix" something that isn't broken.
- Trimming needed procedure to fit a scan instead of moving it to `references/`.
- Writing the description about what the skill DOES instead of when it's NEEDED —
  models trigger on user-moment language, not feature lists.

## Bad behavior this prevents

Shipping a second "sync my skills" skill next to toolkit-foundry because the author
never read the sibling descriptions. Three skills in this repo (preflight,
subagent-execution, test-first-development) shipped with no machine-visible trigger
contract at all until the 2026-07-08 audit added their `when_to_use` fields — the
collision scan + trigger-contract check makes both failure shapes visible before ship.

## Related skills

`toolkit-foundry` (mechanics after content passes), `toolkit-change-control` (ship
gate), `adapting-skills` (external templates first — and the owner of these
standards applied to skills in *other* projects), `toolkit-debugging-playbook`
(live trigger failures).

## Provenance and maintenance

Re-verify volatile claims with:
- `node --test tests/skill-invariants.test.mjs` — budgets/name enforcement
- `node --test tests/skill-routing-contracts.test.mjs` — the guarded collision pairs
- `grep -l 'when_to_use' skills/*/SKILL.md` — which skills use the two-field contract

Last generated: 2026-07-08 (owners/counts + routing-test enforcement noted 2026-08-04)
Known uncertainty:
- How each host tool weights `description` vs `when_to_use` for auto-triggering is
  unverified — treat front-loading BOTH fields as the safe default.
