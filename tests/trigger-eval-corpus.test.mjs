import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');

// Docket #53. Until this file the 643-case trigger corpus had NO validation at
// all — `grep -rln trigger_eval tests/` returned nothing, and the only reader
// was eval-triggers.mjs, which shells out to a judge and takes ~10 minutes.
//
// That is survivable for `expected_skill`, where a typo shows up as a case that
// can never hit. It is not survivable for `disallowed`, whose whole failure
// mode is silence: a misspelled skill name there matches no routing answer
// ever, so the metric reports zero violations and reads as a clean corpus.
// The corpus is the fixture; these are its invariants.

function corpusFiles() {
  const out = [];
  for (const name of fs.readdirSync(SKILLS_DIR).sort()) {
    const file = path.join(SKILLS_DIR, name, 'evals', 'trigger_eval.json');
    if (fs.existsSync(file)) out.push({ skill: name, file, rel: path.relative(REPO_ROOT, file) });
  }
  return out;
}

// Every name the corpus is allowed to reference. Mirrors eval-triggers.mjs's
// catalog: a skill exists iff skills/<name>/SKILL.md does.
function knownSkills() {
  const names = new Set();
  for (const name of fs.readdirSync(SKILLS_DIR)) {
    if (fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md'))) names.add(name);
  }
  return names;
}

function allCases() {
  const out = [];
  for (const { skill, file, rel } of corpusFiles()) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    parsed.forEach((c, i) => out.push({ ...c, _skill: skill, _rel: rel, _at: `${rel}[${i}]` }));
  }
  return out;
}

test('the corpus is non-empty and every file is an array of objects', () => {
  const files = corpusFiles();
  assert.ok(files.length > 0, 'no trigger_eval.json found under skills/');
  for (const { file, rel } of files) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(Array.isArray(parsed), `${rel} is not a JSON array`);
    assert.ok(parsed.length > 0, `${rel} is empty`);
    for (const [i, c] of parsed.entries()) {
      assert.equal(typeof c, 'object', `${rel}[${i}] is not an object`);
      assert.ok(c !== null, `${rel}[${i}] is null`);
    }
  }
});

test('every case has a non-empty query and a boolean should_trigger', () => {
  const bad = [];
  for (const c of allCases()) {
    if (typeof c.query !== 'string' || !c.query.trim()) bad.push(`${c._at}: query`);
    if (typeof c.should_trigger !== 'boolean') bad.push(`${c._at}: should_trigger`);
  }
  assert.deepEqual(bad, [], 'malformed cases');
});

test('expected_skill is present exactly when should_trigger is true', () => {
  // eval-triggers.mjs computes `expected = c.should_trigger ? c.expected_skill : null`,
  // so a should_trigger:false case carrying an expected_skill silently means
  // null — the file would claim one thing and the harness score another.
  const bad = [];
  for (const c of allCases()) {
    if (c.should_trigger && !c.expected_skill) bad.push(`${c._at}: should_trigger with no expected_skill`);
    if (!c.should_trigger && c.expected_skill != null) {
      bad.push(`${c._at}: should_trigger:false but expected_skill=${c.expected_skill}`);
    }
  }
  assert.deepEqual(bad, [], 'expected_skill / should_trigger disagree');
});

test('every skill named by the corpus resolves to a real skill', () => {
  // A typo here is invisible in a run: expected_skill can never hit, an accept
  // alternate never fires, and a disallowed entry never matches.
  const known = knownSkills();
  const bad = [];
  for (const c of allCases()) {
    const named = [
      ...(c.should_trigger && c.expected_skill ? [['expected_skill', c.expected_skill]] : []),
      ...(c.accept || []).map((s) => ['accept', s]),
      ...(c.disallowed || []).map((s) => ['disallowed', s]),
    ];
    for (const [field, s] of named) {
      if (!known.has(s)) bad.push(`${c._at}: ${field} names "${s}", which has no skills/${s}/SKILL.md`);
    }
  }
  assert.deepEqual(bad, [], 'corpus references skills that do not exist');
});

test('accept and disallowed are arrays of strings when present', () => {
  const bad = [];
  for (const c of allCases()) {
    for (const field of ['accept', 'disallowed']) {
      if (c[field] === undefined) continue;
      if (!Array.isArray(c[field])) { bad.push(`${c._at}: ${field} is not an array`); continue; }
      for (const s of c[field]) if (typeof s !== 'string' || !s.trim()) bad.push(`${c._at}: ${field} has a non-string entry`);
      if (new Set(c[field]).size !== c[field].length) bad.push(`${c._at}: ${field} has duplicates`);
    }
  }
  assert.deepEqual(bad, [], 'malformed accept/disallowed');
});

test('no case disallows its own expected_skill or one of its accept alternates', () => {
  // Self-contradiction: the case asserts a skill both must and must not win.
  // isViolation would flag it on every hit, so the metric would report a
  // permanent violation that no routing change can clear.
  const bad = [];
  for (const c of allCases()) {
    const dis = c.disallowed || [];
    if (!dis.length) continue;
    if (c.should_trigger && dis.includes(c.expected_skill)) {
      bad.push(`${c._at}: disallows its own expected_skill "${c.expected_skill}"`);
    }
    for (const a of c.accept || []) {
      if (dis.includes(a)) bad.push(`${c._at}: disallows "${a}", which it also accepts`);
    }
  }
  assert.deepEqual(bad, [], 'self-contradicting cases');
});

test('a disallowed assertion is never parked on an unscored case', () => {
  // kind:"in-context" cases are filtered out of the corpus unless --all
  // (eval-triggers.mjs), so a disallowed entry on one is silently never
  // evaluated — the exact silence this metric is vulnerable to. A `context`
  // case leaves the routing population unconditionally (docket #64), so it is
  // the same silence with no --all escape hatch at all.
  const bad = [];
  for (const c of allCases()) {
    if (!(c.disallowed || []).length) continue;
    if (c.kind === 'in-context') {
      bad.push(`${c._at}: disallowed on a kind:"in-context" case, which default runs never score`);
    }
    if (c.context) {
      bad.push(`${c._at}: disallowed on a context case, which the routing pass never scores`);
    }
  }
  assert.deepEqual(bad, [], 'disallowed on unscored cases');
});

test('context is a non-empty string when present, and never combined with kind:"in-context"', () => {
  // Two different phenomena that both involve "context", which is exactly why
  // they must not be conflated: kind:"in-context" is a follow-up asked while a
  // skill is already loaded; `context` is text injected BEFORE the message
  // arrives (quirks Q4). Overloading one onto the other would silently change
  // what --all scores.
  const bad = [];
  for (const c of allCases()) {
    if (c.context === undefined) continue;
    if (typeof c.context !== 'string' || !c.context.trim()) bad.push(`${c._at}: context is not a non-empty string`);
    if (c.kind === 'in-context') bad.push(`${c._at}: carries both context and kind:"in-context"`);
  }
  assert.deepEqual(bad, [], 'malformed context');
});

test('the context field is actually in use', () => {
  // Same guard as `disallowed` below: the injected-context metric reports
  // nothing when no case declares a preamble, which is indistinguishable from
  // a harness that never runs the pass at all.
  const withContext = allCases().filter((c) => c.context);
  assert.ok(
    withContext.length > 0,
    'no case declares `context` — the injected-context pass is wired up but measures nothing',
  );
});

test('kind is either omitted, "cold", or "in-context"', () => {
  const bad = [];
  for (const c of allCases()) {
    if (c.kind !== undefined && c.kind !== 'cold' && c.kind !== 'in-context') {
      bad.push(`${c._at}: kind="${c.kind}"`);
    }
  }
  assert.deepEqual(bad, [], 'unknown kind values');
});

test('cases sharing a dedup key agree on accept', () => {
  // eval-triggers.mjs dedups the corpus on `query + "||" + expected + "||" + context`. A
  // duplicate's `disallowed` is merged into the kept case; its `accept` is
  // dropped — deliberately, because accept feeds isHit and a silent merge
  // could widen the kept case's accept set and move A3's operating band
  // (docket #55). The drop is only harmless while it is a no-op, and which
  // copy is "kept" is readdirSync order — an accident, not a contract. So
  // force the corpus to agree with itself: the same query asserting two
  // different accept sets in two files is a corpus bug either way.
  const byKey = new Map();
  for (const c of allCases()) {
    const expected = c.should_trigger ? c.expected_skill : null;
    // Mirrors the harness key exactly, context included — otherwise a context
    // twin and its cold original group together here and this test starts
    // policing an agreement the harness never asks for.
    const key = c.query + '||' + expected + '||' + (c.context || '');
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(c);
  }
  const bad = [];
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    const sets = new Set(group.map((c) => JSON.stringify([...(c.accept || [])].sort())));
    if (sets.size > 1) {
      bad.push(group.map((c) => `${c._at} accept=${JSON.stringify(c.accept || [])}`).join(' vs '));
    }
  }
  assert.deepEqual(bad, [], 'duplicate cases with divergent accept — the dropped copy silently loses its assertion');
});

test('the disallowed field is actually in use', () => {
  // Docket #53 shipped the primitive AND seeded the adjacency pairs it named.
  // If every seed were later deleted, the metric would report nothing forever
  // while still looking wired up — this fails instead.
  const withDisallowed = allCases().filter((c) => (c.disallowed || []).length);
  assert.ok(
    withDisallowed.length > 0,
    'no case declares `disallowed` — the metric is wired up but measures nothing',
  );
});

// --- the frozen replay corpus (--corpus, docket #58) ------------------------
//
// `--corpus <file>` re-scores a *frozen* case list against today's catalog, so
// a lift can be attributed to contract work rather than corpus composition.
// The replay input is a prior run's JSON report, and its value is entirely in
// staying byte-comparable to the score it produced. These tests guard the one
// artifact #58 replays; without them it can rot silently and the comparison
// becomes meaningless without anything failing.

const REPLAY = path.join(
  REPO_ROOT,
  'skills/toolkit-research-frontier/references/eval-trials-2026-07-11.json',
);

test('the 2026-07-11 replay corpus is intact — 394 cold cases, uniform shape', () => {
  const rows = JSON.parse(fs.readFileSync(REPLAY, 'utf8'));
  assert.equal(rows.length, 394, 'the baseline is 88.4% over exactly 394 cases');
  for (const [i, r] of rows.entries()) {
    assert.equal(typeof r.query, 'string', `row ${i} has no query`);
    assert.ok(r.query.length > 0, `row ${i} has an empty query`);
    assert.equal(r.kind, 'cold', `row ${i} is not cold — the baseline scored cold cases only`);
    assert.ok('expected' in r, `row ${i} has no expected key (null is the should-not-trigger value)`);
    assert.ok(Array.isArray(r.accept || []), `row ${i} has a non-array accept`);
  }
});

test('every skill the replay corpus names still exists', () => {
  // A rename since 2026-07-11 would make those cases unroutable today and the
  // replay would score a loss that is really a bookkeeping artifact. Nothing
  // has been renamed so far; this fails the day one is, before compute is spent.
  const known = knownSkills();
  const rows = JSON.parse(fs.readFileSync(REPLAY, 'utf8'));
  const missing = new Set();
  for (const r of rows) {
    for (const name of [r.expected, ...(r.accept || [])]) {
      if (name && !known.has(name)) missing.add(name);
    }
  }
  assert.deepEqual(
    [...missing].sort(),
    [],
    'replay corpus names a skill that no longer exists — map the rename before re-running',
  );
});

test('the replay corpus survives the harness dedup without shrinking', () => {
  // eval-triggers.mjs drops a repeat query+expected+context. That is correct
  // for the live sweep (one case can sit in two skills' files) and is
  // corruption for a replay — a shrunken subset would be scored against a
  // baseline computed on the full one. The harness exits 1 rather than allow
  // it; this catches the same thing without spending a run.
  const rows = JSON.parse(fs.readFileSync(REPLAY, 'utf8'));
  const keys = new Set(rows.map((r) => r.query + '||' + (r.expected ?? null) + '||' + (r.context || '')));
  assert.equal(keys.size, rows.length, 'replay rows collide under the harness dedup key');
});

test('--corpus refuses a case list that shrinks under dedup', () => {
  // The guard runs at module load, before the first `claude` spawn, so this
  // costs a process start and no API calls. Without the assertion the harness
  // would happily score 393 of 394 cases and report a comparable-looking mean.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-dedup-'));
  const file = path.join(dir, 'cases.json');
  const row = { query: 'wrap up this session', expected: 'session-handoff', accept: [], kind: 'cold' };
  fs.writeFileSync(file, JSON.stringify([row, { ...row }]));
  const res = spawnSync(
    process.execPath,
    [path.join(REPO_ROOT, 'scripts/eval-triggers.mjs'), '--corpus', file],
    { encoding: 'utf8' },
  );
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(res.status, 1, 'a shrinking replay corpus must fail, not run');
  assert.match(res.stderr, /collapsed to 1 after dedup/);
});
