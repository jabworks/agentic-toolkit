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
