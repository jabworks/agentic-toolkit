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

### 75. diagram-check: decorative lines read as unlabeled edges (2026-09-08)

Every stroked `<line>` is an edge to `skills/blueprint/references/diagram-check.mjs`, so a separator (a divider inside an entity, a title rule) reports `unlabeled-edge`. Raised as a Minor in the 2.29.0 code review; not yet bitten. Candidate rule: a line with no marker that lies fully inside one node, or spans a boundary's full width, is decoration. Decide when a real diagram trips it — a rule invented before the case is a guess.

### 79. diagram-check: a halo narrower than its label is not a finding (2026-09-10)

Seen while calibrating for #76 (2026-09-10): 8 of the 16 edge labels across three real diagrams are wider than the stroke-less halo rect drawn behind them, by 1 to 19 units (widest: a 21-character label at 139 units over a 120 halo). Invisible in those three because no edge crosses those labels; the halo exists for the moment one does, and a narrow one lets the crossing edge show through the label's ends. The kit now sizes halos from the same budget as the label (characters × 11 × 0.6, plus 4px each side); the checker has no rule. Candidate: for each free text, the nearest stroke-less rect whose box contains the text's anchor point is its halo, and a halo that does not contain the text box past the 1-unit tolerance reports `halo-narrower-than-label`. Decide when a real diagram shows the edge poking through — same doctrine as #75: a rule invented before the case is a guess. Evidence table in specs/blueprint/verification/2026-09-10-font-size-calibration/report.md.

### 80. Spec `Commit:` stamps cite branch hashes that squash-merge orphans (2026-09-10)

Seen closing #76 (2026-09-10): `specs/blueprint/index.md` stamps **Commit:** 3e31e7f and its changelog line for 2.29.0 cites eb8cd83 — both are commits on a feature branch, and every PR here squash-merges, so main only ever carries the squash (00455af, 3118965). eb8cd83 is already unresolvable in a fresh clone; 3e31e7f survives only in clones that had the branch. Sweep on that date: 13 spec index headers carry a hash, 11 resolve on main, 2 are orphaned branch commits (blueprint 3e31e7f, discovery-presentation a8b07b7). The stamp is written before the PR exists, so the hash it can name is necessarily the wrong one — the convention is broken by construction, not by carelessness.

`durable-citations.test.mjs` guards paths (#34) and `Q<n>` references (#51) but never hashes, so nothing fails. Two ways out, pick one: (a) stamp the PR number instead of a hash — `**Commit:** PR #153` is knowable at branch time and stable after squash, with a test that the number is a merged PR or the branch's own open one; (b) keep hashes but have the test require every 7-hex cited in `specs/**/index.md` to be an ancestor of main, and stamp `pending` until a post-merge commit fills it in — note that is exactly the shape that orphaned the #73 close (PR #149, re-landed as #152), so (b) needs the fill-in commit to go through its own PR. Existing stale stamps get repaired in the same change; hashes in prose outside the header (the blueprint changelog lines) get the same treatment or an explicit exemption.

### 81. subagent-execution: task-brief.sh looks for `### Task` but draft-plan mandates `## Task` (2026-09-10)

Hit 2026-09-10 dispatching the #78 plan: `skills/subagent-execution/references/task-brief.sh` extracts a card by matching `^### Task N:`, while `skills/draft-plan/SKILL.md` (Task Card Format) and `references/plan-template.md` mandate top-level `## Task N:` headings so plan-review's TOC lists every task. Every plan written to the current template makes the brief script print "Task N not found" — the file-handoff path in subagent-execution's "File Handoffs" section is dead for compliant plans, and a controller pastes the card instead (the context cost the script exists to avoid). Fix is one regex (`^##+ Task N:` accepts both, or `^## ` to match the template) plus a test that runs the script against `plan-template.md`. Same drift class as the self-doctrine memory: two skills in the same bundle disagreeing on a shape neither tests.

### 82. diagram-check: a label or halo inside a boundary title strip is not a finding (2026-09-10)

Found redrawing the reporting specimen in the D9 language (2026-09-10, specs/blueprint/verification/2026-09-10-visual-language/report.md, "Also seen"): the `HTTP · effective composition JSON` halo spans y 285.75–300.75 while the frontend boundary's title strip ends at y 288 — a 2.25-unit overlap. The kit's Boundaries rule says no label or halo ever lands in the strip band (a halo punches a `var(--card)` hole through the tint), but the checker has no notion of a strip: it is a stroke-less rect, which the checker treats as decoration and ignores. The overlap is inherited from the 2026-09-08 routing geometry and invisible at render scale, so it shipped as-is. Candidate rule: a stroke-less rect whose top edge coincides with a boundary rect's top edge and whose width equals the boundary's is that boundary's strip; any text box or halo intersecting it reports `label-in-title-strip`. Wait for a case where the overlap is visible before adding the rule — same doctrine as #75 and #79.

## Loose threads
