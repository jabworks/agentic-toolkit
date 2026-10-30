// Reads the usage-trace store from the format in specs/usage-telemetry/fields.md.
// session-report and usage-trace share that format and no code.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

export const STORE_VERSION = 1;

const IDLE_GAP_MS = 5 * 60 * 1000;
const NON_HUMAN_SOURCES = new Set(['system']);
const HEAD_BYTES = 64 * 1024;
const TEXT_LIMIT = 240;

export class StoreVersionError extends Error {}

export const defaultStoreHome = () => process.env.USAGE_TRACE_HOME || path.join(os.homedir(), '.usage-trace');

// ---------------------------------------------------------------------------
// Dated prices: model -> [{ from: 'YYYY-MM-DD', ...rates }], oldest first.
// ---------------------------------------------------------------------------
const entriesFor = (model, prices) => {
  if (!model) return null;
  if (prices[model]) return prices[model];

  for (const [key, entries] of Object.entries(prices)) {
    if (model.startsWith(key) || key.startsWith(model)) return entries;
  }

  return null;
};

// A timestamp before the first entry prices at the first entry, and no timestamp prices at the latest.
export const priceAt = (model, ts, prices) => {
  const entries = entriesFor(model, prices);

  if (!entries?.length) return null;

  const parsed = ts ? new Date(ts) : null;
  const day = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
  const entry = day ? (entries.findLast(candidate => candidate.from <= day) ?? entries[0]) : entries.at(-1);
  const { from: _from, ...rates } = entry;

  return rates;
};

// Upstream publishes only today's rates, so it may correct the latest entry but never history.
export const setCurrentRates = (prices, model, rates) => {
  const entries = prices[model];

  if (!entries?.length) {
    prices[model] = [{ from: '2020-01-01', ...rates }];

    return;
  }

  entries[entries.length - 1] = { from: entries.at(-1).from, ...rates };
};

// ---------------------------------------------------------------------------
// Store reading
// ---------------------------------------------------------------------------
const listMonths = home => {
  try {
    const months = fs.readdirSync(path.join(home, 'events')).map(name => /^(\d{4}-\d{2})\.jsonl/.exec(name)?.[1]);

    return [...new Set(months.filter(Boolean))].sort();
  } catch {
    return [];
  }
};

// A month can exist in both forms at once, so both are always read.
const readMonth = (home, month) => {
  const base = path.join(home, 'events', `${month}.jsonl`);
  let text = '';

  try {
    text += zlib.gunzipSync(fs.readFileSync(`${base}.gz`)).toString('utf8');
  } catch {
    // No closed form of this month.
  }

  try {
    text += fs.readFileSync(base, 'utf8');
  } catch {
    // No open form of this month.
  }

  return text;
};

const parseLines = text =>
  text.split('\n').flatMap(line => {
    if (!line) return [];

    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });

export const readStore = async function* ({ home, since, until }) {
  for (const month of listMonths(home)) {
    if ((since && month < since.slice(0, 7)) || (until && month > until.slice(0, 7))) continue;

    const calls = new Map();
    const seen = new Set();

    for (const event of parseLines(readMonth(home, month))) {
      if (event.v !== STORE_VERSION) throw new StoreVersionError(`unknown store version ${event.v}`);
      if ((since && event.ts < since) || (until && event.ts > until)) continue;

      if (event.type === 'api_call') {
        const previous = calls.get(event.id);

        if (!previous || (event.output ?? 0) > (previous.output ?? 0)) calls.set(event.id, event);
        continue;
      }

      if (seen.has(event.id)) continue;

      seen.add(event.id);
      yield event;
    }

    yield* calls.values();
  }
};

// ---------------------------------------------------------------------------
// Source selection
// ---------------------------------------------------------------------------
export const resolveSource = async ({ source, explicitDir, home, host, since }) => {
  const transcripts = reason => ({ source: 'transcripts', events: null, coverage: reason ? { fallback: reason } : null });

  if (source === 'transcripts') return transcripts(null);
  if (source === 'auto' && explicitDir) return transcripts(null);

  const fail = reason => {
    if (source === 'store') throw new Error(`--source store: ${reason}`);

    process.stderr.write(`session-report: using transcripts, ${reason}\n`);

    return transcripts(reason);
  };

  if (!listMonths(home).length) return fail(`no usage-trace store at ${home}`);

  const events = [];

  try {
    for await (const event of readStore({ home, since })) {
      if (event.host === host) events.push(event);
    }
  } catch (error) {
    if (error instanceof StoreVersionError) return fail(error.message);
    throw error;
  }

  if (!events.length) return fail(`the store has no ${host} events in this window`);

  events.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));

  const lastRun = readLastRun(home);

  return {
    source: 'store',
    events,
    coverage: {
      home,
      events: events.length,
      from: events[0].ts,
      to: events.at(-1).ts,
      last_ingest: lastRun?.ts ?? null,
      failures: lastRun?.failures ?? null,
    },
  };
};

const readLastRun = home => {
  try {
    return JSON.parse(fs.readFileSync(path.join(home, 'last-run.json'), 'utf8'));
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Local path discovery: the store holds hashes, so a name is recovered by hashing
// the paths this machine's transcripts name and matching. Anything else stays a hash.
// ---------------------------------------------------------------------------
const readHead = file => {
  let fd;

  try {
    fd = fs.openSync(file, 'r');

    const buffer = Buffer.alloc(HEAD_BYTES);
    const size = fs.readSync(fd, buffer, 0, HEAD_BYTES, 0);

    return buffer.toString('utf8', 0, size);
  } catch {
    return '';
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
};

const walkJsonl = function* (dir) {
  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) yield* walkJsonl(full);
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) yield full;
  }
};

const cwdsIn = text => [...text.matchAll(/"cwd":"((?:[^"\\]|\\.)*)"/g)].map(match => {
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return null;
  }
});

export const projectNames = ({ home, roots }) => {
  const names = new Map();
  let salt;

  try {
    salt = fs.readFileSync(path.join(home, 'salt'), 'utf8');
  } catch {
    return names;
  }

  const hash = value => `h:${crypto.createHmac('sha256', salt).update(String(value)).digest('hex').slice(0, 16)}`;

  for (const root of roots) {
    for (const file of walkJsonl(root)) {
      for (const cwd of cwdsIn(readHead(file))) {
        if (cwd) names.set(hash(cwd), cwd);
      }
    }
  }

  return names;
};

// ---------------------------------------------------------------------------
// Prompt text: never in the store unless allowlisted, so it comes from the
// transcript while that still exists.
// ---------------------------------------------------------------------------
const textOf = record => {
  if (record.type === 'user') {
    const content = record.message?.content;

    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.find(block => block.type === 'text')?.text ?? null;
  }

  if (record.payload?.type === 'user_message') return record.payload.message ?? null;

  return null;
};

const fillPromptText = (records, roots) => {
  if (!records.length) return;

  const wanted = new Set(records.map(record => record.sessionId));
  const files = new Map();

  for (const root of roots) {
    for (const file of walkJsonl(root)) {
      if (file.includes(`${path.sep}subagents${path.sep}`)) continue;

      const session = /([0-9a-f]{8}-[0-9a-f-]{27})\.jsonl$/.exec(file)?.[1];

      if (session && wanted.has(session)) files.set(session, file);
    }
  }

  for (const [session, file] of files) {
    const mine = new Map(records.filter(record => record.sessionId === session).map(record => [record.ts, record]));

    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line) continue;

      let parsed;

      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      const record = mine.get(parsed.timestamp);
      const text = record ? textOf(parsed) : null;

      if (text) record.text = text.slice(0, TEXT_LIMIT);
    }
  }
};

// ---------------------------------------------------------------------------
// Aggregation into the analyzers' own stat shapes, so every output path is shared.
// ---------------------------------------------------------------------------
const isHumanTurn = event =>
  event.type === 'turn' &&
  event.prompt_chars !== undefined &&
  !event.interrupted &&
  !event.sidechain &&
  !NON_HUMAN_SOURCES.has(event.prompt_source);

const newPrompt = (event, project) => ({
  text: `(prompt text not retained · ${event.prompt_chars} chars)`,
  ts: event.ts,
  project,
  sessionId: event.session,
  apiCalls: 0,
  subagentCalls: 0,
  inputUncached: 0,
  inputCacheCreate: 0,
  inputCacheRead: 0,
  outputTokens: 0,
});

const promptTokens = r => r.inputUncached + r.inputCacheCreate + r.inputCacheRead + r.outputTokens;

export const applyStoreEvents = (events, state) => {
  const { overall, perProject, perSubagent, perSkill, prompts, sessionSpans, newStats, prices, names, breakThreshold, topN, roots } = state;
  const statsIn = (map, key) => {
    if (!map.has(key)) map.set(key, newStats());

    return map.get(key);
  };
  const labelOf = project => names.get(project) ?? project ?? 'unknown';
  const sessionState = new Map();
  const pricedModels = new Set();

  for (const event of events) {
    const project = labelOf(event.project);
    const ms = Date.parse(event.ts);
    const projectStats = statsIn(perProject, project);

    if (!event.session) continue;

    let session = sessionState.get(event.session);

    if (!session) {
      session = { key: event.session, project, projectStats, firstTs: ms, lastTs: ms, activeMs: 0, prompt: null };
      sessionState.set(event.session, session);
      overall.sessions.add(event.session);
      projectStats.sessions.add(event.session);
    }

    const gap = ms - session.lastTs;

    if (gap > 0 && gap < IDLE_GAP_MS) session.activeMs += gap;
    session.lastTs = Math.max(session.lastTs, ms);

    if (isHumanTurn(event)) {
      overall.humanMessages++;
      session.projectStats.humanMessages++;

      const key = `${event.session}:${event.id}`;

      prompts.set(key, newPrompt(event, session.project));
      session.prompt = prompts.get(key);
      continue;
    }

    if (event.type === 'subagent') {
      overall.subagentCalls++;
      session.projectStats.subagentCalls++;
      statsIn(perSubagent, event.agent_type ?? 'fork').subagentCalls++;
      if (session.prompt) session.prompt.subagentCalls++;
      continue;
    }

    if (event.type === 'tool_call') {
      for (const stats of [overall, session.projectStats]) {
        stats.toolCalls[event.tool] = (stats.toolCalls[event.tool] ?? 0) + 1;
      }

      if (event.tool === 'Skill' && event.skill) {
        for (const stats of [overall, session.projectStats]) {
          stats.skillInvocations[event.skill] = (stats.skillInvocations[event.skill] ?? 0) + 1;
        }
      }

      continue;
    }

    if (event.type !== 'api_call') continue;

    const input = event.input ?? 0;
    const cacheWrite = event.cache_write ?? 0;
    const cacheRead = event.cache_read ?? 0;
    const output = event.output ?? 0;
    const tokens = input + cacheWrite + cacheRead + output;
    const targets = [overall, session.projectStats];

    if (event.sidechain) targets.push(statsIn(perSubagent, event.agent ?? 'fork'));

    const skillStats = event.skill ? statsIn(perSkill, event.skill) : null;

    if (skillStats) targets.push(skillStats);

    const rates = priceAt(event.model, event.ts, prices);
    const cost = rates
      ? {
          input: input * rates.input,
          cacheCreate: cacheWrite * (rates.cache_create ?? rates.input),
          cacheRead: cacheRead * rates.cache_read,
          output: output * rates.output,
        }
      : null;
    const costTotal = cost ? cost.input + cost.cacheCreate + cost.cacheRead + cost.output : 0;

    if (rates) pricedModels.add(event.model);

    for (const stats of targets) {
      stats.sessions.add(event.session);
      stats.apiCalls++;
      stats.inputUncached += input;
      stats.inputCacheCreate += cacheWrite;
      stats.inputCacheRead += cacheRead;
      stats.outputTokens += output;
      if (event.sidechain && stats !== skillStats) stats.subagentTokens += tokens;

      if (cost) {
        stats.costInput += cost.input;
        stats.costCacheCreate += cost.cacheCreate;
        stats.costCacheRead += cost.cacheRead;
        stats.costOutput += cost.output;
        stats.costSavings += (cacheWrite + cacheRead) * rates.input - cost.cacheCreate - cost.cacheRead;
      }

      if (event.model) {
        const usage = (stats.modelUsage[event.model] ??= {
          calls: 0,
          inputUncached: 0,
          inputCacheCreate: 0,
          inputCacheRead: 0,
          outputTokens: 0,
          costTotal: 0,
        });

        usage.calls++;
        usage.inputUncached += input;
        usage.inputCacheCreate += cacheWrite;
        usage.inputCacheRead += cacheRead;
        usage.outputTokens += output;
        usage.costTotal += costTotal;
      }
    }

    const uncached = input + cacheWrite;

    if (uncached > breakThreshold) {
      const entry = {
        ts: event.ts,
        session: event.session,
        project: session.project,
        uncached,
        total: uncached + cacheRead,
        kind: event.sidechain ? 'subagent' : 'main',
        agentType: event.agent,
      };

      overall.cacheBreaks.push(entry);
      session.projectStats.cacheBreaks.push(entry);
    }

    if (session.prompt) {
      session.prompt.apiCalls++;
      session.prompt.inputUncached += input;
      session.prompt.inputCacheCreate += cacheWrite;
      session.prompt.inputCacheRead += cacheRead;
      session.prompt.outputTokens += output;
    }

    const span = sessionSpans.get(event.session) ?? { project: session.project, firstTs: session.firstTs, lastTs: ms, tokens: 0, cost: 0 };

    span.tokens += tokens;
    span.cost += costTotal;
    sessionSpans.set(event.session, span);
  }

  for (const session of sessionState.values()) {
    const wall = session.lastTs - session.firstTs;
    const span = sessionSpans.get(session.key);

    if (span) span.lastTs = session.lastTs;

    for (const stats of [overall, session.projectStats]) {
      stats.wallClockMs += wall;
      stats.activeMs += session.activeMs;
      if (!stats.firstTs || session.firstTs < stats.firstTs) stats.firstTs = session.firstTs;
      if (!stats.lastTs || session.lastTs > stats.lastTs) stats.lastTs = session.lastTs;
    }
  }

  const top = [...prompts.values()]
    .filter(record => record.apiCalls > 0)
    .sort((a, b) => promptTokens(b) - promptTokens(a))
    .slice(0, topN);

  fillPromptText(top, roots);

  return { modelsPriced: pricedModels.size };
};
