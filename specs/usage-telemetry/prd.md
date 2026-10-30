# PRD — usage-telemetry

| Section | In one line |
|---|---|
| Problem | Transcripts appear to be pruned at about 30 days, and on-demand reports can't explain limit burn or workflow payoff |
| Users | Harvey first, then public marketplace users |
| Goals | Durable, detailed usage history that can be measured against |
| Scope | A new `usage-trace` capture plugin for Claude and Codex, plus session-report reading its store |

## Problem

Transcripts appear to be pruned at about 30 days. Reports run only on demand and use a fraction of the recorded fields. They cannot explain limit burn, because limit data is never saved.

## Users

| Who | Today | What changes |
|---|---|---|
| Harvey | Builds week-by-week comparisons by hand from report windows | Measures usage from durable events to optimize their workflow |
| Marketplace users | Run session-report over whatever transcripts remain | Can install capture; nothing is specific to one machine |

## Goals and non-goals

| Goal | Measured by |
|---|---|
| Limit burn vs work done: did the limit drain faster, or was more done? | One-command answer |
| Workflow payoff: which skills, plugins and subagents earn their cost? | Report view |
| Friction: what do denials, errors, compactions and cache breaks cost? | Report view |
| Time and habits: active, waiting and parallel session time | Report view |
| Prompting patterns: prompt size, corrections, interruptions, turns per task, text discarded | Report view |
| Context pressure: how full context gets, and what fills it | Report view |
| Rework: files edited repeatedly, reverts after merge | Report view |
| Outcomes: PR merged or abandoned, CI result, time to merge (`gh` details opt-in) | Report view |
| Routing quality: whether the right skill fired, which tier was chosen | Report view |
| Effort and model fit: cost by effort level, Opus spend on simple turns | Report view |

| Non-goal | Why excluded |
|---|---|
| Sending data anywhere | The store includes corporate repos |
| Team dashboards | Built for individual use |
| Live alerts | It measures after the fact |
| Automatic workflow changes | It measures, and the user decides |

## Success metrics

| Metric | Target | How measured |
|---|---|---|
| Limit question | Answered from one command, with per-session and per-model data | Run the command |
| Weekly figures | Calculated from event timestamps, no hand-entered tables | Report output |
| History | Survives transcript pruning | Events remain after their source transcript is gone |
| Session impact | Capture never slows or breaks a session | Hook returns immediately and fails open |
| Privacy | With default settings, no prompt text and no raw project paths in the store | Automated test |

## Scope

| In | Out |
|---|---|
| `usage-trace` plugin: ingestion, store, backfill, `status`, `setup` | OpenCode and Cursor capture |
| Claude and Codex transcripts | Remote export or hosted storage |
| Opt-in status line limit snapshots | Calling account usage APIs with stored credentials |
| session-report reading the store, with new views | usage-trace replacing session-report |

## Open questions

- Do Codex `rate_limits.primary` and `secondary` ever hold values on this plan?
- Which local-usage gaps does a limit jump imply when Claude is also used on the web or another machine?
- Should `--redact` ship with the first session-report views or later?
