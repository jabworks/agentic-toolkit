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

### 74. C2 — edge-triggered "you skipped the router" reminder for condux on OpenCode (follow-up to #72, gated on its measurement) (2026-09-01)

The enforcement half of the #72 research (`specs/trigger-reliability/opencode-routing-research.md` §4 C2), deliberately left out of the C0 + C1 ship: it catches the actual miss — an edit starting in a main session where `workflow` was never loaded — instead of hoping the session-start reminder stuck.

**Shape (oh-my-openagent's category-skill-reminder, with condux semantics).** `tool.execute.after` on the `skill` tool marks the session *routed* when `workflow` loads; `tool.execute.before` on `edit` / `write` / `patch` / `bash` in an unrouted main session sets a one-shot pending flag; `experimental.chat.messages.transform` splices one synthetic `<system-reminder>` ("an edit is starting and `workflow` was never loaded — load it now, or say the user asked to skip") before the latest user text. Fires at most once per session, never on subagents (reuse #72's name-or-parent discriminator), ~80 tokens when it fires, zero otherwise. Soft — it reminds, it does not block: a hard variant (throw in `tool.execute.before`) would fight users who legitimately said "just do it", and condux's doctrine is soft gates. Stable fallback if `messages.transform` misbehaves: append the reminder to `output.output` of the *next* tool result (opencode-workspace's pattern).

**Gate.** Do not build until the OpenCode measurement docket has a C1 number; if C1 alone lands the `workflow` fire rate near the Claude Code band, C2 is not worth a second experimental hook. Condux minor + npm changeset when it ships; condux-doctor learns the new contract.

**Update 2026-09-02 (#73 closed — the gate has its number, and it argues against building).** On `opencode/big-pickle`, C1 routes implementation tasks at 88.9% (vs 82.9% for the 0.20.0 instructions channel; `specs/trigger-reliability/opencode-routing-measurement.md`), and the residual misses are empty-cwd phrase-not-task cases, operating-manual questions, and cross-skill scoring — none of which an edit-time reminder addresses. C2 stays unbuilt unless a paid-model arm (Harvey's spend call) shows a materially lower task-routing rate that edit-time enforcement could recover.

## Loose threads
