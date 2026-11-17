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
| Q8 | Codex prompts read as zero human messages | Codex writes prompts as `item_completed` | high | yes |

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

## Q8 — Codex prompts read as zero human messages

**Discovered:** 2026-11-17

**Symptom:** every Codex report showed `human msgs: 0`, on the store and on transcripts. The WSL store held 50 Codex `turn` events against 37,562 `api_call` events.
**Trigger:** Codex writes the typed prompt as `event_msg` / `item_completed` with `item.type: "UserMessage"`. On one WSL machine that form was in 971 of 1,145 rollouts from codex-cli 0.118 to 0.169 (165 held no prompt at all), across every originator (TUI, exec, SDK, VS Code, Desktop). The `event_msg` / `user_message` form the parsers read was in 9 rollouts from September, and no file held both. All 9 are `guardian` subagents (the auto-approval reviewer, `parent_thread_id` set), so every one of the 50 stored turns was non-human.
**Cause:** the parsers were written against the rare form. Q1's coverage check never fired, because every `event_msg` subtype is counted as known whether or not it's parsed. A second gap: `parse-codex.mjs` recognised a subagent only by `agent_role` / `agent_nickname`, but 214 of 437 subagent rollouts carry only `parent_thread_id` and `source.subagent`. Their delegation prompts would have counted as human turns.
**Mitigation:** usage-trace 0.1.1 and session-report 1.13.1 read both forms and recognise a subagent by any of the four markers. A subagent's prompt yields no `turn`, matching how Claude sidechains are handled. `CODEX_PARSER_VERSION` makes ingest reread every Codex rollout once, and the store's id dedupe keeps only the missing events. On a copy of the real store, the reread took turns from 50 to 2,843 and `subagent` events from 223 to 437, left tool counts unchanged, and a second run read no Codex file. Dedupe never removes anything, so session-report drops any Codex turn whose session has a `subagent` event, which a Codex subagent's own session always has. That removes the 50 stale guardian turns. Over 28 days, store and transcripts both read 41 human messages, where both had read 0. Not recovered: stored `api_call` and `session` events from the 214 misread subagent rollouts keep `sidechain` unset, and prompts from pruned transcripts are lost. **Upgrade both hosts together.** Claude and Codex each run their own installed copy of `ingest` against one store. Once a 0.1.1 copy records the new parser version, a 0.1.0 copy on the other host can still move file offsets forward with the old parser, and the turns it skips are never reread.
