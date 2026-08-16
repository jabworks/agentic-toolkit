# Live verification — Cursor channel (docket #27)

Date: 2026-08-14 · Setup: Cursor on Windows (hieu1), WSL remote (ubuntu-24.04),
toolkit repo + test project on the WSL filesystem. Test project:
`~/projects/cursor-test` (throwaway).

## Claims → evidence → verdict

1. **`npx skills add` installs the cursor tree** — `npx -y skills add
   <abs>/dist/cursor/skills -a cursor -s <name> -y` → "Local path validated /
   Found 35 skills / copied → ./.agents/skills/<name>", `skills-lock.json`
   written. GitHub subtree syntax
   (`…/tree/main/dist/cursor/skills`) parsed and cloned correctly; found 0
   skills only because `dist/cursor/` is not on `main` yet. **VERIFIED**
   (multi-skill `-s a,b,c` errored; one `-s` per invocation works).
2. **Cursor loads project skills from `.agents/skills/`** — with the test
   project open, `workflow`, `record`, `git-commit` listed in the Skills
   panel under a project group; not misfiled under Rules. **VERIFIED**
3. **Skills are invokable** — `/workflow` offered in chat and loads when
   picked. **VERIFIED** (slash invocation). Description-based auto-trigger
   not separately exercised — per Cursor docs, model invocation reads
   `description`, which the merged tree maximizes. **UNVERIFIED (docs-only)**
4. **Merged descriptions surface fully** — panel renders the folded
   description text; `when_to_use` absent from installed files (grep = 0).
   **VERIFIED**
5. **Global installs are broken on WSL split-home** — CLI `-g` wrote to WSL
   `~/.agents/skills/` (bug #421 behavior confirmed: docs claim
   `~/.cursor/skills/`); Cursor's User group reads the **Windows** home
   (`C:\Users\hieu1\.agents\skills\…` in breadcrumbs), so the WSL-side
   global install (`preflight`) never appeared. **VERIFIED ABSENT** — README
   must direct WSL users to project-level installs.
6. **Docket MCP via manual `.cursor/mcp.json`** — custom entry connects and
   exposes the 4 tools (docket_next/add/close/check). **VERIFIED**
7. **Bonus finding** — Cursor auto-imports the installed Claude Code plugin
   ecosystem: 59 plugin skill entries plus the docket MCP tagged "Plugin",
   running through the WSL environment with all 4 tools enabled, with zero
   Cursor-side setup. On machines with Claude Code + the marketplace
   plugins, the toolkit is already live in Cursor. Screenshot evidence in
   session (settings panel).
8. **Bonus finding 2** — Cursor's Customize panel surfaces registered Claude
   Code plugin *marketplaces* as one-click installs: a "Jabworks Agentic
   Toolkit" section listed the plugins, condux showing "Added".
   **VERIFIED** (screenshot + filesystem). The listing is the Windows-side
   clone `C:\Users\hieu1\.claude\plugins\marketplaces\jabworks-agentic-toolkit`,
   pinned at commit 2c94982 (2026-06-30) — its marketplace.json carries the
   retired `plugin-foundry` and exactly the 5 plugins Cursor showed; the
   "Added" condux is 1.5.5 from the cache dir. Fix: run
   `/plugin marketplace update jabworks-agentic-toolkit` in Windows-side
   Claude Code. Marketplace installs ship raw SKILL.md — `when_to_use`
   present in the cached trees (grep-verified) and invisible to Cursor —
   so the merged tree remains the recommended skill path.

## Consequences for docs

- Install command (post-merge): `npx skills add
  https://github.com/jabworks/agentic-toolkit/tree/main/dist/cursor/skills`
  (project scope; `-a cursor`).
- Never point Cursor at top-level `skills/` (`when_to_use` invisible).
- Global (`-g`) discouraged: upstream #421 + WSL split-home.
- Compat row: works = skills via merged tree, docket MCP (plugin import or
  manual mcp.json), docket CLI fallback; degrades = condux routing without
  the SessionStart hook (catalog inference); absent = plan-review hooks,
  named agents.
