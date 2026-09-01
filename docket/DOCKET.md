# AGENTIC-TOOLKIT DOCKET

**Open items only.** Closed items move to `archive/<year>.md` with their
verification records. The id space is shared across open and archive and ids
are never reused — a "#N" in a commit subject refers to these numbers (this
docket is the tracker). When an item ships: stamp it ✅ with the date and
verification status, then move the entry to the archive in the same action.
Stale open markers cost real sessions — closing means moving.

## Committed

## Someday

### 65. toolkit-debugging-playbook applied-but-cold — evaluate for a routing nudge next period (2026-08-28)

Its period-1 rewrite shipped 2026-08-06 (`400f346`); on 2026-08-20 a user turn
stating its literal remit ("the skill for visual mockups almost never fire")
still missed (`specs/trigger-reliability/period-2-report.md`). No lexical room
left. Per the routing-nudge convention (toolkit-skill-standards), a nudge needs
a measured suppressed-class verdict and a live trigger surface to condition on —
period 3 should decide whether "being inside the toolkit repo" qualifies.

**2026-08-28 — the measurement stands; the default remedy is gone (#69 closed).**
The nudge mechanism this item would have used was retired (session-handoff
2.0.0; D2 retired), and #69 declined it as house doctrine. So this item is
*not* blocked and *not* dead: period 3 still evaluates whether
toolkit-debugging-playbook is suppressed-class. What changed is the disposal —
a verdict is now a finding to report, and shipping a nudge against it needs
both a measured verdict and Harvey's explicit sign-off on the ongoing token
cost. Do not treat a verdict here as authorising a hook.

### 67. Replace third-party remember plugin with our own memory stack on Claude Code? (2026-08-28)

The suppressor in `specs/trigger-reliability/` Q1 is
`claude-plugins-official/remember`'s SessionStart digest. The D2 nudge counters
it without touching it; owning the memory stack (concord already owns Codex)
would let digest and skills cooperate instead. Deliberately deferred at design
time — decision, not implementation, is the next step.

**2026-08-28 — brief written, awaiting ratification:**
`specs/trigger-reliability/memory-stack-decision.md`. Four options (keep /
replace / defer-with-criterion / upstream request) with the parity cost of a
replacement itemized. Recommends **defer against a pre-registered period-3
fire-rate criterion**: ≥40% keeps the third-party stack and closes this item,
<15% triggers the port. Two findings the brief rests on — the plugin exposes
**no config knob** that makes its digest conditional or demotable (the cheap
path is closed on evidence), and docket #64's harness extension proved **no
remedy can be pre-verified in-eval**, so live period-3 data is the only
instrument either option has. Filing an upstream request for a demotable digest
is recommended in parallel regardless of the verdict. Three questions need
Harvey's answer before ratification — see the brief's closing section.

**2026-08-28 — ratified; stays open.** All three questions answered (recorded in
the brief's Ratification section). (1) Losing model-summarized prose is **not**
acceptable, so a port must carry summarization concord does not have — Option B
is strictly more expensive than the scope table priced, and the `< 15%` branch
is a bigger commitment than it read. Recommendation unchanged: defer. (2) The
criterion is evaluated at **period 3 by accumulated sessions**, not a fixed
date, keeping the series like-for-like with periods 1 and 2 (D5). (3) The
upstream request is approved and drafted at
`specs/trigger-reliability/upstream-request.md` — **not yet filed**, pending
Harvey's read. This item closes when the period-3 criterion fires, or earlier if
upstream accepts.

**2026-08-28 (same day) — the criterion is void; the port has no automatic
trigger.** Harvey removed the session-handoff SessionStart hook (2.0.0), and the
criterion measured that nudge's efficacy. The brief's threshold table is kept as
the record of what was pre-registered and must not be applied; a replacement
written after removing the instrument would not be pre-registered, so none was
written. Period 3 now measures whether suppression persists unremediated
(~9% is the period-2 comparison), and the port becomes a judgement call on that
evidence rather than a threshold firing. With our own remedy withdrawn, the
upstream request is the only live path that can close this item without a port —
it is now the highest-value open thread here, and it is still unfiled.

**2026-08-29 — the upstream path is closed too; this item has no automatic
closing condition left.** Harvey declined to file the request: *"I don't really
want to make them change anything."* Ratified as **D7** — `remember` is not
malfunctioning, and D3's boundary (we do not modify a third party's plugin)
extends to not asking them to modify it either. The draft stays in
`specs/trigger-reliability/upstream-request.md`, restatused as declined and
never filed; `memory-stack-decision.md` carries the reversal of its answer 3.

Both closing conditions the ratification named are now void — the criterion
(voided 2026-08-28) and upstream acceptance (declined 2026-08-29). #67 closes
only on Harvey's judgement at period 3, weighing the measured suppression rate
against a port that must carry summarization concord does not have. Option B is
the entire remaining decision space.

Standing position, so no future session re-derives it: the toolkit ships **no**
countermeasure for the suppression class, deliberately, and will not acquire one
by asking. Explicit invocation is the supported path. Do not reopen the upstream
option without Harvey — see D7's "what would reopen this".

### 72. condux on OpenCode — routing payload names a verb the host can't run, leaks into subagents, and sits in the weakest seat; ship C0 (verb fix) + C1 (SessionStart-parity injection) (2026-09-01)

Symptom (Harvey, 2026-09-01): with `@jabworks/condux` loaded, OpenCode does not
reliably load `workflow` first on implementation requests — "the injected
instruction isn't enough". Research against source (oh-my-openagent 4.19.4,
kdcokenny/opencode-workspace, kdcokenny/ocx, anomalyco/opencode 1ead9e3,
`@opencode-ai/plugin` 1.18.25) is in
`specs/trigger-reliability/opencode-routing-research.md`. Three defects, all
observed in source, none yet reproduced live:

1. **Wrong verb.** `routing.md` ships verbatim to the OpenCode tree
   (`build-opencode.mjs` never transforms it) and says run `/condux:workflow`.
   OpenCode has no such command; the executable move is `skill(name="workflow")`.
   The folded `workflow/SKILL.md` says "run `/workflow`" too.
2. **Subagent leak.** `config.instructions` is global, so coder/explorer/
   researcher sessions also receive "every implementation request starts at
   /condux:workflow" — contradictory for coder.
3. **Weakest seat.** `session/llm/request.ts` joins agent prompt + env +
   AGENTS.md + our instructions + skills into ONE system string. On Claude Code
   the same payload is a user-turn `<system-reminder>` at session start.
   OpenCode's own plan-mode enforcement (`session/reminders.ts`) uses that
   shape too: a `synthetic:true` text part on the last user message.

Docket #38 shipped the `instructions` mechanism knowingly; this does not
reverse it, it relocates the payload. The other harnesses that get compliance
combine the recency channel (`chat.message` part mutation / synthetic parts),
main-agent scoping, and tool-event nudges; OMO additionally owns the default
agent (not for us).

**Ship (one changeset, condux minor + `@jabworks/condux` npm changeset):**

- **C0 — fix the verb.** Transform `routing.md` and the folded SKILL.md bodies
  for the OpenCode tree so `/condux:workflow` → load the `workflow` skill via
  `skill(name="workflow")`. Optional: OMO's auto-slash-command trick so a typed
  `/workflow` expands to the skill body (`chat.message`, stable hook).
- **C1 — SessionStart parity.** On the first non-synthetic user message of a
  *main* session (skip our subagents / child sessions), push a `synthetic:true`
  `<system-reminder>` part carrying the routing payload; re-inject on
  `experimental.session.compacting` (`output.context`) and whenever the marker
  is absent from current history (`overflow.ts` can prune without compaction).
  Then drop `routing.md` from `config.instructions`. Cost-neutral in the main
  session (~390 tokens rides in history every turn, same as today); saving is
  subagents stop paying it; seat is strictly better.

**Verify live before shipping C1** (docket #38 precedent: timing verified, not
reasoned): (a) a synthetic part pushed in `chat.message` is persisted and
reaches the model — `opencode run --format json` transcript or debug config;
(b) it survives pruning / is re-injected; (c) condux-doctor's OpenCode probe
updated from "routing.md registered on instructions" to the new contract.

**Follow-up, separate item once C1 is measured:** C2 — edge-triggered miss
catcher (edit/write/bash in a main session where `skill` never loaded
`workflow` → one synthetic reminder; stable fallback appends to the next tool
result, OCW-style). Soft, matching the soft-gate doctrine.

Measurement gap: `scripts/eval-invocations.mjs` spawns `claude -p` only; the
93% band says nothing about OpenCode. Not in scope here — note it.

## Loose threads
