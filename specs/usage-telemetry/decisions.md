# Decisions — usage-telemetry

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Capture by transcript ingestion, in a plugin named `usage-trace` | Only ingestion can backfill, and it adds nothing to tool calls | accepted |
| 2 | Store monthly JSONL in `~/.usage-trace/`, with no content by default | No dependencies, and each event can be checked by eye | accepted |
| 3 | Claude limits come from an opt-in status line snapshot | The only source needing neither credentials nor scraping | accepted |
| 4 | session-report reads the store and falls back to transcripts | One report, and no plugin dependency | accepted |
| 5 | Limit burn is reported at account level | The limit isn't per session and its weighting is unknown | accepted |
| 6 | Keep events indefinitely, gzip old months | Long-term trends are the purpose | accepted |
| 7 | Store tokens, and price them at report time with dated prices | Price corrections apply retroactively | accepted |

## 1. Transcript ingestion — 2026-10-30

**Decided:** a `SessionStart` hook starts a detached background process that incrementally parses transcripts, and a manual command runs it too.
**Because:** only ingestion can backfill, and it adds nothing to tool calls.

| Alternative | Why not |
|---|---|
| Live hooks | Run on every call, miss tokens and attribution, can't backfill |
| OpenTelemetry | Needs a collector and user setup, can't backfill |
| Name `tally` | Sounds like counting only |

**Consequences**
- Depends on transcript formats with no stability promise, so unknown records are counted and reported.
- The store can lag behind the current session.
- Because it has hooks, the plugin ships no root `plugin.json` and isn't on the Agent Plugins channel.

## 2. Event store and privacy — 2026-10-30

**Decided:** monthly JSONL with event types `session`, `api_call`, `tool_call`, `turn`, `context`, `subagent`, `outcome`, `limit`, `coverage`. `USAGE_TRACE_HOME` overrides the location.
**Because:** no dependencies, and each event can be checked by eye.

| Alternative | Why not |
|---|---|
| SQLite | `node:sqlite` availability varies by Node version; a native package breaks the dependency-free pattern |
| DuckDB or Parquet | Heavy dependency |

**Consequences**
- Prompts, responses, tool inputs and output, and file contents are never stored by default.
- Project paths, file paths, branches and PR URLs are salted hashes with a local salt. Names not from a marketplace plugin or built-in are hashed too.
- Readable project names and prompt text are opt-in per project through an allowlist.
- Each source file keeps a read position and events are deduplicated by source ID, so re-runs are safe.
- The store is an exception to the `<git-root>/.<plugin>/` rule, because the data spans projects.

## 3. Limit snapshots — 2026-10-30

**Decided:** `usage-trace setup` shows the status line change and applies it after approval. The snapshot passes input through, writes only when a percentage changes or 5 minutes have passed, and swallows every error.
**Because:** it is the only source needing neither credentials nor scraping.

| Alternative | Why not |
|---|---|
| Scrape `/usage` | Fragile, doesn't suit background use |
| Account usage API with stored OAuth credentials | Undocumented; a plugin shouldn't touch credentials |

**Consequences**
- Limit history starts when capture starts.
- Codex capture is best effort, and reports say "no limit data" rather than guessing.

## 4. session-report integration — 2026-10-30

**Decided:** session-report reads the store when present and otherwise transcripts. The only link is a versioned store format, with no shared code.
**Because:** one report, and no plugin dependency.

| Alternative | Why not |
|---|---|
| Separate report inside usage-trace | Two overlapping reports, duplicates the template |
| usage-trace replaces session-report | Breaks existing users, forces capture on report-only users |

**Consequences**
- Two input paths to keep consistent.
- New views: period comparison, limit burn vs work, workflow payoff, friction, time and habits, coverage.
- Known local paths are hashed and matched at report time to show project names.
- Generated HTML can contain names and prompt text, so it stays private.

## 5. Account-level limit reporting — 2026-10-30

**Decided:** burn is shown per period beside tokens and cost, never split per session.
**Because:** the limit isn't per session and its weighting is unknown.

| Alternative | Why not |
|---|---|
| Estimate per session by token share | Presents guesses as measurements |

**Consequences**
- A report can't say which session caused a jump.

## 6. Retention — 2026-10-30

**Decided:** events are kept indefinitely, old months are gzipped, and deletion is manual.
**Because:** long-term trends are the purpose.

| Alternative | Why not |
|---|---|
| Configurable age cap | Brings back the data loss this plugin exists to stop |

**Consequences**
- Roughly 600 MB a year uncompressed at current usage, an estimate from about 35,000 API and tool records a week at 300 bytes each.

## 7. Cost at report time — 2026-10-30

**Decided:** the store holds tokens, and reports price events from a dated price table.
**Because:** price corrections apply retroactively.

| Alternative | Why not |
|---|---|
| Freeze cost at ingestion | A wrong price stays wrong in the store |

**Consequences**
- The price table must keep its history.
