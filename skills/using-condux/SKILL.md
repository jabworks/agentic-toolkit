---
name: using-condux
description: Operating manual for condux's lean agentic workflow — tiered execution, soft gates, lazy skill loading, and named specialist agents. Establishes how skills and agents fit together so effort stays proportional to the task.
when_to_use: Load at the start of any development task.
user-invocable: false
---

# Using Condux

The operating manual for the condux plugin. Read this first when a dev task arrives, then load only what the task actually needs.

## Philosophy

Condux is **lean and proportional**. It is the opposite of "always run every gate." Effort scales to the task — a button label and a new auth flow do not get the same ceremony.

1. **Proportional, not maximal.** Match the workflow tier to the task. Don't brainstorm a typo. Don't wing a cross-cutting refactor.
2. **Lazy loading.** Never load `brainstorm`, `write-plan`, `tdd`, `sdd`, or `finalize` upfront. Load a skill only when the tier flow reaches the step that needs it.
3. **Soft gates, not hard walls.** A gate (e.g. brainstorm before planning) can be skipped — but only *consciously*. If a gate hasn't run, ask the user whether they want to skip it; don't silently bypass it.
4. **The user is in control.** Condux skills shape *how* you work, but explicit user instructions (CLAUDE.md, AGENTS.md, direct requests) always win. "Treat this as LARGE" or "skip the plan" is always valid.
5. **Implement yourself by default.** Spawning agents is the exception, not the default. Only delegate when there's a concrete justification (see Agents below).

## Entry Point

Every dev task starts with `/workflow` — no exceptions unless the user explicitly says otherwise:

```
/workflow <task description>
```

`workflow` infers the tier (Small / Medium / Large), confirms it with you, then runs the matching flow. You don't pre-load the downstream skills — `workflow` pulls each one in at the right moment.

**Valid bypasses (require explicit user instruction):**
- User is mid-flow: "I've already planned this / already brainstormed" → skip to the relevant step
- User explicitly opts out: "skip workflow", "just do it" → proceed, but note the skip

**Not valid bypasses:**
- Your own assessment that the task is small or bounded — that's `workflow`'s job, not yours
- Being loaded as companion context alongside another skill — condux still drives the workflow

If condux is loaded alongside another skill, run `/workflow` first. The other skill executes within the workflow, not instead of it.

## The Tiers

| Tier   | Looks like                                   | Flow                                                             |
| ------ | -------------------------------------------- | --------------------------------------------------------------- |
| SMALL  | 1–3 files, clear requirements                | implement → `verification` → `finalize`                         |
| MEDIUM | multi-file, some design, known boundaries    | quick inline plan → implement → `verification` → `finalize`     |
| LARGE  | cross-cutting, unclear scope, multi-subsystem | `brainstorm` → `write-plan` → implement → `verification` → `finalize` |

Every tier ends with `verification` then `finalize` — no exceptions. If mid-task the scope outgrows the confirmed tier, stop, report it, and re-confirm before continuing. Never silently expand scope.

On **MEDIUM and LARGE** tasks, `workflow` stops at each phase boundary (plan ready → implementation done → finalized) and presents a `what next?` menu — recommended option first — so the user drives every transition instead of the flow running on a rail. SMALL tasks skip the menus and run straight through. See `workflow` → Checkpoints.

## The Skills

Load each only when its step is reached.

| Skill          | When                                                                 | Gate type                                  |
| -------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `workflow`     | Any implementation request — the router                             | entry point                                |
| `brainstorm`   | LARGE tasks, before planning, or when scope is unclear              | **soft gate** — ask before skipping        |
| `write-plan`   | LARGE tasks, after brainstorm sign-off                              | **soft gate** — needs a signed-off design  |
| `test-driven-development` | Opt-in only — user asks for TDD or input/output logic    | ask before writing/running/editing tests   |
| `subagent-driven-development` | LARGE plan where agent specialization/parallelism pays off | default is to implement yourself      |
| `verification` | End of every tier, before finalize — the "am I actually done?" check | automatic                                  |
| `finalize`     | After all implementation — typecheck → lint → format → tests        | automatic, run once, stop on first failure |
| `code-review`  | On request only — "review this", or after finalize if user says yes | never auto-triggers                        |
| `systematic-debugging` | Any bug investigation — before proposing fixes | load when debugging, not proactively  |
| `plan-review`  | Annotate a plan in the browser before implementation, then return approve/revise/deny to the agent | ExitPlanMode hook or manual |

### Companion: `technical-spec`

`technical-spec` is a separate plugin (`jabworks/technical-spec`) that integrates with condux at two levels:

**Spec context (cross-cutting — `workflow` + `systematic-debugging`):** Before any task executes, condux checks `specs/` for a saved spec matching the affected feature or domain. If found, it loads the relevant files as context (decisions, API contracts, field mappings, quirks) so refactors, bug fixes, and new work on that domain start informed rather than cold.

**Brainstorm integration (`brainstorm`):**
- **At start**: if a spec exists for the feature, offers to open the live HTML preview
- **At sign-off**: saves the design as a structured spec (`specs/<feature>/`) and launches the live preview server, which re-renders as spec files change

**After any spec changes:** whenever a task modifies spec files (`specs/`, OpenAPI YAMLs, API contracts, field mappings), ask the user: "Want me to open the technical-spec visual companion so you can review the changes?"

Install once; condux uses it silently when present. No spec? No noise — the lookup produces no output if nothing is found.

### Interactive plan review: `plan-review`

Render a plan in a local browser for inline annotation, then return an
approve / request-revisions / deny decision to the agent. Wire it to the
`ExitPlanMode` hook so it fires automatically when the agent finishes planning,
or run it manually on any markdown plan/spec. Self-contained — no network egress,
no third-party runtime dependency.

### Gate discipline

- **brainstorm** is a soft gate before planning. If a LARGE task arrives and brainstorm hasn't run, ask: "Want to skip brainstorm and go straight to planning?" — don't assume.
- **write-plan** requires a signed-off design. No design → apply the brainstorm soft gate first.
- **tdd** is fully opt-in. Always ask before writing tests, before running them, and before editing an existing spec. Never silently rewrite a test to match new behavior.
- **finalize** runs its steps in order, once, and stops on the first failure to fix it before continuing. Check `AGENTS.md` for the project's real commands.
- **code-review** never fires on its own and never auto-fixes. After finalize, you may ask once: "Want a code review before merging?"
- **systematic-debugging** is triggered when investigating a bug — load it then, not upfront. It enforces investigation before fixes: never propose a solution before tracing the root cause.

## The Agents

Condux ships four **named specialist agents**. They are pre-defined — never invent a generic subagent with an injected system prompt. Default to implementing yourself; spawn only with concrete justification (unfamiliar codebase, external API to verify, genuinely parallelizable exploration, or a LARGE plan via `subagent-driven-development`).

### `explorer` — read-only codebase navigator
- **Use for:** understanding unfamiliar code, tracing types/symbols, mapping module boundaries, finding patterns and conventions — *before* planning or coding.
- **Model:** haiku. **Mode:** non-blocking — fire it and keep working, retrieve findings when needed.
- **Tools:** `Read`, `LSP`, `Skill`, `WebFetch`, `WebSearch`, Task/Cron/Worktree/Monitor helpers, context7 (`resolve-library-id`, `query-docs`). **No Write/Edit — ever.**
- Prefers LSP (go-to-definition, find-references) over grep; reports only what it observes, never speculates.

### `researcher` — external API/library reference
- **Use for:** confirming exact signatures, return types, or version-specific behavior of any third-party dependency *before* implementation.
- **Model:** sonnet. **Mode:** non-blocking.
- **Tools:** same read/research set as explorer — `Read`, `LSP`, `WebFetch`, `WebSearch`, context7, MCP resource tools. No code edits.
- Resolves the installed version first (lockfile, never assume), then walks the priority chain: MCP → Context7 → official docs → `.d.ts` → library source. Omits anything it can't verify rather than fabricating.

### `planner` — architecture & task breakdown
- **Use for:** turning a signed-off design into an executable plan — task cards, ADR-style decisions, file/folder proposals. Never writes implementation code.
- **Model:** sonnet.
- **Tools:** read/research set **plus `Write`, `Edit`, `NotebookEdit`** (for producing plan docs), context7, Task/Cron/Worktree helpers.
- **Mandatory pre-planning:** always delegates to `explorer` first (and `researcher` if external libs are involved) and waits for findings before planning. Asks up to 3 clarifying questions for LARGE tasks; skips questions for small ones.

### `coder` — implementation executor
- **Use for:** executing a well-defined plan — writing new files, editing existing ones. Only after planning/research are done.
- **Model:** sonnet. **Tools:** all tools.
- **Boundaries:** acts only on a provided plan (never improvises structure/APIs); never explores or researches (delegates back to `explorer`/`researcher` if it needs context); **no typecheck/lint/format/test** — that's `finalize`'s job. Reads `AGENTS.md` and the target files before touching anything, and matches existing conventions exactly.

### Pipeline at a glance

```
explorer ─┐
          ├─→ planner ─→ coder ─→ finalize
researcher┘
```

`explorer`/`researcher` gather context (non-blocking) → `planner` turns it into a plan → `coder` executes → `finalize` validates. For LARGE plans, `subagent-driven-development` orchestrates these agents.

## Red Flags

Stop if you catch yourself doing any of these — they violate condux's lean philosophy:

| Doing                                          | Instead                                                       |
| ---------------------------------------------- | ------------------------------------------------------------ |
| Skipping `/workflow` because the task "seems small" | That judgment belongs to `workflow` — run it first      |
| Treating condux as reference when loaded alongside another skill | Run `/workflow` first; the other skill runs within it |
| Loading every condux skill upfront             | Let `workflow` pull each in at its step                      |
| Brainstorming or writing a plan doc for a SMALL task | Implement directly; verify; finalize                   |
| Running tests / lint / typecheck mid-implementation | Save it all for `finalize`                              |
| Spawning agents for a task you can just do     | Default is to implement yourself                             |
| Silently skipping brainstorm on a LARGE task   | Ask the user — it's a soft gate, not a free pass             |
| Rewriting a test spec to make it pass          | Stop and ask — never silently edit specs                     |
| Auto-running code-review                        | It's on-request only                                         |
| Expanding scope past the confirmed tier         | Stop, report, re-confirm                                     |

---

*Inspired by [obra/superpowers](https://github.com/obra/superpowers) — condux reworks its skill-orchestration ideas around a lean, proportional-effort philosophy (tiered routing, lazy loading, soft gates) rather than always-on maximalism.*
