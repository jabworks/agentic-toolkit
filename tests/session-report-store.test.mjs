import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { priceAt, readStore, setCurrentRates, StoreVersionError } from '../skills/session-report/lib/read-store.mjs';
import { buildPeriods, formatPeriods, parseWindow, periodAt, summarizePeriods, widenSince } from '../skills/session-report/lib/periods.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLAUDE = path.resolve(__dirname, '../skills/session-report/analyze-claude.mjs');
const CODEX = path.resolve(__dirname, '../skills/session-report/analyze-codex.mjs');
const OFFLINE = path.resolve(__dirname, 'offline-fetch.mjs');
const SALT = 'test-salt';
const hash = value => `h:${crypto.createHmac('sha256', SALT).update(value).digest('hex').slice(0, 16)}`;
const SESSION = '11111111-2222-3333-4444-555555555555';
const CWD = '/tmp/usage-store-fixture';

const event = (type, fields) => ({
  v: 1,
  type,
  ts: '2026-10-05T10:00:00.000Z',
  host: 'claude',
  session: SESSION,
  project: hash(CWD),
  ...fields,
});

const makeStore = (tmp, { open = [], closed = [] }) => {
  const home = path.join(tmp, 'store');

  fs.mkdirSync(path.join(home, 'events'), { recursive: true });
  fs.writeFileSync(path.join(home, 'salt'), SALT);

  const lines = events => events.map(item => JSON.stringify(item)).join('\n') + '\n';

  if (open.length) fs.writeFileSync(path.join(home, 'events', '2026-10.jsonl'), lines(open));
  if (closed.length) fs.writeFileSync(path.join(home, 'events', '2026-10.jsonl.gz'), zlib.gzipSync(lines(closed)));

  return home;
};

const withTmp = run => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-session-report-store-'));

  return Promise.resolve(run(tmp)).finally(() => fs.rmSync(tmp, { recursive: true, force: true }));
};

const analyze = (script, ...args) =>
  JSON.parse(execFileSync(process.execPath, ['--import', OFFLINE, script, '--json', ...args], { encoding: 'utf8', maxBuffer: 1e8 }));

const collect = async options => {
  const events = [];

  for await (const item of readStore(options)) events.push(item);

  return events;
};

const PRICES = {
  dated: [
    { from: '2020-01-01', input: 1, cache_create: 1, cache_read: 1, output: 1 },
    { from: '2026-10-01', input: 2, cache_create: 2, cache_read: 2, output: 2 },
  ],
};

test('priceAt picks the entry in force on the day', () => {
  assert.equal(priceAt('dated', '2026-09-30T23:00:00Z', PRICES).input, 1);
  assert.equal(priceAt('dated', '2026-10-01T00:00:00Z', PRICES).input, 2);
  assert.equal(priceAt('dated', null, PRICES).input, 2);
  assert.equal(priceAt('dated', Date.parse('2026-01-01'), PRICES).input, 1);
  assert.equal(priceAt('dated', '2019-01-01T00:00:00Z', PRICES).input, 1);
  assert.equal(priceAt('dated-20261001', '2026-10-02T00:00:00Z', PRICES).input, 2);
  assert.equal(priceAt('nope', '2026-10-02T00:00:00Z', PRICES), null);
  assert.equal(priceAt('dated', '2026-10-02T00:00:00Z', PRICES).from, undefined);
});

test('upstream rates correct the latest entry and leave history alone', () => {
  const prices = structuredClone(PRICES);

  setCurrentRates(prices, 'dated', { input: 9, cache_create: 9, cache_read: 9, output: 9 });
  setCurrentRates(prices, 'fresh', { input: 3, cache_create: 3, cache_read: 3, output: 3 });

  assert.equal(priceAt('dated', '2026-01-01T00:00:00Z', prices).input, 1);
  assert.equal(priceAt('dated', '2026-11-01T00:00:00Z', prices).input, 9);
  assert.equal(priceAt('fresh', '2026-11-01T00:00:00Z', prices).input, 3);
});

test('every bundled price entry is dated and oldest first', () => {
  const prices = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../skills/session-report/model-prices.json'), 'utf8'));

  for (const [model, entries] of Object.entries(prices)) {
    assert.ok(Array.isArray(entries) && entries.length, model);
    assert.deepEqual(entries.map(entry => entry.from), entries.map(entry => entry.from).sort(), model);
  }
});

test('readStore merges both forms of a month and keeps the largest output per call', () =>
  withTmp(async tmp => {
    const home = makeStore(tmp, {
      closed: [event('api_call', { id: 'a', model: 'm', output: 5 }), event('turn', { id: 't', prompt_chars: 2 })],
      open: [event('api_call', { id: 'a', model: 'm', output: 9 }), event('turn', { id: 't', prompt_chars: 2 })],
    });
    const events = await collect({ home });

    assert.equal(events.length, 2);
    assert.equal(events.find(item => item.id === 'a').output, 9);
  }));

test('readStore refuses an unknown version', () =>
  withTmp(async tmp => {
    const home = makeStore(tmp, { open: [event('turn', { id: 't', v: 2 })] });

    await assert.rejects(collect({ home }), StoreVersionError);
  }));

const reportFixture = () => [
  event('turn', { id: 'p1', prompt_chars: 5, prompt_source: 'typed' }),
  event('turn', { id: 'sys', prompt_chars: 5, prompt_source: 'system', ts: '2026-10-05T10:00:01.000Z' }),
  event('api_call', {
    id: 'c1',
    ts: '2026-10-05T10:01:00.000Z',
    model: 'claude-sonnet-5',
    input: 150000,
    output: 1000,
    cache_read: 10,
    cache_write: 20,
    skill: 'demo',
  }),
  event('tool_call', { id: 'tc1', ts: '2026-10-05T10:01:01.000Z', call: 'x', tool: 'Bash' }),
];

test('the store produces the report JSON, with source, coverage, and names resolved', () =>
  withTmp(tmp => {
    const home = makeStore(tmp, { open: reportFixture() });
    const report = analyze(CLAUDE, '--source', 'store', '--store', home);

    assert.equal(report.source, 'store');
    assert.equal(report.coverage.events, 4);
    assert.equal(report.overall.api_calls, 1);
    assert.equal(report.overall.human_messages, 1);
    assert.equal(report.overall.cache_breaks_over_100k, 1);
    assert.equal(report.overall.tool_calls.Bash, 1);
    assert.ok(report.overall.cost_usd.total > 0);
    assert.ok(report.by_skill.demo);
    assert.equal(report.by_day.length, 1);
    assert.equal(report.top_prompts.length, 1);
    // No transcript on disk: size only, and the project stays a hash.
    assert.match(report.top_prompts[0].text, /not retained · 5 chars/);
    assert.deepEqual(Object.keys(report.by_project), [hash(CWD)]);
  }));

test('transcripts supply the project name and prompt text when they still exist', () =>
  withTmp(tmp => {
    const home = makeStore(tmp, { open: reportFixture() });
    const root = path.join(tmp, 'projects');
    const dir = path.join(root, 'fixture');

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${SESSION}.jsonl`),
      JSON.stringify({ type: 'user', cwd: CWD, timestamp: '2026-10-05T10:00:00.000Z', message: { content: 'hello' } }) + '\n',
    );

    const report = analyze(CLAUDE, '--source', 'store', '--store', home, '--dir', root);

    assert.deepEqual(Object.keys(report.by_project), [CWD]);
    assert.equal(report.top_prompts[0].text, 'hello');
  }));

test('auto falls back to transcripts on an unknown version and says so', () =>
  withTmp(tmp => {
    const home = makeStore(tmp, { open: [event('turn', { id: 't', v: 2 })] });
    const empty = path.join(tmp, 'empty');

    fs.mkdirSync(empty);

    // No --dir, so auto really consults the store; HOME keeps the transcript walk empty.
    const report = JSON.parse(
      execFileSync(process.execPath, ['--import', OFFLINE, CLAUDE, '--json', '--store', home], {
        encoding: 'utf8',
        env: { ...process.env, HOME: empty },
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    );

    assert.equal(report.source, 'transcripts');
    assert.match(report.coverage.fallback, /unknown store version 2/);
  }));

test('--source store fails loudly rather than falling back', () =>
  withTmp(tmp => {
    const result = spawnSync(process.execPath, ['--import', OFFLINE, CLAUDE, '--json', '--source', 'store', '--store', path.join(tmp, 'none')], {
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no usage-trace store/);
  }));

test('an explicit --dir with auto never reads the store', () =>
  withTmp(tmp => {
    const home = makeStore(tmp, { open: reportFixture() });
    const root = path.join(tmp, 'projects');

    fs.mkdirSync(root);

    for (const script of [CLAUDE, CODEX]) {
      const report = analyze(script, '--dir', root, '--store', home);

      assert.equal(report.source, 'transcripts');
      assert.equal(report.overall.api_calls, 0);
    }
  }));

// ---------------------------------------------------------------------------
// Period comparison (plan Task 10). Windows end at --compare-end so no test depends on today's date.
// ---------------------------------------------------------------------------
const END = '2026-10-29T00:00:00.000Z';
const DAY = 24 * 60 * 60 * 1000;
const COMPARE = ['--compare', 'weekly', '--periods', '2', '--compare-end', END];

// Two weekly windows: [Oct 15, Oct 22) and [Oct 22, Oct 29]. One session spans both.
const periodFixture = (host = 'claude') => {
  const call = (id, ts, extra) => event('api_call', { id, ts, host, model: 'claude-sonnet-5', output: 10, ...extra });

  return [
    event('turn', { id: 'p1', host, ts: '2026-10-16T10:00:00.000Z', prompt_chars: 5, prompt_source: 'typed' }),
    call('c1', '2026-10-16T10:01:00.000Z', { input: 150000 }),
    event('turn', { id: 'p2', host, ts: '2026-10-23T10:00:00.000Z', prompt_chars: 5, prompt_source: 'typed' }),
    event('turn', { id: 'p3', host, ts: '2026-10-23T10:02:00.000Z', prompt_chars: 5, prompt_source: 'typed' }),
    call('c2', '2026-10-23T10:03:00.000Z', { input: 100 }),
    call('c3', '2026-10-24T10:00:00.000Z', { input: 200 }),
  ];
};

test('windows are [start, end) with the newest also taking its end', () => {
  const periods = buildPeriods({ spec: 'weekly', count: 2, now: Date.parse(END), newStats: () => ({}) });

  assert.equal(parseWindow('weekly'), 7 * DAY);
  assert.equal(parseWindow('36h'), 36 * 60 * 60 * 1000);
  assert.deepEqual(periods.map(period => period.end - period.start), [7 * DAY, 7 * DAY]);
  assert.equal(periods[0].end, periods[1].start);
  assert.equal(periodAt(periods, periods[0].start), periods[0].stats);
  assert.equal(periodAt(periods, periods[1].start), periods[1].stats);
  assert.equal(periodAt(periods, periods[1].end), periods[1].stats);
  assert.equal(periodAt(periods, periods[0].start - 1), null);
  assert.equal(periodAt(periods, periods[1].end + 1), null);
  assert.equal(periodAt(periods, 'not a date'), null);
});

test('a bad window or count is rejected', () => {
  for (const spec of ['monthly', '0d', '7', 'd7']) assert.throws(() => parseWindow(spec), /--compare expects/);

  assert.throws(() => buildPeriods({ spec: 'weekly', count: 0, now: 1, newStats: () => ({}) }), /--periods expects/);
  assert.throws(() => buildPeriods({ spec: 'weekly', count: 'x', now: 1, newStats: () => ({}) }), /--periods expects/);
});

test('--compare widens a narrower --since and keeps an older one', () => {
  const periods = buildPeriods({ spec: '7d', count: 2, now: Date.parse(END), newStats: () => ({}) });
  const first = new Date(periods[0].start);

  assert.equal(widenSince(null, null), null);
  assert.deepEqual(widenSince(null, periods), first);
  assert.deepEqual(widenSince(new Date(END), periods), first);
  assert.deepEqual(widenSince(new Date(first.getTime() - DAY), periods), new Date(first.getTime() - DAY));
});

test('a period is partial exactly when the data begins after its start', () => {
  const periods = buildPeriods({ spec: 'weekly', count: 2, now: Date.parse(END), newStats: () => ({}) });
  const summary = {
    input_tokens: { total: 3, cache_read: 1, cache_create: 1, pct_cached: 33.3 },
    output_tokens: 2,
    cost_usd: null,
    sessions: 1,
    human_messages: 1,
    api_calls: 1,
    by_model: {},
    hours: { active: 0.5 },
    cache_breaks_over_100k: 0,
  };
  const rows = earliest => summarizePeriods(periods, { summarize: () => summary, earliest });

  assert.deepEqual(rows(periods[0].start).map(row => row.partial), [false, false]);
  assert.deepEqual(rows(periods[0].start + 1).map(row => row.partial), [true, false]);
  assert.deepEqual(rows(periods[1].start + 1).map(row => row.partial), [true, true]);
  assert.deepEqual(rows(null).map(row => row.partial), [true, true]);
  assert.equal(rows(0)[0].tokens, 5);
  assert.equal(rows(0)[0].cost, null);
  assert.match(formatPeriods(rows(periods[0].start + 1)).join('\n'), /\(partial\)[\s\S]*do not sum/);
});

for (const [name, script, host] of [
  ['claude', CLAUDE, 'claude'],
  ['codex', CODEX, 'codex'],
]) {
  test(`the store buckets ${name} calls by period, and a session spanning both counts once in each`, () =>
    withTmp(tmp => {
      const home = makeStore(tmp, { open: periodFixture(host) });
      const report = analyze(script, '--source', 'store', '--store', home, ...COMPARE);
      const [older, newer] = report.periods;

      assert.equal(report.periods.length, 2);
      assert.equal(older.start, '2026-10-15T00:00:00.000Z');
      assert.equal(newer.end, END);
      assert.deepEqual([older.api_calls, newer.api_calls], [1, 2]);
      assert.deepEqual([older.human_messages, newer.human_messages], [1, 2]);
      assert.deepEqual([older.tokens, newer.tokens], [150010, 320]);
      assert.deepEqual([older.cache_breaks, newer.cache_breaks], [1, 0]);
      assert.deepEqual([older.sessions, newer.sessions], [1, 1]);
      assert.equal(report.overall.sessions, 1);
      assert.ok(older.cost > 0 && newer.cost > 0);
      assert.deepEqual(Object.keys(newer.by_model), ['claude-sonnet-5']);
      // Capture began Oct 16, after the older window opened on Oct 15.
      assert.deepEqual([older.partial, newer.partial], [true, false]);
      assert.equal(report.coverage.earliest, '2026-10-16T10:00:00.000Z');
      assert.equal(report.overall.api_calls, older.api_calls + newer.api_calls);
    }));
}

test('the store reports the true earliest event even when --since cuts the window shorter', () =>
  withTmp(tmp => {
    const home = makeStore(tmp, { open: periodFixture() });
    const report = analyze(CLAUDE, '--source', 'store', '--store', home, '--since', '2026-10-23T00:00:00.000Z');

    assert.equal(report.coverage.earliest, '2026-10-16T10:00:00.000Z');
    assert.equal(report.coverage.from > report.coverage.earliest, true);
  }));

test('transcripts bucket by period and read the data start from before the window', () =>
  withTmp(tmp => {
    const root = path.join(tmp, 'projects');
    const dir = path.join(root, 'fixture');
    const assistant = (id, timestamp) =>
      JSON.stringify({
        type: 'assistant',
        timestamp,
        requestId: id,
        message: { id: `msg_0${id}${id}${id}${id}${id}${id}`, model: 'claude-sonnet-5', usage: { input_tokens: 100, output_tokens: 10 } },
      });
    const human = (uuid, timestamp) => JSON.stringify({ type: 'user', uuid, cwd: CWD, timestamp, message: { content: 'hello' } });

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${SESSION}.jsonl`),
      [
        human('u1', '2026-10-16T10:00:00.000Z'),
        assistant('r1', '2026-10-16T10:00:30.000Z'),
        human('u2', '2026-10-23T10:00:00.000Z'),
        assistant('r2', '2026-10-23T10:00:30.000Z'),
        assistant('r3', '2026-10-24T10:00:30.000Z'),
      ].join('\n') + '\n',
    );

    const report = analyze(CLAUDE, '--source', 'transcripts', '--dir', root, ...COMPARE);
    const [older, newer] = report.periods;

    assert.equal(report.source, 'transcripts');
    assert.deepEqual([older.api_calls, newer.api_calls], [1, 2]);
    assert.deepEqual([older.human_messages, newer.human_messages], [1, 1]);
    assert.deepEqual([older.tokens, newer.tokens], [110, 220]);
    assert.deepEqual([older.sessions, newer.sessions], [1, 1]);
    assert.equal(report.overall.sessions, 1);
    assert.deepEqual([older.partial, newer.partial], [true, false]);
  }));

test('a run without --compare carries no periods, and a bad flag exits 2 with a message', () =>
  withTmp(tmp => {
    const home = makeStore(tmp, { open: periodFixture() });

    assert.equal('periods' in analyze(CLAUDE, '--source', 'store', '--store', home), false);

    for (const [args, message] of [
      [['--compare'], /--compare needs a value/],
      [['--compare', 'monthly'], /--compare expects/],
      [['--compare', 'weekly', '--periods', '0'], /--periods expects/],
      [['--compare', 'weekly', '--compare-end', 'soon'], /--compare-end expects/],
    ]) {
      for (const script of [CLAUDE, CODEX]) {
        const result = spawnSync(process.execPath, ['--import', OFFLINE, script, '--json', '--store', home, ...args], { encoding: 'utf8' });

        assert.equal(result.status, 2, `${path.basename(script)} ${args.join(' ')}`);
        assert.match(result.stderr, message);
      }
    }
  }));

test('the text report prints the comparison table', () =>
  withTmp(tmp => {
    const home = makeStore(tmp, { open: periodFixture() });
    const text = execFileSync(process.execPath, ['--import', OFFLINE, CLAUDE, '--source', 'store', '--store', home, ...COMPARE], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    assert.match(text, /PERIOD COMPARISON \(weekly, oldest first\)/);
    assert.match(text, /2026-10-15 \(partial\)/);
    assert.match(text, /do not sum/);
  }));

test('the template carries the comparison section and keeps the hidden histogram container', () => {
  const template = fs.readFileSync(path.resolve(__dirname, '../skills/session-report/template.html'), 'utf8');

  assert.match(template, /<section id="periods-section"/);
  assert.match(template, /id="tbl-periods"/);
  assert.match(template, /\$\("periods-section"\)\.remove\(\)/);
  assert.match(template, /<div id="prompt-histogram" hidden><\/div>/);
});

test('the codex analyzer reads only codex events', () =>
  withTmp(tmp => {
    const home = makeStore(tmp, {
      open: [...reportFixture(), event('api_call', { id: 'cx', host: 'codex', model: 'gpt-5.5', input: 10, output: 1 })],
    });
    const report = analyze(CODEX, '--source', 'store', '--store', home);

    assert.equal(report.source, 'store');
    assert.equal(report.overall.api_calls, 1);
  }));
