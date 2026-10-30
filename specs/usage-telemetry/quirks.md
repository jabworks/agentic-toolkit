# Quirks — usage-telemetry

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Transcript format can change without notice | A host update | medium | partial |
| Q2 | Limit data has gaps and no history | No open session, or use elsewhere | medium | partial |
| Q3 | Codex limit fields can be null | Observed in sampled rollouts | low | partial |
| Q4 | Salted hashes aren't anonymity | Short or guessable names, with the salt | medium | partial |
| Q5 | The skill reaches OpenCode and Cursor without capture hooks | Sync generates those trees for every skill | low | no |
| Q6 | Store and analyzer totals differ slightly | Rows with no `requestId` | low | partial |
| Q7 | A few transcript lines are invalid JSON | Torn lines in host transcripts | low | yes |

## Q1 — Transcript format can change without notice

**Discovered:** 2026-10-30

**Symptom:** new or renamed records stop contributing to events.
**Trigger:** a host update.
**Cause:** transcripts have no stability promise.
**Mitigation:** unknown record types are counted in `coverage` events and surfaced by `usage-trace status`.

## Q2 — Limit data has gaps and no history

**Discovered:** 2026-10-30

**Symptom:** no limit data before capture starts or between sessions, and jumps with no matching local usage.
**Trigger:** the status line only runs in an open session; use on the web or another machine isn't seen locally.
**Cause:** the status line is the only source.
**Mitigation:** none for history. A jump with no local usage is reported as such.

## Q3 — Codex limit fields can be null

**Discovered:** 2026-10-30

**Symptom:** `rate_limits.primary` and `secondary` were null in the 5 sampled rollout records.
**Trigger:** unknown; it may depend on the plan.
**Cause:** not established.
**Mitigation:** reports say "no limit data" rather than guessing.

## Q4 — Salted hashes aren't anonymity

**Discovered:** 2026-10-30

**Symptom:** anyone holding the salt could recover short or guessable names.
**Trigger:** sharing the store together with its salt.
**Cause:** hashes of guessable inputs can be brute-forced.
**Mitigation:** the salt stays on the machine; never share it with the store.

## Q5 — The skill reaches OpenCode and Cursor without capture hooks

**Discovered:** 2026-10-30

**Symptom:** the `usage-trace` skill is listed on hosts where nothing starts ingestion.
**Trigger:** sync generates `dist/opencode/skills/` and `dist/cursor/skills/` for every skill.
**Cause:** those builds have no per-skill exclusion.
**Mitigation:** none. The CLI still works when run by hand, and capture on those hosts stays out of scope.

## Q6 — Store and analyzer totals differ slightly

**Discovered:** 2026-10-30

**Symptom:** over 7 days the store showed 260k uncached input against session-report's 595k, and about 0.8% fewer API calls.
**Trigger:** rows with no `requestId`, mainly the local LFM2.5 model.
**Cause:** the store falls back to `message.id` across files, while the analyzer falls back to a per-file key. A raw recount of transcripts by `requestId`, then `message.id`, matched the store's 260k. Which side is right for those rows isn't established.
**Mitigation:** partial. These rows cost $0, and cache reads agree within 0.05%.

## Q7 — A few transcript lines are invalid JSON

**Discovered:** 2026-10-30

**Symptom:** `failures` in a run is small but above zero.
**Trigger:** invalid lines in host transcripts: 8 across all files in a recount.
**Cause:** they fail `JSON.parse`, and no parser error occurred. The host writes them; why isn't established.
**Mitigation:** they're skipped and counted in `coverage`.
