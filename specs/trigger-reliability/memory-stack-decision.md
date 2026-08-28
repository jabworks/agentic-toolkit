# Memory stack on Claude Code — decision brief (docket #67)

> Should the toolkit replace the third-party `remember` plugin on Claude Code
> with its own memory stack? D3 deferred this deliberately: the suppressor is
> external, the countermeasure landed on our side, and the replacement question
> was left open. This brief is the decision machinery, not the decision.

**Status:** awaiting ratification
**Prepared:** 2026-08-28
**Recommends:** defer, against a pre-registered period-3 criterion (Option C)

## Why this is on the table

`specs/trigger-reliability/` Q1 names the suppressor: a SessionStart memory
digest answers the resume question before the trigger is consulted, so
`session-handoff` misses on phrases it declares verbatim. Period 2 measured the
asymmetry inside one skill — resume phrases fired ~9% of turns, wrap-up phrases
~64%, same declared vocabulary — and D2 shipped a conditional routing nudge
against it (session-handoff 1.10.0, armed on both hosts).

D3 drew the boundary: the digest belongs to `claude-plugins-official/remember`,
which we observe and never modify. Owning the memory stack instead would let
digest and skills cooperate rather than one working around the other.

## What is actually installed

| | `claude-plugins-official/remember` 0.20.0 | `concord` 0.6.1 (ours) |
|---|---|---|
| Host | Claude Code | Codex only |
| Language | Python, ~9.5 MB on disk | Node stdlib, 1156 lines |
| Capture | model-summarized (`claude -p`, haiku by default) | mechanical extraction from the rollout, **no model call** |
| Store root | `.remember/` (project-relative default; external mode available) | `<git-root>/.concord/`, plus `~/.codex/concord/` for global notes |
| Tiers | buffer / daily / 7-day recent / archive / pinned core memories | buffer / days / recent / archive, pinned facts never auto-compressed |
| Extras | git backup + restore, NDC compression, recovery, `hooks.d/` listener dispatch, UserPromptSubmit prompt stamps | none of these |

Two collisions worth stating plainly, because both sound worse than they are:

- **Store roots do not collide.** `.remember/` and `.concord/` are separate
  trees, both gitignored here. A Claude Code port of concord could run beside
  the third-party plugin during any migration, which is what makes a staged
  cutover possible at all.
- **The names collide, cosmetically.** Our concord bundle ships a skill called
  `remember`; so is the third-party plugin. They have never been installed on
  the same host (ours is Codex-only), but a Claude Code port makes the clash
  real and user-visible. Renaming ours is not an option — plugin names are
  immutable once published; the skill inside a bundle is not, and that is the
  knob if this proceeds.

## Finding that changed the shape of this question

Docket #64 (PR #135) extended the trigger harness with an optional per-case
injected-context preamble, specifically to replay the suppressed class. First
measurement: **6/6 fires** — the preamble did not suppress anything.

The reason is structural, not a corpus-tuning problem, and it is stated in full
in Q4: the harness *asks* the router which skill handles a message, so the
trigger is always consulted; live suppression is the model never reaching that
question. **No remedy here — nudge or replacement — can be pre-verified in the
harness.** Live period-3 data is the only instrument either option has.

That cuts both ways, and both belong in the record:

- It *raises* the value of owning the stack, because a cooperating digest
  removes the failure mode instead of counteracting it, and we cannot cheaply
  test a counteraction.
- It *also* means we would ship the most expensive remedy with no more evidence
  than the cheap one already deployed — and the cheap one has not been measured
  even once, because it shipped this morning.

## What replacing actually costs

The port is not the whole bill. Scoping only capture and recall undersells it by
most of the surface.

| Capability | Verdict if we replace | Notes |
|---|---|---|
| Session capture | **port** | `lib/rollout.mjs` reads Codex rollout JSONL; Claude Code transcripts are a different format. ~200 lines of new reader. |
| Recall / SessionStart injection | **port** | `bin/recall.mjs` + a Claude `hooks/hooks.json` beside the existing Codex manifest. Small. |
| Host wire formats | **port** | `lib/hook.mjs` gains a Claude branch. Precedent: condux and session-handoff both do this. |
| Tiering, aging, pinning | **keep** | Already implemented and host-agnostic. |
| Model-summarized prose digests | **port or drop — the real decision** | Ours records; theirs summarizes. The daily prose Harvey reads is a product of the haiku call. Dropping it changes what memory *is* here, not just who owns it. |
| Git backup / restore of the store | **drop or build** | Not in concord at all. |
| NDC compression, recovery, `hooks.d/` listeners | **drop** | Substantial third-party surface with no counterpart. |
| UserPromptSubmit prompt stamps | **drop** | The per-turn `[HH:MM — user]` lines come from that plugin and vanish with it. Cosmetic, but they disappear on day one and someone will notice. |

**No configuration escape exists.** The plugin's config was checked for a knob
that would make the digest conditional, smaller, or demotable. There is none:
`memory_inject_max_bytes` only refuses a store already large enough to be
broken, and `prompt_stamp` governs the per-turn stamp, not the digest. The cheap
"just configure it" third path is closed on the evidence, not on assumption.

## Options

| | Option | Cost | Reversible |
|---|---|---|---|
| A | Keep the third-party stack; rely on the shipped nudge | zero | n/a |
| B | Replace now — port concord to Claude Code | high (see table) | painful once memory migrates |
| C | **Defer against a pre-registered criterion** *(recommended)* | zero now | fully |
| D | Ask upstream for a conditional or demotable digest | one issue | n/a — run in parallel with any of the above |

**Option D is not an alternative to the others and should happen regardless.**
D3 bans modifying their plugin; it does not ban asking. We now hold exactly the
evidence an upstream request needs: a measured suppression asymmetry, and a
verified absence of any config knob that addresses it.

## Recommended: Option C, with the criterion fixed now

Pre-registering the criterion is the whole point — deciding after seeing
period-3 numbers invites reading them to suit whichever option feels better by
then.

**Measure at period 3** (method and baselines: `period-2-report.md`; the mine is
re-runnable): `session-handoff`'s turn-level fire rate on resume-shaped phrases,
same corpus rules as periods 1 and 2 (D5).

| Period-3 resume fire rate | Verdict |
|---|---|
| ≥ 40% | Nudge works. **Keep the third-party stack** (Option A). Close #67. |
| 15–40% | Partial. Iterate the nudge; re-measure at period 4. Do not port. |
| < 15% (i.e. unmoved from ~9%) | The nudge failed against a suppressor we do not control. **Port** (Option B), with the scope table above as the starting estimate. |

Two conditions would override the table and justify moving early: the digest
starts suppressing a *second* skill (the class generalizes, and per-skill nudges
stop being proportionate), or the upstream request in Option D is accepted, which
resolves it without a port.

## Open questions for ratification

1. **Is losing model-summarized prose acceptable** if a port happens? Concord
   records; it does not summarize. This is the one line in the cost table that
   changes the product rather than its owner.
2. **Is period 3 the right horizon**, or should the criterion be evaluated on a
   fixed date instead of an accumulated session count?
3. **File the upstream issue now?** It is cheap, parallel, and blocks nothing.

## References

- `specs/trigger-reliability/quirks.md` — Q1 (the suppression class), Q4 (why no
  harness can pre-verify a remedy)
- `specs/trigger-reliability/decisions.md` — D2 (nudge rules), D3 (our-side-only
  boundary that deferred this question)
- `specs/trigger-reliability/period-2-report.md` — the 9%-vs-64% asymmetry and
  the re-runnable method
- PR #135 — the injected-context harness and its 6/6 finding
