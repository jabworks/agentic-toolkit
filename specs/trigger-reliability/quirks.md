# Quirks — Trigger Reliability

Edge cases and failure modes in how skills do (and don't) get activated.

## Q1 — Injected context suppresses activation even when vocabulary matches verbatim

A skill can declare the exact phrase the user types and still not fire, when
content equivalent to the skill's *output* was already injected into context
(a SessionStart memory digest, a memory index). The model's information need
is satisfied before the trigger is consulted, so the workflow — with its
gates, scoring, and cleanup — silently doesn't run. Signature: within one
skill, phrase sets with a context substitute miss while phrase sets without
one fire (session-handoff: resume misses, wrap-up fires — nothing injected
answers "write a handoff"). This class is invisible to lexical audits, which
is why period 1 (100% trigger-contract compliance) could not see it.

## Q2 — A plugin gaining hooks must drop its root Agent Plugins manifest

Shipping a root `plugin.json` switches Codex to the Agent Plugins loader,
which has no hooks support — every Codex hook the plugin declares silently
dies (this repo's `8688e5b` incident; full table in
`specs/agent-plugins-conformance/quirks.md`). Any plugin this programme adds
a nudge hook to (session-handoff first) must join the exclusion that
`scripts/generate-agent-manifests.mjs` derives from the Codex manifest;
`tests/agent-plugins.test.mjs` asserts the coupling.

## Q3 — A nudge that carries content recreates the suppression it counters

The suppressed class is caused by context that answers the question. A
routing nudge that summarizes the handoff (or any artifact) becomes exactly
such context — the skill it routes to fires even less. Nudges are directives
only: they say where a phrase routes, never what the artifact contains.

## Q4 — The eval harness cannot simulate injected SessionStart context (resolved 2026-08-28)

The repo's trigger harness (`scripts/eval-triggers.mjs`) presents catalog +
query to a router model; cases are `(query, expected_skill)` pairs with no
context field, so injected-digest conditions cannot be replayed. Suppressed-
class coverage therefore splits: the end-to-end fire is asserted by
`tests/session-handoff-hooks.test.mjs` (countermeasure presence: conditional
emit, wire formats, fail-open), while the router eval keeps measuring
vocabulary routing. The split is informative, not a gap: session-handoff's
resume phrases ("continue from last session") already sit in
`skills/session-handoff/evals/trigger_eval.json` and pass at the ~93% band —
the same phrases that failed ~91% of the time live in period 2.
**Eval-pass + live-fail is the suppression signature.**

**Update 2026-08-28 (docket #64):** the harness now takes an optional per-case
`context` string and replays it as a preamble injected ahead of the message.
Cases carrying `context` are scored as their own metric — they never enter the
routing band, for the reason `disallowed` doesn't either: a case staged to be
suppressed would move A3's headline while measuring a different question, and
prior bands would stop being comparable. `context` is part of the corpus dedup
key, because the measurement *is* the pairing — the same query cold and under a
preamble — and a key of `query + expected` alone drops the twin silently.
Seeded in `skills/session-handoff/evals/trigger_eval.json` with two cases: a
synthetic memory digest, and that digest plus the shipped 1.10.0 routing nudge.

**First measurement: 6/6 fires (haiku-4-5, 3 trials, both seeds).** The
preamble did **not** reproduce suppression, and the reason is structural rather
than a corpus-tuning problem: the harness *asks* the router "which skill handles
this message?", so the trigger is always consulted. Live suppression is the
model never reaching that question — the digest satisfies the information need
and the turn is answered directly. A preamble can therefore measure whether
injected context *changes a routing answer* (a real, weaker question), but not
whether the routing decision gets made at all. **Q4's split stands:** end-to-end
suppressed-class coverage remains with `tests/session-handoff-hooks.test.mjs`
and live observation; the eval measures vocabulary, now with an optional context
dimension. Reproducing the skip itself would need a harness that poses an
ordinary turn and observes whether a skill is invoked, not one that asks for a
route.

**Update 2026-08-31 (docket #68): that harness now exists.**
`scripts/eval-invocations.mjs` poses each corpus query as an ordinary
headless turn (`claude -p --output-format stream-json`) to an agent with the
skills actually installed, in a fresh temp cwd per case, and reads a fire as
a `Skill` tool_use naming the expected skill (or an `accept` alternate). A
`Read` of a SKILL.md is not a fire. Fire rate is a **third metric beside the
router eval**, never merged into A3's band (the #53/#55 rule), and the pure
half (`scripts/invocation-observe.mjs`) is unit-tested so a zero is a
measurement, not a parser that never matched. A selector is required — the
full corpus is ~$23 and ~2.3 h per trial on haiku-4-5 — so it runs on a
subset by design (`--skills`, `--limit`, or an explicit `--all`).

Three things the first probes (2026-08-31, haiku-4-5, `--max-turns 3`)
established before any band was run:

1. **The harness observes the skip.** `save state before I close this`
   missed with three turns and no `Skill` call; the agent's last line was
   *"State saved to memory. Ready to resume whenever you need."* It wrote to
   Claude Code's **built-in auto-memory** instead of running session-handoff —
   Q1's shape exactly, and the router eval scores the same phrase as a hit.
   `workflow` fired on `add an export button to the invoice table` and
   `record` on `add this to the docket: …`, so the signal reads both ways.
2. **`remember` is not the only suppressor.** The plugin is not installed on
   the probing machine; the built-in memory prompt substituted for the skill
   on its own. Q1 is a class, not one plugin — D7's "explicit invocation is
   the supported path" covers the built-in too.
3. **Some phrases need an environment.** `wrap up this session` answered
   *"Nothing's been done yet — this session just started"* in one turn: in an
   empty cwd there is no session to wrap up, which is docket #14's
   phrase-not-task finding, now visible per case. That is what `--cwd` is
   for — a fixture directory with real state (a `.session-handoff/` handoff,
   a memory file) turns the stimulus into a task, and is the period-3 lever
   for measuring suppression under a real environment rather than a preamble.
   The report's miss table carries the agent's last line so the two miss
   kinds (substituted vs. nothing-to-do) can be told apart without a rerun.

**First band (2026-08-31, session-handoff, 21 cases × 3 trials, haiku-4-5,
fresh empty cwd per case): fire rate 22.2% ± 6.8pp (14/63; trials 19.0 /
23.8 / 23.8%; $1.85).** The router eval scores the same phrases at ~93%. Read
the gap carefully: it is **not** the period-2 live rate (9% resume / 64%
wrap-up), because the environment was empty by construction. Of the 17 cases
that missed, 16 missed 3/3 and every one answered in prose with no `Skill`
call; the last lines split into *nothing-to-do* ("no state to save", "Done.
Session is clean with no pending work") and *memory-first* ("The memory
directory is empty, so there are no notes from a previous session") — the
second is the built-in auto-memory being consulted before any trigger. The
one partial fire, `hand this off to a fresh session` (2/3), is the phrase
that names the artifact rather than the situation. So 22% is the floor an
empty directory produces; the next measurement is the same 21 cases under a
`--cwd` fixture carrying a `.session-handoff/` handoff and a populated memory
file, which is the period-3 instrument. Regenerate with
`node scripts/eval-invocations.mjs --skills session-handoff --runs 3`.
