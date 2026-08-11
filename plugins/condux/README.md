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
experimental hooks feature has to be enabled, and the four specialist agents are
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

**condux conflicts with [superpowers](https://github.com/obra/superpowers). Run one or the other.**

This is stated plainly because condux owes it a debt: condux reworks
superpowers' skill-orchestration ideas around proportional effort — tiered
routing, lazy loading, soft gates — instead of always-on maximalism. The
consequence of a rework is that the two are near-complete functional twins.

They collide hardest at the point neither can yield. Both register a
`SessionStart` hook on the same matcher, and each injects a router telling the
agent that every dev task starts with it:

```
superpowers  SessionStart  startup|clear|compact  →  using-superpowers/SKILL.md
condux       SessionStart  startup|clear|compact  →  routing.md
```

Nothing errors. The agent simply follows whichever contract it read last, and
which one that is can change between sessions. Below that, 11 of superpowers'
14 skills answer the same question as 8 of condux's 14:

| superpowers | condux |
|---|---|
| `using-superpowers` | `workflow` |
| `brainstorming` | `discovery` |
| `writing-plans` | `draft-plan` |
| `executing-plans` · `subagent-driven-development` | `subagent-execution` |
| `dispatching-parallel-agents` | `subagent-deployment` |
| `test-driven-development` | `test-first-development` |
| `systematic-debugging` | `root-cause-analysis` |
| `verification-before-completion` | `preflight` |
| `requesting-code-review` · `receiving-code-review` | `code-review` |

*(Verified against superpowers 6.2.0. `using-git-worktrees` and
`finishing-a-development-branch` are the part you would actually lose —
elsewhere in this toolkit, `git-operations` and `release` cover that ground,
and `writing-skills` is answered by `toolkit-ops`.)*

Both `install.mjs` and `/condux:condux-doctor` detect this and print the
removal command. **Neither runs it.** Uninstalling a plugin you chose is not a
decision an installer gets to make:

```bash
/plugin uninstall superpowers@claude-plugins-official
```

The same check covers loose skills under `~/.claude/skills`, `~/.agents/skills`,
`$CODEX_HOME/skills` and OpenCode's `skills/` — a machine can carry the
overlap through `npx skills add` without the plugin ever being installed.

### Other lineage

The `plan-review` skill is an independent reimplementation inspired by
[Plannotator](https://github.com/backnotprop/plannotator) — no shared code and
no third-party runtime dependency. It is **not** in the conflict registry:
running both is untidy rather than harmful, and no detection surface for it was
verified. Adding an entry needs one, checked against a real install — a wrong
name in a shipped warning is worse than no warning.

The registry lives at `skills/condux-doctor/conflicts.json`. Additions are a
data edit.

---

## The 14 skills

Start with `/workflow` — it is both the entry point and the operating manual.

| Skill | What it does |
|---|---|
| `workflow` | Routes any task to Small / Medium / Large and carries the operating rules. Every dev task starts here. |
| `discovery` | Turns a rough idea into a signed-off design. Goal-level questions, alternatives, then a detail round that feeds the spec. |
| `draft-plan` | Converts a signed-off design into lean task cards — what, why, gotchas, dependencies. |
| `technical-spec` | Durable feature specs under `specs/`, with a live preview. |
| `plan-review` | Renders a plan in a local browser for inline annotation, returns approve / revise / deny. |
| `test-first-development` | Tests before implementation. Opt-in, one upfront consent, never silently rewrites an existing spec. |
| `subagent-execution` | Executes a plan with named specialist agents; resumable from a progress ledger. |
| `subagent-deployment` | Fans out 2+ genuinely independent tasks in a single message. |
| `root-cause-analysis` | Root-cause-first debugging. No fix proposed before the investigation completes. |
| `preflight` | "Am I actually done?" — catches skipped steps and silent regressions before the quality gate. |
| `finalize` | The single end-of-task quality gate: typecheck → lint → format → test, in order, once. |
| `code-review` | Diagnostic report by severity. On request only; never auto-triggers, never fixes. |
| `live-verification` | Drives the real UI, endpoint, or CLI and checks each claim against observed behaviour before you push. |
| `condux-doctor` | Is condux actually working on this host? Runs the SessionStart hook, resolves the Codex Stop hook, checks the agents shipped. |

Four named specialist agents ship alongside them: `explorer` (read-only codebase
navigation), `researcher` (external API verification), `planner` (design → plan), and
`coder` (executes a provided plan). Condux implements directly by default — spawning
an agent requires a concrete justification.

---

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
