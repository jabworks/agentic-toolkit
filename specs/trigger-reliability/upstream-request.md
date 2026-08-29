# Upstream request — a demotable SessionStart digest (docket #67, Option D) — DECLINED, NEVER FILED

> The text we drafted for `Digital-Process-Tools/claude-remember`, the repo
> that actually ships the `remember` plugin, per the #67 ratification
> (2026-08-28, answer 3) — and then decided not to send. Read the whole of this
> document in the past tense.

**Status: DECLINED 2026-08-29 — will never be filed.** See D7 in
`decisions.md`. Harvey's call, in his words: *"I don't really want to make them
change anything."* `remember` is not malfunctioning, and we do not ask a
third-party maintainer to change working software to accommodate our skill —
D3's boundary extended one step. This file is kept as the record of what was
drafted and why it was not sent; it is **not** a to-do.

**Would-have-been destination:** `Digital-Process-Tools/claude-remember`
**Ratified then reversed:** approved 2026-08-28 (`memory-stack-decision.md`,
answer 3), declined 2026-08-29 before anything was posted. Nothing was ever
sent to any repo, under any account.

> **Destination corrected 2026-08-29** (before the decline, and left here
> because the error is worth remembering). This draft previously named
> `anthropics/claude-plugins-official`. That is where `remember` is *listed*,
> not where it lives: the marketplace entry is a pointer whose `source.url` is
> `https://github.com/Digital-Process-Tools/claude-remember.git`. Anthropic
> curates the listing and cannot change the payload, so both asks below — a
> framing line and a config knob — are only actionable in the third-party repo.
> The error came from reading the marketplace-qualified name
> `claude-plugins-official/remember`, used throughout
> `memory-stack-decision.md`, as an address. It is a name, not a destination.

This draft lives in the spec rather than a scratch file so the record of what we
considered — and, as it turned out, chose not to send — survives the session
that wrote it. The instruction that used to sit here said to replace the status
line with the issue URL once posted. There will be no URL.

## Why we were asking rather than patching — and why we stopped

D3 (`decisions.md`) bars us from modifying the third-party plugin — we observe
it, we do not fork it. It does not bar us from asking. We held the two things an
upstream request needs and rarely has: a measured effect, and a verified absence
of any configuration that addresses it.

**That was the case for asking, and it was sound as far as it went.** What it
left out is the question D7 answered: whether a working tool's maintainer owes
our skill an accommodation at all. The argument above prices *their* change as
cheap ("one string") — but that is our estimate of someone else's cost, and the
plugin is not broken. D7 extends D3's boundary rather than contradicting it: we
neither modify their software nor lobby them to. Everything below this line is
preserved as drafted, and none of it was sent.

## Drafting notes (not part of the issue text)

- Keep it a **report plus one cheap ask**, not a demand. The framing-line
  variant costs them one string; the config knob costs them a surface. Lead
  with the cheap one and let them pick.
- **No real memory content.** Every digest example below is synthesized. Naming
  the store directory is fine; quoting anything out of it is not.
- Do not claim the plugin is broken. It does exactly what it advertises. The
  interaction with skill routing is emergent and neither side designed it.

---

## Issue text (as drafted)

**Title:** SessionStart memory digest suppresses skill routing — a way to mark it
as background context?

**Body:**

Thanks for `remember` — the aging tiers and the daily digest are genuinely good,
and this is a report about an interaction with skill routing rather than a bug in
the plugin.

### What we observed

We maintain a skill (`session-handoff`) whose declared trigger phrases include
"continue from last session", "resume", and "pick up where we left off". Across
two measurement periods we mined our own transcripts for turns matching those
phrases and checked whether the skill was actually invoked.

| Phrase class | Fire rate |
|---|---|
| Resume-shaped ("continue from last session") | ~9% |
| Wrap-up-shaped ("wrap up this session") | ~64% |

Same skill, same declared vocabulary, same sessions. The asymmetry tracks one
thing: the SessionStart digest answers a resume-shaped question before the
routing decision is reached. The agent reads what happened last session, is
satisfied, and answers the turn directly. Wrap-up phrases have no such
pre-answer, and fire at seven times the rate.

We do not think this is misbehaviour by the plugin. The digest is doing its job
well enough that the agent stops looking, which is arguably a compliment.

### Why we cannot configure around it

We looked for a knob before writing this:

- `memory_inject_max_bytes` only refuses a store that has already grown past a
  threshold — it does not scale or condition the injection.
- `prompt_stamp` governs the per-turn stamp, not the digest.

There is no setting that makes the digest conditional, smaller on resume-shaped
turns, or explicitly subordinate to a skill.

### What would help, cheapest first

**1. A framing line in the injected payload.** One sentence marking the digest as
background context rather than an answer:

> An injected memory digest is background context, not a resume workflow; never
> treat it as a substitute for invoking the relevant skill.

We ran exactly this line in a SessionStart hook of our own and then removed it,
which is what convinced us it belongs on your side rather than ours. From our
hook it could only vouch for one skill, and it cost a second SessionStart
injection whose only job was to qualify the first — a permanent per-session cost
on every install, to patch one skill's routing. In your payload the same
sentence speaks for the digest itself, and costs one string.

**2. A config knob to demote or condition the digest** — e.g. inject at reduced
size, or skip injection, when the session opens with a resume-shaped turn. More
surface for you; more precise for us.

**3. Nothing.** A completely reasonable outcome — we are reporting, not blocked.
Even then, the measurement above may be useful to you: any plugin that injects at
SessionStart is in a position to pre-empt the routing layer, and we have not seen
that written down anywhere.

### Happy to help

We can share the measurement method (transcript mine, turn-level fire rate by
phrase class) if it would be useful for reproducing this against other skills.
The effect is not specific to ours — it should reproduce with any skill whose
trigger phrases overlap what a digest already answers.

---

## What we do NOT ask for

- **Not** a request to stop injecting. The digest is useful and this is not a
  case for removing it.
- **Not** a request to special-case our plugin by name. A framing line that helps
  every skill is the right shape; a carve-out for `session-handoff` is not.
- **Not** a claim that we are blocked. We route around it by invoking the skill
  explicitly; the reason for writing is that the phrases we declare are the ones
  a user naturally types, and those are exactly the ones being pre-answered.

## References

- `specs/trigger-reliability/quirks.md` — Q1 (the suppression class)
- `specs/trigger-reliability/period-2-report.md` — the 9%-vs-64% measurement and
  its method
- `specs/trigger-reliability/memory-stack-decision.md` — the #67 brief this
  request is Option D of
- `specs/trigger-reliability/decisions.md` — D2 (nudge rules), D3 (our-side-only
  boundary)
