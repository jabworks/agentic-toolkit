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

// docket #64: a case carrying `context` is replayed with that text injected
// before the message — the condition a cold `(query, expected)` pair cannot
// reproduce (specs/trigger-reliability/quirks.md Q4). Scored as its own metric
// for the same reason `disallowed` is: A3's operating band is a like-for-like
// series, and a case deliberately staged to be suppressed would drag it down
// while measuring something else entirely.
//
// "Fired" is plain isHit under the preamble. A case that does not fire is the
// suppression signature — eval-pass cold, eval-fail under context.
export function contextRows(hitCounts, answers, caseKey) {
  const rows = [];
  for (const { case: c, hit, seen } of hitCounts.values()) {
    const got = answers.get(caseKey(c)) || [];
    rows.push({
      case: c,
      fired: hit,
      seen,
      // Where it went instead, across every trial — the same question the
      // flaky table answers for cold cases. A suppressed case usually routes
      // to null, and knowing that is the difference between "the nudge is
      // needed" and "a sibling skill is winning".
      missed: [...new Set(got.filter((g) => !isHit({ ...c, got: g })).map((g) => g ?? 'null'))],
    });
  }
  return rows;
}

// Occurrence-level, not case-level: with --runs 3 a case that fires once in
// three is the interesting result, and a case-level count would round it to
// either "fired" or "suppressed" and lose exactly that.
export function contextHeadline(rows) {
  if (!rows.length) return null;
  const fired = rows.reduce((s, r) => s + r.fired, 0);
  const seen = rows.reduce((s, r) => s + r.seen, 0);
  return `Injected-context fires: **${fired}/${seen}** across ${rows.length} case${rows.length === 1 ? '' : 's'}`
    + ' replayed under a context preamble.'
    + ' Reported separately — not included in the accuracy above.';
}

export function contextSection(rows) {
  if (!rows.length) return [];
  // Distinct preambles get short labels and are printed in full below the
  // table. A digest is many lines; inlining one into a markdown cell would
  // wreck the table, and referring to a preamble the report doesn't contain
  // would make the result unreadable six months from now.
  const labels = new Map();
  for (const r of rows) if (!labels.has(r.case.context)) labels.set(r.case.context, `ctx-${labels.size + 1}`);

  const lines = [];
  lines.push(`## Injected-context cases (${rows.length})`);
  lines.push('');
  lines.push('Each case is replayed with a preamble injected ahead of the message — the');
  lines.push('condition a cold `(query, expected)` pair cannot reproduce (quirks Q4). A');
  lines.push('case that fires routed correctly despite the injected context; one that');
  lines.push('does not is the suppression signature. Scored separately from routing');
  lines.push('accuracy — these cases never enter the band.');
  lines.push('');
  lines.push('| query | expected | context | fired | routed to instead | corpus file |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of rows) {
    lines.push(
      `| ${esc(r.case.query)} | ${r.case.expected ?? 'null'} | ${labels.get(r.case.context)}`
      + ` | ${r.fired}/${r.seen} | ${r.missed.join(', ') || '—'} | ${r.case.source} |`,
    );
  }
  lines.push('');
  for (const [text, label] of labels) {
    lines.push(`**${label}**`);
    lines.push('');
    lines.push('```');
    lines.push(text);
    lines.push('```');
    lines.push('');
  }
  return lines;
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

// Per-skill accuracy, aggregated across every run.
//
// This lived in eval-triggers.mjs and was built from the final run alone, so
// each row was one trial sitting under a three-trial headline with nothing
// saying so. It manufactures regressions: docket #71 was filed on
// toolkit-research-frontier "losing a quarter of its cases" (12/16 -> 8/16)
// between two reports, when the August trials were 13 / 11 / 8 — one of them
// above the July figure — and the table printed the worst. Comparing two
// reports per-skill was comparing two single trials.
//
// It lives here now because that is the difference between a bug caught by a
// test and a bug caught by reading a committed claim two days later.
//
// `runsData` is one entry per trial: { results: [...] }. Batch errors are
// excluded, and because a run that errored can be short, `cases` is the widest
// trial rather than an average.
export function bySkillRows(runsData) {
  const bySkill = {};
  runsData.forEach(({ results }, runIdx) => {
    for (const r of results) {
      if (r.got === '(batch-error)') continue;
      const key = r.expected ?? '(null)';
      const e = (bySkill[key] = bySkill[key] || { perRunHit: [], perRunTotal: [] });
      while (e.perRunHit.length <= runIdx) {
        e.perRunHit.push(0);
        e.perRunTotal.push(0);
      }
      e.perRunTotal[runIdx]++;
      if (isHit(r)) e.perRunHit[runIdx]++;
    }
  });
  for (const e of Object.values(bySkill)) {
    e.meanHit = e.perRunHit.reduce((a, b) => a + b, 0) / (e.perRunHit.length || 1);
    e.cases = e.perRunTotal.length ? Math.max(...e.perRunTotal) : 0;
    e.rate = e.cases ? e.meanHit / e.cases : 0;
  }
  return bySkill;
}

// The table itself, so the "which run is this?" labelling can be tested rather
// than eyeballed — the ambiguity was the whole defect.
export function bySkillSection(bySkill, runs) {
  const lines = ['## Per expected skill', ''];
  if (runs > 1) {
    lines.push(
      `Mean hits per trial across ${runs} runs. **Compare these across reports only ` +
        'with the spread in view** — a one-trial move on a small case set is usually noise.',
      '',
    );
  }
  lines.push(runs > 1 ? '| expected | accuracy | per-trial |' : '| expected | accuracy |');
  lines.push(runs > 1 ? '|---|---|---|' : '|---|---|');
  for (const [k, v] of Object.entries(bySkill).sort((a, b) => a[1].rate - b[1].rate)) {
    const acc = runs > 1 ? `${v.meanHit.toFixed(1)}/${v.cases}` : `${v.meanHit}/${v.cases}`;
    lines.push(runs > 1 ? `| ${esc(k)} | ${acc} | ${v.perRunHit.join(' / ')} |` : `| ${esc(k)} | ${acc} |`);
  }
  return lines;
}
