---
name: session-report
description: Generate an explorable HTML report of session usage (tokens, cache, subagents, slash commands) from local transcripts. Works for Claude Code (~/.claude) and Codex (~/.codex). Pass a time range as argument (24h, 7d, 30d, all) — defaults to 7d.
argument-hint: "[24h|7d|30d|all]"
---

# Session Report

Produce a self-contained HTML report of session usage and save it to the current working directory.

## Steps

1. **Detect tool and pick analyzer.** Run:
   ```sh
   if [ -n "$CODEX_HOME" ] || [ -n "$CODEX_SANDBOX_NETWORK_DISABLED" ]; then
     TOOL=codex; ANALYZER=analyze-codex.mjs
   elif [ -d "$HOME/.codex/sessions" ] && [ ! -d "$HOME/.claude/projects" ]; then
     TOOL=codex; ANALYZER=analyze-codex.mjs
   elif [ -d "$HOME/.claude/projects" ]; then
     TOOL=claude; ANALYZER=analyze-claude.mjs
   else
     TOOL=codex; ANALYZER=analyze-codex.mjs
   fi
   ```
   **Ambiguous case** — if both `~/.codex/sessions` and `~/.claude/projects` exist and no env var matched, the shell above falls through to `TOOL=claude`. Honor that result exactly:
   - **If you are Codex**: override to `TOOL=codex; ANALYZER=analyze-codex.mjs`
   - **If you are Claude Code**: the shell result is correct — keep `TOOL=claude; ANALYZER=analyze-claude.mjs`. Do **not** change it.

   The user can also force the tool with `--tool codex` or `--tool claude`.

2. **Parse time range** from `$ARGUMENTS` (e.g. `7d`, `30d`, `24h`). Default: `7d`. If `all` — omit `--since`.

3. **Run the analyzer.** Both scripts live alongside this SKILL.md — use the absolute path. Output to `/tmp/session-report-${TOOL}.json` (e.g. `session-report-claude.json`) so concurrent runs from different tools never collide:
   ```sh
   # With --since:
   node <skill-dir>/$ANALYZER --json --since 7d > /tmp/session-report-${TOOL}.json

   # All-time:
   node <skill-dir>/$ANALYZER --json > /tmp/session-report-${TOOL}.json
   ```

4. **Read** `/tmp/session-report-${TOOL}.json`. Skim `overall`, `by_project`, `by_subagent_type`, `by_skill`, `cache_breaks`, `top_prompts`.

5. **Copy the template** to the output path in the current working directory:
   ```sh
   cp <skill-dir>/template.html ./session-report-$(date +%Y%m%d-%H%M).html
   ```

6. **Edit the output file** (use Edit, not Write — preserve the template's JS/CSS):
   - Replace the contents of `<script id="report-data" type="application/json">` with the full JSON from step 3. The page's JS renders everything automatically from this blob. **IMPORTANT: the script tag must contain only valid JSON — no comments, no debug lines, no analysis notes. Any non-JSON text before or after the `{...}` will break `JSON.parse()` and leave all sections blank.**
   - Fill the `<!-- AGENT: anomalies -->` block with **3–5 one-line findings**. Express figures as **% of total tokens** (total = `overall.input_tokens.total + overall.output_tokens`):
     ```html
     <div class="take bad"><div class="fig">41.2%</div><div class="txt"><b>project-x</b> consumed 41% of the week across 3 sessions</div></div>
     ```
     Classes: `.take bad` (red) for waste/anomalies, `.take good` (green) for healthy signals, `.take info` (blue) for neutral. Look for: project eating disproportionate share, cache-hit <85%, single prompt >2% of total, subagents averaging >1M tokens/call, clustering cache breaks.

     **Codex note:** `pct_cached` will be 0 for most OpenAI models — only flag this if the model supports prompt caching.

   - Fill the `<!-- AGENT: optimizations -->` block with 1–4 `<div class="callout">` suggestions tied to specific rows in the data.
   - Do not restructure existing sections.

7. **Report** the saved file path. Do not open it or render it.

## Notes

- The template auto-adjusts titlebar and command text from `DATA.tool` in the JSON.
- For Codex: slash commands are extracted from message text (best-effort, not precise attribution). The `by_skill` table shows commands that appeared as `/foo` in user messages.
- For Codex: the subagent replay overcounting problem is handled by the analyzer — events timestamped before the session's own start are discarded.
- If JSON is >2MB, trim `top_prompts` and `cache_breaks` to 100 entries each before embedding.
