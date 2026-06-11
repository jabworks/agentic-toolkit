#!/usr/bin/env node
/**
 * analyze-codex.mjs
 *
 * Scans ~/.codex/sessions/YYYY/MM/DD/*.jsonl transcript files and reports
 * token usage, subagent activity, slash commands, and session timelines.
 *
 * Output JSON is structurally identical to analyze-claude.mjs so the shared
 * template.html renders it without changes.
 *
 * Key Codex differences handled here:
 *  - Sessions in date hierarchy (no project dirs) — cwd from session_meta
 *    is used to group sessions by project
 *  - Token events are event_msg records with payload.type === "token_count";
 *    last_token_usage is the per-call delta (total_token_usage is cumulative).
 *    Current Codex logs put this under payload.info.last_token_usage; older
 *    logs may put it directly on payload.last_token_usage.
 *  - CRITICAL: subagent files replay the parent thread's full token history.
 *    Events timestamped before the session's own session_meta.timestamp are
 *    discarded — this is the primary defence against 91x overcounting.
 *  - Slash commands are extracted from user message text (best-effort)
 *  - Current Codex logs use cached_input_tokens; older logs may use
 *    cache_creation_input_tokens / cache_read_input_tokens.
 *  - Subagent type comes from session_meta.agent_nickname or agent_role
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const LOCAL_PRICES = require('./model-prices.json');
const LITELLM_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

async function refreshPricesFromLiteLLM() {
  try {
    const r = await fetch(LITELLM_URL, { signal: AbortSignal.timeout(3000) });
    const d = await r.json();
    for (const [key, val] of Object.entries(d)) {
      if (!LOCAL_PRICES[key] && val.input_cost_per_token) {
        LOCAL_PRICES[key] = {
          input: val.input_cost_per_token,
          cache_create: val.cache_creation_input_token_cost ?? val.input_cost_per_token,
          cache_read: val.cache_read_input_token_cost ?? 0,
          output: val.output_cost_per_token ?? 0,
        };
      }
    }
  } catch { /* offline or timeout — local prices only */ }
}

function lookupPrice(model) {
  if (!model) return null;
  if (LOCAL_PRICES[model]) return LOCAL_PRICES[model];
  for (const [key, val] of Object.entries(LOCAL_PRICES)) {
    if (model.startsWith(key) || key.startsWith(model)) return val;
  }
  return null;
}

function computeCostFromNormalized(tok, prices) {
  if (!prices) return null;
  const pCC = prices.cache_create ?? prices.input;
  const input    = tok.inputUncached * prices.input;
  const cacheC   = tok.cacheCreate  * pCC;
  const cacheR   = tok.cacheRead    * prices.cache_read;
  const output   = tok.output       * prices.output;
  const savings  = (tok.cacheCreate + tok.cacheRead) * prices.input - cacheC - cacheR;
  return { input, cacheCreate: cacheC, cacheRead: cacheR, output, savings };
}

function addCost(s, cost) {
  s.costInput      += cost.input;
  s.costCacheCreate += cost.cacheCreate;
  s.costCacheRead  += cost.cacheRead;
  s.costOutput     += cost.output;
  s.costSavings    += cost.savings;
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
function flag(name, dflt) {
  const i = argv.indexOf(name);
  if (i === -1) return dflt;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}
const ROOT = flag('--dir', path.join(os.homedir(), '.codex', 'sessions'));
const AS_JSON = argv.includes('--json');
const TOP_N = parseInt(flag('--top', '15'), 10);
const SINCE = parseSince(flag('--since', null));
const CACHE_BREAK_THRESHOLD = parseInt(flag('--cache-break', '100000'), 10);
const IDLE_GAP_MS = 5 * 60 * 1000;

function parseSince(s) {
  if (!s) return null;
  const m = /^(\d+)([dh])$/.exec(s);
  if (m) {
    const ms = m[2] === 'd' ? 86400000 : 3600000;
    return new Date(Date.now() - parseInt(m[1], 10) * ms);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

// ---------------------------------------------------------------------------
// Stats container — same shape as analyze-claude.mjs output
// ---------------------------------------------------------------------------
function newStats() {
  return {
    sessions: new Set(),
    apiCalls: 0,
    inputUncached: 0,
    inputCacheCreate: 0,
    inputCacheRead: 0,
    outputTokens: 0,
    humanMessages: 0,
    wallClockMs: 0,
    activeMs: 0,
    cacheBreaks: [],
    subagentCalls: 0,
    subagentTokens: 0,
    skillInvocations: {},
    modelUsage: {},
    toolCalls: {},
    firstTs: null,
    lastTs: null,
    costInput: 0,
    costCacheCreate: 0,
    costCacheRead: 0,
    costOutput: 0,
    costSavings: 0,
  };
}

function bumpModel(s, model, usage, costTotal) {
  if (!model) return;
  const m = s.modelUsage[model] || (s.modelUsage[model] = { calls: 0, inputUncached: 0, inputCacheCreate: 0, inputCacheRead: 0, outputTokens: 0, costTotal: 0 });
  m.calls++;
  m.inputUncached    += usage.inputUncached || 0;
  m.inputCacheCreate += usage.cacheCreate || 0;
  m.inputCacheRead   += usage.cacheRead || 0;
  m.outputTokens     += usage.output || 0;
  m.costTotal        += costTotal || 0;
}

const HIST_BREAKS = [0, 1000, 5000, 10000, 50000, 100000, 500000];
function promptSizeBucket(tokens) {
  if (tokens === 0) return 0;
  for (let i = HIST_BREAKS.length - 1; i >= 1; i--) {
    if (tokens >= HIST_BREAKS[i]) return i;
  }
  return 1;
}

function buildPromptHistogram() {
  const labels = ['0', '<1k', '<5k', '<10k', '<50k', '<100k', '<500k', '500k+'];
  const counts = new Array(labels.length).fill(0);
  for (const r of prompts.values()) {
    if (r.apiCalls > 0) counts[promptSizeBucket(promptTotal(r))]++;
  }
  return labels.map((label, i) => ({ label, count: counts[i] }));
}

function efficiencyScore(s) {
  const inTotal = s.inputUncached + s.inputCacheCreate + s.inputCacheRead;
  const grand = inTotal + s.outputTokens;
  const cacheScore = inTotal > 0 ? s.inputCacheRead / inTotal : 0;
  const tokPerMsg = s.humanMessages > 0 ? grand / s.humanMessages : 0;
  const msgScore = 1 - Math.min(1, tokPerMsg / 10000);
  const subRatio = grand > 0 ? s.subagentTokens / grand : 0;
  const subScore = 1 - Math.min(1, subRatio);
  return Math.round(100 * (0.4 * cacheScore + 0.3 * msgScore + 0.3 * subScore));
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------
function* walk(dir) {
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && e.name.endsWith('.jsonl')) yield p;
  }
}

// Normalize cwd to a short project key (e.g. "projects/myapp" or "myapp")
function cwdToProject(cwd) {
  if (!cwd) return 'unknown';
  const home = os.homedir();
  if (cwd.startsWith(home)) {
    const rel = cwd.slice(home.length).replace(/^\//, '');
    return rel || 'home';
  }
  const parts = cwd.replace(/\/$/, '').split('/');
  return parts.slice(-2).join('/') || cwd;
}

// ---------------------------------------------------------------------------
// Global dedup — secondary guard against replay after time-filter
// ---------------------------------------------------------------------------
const seenTokenEvents = new Set();

// ---------------------------------------------------------------------------
// Prompt + session tracking
// ---------------------------------------------------------------------------
const prompts = new Map(); // key -> record
const promptSkills = new Map(); // prompt key -> slash/skill command name
const sessionTurns = new Map(); // sessionId -> [key, ...]
const sessionSpans = new Map(); // sessionId -> {project, firstTs, lastTs, tokens}

function promptRecord(key, init) {
  let r = prompts.get(key);
  if (!r) {
    r = {
      text: init.text,
      ts: init.ts,
      project: init.project,
      sessionId: init.sessionId,
      apiCalls: 0,
      subagentCalls: 0,
      inputUncached: 0,
      inputCacheCreate: 0,
      inputCacheRead: 0,
      outputTokens: 0,
    };
    prompts.set(key, r);
  }
  return r;
}

function bumpSkill(s, name) {
  s.skillInvocations[name] = (s.skillInvocations[name] || 0) + 1;
}

function bumpTool(s, name) {
  s.toolCalls[name] = (s.toolCalls[name] || 0) + 1;
}

// ---------------------------------------------------------------------------
// Per-file processing
// ---------------------------------------------------------------------------
async function processFile(filePath) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let sessionId = path.basename(filePath, '.jsonl');
  let isSubagent = false;
  let project = 'unknown';
  let agentType = 'main';
  let model = null;
  let currentModel = null; // updated per turn_context event
  let sessionStartTs = 0;
  let metaParsed = false;

  let firstTs = null,
    lastTs = null,
    prevTs = null,
    activeMs = 0;

  // Collected during parse, committed after
  const tokenEvents = []; // {ts, inputUncached, cacheCreate, cacheRead, output}
  const userTurns = []; // {text, ts, key}
  const toolCallNames = []; // tool/function names called

  for await (const line of rl) {
    if (!line.trim()) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }

    // session_meta — always first, sets identity for the rest of the file
    if (!metaParsed && e.type === 'session_meta' && e.payload) {
      const p = e.payload;
      metaParsed = true;
      sessionId = p.id || sessionId;
      isSubagent = !!p.parent_thread_id;
      project = cwdToProject(p.cwd);
      agentType = p.agent_nickname || p.agent_role || (isSubagent ? 'subagent' : 'main');
      model = p.model || null;
      const t = Date.parse(p.timestamp);
      if (!isNaN(t)) sessionStartTs = t;
      continue;
    }

    if (e.type === 'session_meta') continue;

    // turn_context fires before each API call and carries the active model name.
    // session_meta never has a model field in Codex logs, so this is the only
    // reliable source of per-call model identity.
    if (e.type === 'turn_context' && e.payload?.model) {
      currentModel = e.payload.model;
      if (!model) model = currentModel;
      continue;
    }

    // Skip compacted records — they hold replacement_history, not new calls
    if (e.type === 'compacted') continue;

    // Extract event timestamp
    let ts = 0;
    const rawTs = e.timestamp || (e.payload && (e.payload.timestamp || e.payload.created_at));
    if (rawTs) {
      const t = Date.parse(rawTs);
      if (!isNaN(t)) ts = t;
    }

    // PRIMARY DEDUP: discard events from before this session started.
    // Subagent files replay the parent's token history; those events have
    // timestamps that predate the subagent's own session_meta.timestamp.
    if (ts && sessionStartTs && ts < sessionStartTs - 5000) continue;

    // --since filter
    if (SINCE && ts && ts < SINCE.getTime()) continue;

    // Wall-clock and active time tracking
    if (ts > 0) {
      if (firstTs === null) firstTs = ts;
      if (prevTs !== null) {
        const gap = ts - prevTs;
        if (gap > 0 && gap < IDLE_GAP_MS) activeMs += gap;
      }
      prevTs = ts;
      lastTs = ts;
    }

    // function_call and custom_tool_call live under response_item, not event_msg
    if (e.type === 'response_item' && e.payload) {
      const rpl = e.payload;
      if ((rpl.type === 'function_call' || rpl.type === 'custom_tool_call') && rpl.name) {
        toolCallNames.push(rpl.name);
      }
      continue;
    }

    if (e.type !== 'event_msg' || !e.payload) continue;
    const pl = e.payload;

    // Token count event
    if (pl.type === 'token_count') {
      const usage = normalizeUsage(pl);
      if (!usage) continue;
      const { inputUncached, cacheCreate, cacheRead, output } = usage;
      // Secondary dedup: catches any remaining replay with same ts+amounts
      const dedupKey = `${ts}|${inputUncached}|${cacheCreate}|${cacheRead}|${output}`;
      if (!seenTokenEvents.has(dedupKey)) {
        seenTokenEvents.add(dedupKey);
        tokenEvents.push({ ts, inputUncached, cacheCreate, cacheRead, output, model: currentModel });
      }
      continue;
    }

    // Tool / function calls
    if ((pl.type === 'function_call' || pl.type === 'custom_tool_call') && pl.name) {
      toolCallNames.push(pl.name);
      continue;
    }

    // User turn — extract text for prompt tracking and slash command detection
    const role = pl.role || pl.type;
    if ((role === 'user' || role === 'user_message') && !isSubagent) {
      const text = extractText(pl);
      if (text) {
        const key = `${sessionId}:${ts}:${text.slice(0, 40)}`;
        userTurns.push({ text, ts, key });
      }
    }
  }

  return {
    sessionId,
    isSubagent,
    project,
    agentType,
    model,
    toolCallNames,
    firstTs,
    lastTs,
    activeMs,
    tokenEvents,
    userTurns,
  };
}

function extractText(pl) {
  if (typeof pl.content === 'string') return pl.content.trim().slice(0, 500);
  if (Array.isArray(pl.content)) {
    for (const c of pl.content) {
      if (c && c.type === 'text' && c.text) return c.text.trim().slice(0, 500);
      if (typeof c === 'string' && c.trim()) return c.trim().slice(0, 500);
    }
  }
  if (typeof pl.message === 'string') return pl.message.trim().slice(0, 500);
  if (typeof pl.text === 'string') return pl.text.trim().slice(0, 500);
  return null;
}

function normalizeUsage(pl) {
  const u = pl.last_token_usage || (pl.info && pl.info.last_token_usage);
  if (!u) return null;

  const input = u.input_tokens || 0;
  const cacheCreate = u.cache_creation_input_tokens || 0;
  const cacheRead = u.cache_read_input_tokens || u.cached_input_tokens || 0;
  const output = u.output_tokens || 0;

  // In current Codex logs, input_tokens includes cached_input_tokens. Older
  // logs with cache_read_input_tokens treated input_tokens as uncached.
  const hasCurrentCachedField = Object.prototype.hasOwnProperty.call(u, 'cached_input_tokens');
  const inputUncached = hasCurrentCachedField ? Math.max(0, input - cacheCreate - cacheRead) : input;

  return { inputUncached, cacheCreate, cacheRead, output };
}

function promptPreview(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 240 ? t.slice(0, 237) + '…' : t;
}

function buildContext(pk) {
  const r = prompts.get(pk);
  if (!r) return null;
  const turns = sessionTurns.get(r.sessionId);
  if (!turns) return null;
  const i = turns.indexOf(pk);
  if (i === -1) return null;
  const lo = Math.max(0, i - 2),
    hi = Math.min(turns.length, i + 3);
  return turns.slice(lo, hi).map((k, j) => {
    const t = prompts.get(k) || {};
    return { text: t.text || '', ts: t.ts || null, calls: t.apiCalls || 0, here: lo + j === i };
  });
}

// ---------------------------------------------------------------------------
// Timeline: group sessions into local-date buckets
// ---------------------------------------------------------------------------
function buildByDay() {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = new Map();
  for (const [id, s] of sessionSpans) {
    if (s.firstTs === null || s.tokens === 0) continue;
    const d0 = new Date(s.firstTs);
    const key = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
    let day = days.get(key);
    if (!day) {
      day = { date: key, dow: DOW[d0.getDay()], tokens: 0, sessions: [] };
      days.set(key, day);
    }
    const base = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()).getTime();
    day.tokens += s.tokens;
    day.cost = (day.cost || 0) + (s.cost || 0);
    day.sessions.push({
      id,
      project: s.project,
      tokens: s.tokens,
      cost: +(s.cost || 0).toFixed(4),
      start_min: Math.max(0, Math.round((s.firstTs - base) / 60000)),
      end_min: Math.max(1, Math.round((s.lastTs - base) / 60000)),
    });
  }
  for (const d of days.values()) {
    const b = new Array(144).fill(0);
    for (const s of d.sessions) {
      const lo = Math.min(143, Math.floor(s.start_min / 10));
      const hi = Math.min(144, Math.ceil(Math.min(s.end_min, 1440) / 10));
      for (let i = lo; i < hi; i++) b[i]++;
    }
    d.peak = Math.max(0, ...b);
    d.peak_at_min = d.peak > 0 ? b.indexOf(d.peak) * 10 : 0;
    d.sessions.sort((a, b) => a.start_min - b.start_min);
    d.cost = +(d.cost || 0).toFixed(4);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function promptTotal(r) {
  return r.inputUncached + r.inputCacheCreate + r.inputCacheRead + r.outputTokens;
}

function topPrompts(n) {
  return [...prompts.entries()]
    .filter(([, r]) => r.apiCalls > 0)
    .sort((a, b) => promptTotal(b[1]) - promptTotal(a[1]))
    .slice(0, n)
    .map(([pk, r]) => ({
      ts: r.ts,
      project: r.project,
      session: r.sessionId,
      text: r.text,
      api_calls: r.apiCalls,
      subagent_calls: r.subagentCalls,
      total_tokens: promptTotal(r),
      input: { uncached: r.inputUncached, cache_create: r.inputCacheCreate, cache_read: r.inputCacheRead },
      output: r.outputTokens,
      context: buildContext(pk),
    }));
}

function summarize(s) {
  const inTotal = s.inputUncached + s.inputCacheCreate + s.inputCacheRead;
  return {
    sessions: s.sessions.size,
    api_calls: s.apiCalls,
    input_tokens: {
      uncached: s.inputUncached,
      cache_create: s.inputCacheCreate,
      cache_read: s.inputCacheRead,
      total: inTotal,
      pct_cached: inTotal > 0 ? +((100 * s.inputCacheRead) / inTotal).toFixed(1) : 0,
    },
    output_tokens: s.outputTokens,
    human_messages: s.humanMessages,
    hours: {
      wall_clock: +(s.wallClockMs / 3600000).toFixed(1),
      active: +(s.activeMs / 3600000).toFixed(1),
    },
    cache_breaks_over_100k: s.cacheBreaks.length,
    subagent: {
      calls: s.subagentCalls,
      total_tokens: s.subagentTokens,
      avg_tokens_per_call: s.subagentCalls > 0 ? Math.round(s.subagentTokens / s.subagentCalls) : 0,
    },
    skill_invocations: s.skillInvocations,
    efficiency_score: efficiencyScore(s),
    span: s.firstTs ? { from: new Date(s.firstTs).toISOString(), to: new Date(s.lastTs).toISOString() } : null,
    cost_usd: (s.costInput + s.costCacheCreate + s.costCacheRead + s.costOutput) > 0
      ? {
          total:               +(s.costInput + s.costCacheCreate + s.costCacheRead + s.costOutput).toFixed(6),
          input:               +s.costInput.toFixed(6),
          cache_create:        +s.costCacheCreate.toFixed(6),
          cache_read:          +s.costCacheRead.toFixed(6),
          output:              +s.costOutput.toFixed(6),
          savings_vs_no_cache: +s.costSavings.toFixed(6),
        }
      : null,
    by_model: s.modelUsage,
    tool_calls: s.toolCalls,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await refreshPricesFromLiteLLM();
  const overall = newStats();
  const perProject = new Map();
  const perSubagent = new Map();
  const perSkill = new Map();

  const files = [...walk(ROOT)];
  if (!AS_JSON) process.stderr.write(`scanning ${files.length} files in ${ROOT}…\n`);

  let n = 0;
  for (const filePath of files) {
    const {
      sessionId,
      isSubagent,
      project: proj,
      agentType,
      model,
      firstTs,
      lastTs,
      activeMs,
      tokenEvents,
      userTurns,
      toolCallNames,
    } = await processFile(filePath);

    if (!perProject.has(proj)) perProject.set(proj, newStats());
    const projStats = perProject.get(proj);

    let subStats = null;
    if (isSubagent) {
      if (!perSubagent.has(agentType)) perSubagent.set(agentType, newStats());
      subStats = perSubagent.get(agentType);
    }

    // Session span for timeline
    let span = sessionSpans.get(sessionId);
    if (!span) {
      span = { project: proj, firstTs: null, lastTs: null, tokens: 0 };
      sessionSpans.set(sessionId, span);
    }
    if (firstTs !== null) {
      if (span.firstTs === null || firstTs < span.firstTs) span.firstTs = firstTs;
      if (span.lastTs === null || lastTs > span.lastTs) span.lastTs = lastTs;
      const wall = lastTs - firstTs;
      for (const s of [overall, projStats, subStats].filter(Boolean)) {
        s.wallClockMs += wall;
        s.activeMs += activeMs;
        if (!s.firstTs || firstTs < s.firstTs) s.firstTs = firstTs;
        if (!s.lastTs || lastTs > s.lastTs) s.lastTs = lastTs;
      }
    }

    // Count session / subagent if meaningful data found
    if (tokenEvents.length > 0 || userTurns.length > 0) {
      for (const s of [overall, projStats, subStats].filter(Boolean)) {
        s.sessions.add(sessionId);
      }
      if (isSubagent) {
        overall.subagentCalls++;
        projStats.subagentCalls++;
      }
    }

    // Attribute user turns — prompt records + slash command detection
    for (const { text, ts, key } of userTurns) {
      const slashMatch = text.match(/^[/$]([a-zA-Z][\w:-]*)/);
      if (slashMatch) {
        const cmd = slashMatch[1];
        bumpSkill(overall, cmd);
        bumpSkill(projStats, cmd);
        if (!perSkill.has(cmd)) perSkill.set(cmd, newStats());
        promptSkills.set(key, cmd);
      }
      promptRecord(key, { text: promptPreview(text), ts, project: proj, sessionId });
      overall.humanMessages++;
      projStats.humanMessages++;
      let turns = sessionTurns.get(sessionId);
      if (!turns) sessionTurns.set(sessionId, (turns = []));
      turns.push(key);
    }

    // Attribute tool calls
    for (const name of toolCallNames) {
      bumpTool(overall, name);
      bumpTool(projStats, name);
      if (subStats) bumpTool(subStats, name);
    }

    // Commit token events to buckets
    let turnIdx = 0;
    let currentPromptKey = null;
    const sortedTurns = [...userTurns].sort((a, b) => a.ts - b.ts);
    const sortedTokenEvents = [...tokenEvents].sort((a, b) => a.ts - b.ts);

    for (const { ts, inputUncached, cacheCreate, cacheRead, output, model: eventModel } of sortedTokenEvents) {
      while (turnIdx < sortedTurns.length && sortedTurns[turnIdx].ts <= ts) {
        currentPromptKey = sortedTurns[turnIdx].key;
        turnIdx++;
      }

      const tot = inputUncached + cacheCreate + cacheRead + output;
      span.tokens += tot;

      const targets = [overall, projStats];
      if (subStats) targets.push(subStats);
      const currentSkill = currentPromptKey ? promptSkills.get(currentPromptKey) : null;
      const skillStats = currentSkill ? perSkill.get(currentSkill) : null;
      if (skillStats) targets.push(skillStats);
      for (const s of targets) {
        s.sessions.add(sessionId);
        s.apiCalls++;
        s.inputUncached += inputUncached;
        s.inputCacheCreate += cacheCreate;
        s.inputCacheRead += cacheRead;
        s.outputTokens += output;
      }

      const resolvedModel = eventModel || model;
      const prices = lookupPrice(resolvedModel);
      let callCostTotal = 0;
      if (prices) {
        const cost = computeCostFromNormalized({ inputUncached, cacheCreate, cacheRead, output }, prices);
        for (const s of targets) addCost(s, cost);
        callCostTotal = cost.input + cost.cacheCreate + cost.cacheRead + cost.output;
      }
      const usageNorm = { inputUncached, cacheCreate, cacheRead, output };
      for (const s of targets) bumpModel(s, resolvedModel, usageNorm, callCostTotal);
      span.cost = (span.cost || 0) + callCostTotal;

      if (isSubagent) {
        overall.subagentTokens += tot;
        projStats.subagentTokens += tot;
        if (subStats) subStats.subagentTokens += tot;
        if (skillStats) skillStats.subagentTokens += tot;
      }

      // Cache break detection
      const uncached = inputUncached + cacheCreate;
      if (uncached > CACHE_BREAK_THRESHOLD) {
        const total = uncached + cacheRead;
        const cb = {
          ts: ts ? new Date(ts).toISOString() : null,
          session: sessionId,
          project: proj,
          uncached,
          total,
          kind: isSubagent ? 'subagent' : 'main',
          agentType: isSubagent ? agentType : undefined,
          context: null,
        };
        overall.cacheBreaks.push(cb);
        projStats.cacheBreaks.push(cb);
        if (subStats) subStats.cacheBreaks.push(cb);
      }

      // Attribute to current prompt
      if (currentPromptKey) {
        const r = prompts.get(currentPromptKey);
        if (r) {
          r.apiCalls++;
          r.inputUncached += inputUncached;
          r.inputCacheCreate += cacheCreate;
          r.inputCacheRead += cacheRead;
          r.outputTokens += output;
        }
      }
    }

    n++;
    if (!AS_JSON && n % 100 === 0) {
      process.stderr.write(`\r  scanned ${n}/${files.length} files…`);
    }
  }

  if (!AS_JSON) process.stderr.write(`\r  scanned ${n}/${files.length} files.\n`);

  // Drop empty buckets
  for (const m of [perProject, perSubagent, perSkill]) {
    for (const [k, v] of m) {
      if (v.apiCalls === 0 && v.sessions.size === 0) m.delete(k);
    }
  }

  if (AS_JSON) {
    const out = {
      tool: 'codex',
      root: ROOT,
      generated_at: new Date().toISOString(),
      since: SINCE ? SINCE.toISOString() : null,
      overall: summarize(overall),
      cache_breaks: overall.cacheBreaks.sort((a, b) => b.uncached - a.uncached).slice(0, 100),
      by_project: Object.fromEntries([...perProject].map(([k, v]) => [k, summarize(v)])),
      by_subagent_type: Object.fromEntries([...perSubagent].map(([k, v]) => [k, summarize(v)])),
      by_skill: Object.fromEntries([...perSkill].map(([k, v]) => [k, summarize(v)])),
      top_prompts: topPrompts(100),
      by_day: buildByDay(),
      prompt_size_histogram: buildPromptHistogram(),
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } else {
    printText({ overall, perProject, perSubagent, perSkill });
  }
}

// ---------------------------------------------------------------------------
// Text output
// ---------------------------------------------------------------------------
function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

function printText({ overall, perProject, perSubagent, perSkill }) {
  const line = (...a) => console.log(...a);
  const hr = () => line('─'.repeat(78));
  const pct = (a, b) => (b > 0 ? ((100 * a) / b).toFixed(1) + '%' : '—');
  const hrs = (ms) => (ms / 3600000).toFixed(1);
  const totalIn = (s) => s.inputUncached + s.inputCacheCreate + s.inputCacheRead;

  function printBlock(title, s, indent = '') {
    const inT = totalIn(s);
    line(`${indent}${title}`);
    line(`${indent}  sessions: ${s.sessions.size}   api calls: ${s.apiCalls}   human msgs: ${s.humanMessages}`);
    line(
      `${indent}  input:  ${fmt(inT)} (uncached ${fmt(s.inputUncached)}, cache-create ${fmt(s.inputCacheCreate)}, cache-read ${fmt(s.inputCacheRead)} = ${pct(s.inputCacheRead, inT)} cached)`,
    );
    line(`${indent}  output: ${fmt(s.outputTokens)}`);
    line(`${indent}  hours:  ${hrs(s.wallClockMs)} wall-clock, ${hrs(s.activeMs)} active (gaps >5m excluded)`);
    line(`${indent}  cache breaks >${fmt(CACHE_BREAK_THRESHOLD)}: ${s.cacheBreaks.length}`);
    line(`${indent}  subagents: ${s.subagentCalls} calls, ${fmt(s.subagentTokens)} tokens`);
    const topCmds = Object.entries(s.skillInvocations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (topCmds.length) line(`${indent}  commands: ${topCmds.map(([k, v]) => `/${k}×${v}`).join(', ')}`);
  }

  line();
  line(`Codex session analysis — ${ROOT}`);
  if (SINCE) line(`(since ${SINCE.toISOString()})`);
  hr();
  printBlock('OVERALL', overall);

  hr();
  line('BY PROJECT');
  const projects = [...perProject].sort((a, b) => totalIn(b[1]) - totalIn(a[1]));
  for (const [name, s] of projects.slice(0, TOP_N)) {
    printBlock(name, s, '  ');
    line();
  }
  if (projects.length > TOP_N) line(`  … ${projects.length - TOP_N} more`);

  hr();
  line('BY SUBAGENT TYPE');
  for (const [name, s] of [...perSubagent].sort((a, b) => b[1].apiCalls - a[1].apiCalls)) {
    printBlock(name, s, '  ');
    line();
  }

  hr();
  line('TOP SLASH COMMANDS');
  const cmds = [...perSkill].sort((a, b) => totalIn(b[1]) - totalIn(a[1]));
  for (const [name, s] of cmds.slice(0, TOP_N)) {
    printBlock('/' + name, s, '  ');
    line();
  }
  line();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
