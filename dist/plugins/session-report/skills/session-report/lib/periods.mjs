// Period comparison: trailing windows of one width ending now, each holding a stats bucket from the
// analyzer. The analyzers push a call's bucket into the same target list as the overall one, so a
// period gets every figure the overall block does and no second summarizer exists.
const UNIT_MS = { h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
const DEFAULT_COUNT = 4;
const MAX_COUNT = 52;

export const parseWindow = spec => {
  if (spec === 'weekly') return 7 * UNIT_MS.d;

  const match = /^(\d+)([dh])$/.exec(spec);

  if (!match || Number(match[1]) === 0) throw new Error(`--compare expects weekly, <N>d or <N>h, got ${spec}`);

  return Number(match[1]) * UNIT_MS[match[2]];
};

export const parseCount = value => {
  if (value === null || value === undefined) return DEFAULT_COUNT;

  const count = Number(value);

  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    throw new Error(`--periods expects a whole number from 1 to ${MAX_COUNT}, got ${value}`);
  }

  return count;
};

// Oldest first. A period is [start, end); the newest also takes `end` itself, so a call stamped at `now` is not lost.
export const buildPeriods = ({ spec, count, now, newStats }) => {
  const width = parseWindow(spec);
  const periods = [];

  for (let age = parseCount(count) - 1; age >= 0; age--) {
    const end = now - age * width;

    periods.push({ start: end - width, end, stats: newStats() });
  }

  return periods;
};

// Throws on a bad flag so each analyzer reports it the same way; null means the run asked for no comparison.
export const periodsFromFlags = ({ compare, periods, compareEnd, newStats }) => {
  if (compare === null || compare === undefined) return null;
  if (compare === true) throw new Error('--compare needs a value: weekly, <N>d or <N>h');

  const now = typeof compareEnd === 'string' ? Date.parse(compareEnd) : Date.now();

  if (!Number.isFinite(now)) throw new Error(`--compare-end expects an ISO date, got ${compareEnd}`);

  return buildPeriods({ spec: compare, count: periods, now, newStats });
};

export const periodAt = (periods, ts) => {
  const ms = typeof ts === 'number' ? ts : Date.parse(ts);

  if (!Number.isFinite(ms)) return null;

  for (const [index, period] of periods.entries()) {
    const last = index === periods.length - 1;

    if (ms >= period.start && (ms < period.end || (last && ms === period.end))) return period.stats;
  }

  return null;
};

// The comparison widens the report window to cover every period, so --since can never cut one short.
export const widenSince = (since, periods) => {
  if (!periods) return since;

  const first = new Date(periods[0].start);

  return since && since < first ? since : first;
};

// A period is partial when the source has nothing at its start: transcripts were pruned, or capture began mid-window.
export const summarizePeriods = (periods, { summarize, earliest }) =>
  periods.map(({ start, end, stats }) => {
    const summary = summarize(stats);

    return {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      partial: earliest === null || earliest === undefined || earliest > start,
      tokens: summary.input_tokens.total + summary.output_tokens,
      cost: summary.cost_usd ? summary.cost_usd.total : null,
      sessions: summary.sessions,
      human_messages: summary.human_messages,
      api_calls: summary.api_calls,
      by_model: summary.by_model,
      active_hours: summary.hours.active,
      cache_hit: summary.input_tokens.pct_cached,
      cache_reads: summary.input_tokens.cache_read,
      cache_writes: summary.input_tokens.cache_create,
      cache_breaks: summary.cache_breaks_over_100k,
    };
  });

const compact = value => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;

  return String(value);
};

export const formatPeriods = rows => {
  const head = ['period start', 'tokens', 'cost', 'sessions*', 'msgs', 'calls', 'active h', 'cache %', 'breaks'];
  const body = rows.map(row => [
    `${row.start.slice(0, 10)}${row.partial ? ' (partial)' : ''}`,
    compact(row.tokens),
    row.cost === null ? 'n/a' : `$${row.cost.toFixed(2)}`,
    String(row.sessions),
    String(row.human_messages),
    String(row.api_calls),
    String(row.active_hours),
    String(row.cache_hit),
    String(row.cache_breaks),
  ]);
  const widths = head.map((cell, column) => Math.max(cell.length, ...body.map(line => line[column].length)));
  const render = line => line.map((cell, column) => (column === 0 ? cell.padEnd(widths[column]) : cell.padStart(widths[column]))).join('  ');

  return [render(head), ...body.map(render), '* a session spanning periods counts once in each, so sessions do not sum'];
};
