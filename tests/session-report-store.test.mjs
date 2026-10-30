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

test('the codex analyzer reads only codex events', () =>
  withTmp(tmp => {
    const home = makeStore(tmp, {
      open: [...reportFixture(), event('api_call', { id: 'cx', host: 'codex', model: 'gpt-5.5', input: 10, output: 1 })],
    });
    const report = analyze(CODEX, '--source', 'store', '--store', home);

    assert.equal(report.source, 'store');
    assert.equal(report.overall.api_calls, 1);
  }));
