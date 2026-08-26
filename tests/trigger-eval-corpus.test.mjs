import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
  // evaluated — the exact silence this metric is vulnerable to.
  const bad = [];
  for (const c of allCases()) {
    if ((c.disallowed || []).length && c.kind === 'in-context') {
      bad.push(`${c._at}: disallowed on a kind:"in-context" case, which default runs never score`);
    }
  }
  assert.deepEqual(bad, [], 'disallowed on unscored cases');
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
  // eval-triggers.mjs dedups the corpus on `query + "||" + expected`. A
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
    const key = c.query + '||' + expected;
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
