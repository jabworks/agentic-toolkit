#!/usr/bin/env node
/* eslint-disable */
/**
 * analyze-sessions.js
 *
 * Scans ~/.claude/projects/**.jsonl transcript files and reports token usage,
 * message counts, runtime, cache breaks, subagent and skill activity.
 *
 * Output is human-readable text by default; pass --json for machine-readable.
 *
 * Usage:
 *   node scripts/analyze-sessions.js [--dir <projects-dir>] [--json] [--since <ISO|7d|24h>] [--top N]
 *
 * Notes on JSONL structure (discovered empirically):
 *  - One API response is split into MULTIPLE `type:"assistant"` entries (one per
 *    content block). They share the same `requestId` / `message.id`, and only the
 *    LAST one carries the final `output_tokens`. We dedupe by requestId and keep
 *    the max output_tokens to avoid 3-10x overcounting.
 *  - `type:"user"` entries include tool_result messages, interrupt markers,
 *    compact summaries and meta-injected text. A "human" message is one where
 *    isSidechain/isMeta/isCompactSummary are falsy and the content is a plain
 *    string (or text block) that isn't a tool_result or interrupt marker.
 *  - Subagent transcripts live in <project>/<sessionId>/subagents/*.jsonl with a
 *    sibling *.meta.json containing {agentType}. When meta is absent we fall back
 *    to the filename label (`agent-a<label>-<hash>.jsonl` → label) or "fork".
 *  - Resumed sessions can re-serialize prior entries into a new file; we dedupe
 *    globally by entry `uuid` so replayed history isn't double-counted.
 */

import fs from 'fs'
import os from 'os'
import path from 'path'
import readline from 'readline'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const LOCAL_PRICES = require('./model-prices.json')
const LITELLM_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'
const PRICE_CACHE = path.join(
  process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'),
  'agentic-toolkit',
  'litellm-prices.json',
)

// Which price table actually priced this run — surfaced in the report footer so a
// wrong number is attributable instead of silently authoritative.
const PRICING = { source: 'bundled', fetched_at: null, models_priced: 0 }

function normalizeUpstream(raw) {
  const out = {}
  for (const [key, val] of Object.entries(raw)) {
    if (!val || typeof val.input_cost_per_token !== 'number') continue
    out[key] = {
      input: val.input_cost_per_token,
      cache_create: val.cache_creation_input_token_cost ?? val.input_cost_per_token,
      cache_read: val.cache_read_input_token_cost ?? 0,
      output: val.output_cost_per_token ?? 0,
    }
  }
  return out
}

// Upstream overrides the bundled table: hand-maintained prices drift silently, and
// a stale rate still renders a confident-looking cost. The bundled table is kept as
// the offline fallback and as the only source for retired models upstream dropped.
function applyUpstream(prices, source, fetchedAt) {
  let n = 0
  for (const [key, val] of Object.entries(prices)) {
    LOCAL_PRICES[key] = val
    n++
  }
  PRICING.source = source
  PRICING.fetched_at = fetchedAt
  PRICING.models_priced = n
}

async function refreshPricesFromLiteLLM() {
  try {
    const r = await fetch(LITELLM_URL, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const prices = normalizeUpstream(await r.json())
    if (!Object.keys(prices).length) throw new Error('empty price table')
    const fetchedAt = new Date().toISOString()
    applyUpstream(prices, 'live', fetchedAt)
    try {
      fs.mkdirSync(path.dirname(PRICE_CACHE), { recursive: true })
      fs.writeFileSync(PRICE_CACHE, JSON.stringify({ fetched_at: fetchedAt, prices }))
    } catch { /* cache write is best-effort */ }
    return
  } catch { /* offline, timeout, or bad payload — fall through to the cache */ }
  try {
    const cached = JSON.parse(fs.readFileSync(PRICE_CACHE, 'utf8'))
    if (cached?.prices && Object.keys(cached.prices).length) {
      applyUpstream(cached.prices, 'cache', cached.fetched_at ?? null)
    }
  } catch { /* no usable cache — bundled prices, which is already the default */ }
}

function lookupPrice(model) {
  if (!model) return null
  if (LOCAL_PRICES[model]) return LOCAL_PRICES[model]
  for (const [key, val] of Object.entries(LOCAL_PRICES)) {
    if (model.startsWith(key) || key.startsWith(model)) return val
  }
  return null
}

function computeCost(rawUsage, prices) {
  if (!prices) return null
  const unc = rawUsage.input_tokens || 0
  const cc  = rawUsage.cache_creation_input_tokens || 0
  const cr  = rawUsage.cache_read_input_tokens || 0
  const out = rawUsage.output_tokens || 0
  const pCC = prices.cache_create ?? prices.input
  const input    = unc * prices.input
  const cacheC   = cc  * pCC
  const cacheR   = cr  * prices.cache_read
  const output   = out * prices.output
  const savings  = (cc + cr) * prices.input - cacheC - cacheR
  return { input, cacheCreate: cacheC, cacheRead: cacheR, output, savings }
}

function addCost(s, cost) {
  s.costInput      += cost.input
  s.costCacheCreate += cost.cacheCreate
  s.costCacheRead  += cost.cacheRead
  s.costOutput     += cost.output
  s.costSavings    += cost.savings
}

function bumpModel(s, model, usage, costTotal) {
  if (!model) return
  const m = s.modelUsage[model] || (s.modelUsage[model] = { calls: 0, inputUncached: 0, inputCacheCreate: 0, inputCacheRead: 0, outputTokens: 0, costTotal: 0 })
  m.calls++
  m.inputUncached    += usage.input_tokens || 0
  m.inputCacheCreate += usage.cache_creation_input_tokens || 0
  m.inputCacheRead   += usage.cache_read_input_tokens || 0
  m.outputTokens     += usage.output_tokens || 0
  m.costTotal        += costTotal || 0
}

function bumpTool(s, name) {
  s.toolCalls[name] = (s.toolCalls[name] || 0) + 1
}

const HIST_BREAKS = [0, 1000, 5000, 10000, 50000, 100000, 500000]
function promptSizeBucket(tokens) {
  if (tokens === 0) return 0
  for (let i = HIST_BREAKS.length - 1; i >= 1; i--) {
    if (tokens >= HIST_BREAKS[i]) return i
  }
  return 1
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2)
function flag(name, dflt) {
  const i = argv.indexOf(name)
  if (i === -1) return dflt
  const v = argv[i + 1]
  return v === undefined || v.startsWith('--') ? true : v
}
const ROOT = flag('--dir', path.join(os.homedir(), '.claude', 'projects'))
const AS_JSON = argv.includes('--json')
const TOP_N = parseInt(flag('--top', '15'), 10)
const SINCE = parseSince(flag('--since', null))
const CACHE_BREAK_THRESHOLD = parseInt(flag('--cache-break', '100000'), 10)
const IDLE_GAP_MS = 5 * 60 * 1000 // gaps >5min don't count toward "active" time

function parseSince(s) {
  if (!s) return null
  const m = /^(\d+)([dh])$/.exec(s)
  if (m) {
    const ms = m[2] === 'd' ? 86400000 : 3600000
    return new Date(Date.now() - parseInt(m[1], 10) * ms)
  }
  const d = new Date(s)
  return isNaN(d) ? null : d
}

// ---------------------------------------------------------------------------
// Stats container
// ---------------------------------------------------------------------------
function newStats() {
  return {
    sessions: new Set(),
    apiCalls: 0,
    inputUncached: 0, // usage.input_tokens
    inputCacheCreate: 0, // usage.cache_creation_input_tokens
    inputCacheRead: 0, // usage.cache_read_input_tokens
    outputTokens: 0,
    humanMessages: 0,
    wallClockMs: 0,
    activeMs: 0,
    cacheBreaks: [], // [{ts, session, project, uncached, total}]
    subagentCalls: 0,
    subagentTokens: 0, // total (in+out) inside subagent transcripts
    skillInvocations: {}, // name -> count
    modelUsage: {}, // model -> {calls, inputUncached, inputCacheCreate, inputCacheRead, outputTokens, costTotal}
    toolCalls: {}, // toolName -> count
    promptSizeHistogram: [0, 0, 0, 0, 0, 0, 0, 0], // buckets: 0,<1k,<5k,<10k,<50k,<100k,<500k,500k+
    firstTs: null,
    lastTs: null,
    costInput: 0,
    costCacheCreate: 0,
    costCacheRead: 0,
    costOutput: 0,
    costSavings: 0,
  }
}

function addUsage(s, u) {
  s.apiCalls++
  s.inputUncached += u.input_tokens || 0
  s.inputCacheCreate += u.cache_creation_input_tokens || 0
  s.inputCacheRead += u.cache_read_input_tokens || 0
  s.outputTokens += u.output_tokens || 0
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------
function* walk(dir) {
  let ents
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of ents) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (e.isFile() && e.name.endsWith('.jsonl')) yield p
  }
}

function classifyFile(p) {
  // returns { project, sessionId, kind, agentId?, agentTypeHint? }
  // agentTypeHint is from meta.json or filename label; final type is resolved
  // in main() after the parent-transcript map is built.
  const rel = path.relative(ROOT, p)
  const parts = rel.split(path.sep)
  const project = parts[0]
  const subIdx = parts.indexOf('subagents')
  if (subIdx !== -1) {
    const sessionId = parts[subIdx - 1]
    const base = path.basename(p, '.jsonl')
    const agentId = base.replace(/^agent-/, '')
    return {
      project,
      sessionId,
      kind: 'subagent',
      agentId,
      agentTypeHint:
        inferAgentTypeFromMeta(p) || inferAgentTypeFromFilename(base),
    }
  }
  if (parts.includes('workflows')) {
    const sessionId = parts[1]
    return { project, sessionId, kind: 'subagent', agentTypeHint: 'workflow' }
  }
  const sessionId = path.basename(p, '.jsonl')
  return { project, sessionId, kind: 'main' }
}

function inferAgentTypeFromMeta(jsonlPath) {
  const metaPath = jsonlPath.replace(/\.jsonl$/, '.meta.json')
  try {
    const m = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    if (m && typeof m.agentType === 'string') return m.agentType
  } catch {
    /* no meta */
  }
  return null
}

function inferAgentTypeFromFilename(base) {
  // agentId = 'a' + hex16  OR  'a' + label + '-' + hex16  (src/utils/uuid.ts)
  const m = /^agent-a([a-zA-Z_][\w-]*?)-[0-9a-f]{6,}$/.exec(base)
  if (m) return m[1] // internal background fork label
  return null // unlabeled — resolve via agentIdToType map or default to 'fork'
}

// ---------------------------------------------------------------------------
// Per-file streaming parse
// ---------------------------------------------------------------------------
const seenUuids = new Set() // global dedupe across resumed sessions
const seenRequestIds = new Set() // global dedupe for usage accounting
const toolUseIdToType = new Map() // tool_use id -> subagent_type (from Agent/Task tool_use)
const agentIdToType = new Map() // agentId -> subagent_type (linked via tool_result)
const toolUseIdToPrompt = new Map() // tool_use id -> promptKey (Agent spawned during this prompt)
const agentIdToPrompt = new Map() // agentId -> promptKey
const prompts = new Map() // promptKey -> { text, ts, project, sessionId, ...usage }
const sessionTurns = new Map() // sessionId -> [promptKey, ...] in transcript order
const sessionSpans = new Map() // sessionId -> {project, firstTs, lastTs, tokens}

function promptRecord(key, init) {
  let r = prompts.get(key)
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
    }
    prompts.set(key, r)
  }
  return r
}

async function processFile(p, info, buckets) {
  const rl = readline.createInterface({
    input: fs.createReadStream(p, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  })

  // Per-file: dedupe API calls by requestId, keep the one with max output_tokens.
  // We collect first, then commit, because earlier blocks have stale output counts.
  const fileApiCalls = new Map() // key -> {usage, ts}
  let firstTs = null
  let lastTs = null
  let prevTs = null
  let activeMs = 0
  let currentSkill = null // skill attribution for this turn
  // Prompt attribution: in main files this is set on each human message; in
  // subagent files it's inherited from the spawning prompt (via agentIdToPrompt).
  let currentPrompt =
    info.kind === 'subagent' && info.agentId
      ? agentIdToPrompt.get(info.agentId) || null
      : null

  const project = buckets.project
  const overall = buckets.overall
  const subagent = buckets.subagent // may be null
  const skillStats = buckets.skillStats // map name -> stats

  for await (const line of rl) {
    if (!line) continue
    let e
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }

    // global uuid dedupe (resumed sessions replay history)
    if (e.uuid) {
      if (seenUuids.has(e.uuid)) continue
      seenUuids.add(e.uuid)
    }

    // timestamp tracking
    if (e.timestamp) {
      const ts = Date.parse(e.timestamp)
      if (!isNaN(ts)) {
        if (SINCE && ts < SINCE.getTime()) continue
        if (firstTs === null) firstTs = ts
        if (prevTs !== null) {
          const gap = ts - prevTs
          if (gap > 0 && gap < IDLE_GAP_MS) activeMs += gap
        }
        prevTs = ts
        lastTs = ts
      }
    }

    if (e.type === 'user') {
      // Link Agent tool_result -> agentId for type + prompt attribution.
      const tur = e.toolUseResult
      if (tur && tur.agentId) {
        const c0 = Array.isArray(e.message?.content)
          ? e.message.content[0]
          : null
        const tuid = c0 && c0.tool_use_id
        if (tuid) {
          const st = toolUseIdToType.get(tuid)
          if (st) agentIdToType.set(tur.agentId, st)
          const pk = toolUseIdToPrompt.get(tuid)
          if (pk) {
            agentIdToPrompt.set(tur.agentId, pk)
            const r = prompts.get(pk)
            if (r) r.subagentCalls++
          }
        }
      }
      handleUser(
        e,
        info,
        { project, overall, subagent },
        v => {
          currentSkill = v
        },
        pk => {
          currentPrompt = pk
        },
      )
      continue
    }

    if (e.type === 'assistant') {
      const msg = e.message || {}
      const usage = msg.usage
      // detect Skill / Agent tool calls in content
      if (Array.isArray(msg.content)) {
        for (const c of msg.content) {
          if (c && c.type === 'tool_use') {
            bumpTool(overall, c.name)
            bumpTool(project, c.name)
            if (subagent) bumpTool(subagent, c.name)
            if (c.name === 'Skill' && c.input && c.input.skill) {
              const sk = String(c.input.skill)
              bumpSkill(overall, sk)
              bumpSkill(project, sk)
              if (subagent) bumpSkill(subagent, sk)
              currentSkill = sk
            }
            if (c.name === 'Agent' || c.name === 'Task') {
              if (c.input && c.input.subagent_type) {
                toolUseIdToType.set(c.id, String(c.input.subagent_type))
              }
              if (currentPrompt) toolUseIdToPrompt.set(c.id, currentPrompt)
            }
          }
        }
      }
      if (!usage) continue
      const key =
        e.requestId ||
        (msg.id && msg.id.startsWith('msg_0') && msg.id.length > 10
          ? msg.id
          : null) ||
        `${p}:${e.uuid || ''}`
      const prev = fileApiCalls.get(key)
      if (
        !prev ||
        (usage.output_tokens || 0) >= (prev.usage.output_tokens || 0)
      ) {
        fileApiCalls.set(key, {
          usage,
          ts: e.timestamp,
          skill: currentSkill,
          prompt: currentPrompt,
          model: msg.model || null,
        })
      }
      continue
    }
  }

  // commit timestamps
  if (firstTs !== null && lastTs !== null) {
    const wall = lastTs - firstTs
    for (const s of [overall, project, subagent].filter(Boolean)) {
      s.wallClockMs += wall
      s.activeMs += activeMs
      if (!s.firstTs || firstTs < s.firstTs) s.firstTs = firstTs
      if (!s.lastTs || lastTs > s.lastTs) s.lastTs = lastTs
    }
  }

  // session span (for by_day timeline) — subagent files roll into parent sessionId
  let span = sessionSpans.get(info.sessionId)
  if (!span) {
    span = { project: info.project, firstTs: null, lastTs: null, tokens: 0, cost: 0 }
    sessionSpans.set(info.sessionId, span)
  }
  if (firstTs !== null) {
    if (span.firstTs === null || firstTs < span.firstTs) span.firstTs = firstTs
    if (span.lastTs === null || lastTs > span.lastTs) span.lastTs = lastTs
  }

  // commit API calls
  for (const [key, { usage, ts, skill, prompt, model }] of fileApiCalls) {
    if (key && seenRequestIds.has(key)) continue
    seenRequestIds.add(key)

    const tot =
      (usage.input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0) +
      (usage.cache_read_input_tokens || 0) +
      (usage.output_tokens || 0)
    span.tokens += tot

    const targets = [overall, project]
    if (subagent) targets.push(subagent)
    if (skill && skillStats) {
      if (!skillStats.has(skill)) skillStats.set(skill, newStats())
      targets.push(skillStats.get(skill))
    }
    for (const s of targets) addUsage(s, usage)

    const prices = lookupPrice(model)
    let callCostTotal = 0
    if (prices) {
      const cost = computeCost(usage, prices)
      for (const s of targets) addCost(s, cost)
      callCostTotal = cost.input + cost.cacheCreate + cost.cacheRead + cost.output
    }
    for (const s of targets) bumpModel(s, model, usage, callCostTotal)
    span.cost += callCostTotal

    if (prompt) {
      const r = prompts.get(prompt)
      if (r) {
        r.apiCalls++
        r.inputUncached += usage.input_tokens || 0
        r.inputCacheCreate += usage.cache_creation_input_tokens || 0
        r.inputCacheRead += usage.cache_read_input_tokens || 0
        r.outputTokens += usage.output_tokens || 0
      }
    }

    // subagent token accounting on parent buckets
    if (info.kind === 'subagent') {
      overall.subagentTokens += tot
      project.subagentTokens += tot
      if (subagent) subagent.subagentTokens += tot
    }

    // cache break detection
    const uncached =
      (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0)
    if (uncached > CACHE_BREAK_THRESHOLD) {
      const total = uncached + (usage.cache_read_input_tokens || 0)
      const cb = {
        ts,
        session: info.sessionId,
        project: info.project,
        uncached,
        total,
        kind: info.kind,
        agentType: info.agentType,
        prompt,
      }
      overall.cacheBreaks.push(cb)
      project.cacheBreaks.push(cb)
      if (subagent) subagent.cacheBreaks.push(cb)
    }
  }

  // only count this file toward session/subagent tallies if it had in-range entries
  if (firstTs !== null || fileApiCalls.size > 0) {
    for (const s of [overall, project, subagent].filter(Boolean)) {
      s.sessions.add(info.sessionId)
    }
    if (info.kind === 'subagent') {
      overall.subagentCalls++
      project.subagentCalls++
      if (subagent) subagent.subagentCalls++
    }
  }
}

function handleUser(
  e,
  info,
  { project, overall, subagent },
  setSkill,
  setPrompt,
) {
  if (e.isMeta || e.isCompactSummary) return
  const content = e.message && e.message.content
  let isToolResult = false
  let text = null
  if (typeof content === 'string') {
    text = content
  } else if (Array.isArray(content)) {
    const first = content[0]
    if (first && first.type === 'tool_result') isToolResult = true
    else if (first && first.type === 'text') text = first.text || ''
  }
  if (isToolResult) return

  let slashCmd = null
  if (text) {
    // Auto-continuations (task notifications, scheduled wakeups) are not new
    // human prompts; keep attributing to the previously active prompt.
    if (
      text.startsWith('<task-notification') ||
      text.startsWith('<scheduled-wakeup') ||
      text.startsWith('<background-task')
    ) {
      return
    }
    const m = /<command-(?:name|message)>\/?([^<]+)<\/command-/.exec(text)
    if (m) {
      slashCmd = m[1].trim()
      bumpSkill(overall, slashCmd)
      bumpSkill(project, slashCmd)
      if (subagent) bumpSkill(subagent, slashCmd)
      setSkill(slashCmd)
    } else {
      setSkill(null) // plain human message resets skill attribution
    }
    if (text.startsWith('[Request interrupted')) return
  }

  // Only count as human message / start a prompt in main (non-sidechain) transcripts
  if (info.kind === 'main' && !e.isSidechain) {
    overall.humanMessages++
    project.humanMessages++
    const pk = e.uuid || `${info.sessionId}:${e.timestamp}`
    promptRecord(pk, {
      text: promptPreview(text, slashCmd),
      ts: e.timestamp,
      project: info.project,
      sessionId: info.sessionId,
    })
    setPrompt(pk)
    let turns = sessionTurns.get(info.sessionId)
    if (!turns) sessionTurns.set(info.sessionId, (turns = []))
    turns.push(pk)
  }
}

function promptPreview(text, slashCmd) {
  if (slashCmd) return `/${slashCmd}`
  if (!text) return '(non-text)'
  const t = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return t.length > 240 ? t.slice(0, 237) + '…' : t
}

// ±2 user messages around a given prompt, with the api-call count that
// followed each one. Used for drill-down in the HTML report.
function buildContext(pk) {
  const r = prompts.get(pk)
  if (!r) return null
  const turns = sessionTurns.get(r.sessionId)
  if (!turns) return null
  const i = turns.indexOf(pk)
  if (i === -1) return null
  const lo = Math.max(0, i - 2)
  const hi = Math.min(turns.length, i + 3)
  return turns.slice(lo, hi).map((k, j) => {
    const t = prompts.get(k) || {}
    return {
      text: t.text || '',
      ts: t.ts || null,
      calls: t.apiCalls || 0,
      here: lo + j === i,
    }
  })
}

function bumpSkill(s, name) {
  s.skillInvocations[name] = (s.skillInvocations[name] || 0) + 1
}

const _btCache = new Map()
function birthtime(p) {
  let t = _btCache.get(p)
  if (t === undefined) {
    try {
      t = fs.statSync(p).birthtimeMs
    } catch {
      t = 0
    }
    _btCache.set(p, t)
  }
  return t
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await refreshPricesFromLiteLLM()
  const overall = newStats()
  const perProject = new Map() // project -> stats
  const perSubagent = new Map() // agentType -> stats
  const perSkill = new Map() // skill -> stats (token-attributed)

  // Classify, then sort main files before subagent files. Fork-style subagents
  // replay parent entries with identical uuids; processing parents first ensures
  // the global uuid-dedupe attributes those entries to the parent, not the fork.
  // Among subagents, sort by birthtime so a parent subagent is processed before
  // any nested children it spawned (needed for prompt-attribution propagation).
  const files = [...walk(ROOT)]
    .map(p => ({ p, info: classifyFile(p) }))
    .sort((a, b) => {
      const ka = a.info.kind === 'main' ? 0 : 1
      const kb = b.info.kind === 'main' ? 0 : 1
      if (ka !== kb) return ka - kb
      if (ka === 1) return birthtime(a.p) - birthtime(b.p)
      return 0
    })
  let n = 0
  for (const { p, info } of files) {
    if (!perProject.has(info.project)) perProject.set(info.project, newStats())
    const project = perProject.get(info.project)

    let subagent = null
    if (info.kind === 'subagent') {
      // Resolve agent type: meta.json/filename hint > parent-transcript map > 'fork'
      const at =
        info.agentTypeHint ||
        (info.agentId && agentIdToType.get(info.agentId)) ||
        'fork'
      info.agentType = at
      if (!perSubagent.has(at)) perSubagent.set(at, newStats())
      subagent = perSubagent.get(at)
    }

    await processFile(p, info, {
      overall,
      project,
      subagent,
      skillStats: perSkill,
    })
    n++
    if (!AS_JSON && n % 200 === 0) {
      process.stderr.write(`\r  scanned ${n}/${files.length} files…`)
    }
  }
  if (!AS_JSON)
    process.stderr.write(`\r  scanned ${n}/${files.length} files.\n`)

  // Drop empty buckets (created for files that had no in-range entries under --since)
  for (const m of [perProject, perSubagent, perSkill]) {
    for (const [k, v] of m) {
      if (v.apiCalls === 0 && v.sessions.size === 0) m.delete(k)
    }
  }

  if (AS_JSON) {
    printJson({ overall, perProject, perSubagent, perSkill })
  } else {
    printText({ overall, perProject, perSubagent, perSkill })
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return String(n)
}
function pct(a, b) {
  return b > 0 ? ((100 * a) / b).toFixed(1) + '%' : '—'
}
function hrs(ms) {
  return (ms / 3600000).toFixed(1)
}

function efficiencyScore(s) {
  const inTotal = s.inputUncached + s.inputCacheCreate + s.inputCacheRead
  const grand = inTotal + s.outputTokens
  if (grand === 0) return null
  const cacheScore = inTotal > 0 ? s.inputCacheRead / inTotal : 0
  const tokPerMsg = s.humanMessages > 0 ? grand / s.humanMessages : 0
  const msgScore = 1 - Math.min(1, tokPerMsg / 10000)
  const subRatio = grand > 0 ? s.subagentTokens / grand : 0
  const subScore = 1 - Math.min(1, subRatio)
  return Math.round(100 * (0.4 * cacheScore + 0.3 * msgScore + 0.3 * subScore))
}

function summarize(s) {
  const inTotal = s.inputUncached + s.inputCacheCreate + s.inputCacheRead
  return {
    sessions: s.sessions.size,
    api_calls: s.apiCalls,
    input_tokens: {
      uncached: s.inputUncached,
      cache_create: s.inputCacheCreate,
      cache_read: s.inputCacheRead,
      total: inTotal,
      pct_cached:
        inTotal > 0 ? +((100 * s.inputCacheRead) / inTotal).toFixed(1) : 0,
    },
    output_tokens: s.outputTokens,
    human_messages: s.humanMessages,
    hours: { wall_clock: +hrs(s.wallClockMs), active: +hrs(s.activeMs) },
    cache_breaks_over_100k: s.cacheBreaks.length,
    subagent: {
      calls: s.subagentCalls,
      total_tokens: s.subagentTokens,
      avg_tokens_per_call:
        s.subagentCalls > 0
          ? Math.round(s.subagentTokens / s.subagentCalls)
          : 0,
    },
    skill_invocations: s.skillInvocations,
    efficiency_score: efficiencyScore(s),
    span: s.firstTs
      ? {
          from: new Date(s.firstTs).toISOString(),
          to: new Date(s.lastTs).toISOString(),
        }
      : null,
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
  }
}

function printJson({ overall, perProject, perSubagent, perSkill }) {
  const out = {
    tool: 'claude',
    root: ROOT,
    generated_at: new Date().toISOString(),
    pricing: PRICING,
    overall: summarize(overall),
    cache_breaks: overall.cacheBreaks
      .sort((a, b) => b.uncached - a.uncached)
      .slice(0, 100)
      .map(({ prompt, ...b }) => ({
        ...b,
        context: prompt ? buildContext(prompt) : null,
      })),
    by_project: Object.fromEntries(
      [...perProject].map(([k, v]) => [k, summarize(v)]),
    ),
    by_subagent_type: Object.fromEntries(
      [...perSubagent].map(([k, v]) => [k, summarize(v)]),
    ),
    by_skill: Object.fromEntries(
      [...perSkill].map(([k, v]) => [k, summarize(v)]),
    ),
    top_prompts: topPrompts(100),
    by_day: buildByDay(),
    prompt_size_histogram: buildPromptHistogram(),
  }
  process.stdout.write(JSON.stringify(out, null, 2).replace(/</g, '\\u003c') + '\n')
}

// Group sessions into local-date buckets for the timeline view. A session is
// placed on the day its first message landed; tokens for that session (incl.
// subagents) count toward that day even if it ran past midnight.
function buildByDay() {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days = new Map() // yyyy-mm-dd -> {date, dow, tokens, sessions:[]}
  for (const [id, s] of sessionSpans) {
    if (s.firstTs === null || s.tokens === 0) continue
    const d0 = new Date(s.firstTs)
    const key = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`
    let day = days.get(key)
    if (!day) {
      day = { date: key, dow: DOW[d0.getDay()], tokens: 0, cost: 0, sessions: [] }
      days.set(key, day)
    }
    const base = new Date(
      d0.getFullYear(),
      d0.getMonth(),
      d0.getDate(),
    ).getTime()
    day.tokens += s.tokens
    day.cost += s.cost || 0
    day.sessions.push({
      id,
      project: s.project,
      tokens: s.tokens,
      cost: +(s.cost || 0).toFixed(4),
      start_min: Math.max(0, Math.round((s.firstTs - base) / 60000)),
      end_min: Math.max(1, Math.round((s.lastTs - base) / 60000)),
    })
  }
  for (const d of days.values()) {
    // peak concurrency via 10-min buckets, capped at 24h for display
    const b = new Array(144).fill(0)
    for (const s of d.sessions) {
      const lo = Math.min(143, Math.floor(s.start_min / 10))
      const hi = Math.min(144, Math.ceil(Math.min(s.end_min, 1440) / 10))
      for (let i = lo; i < hi; i++) b[i]++
    }
    d.peak = Math.max(0, ...b)
    d.peak_at_min = d.peak > 0 ? b.indexOf(d.peak) * 10 : 0
    d.sessions.sort((a, b) => a.start_min - b.start_min)
    d.cost = +d.cost.toFixed(4)
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function promptTotal(r) {
  return (
    r.inputUncached + r.inputCacheCreate + r.inputCacheRead + r.outputTokens
  )
}

function buildPromptHistogram() {
  const labels = ['0', '<1k', '<5k', '<10k', '<50k', '<100k', '<500k', '500k+']
  const counts = new Array(labels.length).fill(0)
  for (const r of prompts.values()) {
    if (r.apiCalls > 0) counts[promptSizeBucket(promptTotal(r))]++
  }
  return labels.map((label, i) => ({ label, count: counts[i] }))
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
      input: {
        uncached: r.inputUncached,
        cache_create: r.inputCacheCreate,
        cache_read: r.inputCacheRead,
      },
      output: r.outputTokens,
      context: buildContext(pk),
    }))
}

function printText({ overall, perProject, perSubagent, perSkill }) {
  const line = (...a) => console.log(...a)
  const hr = () => line('─'.repeat(78))

  line()
  line(`Claude Code session analysis — ${ROOT}`)
  if (SINCE) line(`(since ${SINCE.toISOString()})`)
  hr()
  printBlock('OVERALL', overall)

  hr()
  line(
    `CACHE BREAKS (>${fmt(CACHE_BREAK_THRESHOLD)} uncached input on a single call)`,
  )
  const breaks = overall.cacheBreaks
    .sort((a, b) => b.uncached - a.uncached)
    .slice(0, TOP_N)
  if (breaks.length === 0) line('  none')
  for (const b of breaks) {
    line(
      `  ${fmt(b.uncached).padStart(8)} uncached / ${fmt(b.total).padStart(8)} total  ` +
        `${(b.ts || '').slice(0, 19)}  ${b.project}` +
        (b.kind === 'subagent' ? `  [${b.agentType}]` : ''),
    )
  }
  if (overall.cacheBreaks.length > TOP_N)
    line(`  … ${overall.cacheBreaks.length - TOP_N} more`)

  hr()
  line(
    'MOST EXPENSIVE PROMPTS (total tokens incl. subagents spawned during the turn)',
  )
  const top = topPrompts(TOP_N)
  if (top.length === 0) line('  none')
  for (const r of top) {
    const inTot = r.input.uncached + r.input.cache_create + r.input.cache_read
    line(
      `  ${fmt(r.total_tokens).padStart(8)}  ` +
        `(in ${fmt(inTot)} ${pct(r.input.cache_read, inTot)} cached, out ${fmt(r.output)})  ` +
        `${r.api_calls} calls` +
        (r.subagent_calls ? `, ${r.subagent_calls} subagents` : '') +
        `  ${(r.ts || '').slice(0, 16)}  ${r.project}`,
    )
    line(`           "${r.text}"`)
  }
  line(
    '  (note: internal background forks like task_summary/compact are not attributed to a prompt)',
  )

  hr()
  line('BY PROJECT (top by total input tokens)')
  const projects = [...perProject.entries()].sort(
    (a, b) => totalIn(b[1]) - totalIn(a[1]),
  )
  for (const [name, s] of projects.slice(0, TOP_N)) {
    printBlock(name, s, '  ')
    line()
  }
  if (projects.length > TOP_N)
    line(`  … ${projects.length - TOP_N} more projects`)

  hr()
  line('BY SUBAGENT TYPE')
  const agents = [...perSubagent.entries()].sort(
    (a, b) => totalIn(b[1]) - totalIn(a[1]),
  )
  for (const [name, s] of agents) {
    printBlock(name, s, '  ')
    line()
  }

  hr()
  line(
    'BY SKILL / SLASH COMMAND (tokens attributed = from invocation until next human msg)',
  )
  const skills = [...perSkill.entries()].sort(
    (a, b) => totalIn(b[1]) - totalIn(a[1]),
  )
  for (const [name, s] of skills.slice(0, TOP_N)) {
    printBlock(name, s, '  ')
    line()
  }
  if (skills.length > TOP_N) line(`  … ${skills.length - TOP_N} more`)
  line()
}

function totalIn(s) {
  return s.inputUncached + s.inputCacheCreate + s.inputCacheRead
}

function printBlock(title, s, indent = '') {
  const inTotal = totalIn(s)
  console.log(`${indent}${title}`)
  console.log(
    `${indent}  sessions: ${s.sessions.size}   api calls: ${s.apiCalls}   human msgs: ${s.humanMessages}`,
  )
  console.log(
    `${indent}  input:  ${fmt(inTotal)} total  ` +
      `(uncached ${fmt(s.inputUncached)}, cache-create ${fmt(s.inputCacheCreate)}, cache-read ${fmt(s.inputCacheRead)} = ${pct(s.inputCacheRead, inTotal)} cached)`,
  )
  console.log(`${indent}  output: ${fmt(s.outputTokens)}`)
  console.log(
    `${indent}  hours:  ${hrs(s.wallClockMs)} wall-clock, ${hrs(s.activeMs)} active (gaps >5m excluded)`,
  )
  console.log(
    `${indent}  cache breaks >${fmt(CACHE_BREAK_THRESHOLD)}: ${s.cacheBreaks.length}`,
  )
  console.log(
    `${indent}  subagents: ${s.subagentCalls} calls, ${fmt(s.subagentTokens)} tokens, avg ${fmt(
      s.subagentCalls ? Math.round(s.subagentTokens / s.subagentCalls) : 0,
    )}/call`,
  )
  const topSkills = Object.entries(s.skillInvocations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  if (topSkills.length)
    console.log(
      `${indent}  skills: ${topSkills.map(([k, v]) => `${k}×${v}`).join(', ')}`,
    )
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
