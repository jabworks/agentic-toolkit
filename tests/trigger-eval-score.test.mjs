import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isHit,
  isViolation,
  violationRows,
  violationHeadline,
  violationSection,
  scoredWithDisallowed,
} from '../scripts/trigger-eval-score.mjs';

// Docket #53. The predicates live in their own module precisely so they can be
// exercised here: eval-triggers.mjs spawns a judge, so reaching a predicate
// through it would cost a real ~10-minute run, and the metric would have
// shipped with shape-only coverage. A violation counter that silently returns
// zero is indistinguishable from a clean corpus.

const caseKey = (r) => r.query + '||' + (r.expected ?? '');

function fixture(over = {}) {
  return {
    query: 'resume where we left off last session',
    expected: 'session-handoff',
    accept: [],
    disallowed: ['discovery'],
    kind: 'cold',
    source: 'session-handoff',
    ...over,
  };
}

test('a disallowed skill winning is a violation', () => {
  assert.equal(isViolation({ ...fixture(), got: 'discovery' }), true);
});

test('the expected skill winning is never a violation', () => {
  assert.equal(isViolation({ ...fixture(), got: 'session-handoff' }), false);
});

test('an accept alternate is not a violation unless it is also disallowed', () => {
  const c = fixture({ accept: ['workflow'] });
  assert.equal(isViolation({ ...c, got: 'workflow' }), false);
  // A case that both accepts and disallows the same skill is self-contradicting;
  // the corpus test forbids it, and the predicate here would call it a
  // violation. Asserted so the precedence is recorded rather than incidental.
  assert.equal(isViolation({ ...c, disallowed: ['workflow'], got: 'workflow' }), true);
});

test('a harness sentinel never matches a real disallowed list', () => {
  // `(batch-error)` and `(missing)` are not skill names. If either matched, a
  // limit-class outage would read as a wave of collisions. The predicate has no
  // special-casing for them and needs none — no real corpus entry can name one,
  // because trigger-eval-corpus.test.mjs requires every disallowed name to
  // resolve to a skills/<name>/SKILL.md.
  assert.equal(isViolation({ ...fixture(), got: '(batch-error)' }), false);
  assert.equal(isViolation({ ...fixture(), got: '(missing)' }), false);
  // Stated rather than special-cased: a list that literally names a sentinel
  // would match, which is why the corpus guard is the thing that prevents it.
  const contrived = fixture({ disallowed: ['discovery', '(batch-error)'] });
  assert.equal(isViolation({ ...contrived, got: '(batch-error)' }), true);
});

test('the headline denominator counts scored cases, not corpus cases', () => {
  // Review finding: deriving the denominator from `corpus` counted cases whose
  // every trial batch-errored. eval-triggers.mjs skips batch errors when
  // building hitCounts, so those cases are absent here — which is exactly the
  // population the numerator comes from. A limit-aborted run read "1/3" when
  // one case was judged.
  const mk = (q) => ({ ...fixture({ query: q }) });
  const [a, b, c] = [mk('a'), mk('b'), mk('c')];
  const answers = new Map([[caseKey(a), ['discovery']]]);
  const hitCounts = new Map([[caseKey(a), { case: a, hit: 0, seen: 1 }]]);

  assert.equal(scoredWithDisallowed(hitCounts), 1, 'b and c never reached hitCounts');
  const rows = violationRows(hitCounts, answers, caseKey);
  assert.match(violationHeadline(rows, scoredWithDisallowed(hitCounts)), /\*\*1\/1\*\*/);
  // The corpus still holds all three — the old, wrong denominator.
  assert.equal([a, b, c].filter((x) => x.disallowed.length).length, 3);
});

test('cases without disallowed are not counted in the denominator', () => {
  const withD = fixture({ query: 'a' });
  const withoutD = fixture({ query: 'b', disallowed: [] });
  const hitCounts = new Map([
    [caseKey(withD), { case: withD, hit: 1, seen: 1 }],
    [caseKey(withoutD), { case: withoutD, hit: 1, seen: 1 }],
  ]);
  assert.equal(scoredWithDisallowed(hitCounts), 1);
  assert.equal(scoredWithDisallowed(new Map()), 0);
});

test('a null routing decision is never a violation', () => {
  // Routing to null is "no skill fires", which is what a disallowed entry wants.
  assert.equal(isViolation({ ...fixture(), got: null }), false);
  assert.equal(isViolation({ ...fixture(), got: undefined }), false);
});

test('a case with no disallowed list can never violate', () => {
  assert.equal(isViolation({ ...fixture({ disallowed: [] }), got: 'discovery' }), false);
  assert.equal(isViolation({ query: 'x', expected: null, got: 'discovery' }), false);
});

test('violations are counted across every trial, not just the last run', () => {
  // The whole reason the rows read `answers` rather than the final results
  // array: a collision that fires in 1 of 3 trials is exactly the signal.
  const c = fixture();
  const answers = new Map([[caseKey(c), ['session-handoff', 'discovery', 'session-handoff']]]);
  const hitCounts = new Map([[caseKey(c), { case: c, hit: 2, seen: 3 }]]);
  const rows = violationRows(hitCounts, answers, caseKey);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].named, ['discovery']);
  assert.equal(rows[0].hits, 1);
  assert.equal(rows[0].seen, 3);
});

test('a case that passes routing can still be reported as a violation', () => {
  // The point of the separate metric — `accept` makes this a HIT and it still
  // appears below. Inferring the collision from an accuracy dip would miss it.
  const c = fixture({ accept: ['discovery'], disallowed: ['discovery'] });
  assert.equal(isHit({ ...c, got: 'discovery' }), true);
  const answers = new Map([[caseKey(c), ['discovery']]]);
  const hitCounts = new Map([[caseKey(c), { case: c, hit: 1, seen: 1 }]]);
  assert.equal(violationRows(hitCounts, answers, caseKey).length, 1);
});

test('a clean corpus produces no rows and no section', () => {
  const c = fixture();
  const answers = new Map([[caseKey(c), ['session-handoff', 'session-handoff']]]);
  const hitCounts = new Map([[caseKey(c), { case: c, hit: 2, seen: 2 }]]);
  const rows = violationRows(hitCounts, answers, caseKey);
  assert.deepEqual(rows, []);
  assert.deepEqual(violationSection(rows), []);
});

test('the headline states the separation and is omitted when nothing declares disallowed', () => {
  const rows = [{ case: fixture(), named: ['discovery'], hits: 2, seen: 3 }];
  const line = violationHeadline(rows, 5);
  assert.match(line, /\*\*1\/5\*\*/, 'violating cases over cases carrying disallowed');
  assert.match(line, /2 occurrences/);
  assert.match(line, /not included in the accuracy/i, 'the separation is stated in the artifact itself');
  // A corpus with no disallowed entries must not grow a line claiming zero
  // violations — that would read as evidence of a clean corpus rather than of
  // an unused field.
  assert.equal(violationHeadline([], 0), null);
});

test('one occurrence is not pluralised', () => {
  const line = violationHeadline([{ case: fixture(), named: ['discovery'], hits: 1, seen: 3 }], 1);
  assert.match(line, /1 occurrence across/);
});

test('the section escapes pipes so a query cannot break the table', () => {
  const c = fixture({ query: 'run a | b and check' });
  const rows = [{ case: c, named: ['discovery'], hits: 1, seen: 1 }];
  const body = violationSection(rows).join('\n');
  assert.match(body, /run a \\\| b and check/);
  assert.match(body, /^## Disallowed violations \(1\)$/m);
  assert.match(body, /\| session-handoff \| discovery \| discovery \| 1\/1 \| session-handoff \|/);
});

test('a null-expected case renders as null rather than blank', () => {
  const c = fixture({ expected: null, disallowed: ['discovery'] });
  const rows = [{ case: c, named: ['discovery'], hits: 1, seen: 1 }];
  assert.match(violationSection(rows).join('\n'), /\| null \| discovery \|/);
});

test('isHit is unchanged by any of this', () => {
  // The band A3 is judged on must stay a like-for-like series. These are the
  // exact semantics that produced 91.7% — asserted so a future edit to the
  // scoring module cannot move them silently.
  assert.equal(isHit({ expected: 'discovery', got: 'discovery' }), true);
  assert.equal(isHit({ expected: null, got: null }), true);
  assert.equal(isHit({ expected: 'discovery', got: 'workflow', accept: ['workflow'] }), true);
  assert.equal(isHit({ expected: 'discovery', got: 'workflow' }), false);
  assert.equal(isHit({ expected: null, got: null, accept: [] }), true);
  // A disallowed entry must not reach isHit by any route.
  assert.equal(isHit({ expected: 'session-handoff', got: 'session-handoff', disallowed: ['session-handoff'] }), true);
});
