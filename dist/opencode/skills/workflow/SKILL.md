---
name: workflow
description: "Routes any dev task into the right execution tier (Small/Medium/Large) and carries condux's operating rules — proportional effort, lazy skill loading, soft gates, implement-yourself-by-default. Confirms the tier with the user, then executes the matching flow, loading downstream skills only when a step needs them. Trigger with any implementation request — feature, bug fix, refactor, new endpoint, UI change. Every dev task starts here; other skills execute within /workflow, not instead of it. Also the operating manual — questions about how condux works, its tiers, soft gates, checkpoints, and named agents."
argument-hint: "<task description>"
---

# /workflow

Pick the right tier, confirm it, execute. No over-engineering for a button change.
No under-planning for a cross-cutting feature.

## Usage

```
/workflow $ARGUMENTS
```

## Live Context

```!
git status --short
git log --oneline -5
```

## Operating Rules

Condux is **lean and proportional** — the opposite of "always run every gate."

1. **Proportional, not maximal.** Match the tier to the task. Don't discovery a
   typo. Don't wing a cross-cutting refactor.
2. **Lazy loading.** Never load `discovery`, `draft-plan`, `test-first-development`,
   `subagent-execution`, or `finalize` upfront. Load a skill only when the tier flow
   reaches the step that needs it.
3. **Soft gates, not hard walls.** A gate (e.g. discovery before planning) can be
   skipped — but only *consciously*. If a gate hasn't run, ask the user whether they
   want to skip it; never silently bypass it.
4. **The user is in control.** Condux shapes *how* you work, but explicit user
   instructions (CLAUDE.md, AGENTS.md, direct requests) always win. "Treat this as
   LARGE" or "skip the plan" is always valid.
5. **Implement yourself by default.** Spawning agents is the exception — only
   delegate with a concrete justification (see Agents below).
6. **House style rides along.** Before the first line of code in any tier, load
   the `coding-directive` skill if it is installed — skip silently when it
   isn't. Codebase mimicry and repo config still win over the directive.

## Entry Contract

Every dev task starts with `/workflow` — no exceptions unless the user says so.

**Valid bypasses (explicit user instruction required):**
- Mid-flow: "I've already designed/planned this" → skip to the relevant step.
- Explicit opt-out: "skip workflow", "just do it" → proceed, but note the skip.

**Not valid bypasses:**
- Your own judgment that the task "seems small" — tier inference is this skill's
  job, not yours.
- Being loaded as companion context alongside another skill — run `/workflow`
  first; the other skill executes within it, not instead of it.

## Tiers

| Tier | Looks like | Flow |
|---|---|---|
| **SMALL** | isolated change, 1–3 files, clear requirements (a button, a label, a prop, a typo) | implement → `/preflight` → `/finalize` |
| **MEDIUM** | multi-file, some design needed, known boundaries (new form + API route, new procedure) | quick inline plan → implement → `/preflight` → `/finalize` |
| **LARGE** | cross-cutting, unclear scope, multiple subsystems (new module, auth flow, data-model change) | `/discovery` → `/draft-plan` → implement → `/preflight` → `/finalize` |

Every tier ends with `preflight` then `finalize` — no exceptions.

## The Router

1. **Infer the tier.** How many files? Requirement clear or needs design? Crosses
   service/package boundaries? Unknowns needing exploration first?
2. **Spec lookup.** Detect the package root (walk up from CWD to git root, find the
   nearest `package.json` / `Cargo.toml` / `go.mod` / `pyproject.toml`). Check both
   scopes (deduplicate if identical):
   `ls <package-root>/specs/ 2>/dev/null` and `ls <git-root>/specs/ 2>/dev/null`.
   Match the task subject to a spec dir (fuzzy kebab-case: "checkout flow" →
   `specs/checkout-flow`). If found, read `index.md`, then load by task type —
   bug/debug → `quirks.md`, `api.md`, `fields.md`; refactor → `implementation.md`,
   `decisions.md`; new feature → `decisions.md`, `api.md`, `fields.md`. Carry this
   context through; don't re-read mid-task. No spec → proceed without comment.
3. **Confirm with the user.** State the inferred tier + a one-sentence reason. If a
   spec was loaded, mention it and offer the companion: "Found spec for
   `checkout-flow` — loaded as context. Want the live HTML preview while we work?
   [y/n]" (if yes, load `technical-spec` and run its preview). Wait for explicit
   confirmation before proceeding.
4. **Execute the tier flow**, loading only the skills the tier needs, when needed.
5. **Checkpoints (MEDIUM/LARGE).** At each phase boundary, stop and present a
   "what next?" menu (AskUserQuestion), recommended option first. The user drives
   every transition — never auto-advance. SMALL runs linear with no menus.

### Tier flows

- **SMALL:** implement directly (no plan doc, no discovery) → `/preflight` → `/finalize`.
- **MEDIUM:** short inline plan (same section shape as draft-plan, kept lean —
  Overview · Files · Interfaces · Sketch where non-obvious · Edge cases) → CP-1 →
  implement top-to-bottom → CP-2 → `/preflight` → `/finalize` → CP-3.
- **LARGE:** load `discovery`, run fully to sign-off → load `draft-plan`, produce the
  plan doc, sign-off → CP-1 → implement task by task (`subagent-execution` if the
  user picks it) → CP-2 → `/preflight` → `/finalize` → CP-3.

## Checkpoints

After the user picks, load **only** that skill, run it, then return to the nearest
checkpoint and re-present the menu until the user chooses Done.

### CP-1 — Plan ready

*After draft-plan sign-off (LARGE) or the inline plan (MEDIUM). Plan review already
happened (or was declined) in draft-plan's own save step — don't re-offer it.*

| Option | What it does |
|---|---|
| **Start implementing** *(recommended)* | Implement the plan top-to-bottom yourself |
| **Write tests first** | Load `test-first-development`; one upfront consent, then test-first |
| **Spawn specialist agents** | Load `subagent-execution`; execute the plan with named agents |
| **Dispatch independent tasks in parallel** | Load `subagent-deployment`; fan out N independent tasks |
| **Revise the plan** | Loop back to `draft-plan` with the new direction |

### CP-2 — Implementation done

| Option | What it does |
|---|---|
| **Verify & finalize** *(recommended)* | Run `preflight`, then `finalize` |
| **Code review first** | Load `code-review` on the diff before finalizing |
| **Keep building** | More scope remains — re-confirm the tier if it grew |

### CP-3 — Finalized and green

| Option | What it does |
|---|---|
| **Verify it live** *(recommended when the change has a runnable surface)* | Load `live-verification` — drive the real UI or endpoint and check each claim against observed behaviour |
| **Code review** *(recommended)* | `/code-review` the diff before merging |
| **Commit** | Load the `git-commit` skill if installed (conventional message from the diff, safe staging); otherwise follow the repo's commit conventions |
| **Cut a release** | Load the `release` skill if installed — machinery detection, dry-run plan, then tag → push → GitHub release; otherwise follow the repo's release conventions |
| **Done** | Stop here |

## Skills and Gates

Load each only when its step is reached.

| Skill | When | Gate discipline |
|---|---|---|
| `discovery` | LARGE, before planning, or scope unclear | soft gate — ask before skipping |
| `draft-plan` | LARGE, after discovery sign-off | needs a signed-off design; no design → apply the discovery soft gate first |
| `test-first-development` | user asks, or picks it at CP-1 | one upfront consent; always ask before editing an existing test spec |
| `subagent-execution` | LARGE plan where specialization/parallelism pays off | default is implement yourself |
| `subagent-deployment` | 2+ independent tasks, no shared files/deps | ad-hoc work, not ordered plans |
| `preflight` | end of every tier, before finalize | automatic on SMALL; recommended CP-2 choice |
| `finalize` | after all implementation | runs in order, once, stops on first failure; check AGENTS.md for the real commands |
| `live-verification` | after finalize, when the change has a runnable surface | offer at CP-3; one pass, no loop; skipping is fine, silent skipping is not |
| `code-review` | on request only | never auto-triggers, never fixes; after finalize you may ask ONCE |
| `root-cause-analysis` | any bug investigation | load when debugging starts, not proactively; investigation before fixes |
| `plan-review` | plan/spec annotation in the browser | via ExitPlanMode/Stop hook, draft-plan's save step, or manually |
| `technical-spec` | spec context + persistence (see below) | confirm before writing; never silently modify spec files |

**Spec companion (`technical-spec`):** the router's step-2 lookup loads spec context
silently — no spec, no noise. `discovery` integrates it at sign-off (design doc always;
structured spec default-on, opt-out + live preview). `preflight` closes the loop — its
Drift Check compares the implementation against the task's spec before finalize.
Whenever a task **modifies** spec files
(`specs/`, OpenAPI YAMLs, contracts, field mappings), offer: "Want the live spec
preview open to review the changes?"

## Artifacts

Two tiers, split by durability — not by which skill produced them.

| Tier | Where | Contents | Git |
|---|---|---|---|
| **Durable** | `<git-root>/specs/` | tech specs (`technical-spec`), browsable via `spec-browser` | committed |
| **Working state** | `<git-root>/.condux/` | `designs/` · `plans/` · `progress/` · `scratch/` · `verification/` (live-verification evidence) | gitignored |

The spec is what you keep; the design and plan are scaffolding for building
it. Don't promote working state into `docs/` or the repo root — a project's
`docs/` belongs to the project, not to condux.

**Bootstrap.** `.condux/` is created on demand at the git root by the first
skill that writes there. Before that first write, check it's ignored:

```bash
git check-ignore -q .condux/ || echo "not ignored"
```

If it isn't, offer once: "condux keeps its working files in `.condux/` — add
it to `.gitignore` so they stay out of your commits?" On yes, append
`.condux/` to the repo's `.gitignore`. If the user would rather not touch a
tracked file, write it to `.git/info/exclude` instead. Never edit either file
without asking. Not a git repo → fall back to CWD and say so once.

**Override.** A project can relocate either tier in `AGENTS.md`; an explicit
override always wins over these defaults.

## Agents

Four **named specialist agents** ship with condux — never invent a generic subagent
with an injected prompt. Implement yourself by default; spawn only with concrete
justification (unfamiliar codebase, external API to verify, genuinely parallel
exploration, or a LARGE plan via `subagent-execution`).

- `explorer` — read-only codebase navigation (haiku, non-blocking; LSP over grep).
- `researcher` — external API/library verification (sonnet, non-blocking; resolves
  the installed version first, omits what it can't verify).
- `planner` — design → executable plan (sonnet; always delegates to explorer, and
  researcher when external libs are involved, before planning).
- `coder` — executes a provided plan only (sonnet; no exploration, no
  typecheck/lint/test — that's finalize's job).

Pipeline: explorer/researcher gather (non-blocking) → planner plans → coder executes
→ finalize validates. Spawn mechanics, model tiering, and the parallel-safety
checklist live in `subagent-execution` and `subagent-deployment`.

## Escalating Mid-Task

Scope turns out bigger than the confirmed tier? Stop immediately, report what you
found ("this touches auth middleware, not just the UI"), re-confirm the tier before
continuing. Never silently expand scope.

## Red Flags

Stop if you catch yourself doing any of these:

| Doing | Instead |
|---|---|
| Skipping `/workflow` because the task "seems small" | That judgment belongs to the router — run it first |
| Loading every condux skill upfront | Let the tier flow pull each in at its step |
| Discovery or a plan doc for a SMALL/MEDIUM task | Implement directly; verify; finalize |
| Tests / lint / typecheck mid-implementation | Save it all for `finalize` |
| Spawning agents for a task you can just do | Default is to implement yourself |
| Silently skipping discovery on a LARGE task | Ask — it's a soft gate, not a free pass |
| Rewriting a test spec to make it pass | Stop and ask — never silently edit specs |
| Auto-running code-review, commits, or agents | They're checkpoint choices; run only when picked |
| Auto-advancing past a checkpoint on MEDIUM/LARGE | The user owns every transition |
| Expanding scope past the confirmed tier | Stop, report, re-confirm |

## Tips

1. Be specific: "add export button to invoice table that calls exportInvoices" →
   SMALL. "improve the invoice flow" → clarify before a tier can be inferred.
2. Override anytime: "treat this as LARGE" is always valid.
3. Tests-first is opt-in: pick it at CP-1 or say so anytime.
4. Review is separate: after `/finalize`, run `/code-review` if you want one.
