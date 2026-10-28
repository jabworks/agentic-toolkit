# Condux

Lean agentic workflow for Claude Code, Codex, and OpenCode.

Condux routes a dev task into the right execution tier — Small, Medium, or Large —
and runs only the steps that tier actually needs. No discovery phase for a typo. No
plan document for a two-line fix. No test suite running mid-implementation.

The design bet is **proportional effort**. Most agentic workflow tooling applies the
same heavy pipeline to every task, so people stop using it for small work and it
stops being a workflow at all. Condux makes the tier an explicit, user-confirmed
decision and loads downstream skills lazily, only when a step reaches for one.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install condux@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add condux@jabworks-agentic-toolkit
```

**OpenCode** — one line, via the [`@jabworks/condux`](https://www.npmjs.com/package/@jabworks/condux) npm package,
which bundles these skills and self-registers them on `config.skills.paths`:

```jsonc
// opencode.json
{
  "plugin": ["@jabworks/condux"]
}
```

**Codex needs two more things**, and no plugin can do either for you: Codex's
experimental hooks feature has to be enabled, and the five specialist agents are
standalone TOMLs because the Codex plugin format has no `agents/` component.

```bash
node install.mjs                 # detect, register, verify, report
node install.mjs --dry-run       # see what it would change first
```

[`INSTALL.md`](INSTALL.md) is the same procedure by hand, and covers what
differs between a plugin install and `npx skills add`. To check an existing
install rather than change it, run `/condux:condux-doctor` — or
`node install.mjs --uninstall` to reverse it.

---

## Compatibility

**Run one workflow router at a time.** condux registers a `SessionStart` hook
that tells the agent every dev task starts at `/workflow`. Another workflow
library that does the same thing on the same matcher puts two competing
contracts in context. Nothing errors: the agent follows whichever it read
last, and that can change between sessions.

Both `install.mjs` and `/condux:condux-doctor` detect known conflicting
libraries, whether installed as a plugin or as loose skills under
`~/.claude/skills`, `~/.agents/skills`, `$CODEX_HOME/skills` or OpenCode's
`skills/`, and print the removal command. **Neither runs it.** Uninstalling a
plugin you chose is not a decision an installer gets to make.

The registry lives at `skills/condux-doctor/conflicts.json`. Adding an entry is
a data edit, but it needs a detection surface checked against a real install —
a wrong name in a shipped warning is worse than no warning.

---

## The 16 skills

Start with `/workflow` — it is both the entry point and the operating manual.

| Skill | What it does |
|---|---|
| `workflow` | Routes any task to Small / Medium / Large and carries the operating rules. Every dev task starts here. |
| `discovery` | Turns a rough idea into a signed-off design. Goal-level questions that become the feature's PRD, alternatives, then a detail round that feeds the spec. |
| `blueprint` | Design-time visual clarity: HTML wireframes and full renders for UI in the house token language (schematic wireframe mode, full render mode), inline-SVG diagrams for data models, flows, and architecture. |
| `draft-plan` | Converts a signed-off design into lean task cards — what, why, gotchas, dependencies. |
| `technical-spec` | Durable feature specs under `specs/` — the PRD, decisions, contracts, quirks — with a live preview. |
| `plan-review` | Renders a plan in a local browser for inline annotation, returns approve / revise / deny. |
| `test-first-development` | Tests before implementation. Opt-in, one upfront consent, never silently rewrites an existing spec. |
| `subagent-execution` | Executes a plan with named specialist agents; resumable from a progress ledger. |
| `subagent-deployment` | Fans out 2+ genuinely independent tasks in a single message. |
| `root-cause-analysis` | Root-cause-first debugging. No fix proposed before the investigation completes. |
| `preflight` | "Am I actually done?" — catches skipped steps and silent regressions before the quality gate. |
| `finalize` | The single end-of-task quality gate: typecheck → lint → format → test, in order, once. |
| `code-review` | Diagnostic report by severity. On request only; never auto-triggers, never fixes. |
| `live-verification` | Drives the real UI, endpoint, or CLI and checks each claim against observed behaviour before you push — including Android apps on an emulator via adb; install [`agent-device`](https://github.com/callstack/agent-device) for a richer driver (optional). |
| `research` | Cited multi-source research for dev questions — parallel `scout` agents write cited notes, and a decision-ready report lands in `.condux/research/`. |
| `condux-doctor` | Is condux actually working on this host? Runs the SessionStart hook, resolves the Codex Stop hook, checks the agents shipped. |

Five named specialist agents ship alongside them: `explorer` (read-only codebase
navigation), `researcher` (external API verification), `planner` (design → plan),
`coder` (executes a provided plan), and `scout` (one angle of a `/condux:research`
survey). Condux implements directly by default — spawning
an agent requires a concrete justification.

---

## The Claude Code mod

On Claude Code (terminal and desktop app) condux also ships a **mod**: a small module that draws in the session instead
of asking you to open a file. It is read-only: it never writes to `.condux/`, runs a command or fills your prompt (it does open itself once; see below).

| | |
|---|---|
| `/condux` | Opens a live board of your plans: each task as done, next ready, ready or blocked, the ledger's wrap-up lines, and a task's card on expand. Plans with no progress ledger show as "state unknown" rather than guessing. `/condux all` lists every plan, including older finished ones. The stale and no-ledger groups show their newest five and count the rest. |
| Opens itself | The first time an agent writes a progress ledger in a session (the moment a saved plan starts being implemented) the board opens beside the chat without taking your keyboard. Once per session; close it and it stays closed. Set `CONDUX_AUTO_OPEN=0` to turn it off. |
| Status line | One line under the prompt, such as `plan: my-feature · 4/6 · next: Task 5`, for the open plan whose ledger changed most recently. It appears only in repositories that have a `.condux/` directory, and clears when nothing is open. |

The board reads the plans and progress ledgers under `.condux/` in the repository you are in, and polls them every few
seconds, so it follows an agent that is working through a plan on its own. If the mod fails to load, the skills and the
routing hook are unaffected; you get one log line. Codex, OpenCode and Cursor do not load mods, so nothing changes for
them. The design is in `specs/condux-mod/`.

## Artifacts

Two tiers, split by durability:

| Tier | Location | Committed |
|---|---|---|
| Durable — tech specs | `<git-root>/specs/` | yes |
| Working state — designs, plans, progress, scratch | `<git-root>/.condux/` | no (gitignored) |

`.condux/` is created on demand and condux asks before touching your `.gitignore`.
It never writes to the repo root, the CWD, or your project's `docs/`.

---

## Security posture

Condux is designed to be auditable in a single sitting.

- **No runtime dependencies.** Both bundled Node servers declare only
  `{"type": "commonjs"}` — there is no `node_modules`, no install step, and no
  third-party code in the execution path.
- **No network egress.** The plan-review HTML template references no external
  origin — no CDN, font, script, or analytics. This is enforced by a test in the
  source repo, not just by convention.
- **Localhost only.** Both servers bind `127.0.0.1` explicitly. Nothing is reachable
  off the machine.
- **Scoped file reads.** The review server serves only documents it has itself
  enumerated; a request for anything outside that allowlist returns empty.
- **Hooks execute one thing.** Each hook invokes `node` on a file inside the plugin
  root, addressed through the host's own plugin-root variable
  (`${CLAUDE_PLUGIN_ROOT}` on Claude Code, `${PLUGIN_ROOT}` on Codex).

### Why the Codex Stop hook has a 96-hour timeout

`hooks/codex-hooks.json` sets `"timeout": 345600`. That is deliberate, not a typo.

The Stop hook opens the plan-review server and blocks until you make a decision in
the browser. The timeout is the maximum time it will wait for a *human* — so it is
sized for "I stepped away and came back tomorrow," not for a machine operation. A
conventional 30- or 60-second timeout would kill the review while you were reading
it. The server exits as soon as a decision is delivered; the timeout is a ceiling,
never a delay.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
