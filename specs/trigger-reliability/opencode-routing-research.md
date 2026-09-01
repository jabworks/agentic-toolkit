# condux on OpenCode — why `config.instructions` isn't enough, and what the other harnesses do

Research note, 2026-09-01. Sources: shallow clones taken today of
`code-yeongyu/oh-my-openagent` (ffefeb2, 2026-09-01), `kdcokenny/opencode-workspace`
(46f57b4, 2026-08-18), `kdcokenny/ocx` (636dc2d, 2026-08-18), `anomalyco/opencode`
(1ead9e3, 2026-08-31, sparse: `session/ config/ agent/ plugin/ skill/`), and
`@opencode-ai/plugin@1.18.25` type definitions. Nothing here was run live; every
claim is "observed in source" unless marked otherwise.

**Assumed symptom** (Harvey: "the injected instruction isn't enough"): the OpenCode
agent does not reliably load the `workflow` skill first on implementation requests,
the way Claude Code / Codex sessions do with the SessionStart injection. Findings are
also useful under the adjacent readings (skill not discovered, wrong skill first).

---

## 1. What OpenCode actually does with our injection (ground truth from source)

`packages/opencode/src/session/prompt.ts` ~L1255 builds the per-request system array:

```
system = [ ...env, ...instructions, ...(mcpInstructions), ...(skills) ]
```

`instructions` = `Instruction.system()` = AGENTS.md/CLAUDE.md discovery **plus every
`config.instructions` entry** (`session/instruction.ts` L135). So `routing.md` *is*
in the system prompt — docket #38's verification holds on 1.18.x.

`session/llm/request.ts` L58 then joins it all into ONE system string:

```
system[0] = [ agent.prompt ?? providerDefaultPrompt, ...system, user.system ].join("\n")
plugin.trigger("experimental.chat.system.transform", {sessionID, model}, {system})
// anything a plugin pushes becomes system[1] (rest joined)
```

Three consequences:

1. **Position.** `routing.md` sits mid-block: after the `build` agent prompt and
   `<env>`, mixed with the user's AGENTS.md, before `<available_skills>`. On Claude
   Code the identical text arrives as a *user-turn* `<system-reminder>` at session
   start — recency-positioned and in the channel Claude Code models are tuned to
   obey. Same words, weaker seat.
2. **Scope.** `config.instructions` is global: every subagent session (coder,
   explorer, researcher spawned via `task`) also receives "every implementation
   request starts at `/condux:workflow`". That is noise at best and contradictory
   for `coder`, whose brief is "execute the plan".
3. **The verb doesn't exist on OpenCode.** `routing.md` ships verbatim (two
   `condux:` references; `build-opencode.mjs` never touches it) and tells the model
   to run `/condux:workflow`. OpenCode has no such command; the actionable move is
   `skill(name="workflow")`. The folded `workflow/SKILL.md` likewise says "run
   `/workflow`". The model has to translate a Claude-namespaced slash command into a
   tool call on its own — the single cheapest defect to fix, and plausibly a large
   part of the symptom.

**OpenCode's own enforcement channel is not the system prompt.**
`session/reminders.ts` (`SessionReminders.apply`, called at prompt.ts L1180 *before*
`messages.transform`) pushes `{type:"text", synthetic:true}` parts onto the **last
user message** carrying `<system-reminder>` blocks (`plan-mode.txt`,
`build-switch.txt`). That is exactly the Claude Code system-reminder shape: a
synthetic user-turn part, re-evaluated every turn, cache-neutral for the system
prefix.

**Hook surface (`@opencode-ai/plugin@1.18.25`, `dist/index.d.ts`):** `config`, `event`,
`tool`, `chat.message`, `chat.params`, `chat.headers`, `permission.ask`,
`command.execute.before`, `tool.execute.before/after`, `shell.env`,
`tool.definition`, and experimental: `chat.messages.transform`,
`chat.system.transform`, `session.compacting`, `compaction.autocontinue`,
`text.complete`, `provider.small_model`.

Upstream noise checked and dismissed: anomalyco/opencode#17100 ("system.transform
mutations discarded") was closed same day by the reporter as interference from
another plugin; vectorize-io/hindsight#2656 ("experimental hooks not in API") was
retracted by the reporter — the hooks are in the shipped types. `system.transform`
works; it is just experimental-flagged.

---

## 2. How each harness gets compliance

### oh-my-openagent (npm `oh-my-opencode` / `oh-my-openagent` 4.19.4) — *replace the agent, then police the turn*

Monorepo; the OpenCode plugin is `packages/omo-opencode/`. 60+ hook modules under
`src/hooks/`. Hook usage across src (files, tests excluded): `tool.execute.before` 33,
`tool.execute.after` 33, `chat.message` 21, `messages.transform` 12,
`session.compacting` 9, `system.transform` 6, `command.execute.before` 5.

| Lever | Where | Mechanism |
|---|---|---|
| **Own primary agent** | `plugin-handlers/agent-config-assembly.ts` L148–152 | `config` hook sets `config.default_agent = "sisyphus"`; the workflow lives in the agent prompt, not in instructions. `agents/dynamic-agent-core-sections.ts` adds an `<agent-identity>` override because OpenCode prepends its own prompt to `mode: "primary"` agents. |
| **Runtime prompt rewrite** | `plugin/system-transform.ts` | `system.transform` rebuilds the Sisyphus body for the *actual* runtime model and pushes `<ultrawork-mode>` when default-mode is on; dedupes by tag (hook re-fires after compaction). |
| **Keyword → mandatory mode** | `hooks/keyword-detector/hook.ts` L250–259 | `chat.message`: regex over the real user text part; on match **appends** `"\n\n---\n\n" + <mode block>` to `output.parts[idx].text`. Block opens with `**MANDATORY**: You MUST say "ULTRAWORK MODE ENABLED!" …`. Skips synthetic/internal parts; skips non-main sessions for most keywords; tracks already-injected. |
| **Slash-command expansion** | `hooks/auto-slash-command/hook.ts` L91–160 | `chat.message`: if the prompt starts with `/name`, resolves it against commands **and skills** (`executor.ts` `skillToCommandInfo`) and **replaces the text part** with the expanded template inside `<auto-slash-command>` tags. This is how `/workflow` typed by a user becomes the skill body on OpenCode. |
| **Delegation nag** | `hooks/category-skill-reminder/hook.ts` L120–172 | `tool.execute.after` counts work-tool calls; ≥3 without a delegation tool ⇒ `messages.transform` **splices one `synthetic:true` text part** before the latest user text. One-shot per session. |
| **Continuation loop** | `hooks/todo-continuation-enforcer/` | `event: session.idle` with open todos ⇒ `client.session.promptAsync` with a system-directive prompt ("Continue… Do not stop until all tasks are done"); countdown, cooldown, stagnation caps, skip-list `["prometheus","compaction","plan"]`. |
| **Hard guards** | `hooks/*-guard/`, `tool.execute.before` | throw in `tool.execute.before` to block a call (write-existing-file-guard, notepad-write-guard, tool-pair-validator …). |
| **Compaction survival** | `experimental.session.compacting` | re-injects state into `output.context`. |
| **Claude Code hooks compat** | `hooks/claude-code-hooks/` | Runs `settings.json` hooks: `UserPromptSubmit`, `PreToolUse`, `PostToolUse(+Failure)`, `Stop`, `SubagentStop`, `PreCompact`, `Notification`, `SessionStart` are in the type union; handlers exist for chat-message, tool-before/after, pre-compact, session events. |

Cost profile: the agent prompt is large (Sisyphus prompt ~thousands of tokens) but
sits in the cached system prefix; per-turn extras are one-shot or edge-triggered.
Fragility: heavy reliance on payload shapes (`sessionID` resolution helpers exist
precisely because they drifted), `system.transform` experimental, model-specific
prompt variants.

### opencode-workspace (kdcokenny, installed via `ocx`) — *agent-scoped rules + tool-output nudges*

`src/plugin/workspace-plugin.ts` (plan/build orchestration) and
`background-agents.ts` (async delegation). No agent replacement: it configures
OpenCode's native `plan`/`build` primaries as read-only orchestrators (README
"Permissions") and injects rules by agent.

| Lever | Where | Mechanism |
|---|---|---|
| **Agent-scoped system rules** | `workspace-plugin.ts` L605–618 | `system.transform` pushes a `<date-awareness>` block for all agents, then `PLAN_RULES` if `input.agent === "plan"`, `BUILD_RULES` (`<system-reminder><delegation-mandate policy_level="critical">… You Are an ORCHESTRATOR … ALL code changes → delegate to coder`) if `"build"`. |
| **Next-step nudges in tool output** | `workspace-plugin.ts` `tool.execute.after` | after `plan_save`: `output.output += "<system-reminder>Plan saved… You MUST now delegate to the reviewer…"`; after the last tracked `coder` task: "Coder task complete. Proceed to code review…". |
| **State via tool calls** | `tool.execute.before` | tracks `task` calls with `subagent_type === "coder"` (callID map with 15-min stale sweep). |
| **Delegation rules** | `background-agents.ts` L1890 | `system.transform` pushes `DELEGATION_RULES` (routing table: read-only subagents → `delegate`, write-capable → native `task`). |
| **Notifications back into chat** | `background-agents.ts` L1895 | `chat.message` injects pending delegation results as parts. |
| **Compaction survival** | `session.compacting` | pushes `<workspace-context>` with the current plan task into `output.context`. |

Fragility worth flagging: it keys on `input.agent` in `system.transform`, which the
SDK types as absent ("runtime provides these properties", citing sst/opencode#6142).
In today's `request.ts` L68 the trigger passes only `{sessionID, model}` — so on
current OpenCode the plan/build rule branches would not fire (only the universal
date block would). Unverified live, but it is a concrete example of the
experimental-hook drift risk.

### ocx (kdcokenny/ocx 2.0.15) — *config-time composition, no runtime hooks*

An extension manager: profiles (`~/.config/opencode/profiles/<name>/`) that control
what OpenCode sees via include/exclude globs, registries of shadcn-style copied
components, `ocx oc -p <profile>` to launch. No plugin hooks anywhere in the repo.
Relevant guidance from its docs: put shared guidance in the config `instructions`
array (`opencode.instructions` registry field, resolved to
`.opencode/instructions/*.md`), **never** into AGENTS.md/CLAUDE.md standard
locations; note that if any AGENTS.md exists CLAUDE.md is ignored. So ocx validates
the channel condux already uses — it just doesn't claim that channel *enforces*
anything. Different category from the other two; nothing to port.

---

## 3. The gap, stated plainly

condux's OpenCode plugin pulls exactly one lever — global ambient prose in the
system block — and it pulls it with a verb the host can't execute. Both harnesses
that get compliance combine (a) something in the **user-turn/recency channel**
(`chat.message` part mutation or synthetic parts), (b) **agent scoping** (main
agent only), and (c) **event-driven nudges** tied to tool calls. OMO additionally
owns the agent. OpenCode itself enforces its own plan mode via (a).

The Claude Code / Codex parity target is not "instructions every turn"; it is
**SessionStart semantics**: inject once on session start, again after clear, again
after compaction. OpenCode has those three moments: first real `chat.message` of a
session, `session.compacted` / `experimental.session.compacting`, and a new
session ID. In the main session that costs the same ~390 tokens per request as
today (a persisted part rides in history every turn, exactly like an instruction
block does); the saving is that subagent sessions stop paying it, and the seat
is better.

---

## 4. Candidate mechanisms for condux, ranked

Costs are per main-agent turn unless stated. "Stable" = non-experimental hook.

### C0 — Fix the verb (ship regardless; near-zero cost)

Transform `routing.md` for the OpenCode tree in `build-opencode.mjs`: `/condux:workflow`
→ "load the `workflow` skill (`skill(name="workflow")`)"; likewise the folded
SKILL.md bodies' `/workflow` mentions, or add one line to the OpenCode routing
payload mapping `/name` → `skill(name)`. Also consider OMO's trick so a user who
*types* `/workflow` gets the skill body: `chat.message` + text-part replacement
(~40 lines, stable hook). Fragility: none. Verifiable with `opencode debug config`
plus one transcript.

### C1 — SessionStart parity via `chat.message` + compaction (recommended core)

`chat.message` (stable): on the **first non-synthetic user message per session**,
in the **main session only** (skip when `input.agent` is one of our subagents or
the session has a parent), push a `synthetic: true` text part carrying
`<system-reminder>` + the routing payload — the same shape OpenCode's
`reminders.ts` uses. Re-inject on `experimental.session.compacting` via
`output.context` (or on the first `chat.message` after a `session.compacted`
event, if we want to stay on stable hooks only). Then **drop `routing.md` from
`config.instructions`**, or shrink it to a two-line pointer.

- Cost: cost-neutral in the main session — the persisted part rides in history
  on every subsequent request, ~390 tokens, same as the instruction block
  today. The saving is scoping: coder/explorer/researcher sessions stop
  carrying it (instructions are global; this isn't). Docket #38's ratified
  trade is unchanged in magnitude, better in placement.
- Enforcement: recency channel, `<system-reminder>` framing, scoped to the main
  agent. This is the lever OpenCode itself uses.
- Fragility: low — `chat.message` and `event` are stable; `session.compacting`
  is experimental but optional. Two things to verify live before shipping:
  (1) a synthetic part pushed in `chat.message` is persisted and reaches the
  model (OpenCode's own reminder parts are pushed post-storage at L1180; a
  `chat.message` push happens pre-storage, which should be *more* durable);
  (2) durability — an instruction block never leaves context, but a part on
  the first user message can be pruned without a compaction event
  (`session/overflow.ts` exists), so the re-inject condition should be
  "routing marker absent from current history", not "first message only".
- Precedent: OMO keyword-detector (text-part append), OpenCode plan-mode
  (synthetic part), OCW notifications (parts injection).

### C2 — Edge-triggered "you skipped the router" reminder (adds enforcement)

Mirror OMO's category-skill-reminder with condux semantics: `tool.execute.after`
on the `skill` tool marks the session *routed* when `workflow` loads;
`tool.execute.before` on `edit`/`write`/`patch`/`bash` in an unrouted main
session sets a pending flag; `experimental.chat.messages.transform` splices one
synthetic `<system-reminder>` ("an edit is starting and `workflow` was never
loaded — load it now or say the user asked to skip") before the latest user text.
One-shot per session; never on subagents.

- Cost: zero until it fires; ~80 tokens once.
- Enforcement: catches the actual miss (editing without routing) rather than
  hoping the preamble stuck. Soft — it reminds, it does not block. A hard variant
  (throw in `tool.execute.before`) exists but would fight users who legitimately
  said "just do it"; condux's own doctrine is soft gates.
- Fragility: `messages.transform` is experimental; fall back to appending the
  reminder to `output.output` of the *next* tool result (OCW's pattern, stable).

### C3 — Agent-scoped `system.transform` push (OCW pattern; alternative to C1's placement)

Push the routing block from `experimental.chat.system.transform` only when the
session's active agent is `build` (condux already tracks `activeAgent` per
session from `chat.params`; don't rely on `input.agent`, which current source
does not pass). Removes the subagent leakage and the AGENTS.md co-mingling, keeps
prompt-cache friendliness (lands as `system[1]`).

- Cost: same ~390 tokens/turn as today, but main agent only.
- Enforcement: still system-role; better seat than mid-block, worse than C1's
  recency. Take this only if live testing shows C1's synthetic part is not
  persisted.
- Fragility: experimental hook; the OCW `input.agent` drift above shows how it bites.

### C4 — Own primary agent (OMO pattern) — not recommended

Inject a `condux` primary with routing baked into its prompt and set
`default_agent`. Strongest compliance, but it changes the user's default agent,
duplicates OpenCode's `build` prompt, and inverts condux's "skills inside the host"
stance; OMO needs an identity-override section just to survive OpenCode's
prepended prompt. Mentioning for completeness.

### Suggested shape

C0 + C1 now (one changeset, condux minor bump, `@jabworks/condux` npm changeset);
C2 as a follow-up once C1 is measured. Measurement gap to note: the trigger-eval
harness (`scripts/eval-invocations.mjs`) spawns `claude -p`; there is no OpenCode
run, so today's ~93% band says nothing about this channel. `opencode run --format
json` (non-interactive) is the obvious adapter if we want a before/after number.

---

## 5. Sources

- https://github.com/code-yeongyu/oh-my-openagent — `packages/omo-opencode/src/{plugin,hooks,agents,plugin-handlers}`
- https://github.com/kdcokenny/opencode-workspace — `src/plugin/{workspace-plugin,background-agents}.ts`, README
- https://github.com/kdcokenny/ocx — README, `docs/reference/skills.mdx`, `docs/registries/create.mdx`
- https://github.com/anomalyco/opencode — `packages/opencode/src/session/{prompt,instruction,reminders,system}.ts`, `session/llm/request.ts`, `skill/index.ts`
- https://opencode.ai/docs/plugins/ · https://opencode.ai/docs/rules/ · https://opencode.ai/docs/skills/
- https://github.com/anomalyco/opencode/issues/17100 (closed, plugin interference) · https://github.com/vectorize-io/hindsight/issues/2656 (closed, reporter retracted) · https://github.com/anomalyco/opencode/issues/6142 (closed 2026-05-22)
- Local: `packages/condux-opencode/index.js`, `skills/workflow/hooks/routing.md`, `docket/archive/2026.md` #38
