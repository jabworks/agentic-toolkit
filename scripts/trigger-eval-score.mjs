// Pure scoring predicates for the trigger-routing eval (health campaign, A3).
//
// Extracted from eval-triggers.mjs so the scoring can be tested without
// spawning a judge. That script runs top-to-bottom and shells out to `claude`,
// so importing it to reach a predicate would cost a real eval run — which is
// why the violation metric would otherwise have shipped with shape-only
// coverage. A metric that silently counts zero looks exactly like a clean
// corpus (docket #43's mdLite bug, same shape: a real-content render is not a
// test).
//
// Nothing here reads the filesystem or the network. eval-triggers.mjs owns the
// corpus, the judge and the report; this owns what counts as a hit and what
// counts as a violation.

// A case is scored against `expected` plus its per-case `accept` alternates
// (doctrine-correct siblings, e.g. `workflow` for an implementation request).
export const isHit = (r) => (r.got ?? null) === (r.expected ?? null)
  || (r.got != null && (r.accept || []).includes(r.got));

// docket #53: `disallowed` states a collision directly — "this skill must NOT
// win here" — instead of inferring it from an accuracy dip. It is scored as a
// SEPARATE REPORTED METRIC and deliberately has no path into isHit: A3's
// operating band is the number the campaign is judged on, and a change that
// moved it while adding an assertion would make every prior run
// incomparable.
//
// The sentinels `(batch-error)` and `(missing)` are never real skill names, so
// they can never match a disallowed entry. Callers still filter batch errors
// out before scoring, exactly as they do for accuracy.
export const isViolation = (r) => r.got != null && (r.disallowed || []).includes(r.got);

// Per-case violations aggregated across EVERY trial, not just the last run.
// A collision that fires in 1 of 3 trials is the signal this metric exists to
// catch; reading only the final run would hide two-thirds of them.
//
// `hitCounts` and `answers` are the maps eval-triggers.mjs already builds for
// the flaky-case table — same inputs, different question.
export function violationRows(hitCounts, answers, caseKey) {
  const rows = [];
  for (const { case: c } of hitCounts.values()) {
    const disallowed = c.disallowed || [];
    if (!disallowed.length) continue;
    const got = answers.get(caseKey(c)) || [];
    const offending = got.filter((g) => isViolation({ ...c, got: g }));
    if (!offending.length) continue;
    rows.push({
      case: c,
      named: [...new Set(offending)],
      hits: offending.length,
      seen: got.length,
    });
  }
  return rows;
}

// The headline's denominator must count the same population the numerator was
// drawn from: cases that were actually SCORED. Deriving it from the corpus
// instead counts cases whose every trial batch-errored, so a limit-aborted run
// reads "1/17" when only one case was ever judged — understating the rate
// against a denominator that quietly includes unscored cases. The accuracy line
// directly above already uses a batch-error-free denominator; these two numbers
// sit adjacent in the report and must not count different things.
//
// Not hypothetical: A3's own record has a run where 29/96 batches failed on
// session limits.
export function scoredWithDisallowed(hitCounts) {
  return [...hitCounts.values()].filter(({ case: c }) => (c.disallowed || []).length).length;
}

const esc = (s) => String(s).replace(/\|/g, '\\|');

// The headline stays OFF the accuracy line and says so in its own text — the
// separation is the point of the metric, and a reader comparing bands months
// from now should not have to re-derive it from the source.
export function violationHeadline(rows, casesWithDisallowed) {
  if (!casesWithDisallowed) return null;
  const occurrences = rows.reduce((s, r) => s + r.hits, 0);
  return `Disallowed violations: **${rows.length}/${casesWithDisallowed}** cases carrying \`disallowed\``
    + ` (${occurrences} occurrence${occurrences === 1 ? '' : 's'} across all trials).`
    + ' Reported separately — not included in the accuracy above.';
}

export function violationSection(rows) {
  if (!rows.length) return [];
  const lines = [];
  lines.push(`## Disallowed violations (${rows.length})`);
  lines.push('');
  lines.push('A case named a skill it declares must never win here. This is scored');
  lines.push('separately from routing accuracy: a case can pass its routing check and');
  lines.push('still appear below.');
  lines.push('');
  lines.push('| query | expected | named | disallowed | trials | corpus file |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of rows) {
    lines.push(
      `| ${esc(r.case.query)} | ${r.case.expected ?? 'null'} | ${r.named.join(', ')}`
      + ` | ${(r.case.disallowed || []).join(', ')} | ${r.hits}/${r.seen} | ${r.case.source} |`,
    );
  }
  lines.push('');
  return lines;
}
