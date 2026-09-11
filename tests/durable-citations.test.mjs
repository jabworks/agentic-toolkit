import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Docket #34: committed files cited evidence living in `.condux/`, which is
// gitignored working state. Six citations existed; two already pointed at
// nothing, because nothing walks these trees looking for the rot.
//
// The ratified policy is PROMOTE ON CITE — when a durable file needs to
// reference a design or verification report, that artifact is copied into the
// repo first (the spec dir it belongs to) and the committed path is cited.
// So no durable file may name a *file* inside gitignored working state.
//
// `.condux/` is where the rot was found, but the rule is about durability, not
// about condux. Every plugin gets a gitignored `.<plugin-name>/` at the git
// root (README's artifact-layout block lists them), and a citation into any of
// them dies the same way. Enumerated rather than matched as a generic dotdir,
// because `.github/workflows/…` is a perfectly good committed citation.
//
// The pattern deliberately requires a file extension. Durable docs are still
// allowed to discuss working state as a concept — README draws the
// directories, and docket entries reason about them by name. What they may not
// do is point at something inside one, which is the part that rots.
const WORKING_STATE = ['condux', 'session-handoff', 'session-report', 'remember'];
const CITATION = new RegExp(String.raw`\.(?:${WORKING_STATE.join('|')})\/[\w.@/-]*\.\w+`, 'g');

// Durable trees: everything here survives a clone onto another machine, so
// everything here must resolve on another machine.
const ROOTS = ['specs', 'docket'];
const FILES = ['README.md', 'CLAUDE.md'];

function markdownUnder(dir) {
  const abs = path.join(REPO_ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownUnder(rel));
    else if (entry.name.endsWith('.md')) out.push(rel);
  }
  return out;
}

function citationsIn(rel) {
  const lines = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(CITATION)) hits.push(`${rel}:${i + 1} → ${m[0]}`);
  });
  return hits;
}

test('no durable file cites a path inside gitignored working state (docket #34)', () => {
  const targets = [...ROOTS.flatMap(markdownUnder), ...FILES];
  const hits = targets.flatMap(citationsIn);
  assert.deepEqual(
    hits,
    [],
    'durable files must cite committed paths, not gitignored working state ' +
      '(promote the artifact into the spec dir it belongs to, then cite that):\n  ' +
      hits.join('\n  '),
  );
});

test('the citation pattern catches a real citation and spares prose', () => {
  const caught = [
    'Evidence: .condux/verification/2026-08-14-cursor-channel/report.md.',
    'Initial spec from signed-off design (`.condux/designs/2026-08-05-docket.md`)',
    'see [the design](.condux/designs/2026-08-12-uninstall-convention.md)',
    // The rule is durability, not condux — a sibling working-state dir rots identically.
    'picked up from .session-handoff/2026-08-15-worktree-shipped.md',
    '.session-report/2026-08-01-usage.html has the numbers',
  ];
  for (const line of caught) {
    assert.ok(CITATION.test(line), 'should have flagged: ' + line);
    CITATION.lastIndex = 0;
  }

  const spared = [
    '  .condux/            # working state — designs/ plans/ progress/ scratch/',
    'condux has 12 skills and one `.condux/`, so uninstalling condux tells',
    'working state goes to `.condux/`, gitignored, named for the owning plugin',
    'Durable content may not depend on ephemeral content in .condux/ designs.',
    '  .session-handoff/   # working state — handoff docs',
    // A committed dotdir is not working state and stays citeable.
    'see .github/workflows/plugin-release.yml for the tagging rules',
  ];
  for (const line of spared) {
    assert.ok(!CITATION.test(line), 'should have allowed: ' + line);
    CITATION.lastIndex = 0;
  }
});

test('every promoted artifact this policy created is actually committed', () => {
  // The four artifacts promoted out of `.condux/` when #34 was closed. If one
  // is deleted, its citations silently become the same dangling references the
  // docket was filed about — the absence test above would still pass.
  const promoted = [
    'specs/docket/design.md',
    'specs/dir-mode-navigation/design.md',
    'specs/cursor-channel/verification.md',
    'specs/agent-plugins-conformance/verification.md',
  ];
  for (const rel of promoted) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, rel)), 'missing promoted artifact: ' + rel);
  }
});

// Docket #51: `specs/surface-kit/index.md` credited Q17-Q19 to D9 in its
// changelog, and none of the three was ever written into `quirks.md`. The
// citation read as authoritative for two weeks, and closing it cost a session.
// Same rot as #34 above, different mechanism: there the citation named a path
// that does not survive a clone, here it names an anchor that never existed.
//
// One direction only. A quirk that nobody cites is fine — Q3 and Q4 have stood
// uncited since the spec was written, because a quirk earns its place by being
// true, not by being referenced. Asserting the reverse would mean failing today
// or grandfathering two exceptions, and neither buys anything.
const QUIRK_HEADING = /^##\s+(Q\d+)\b/;

// A range is how #51 was actually written ("Q17-Q19 were attributed to D9"),
// so expanding one is not a nicety — an endpoints-only reader would have
// spared the exact citation this test exists for. Hyphen and en dash both.
const QUIRK_RANGE = /\bQ(\d+)\s*[-–—]\s*Q(\d+)\b/g;

// An optional spec-dir qualifier binds the citation to another spec:
// `specs/docket/decisions.md` says "(surface-kit Q9)", which resolves against
// surface-kit and would otherwise read as a dangling Q9 in docket.
const QUIRK_CITE = /\b(?:([a-z][a-z0-9-]*)\s+)?Q(\d+)\b/g;

// `Q1 2026` is a quarter, not a quirk. The spec tree is prose, so this costs
// nothing to exclude and is the one false positive the shape invites.
const QUARTER = /^\s*\d{4}\b/;

function specDirs() {
  const abs = path.join(REPO_ROOT, 'specs');
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name);
}

// A spec only makes a claim here if its quirks.md actually numbers its
// headings. `specs/docket/quirks.md` uses prose headings ("Id-space hazards"),
// so it has no Q-space to resolve against and is not held to one.
function quirkIndex() {
  const index = new Map();
  const duplicates = [];
  for (const name of specDirs()) {
    const rel = path.join('specs', name, 'quirks.md');
    const abs = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const seen = new Set();
    fs.readFileSync(abs, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const m = line.match(QUIRK_HEADING);
        if (!m) return;
        if (seen.has(m[1])) duplicates.push(`${rel}:${i + 1} → ${m[1]} declared twice`);
        seen.add(m[1]);
      });
    if (seen.size) index.set(name, seen);
  }
  return { index, duplicates };
}

// Returns [{ target, quirk, where }] — `target` is the spec the citation
// resolves against, which is the qualifier when there is one and the citing
// file's own spec otherwise.
export function quirkCitations(rel, body, known) {
  const own = rel.split(path.sep)[1];
  const hits = [];
  body.split('\n').forEach((line, i) => {
    // A heading declares a quirk; it does not cite one.
    if (QUIRK_HEADING.test(line)) return;
    const at = `${rel}:${i + 1}`;
    const claimed = new Set();
    for (const m of line.matchAll(QUIRK_RANGE)) {
      const [lo, hi] = [Number(m[1]), Number(m[2])];
      if (hi < lo || hi - lo > 50) continue;
      for (let n = lo; n <= hi; n++) {
        claimed.add(`Q${n}`);
        hits.push({ target: own, quirk: `Q${n}`, where: at });
      }
    }
    for (const m of line.matchAll(QUIRK_CITE)) {
      const quirk = `Q${m[2]}`;
      if (QUARTER.test(line.slice(m.index + m[0].length))) continue;
      const target = m[1] && known.has(m[1]) ? m[1] : own;
      if (target === own && claimed.has(quirk)) continue; // already taken by a range
      hits.push({ target, quirk, where: at });
    }
  });
  return hits;
}

test('every Q<n> a spec cites resolves to a quirk that exists (docket #51)', () => {
  const { index, duplicates } = quirkIndex();
  assert.deepEqual(duplicates, [], 'a quirk number is declared twice:\n  ' + duplicates.join('\n  '));
  assert.ok(index.size, 'no spec numbers its quirks — this guard has gone blind');

  const dangling = [];
  for (const rel of markdownUnder('specs')) {
    const body = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    for (const { target, quirk, where } of quirkCitations(rel, body, index)) {
      const headings = index.get(target);
      if (!headings) continue; // that spec does not number its quirks
      if (!headings.has(quirk)) dangling.push(`${where} → ${quirk} (no "## ${quirk}" in specs/${target}/quirks.md)`);
    }
  }

  assert.deepEqual(
    dangling,
    [],
    'a spec cites a quirk that was never written — write the quirk, or drop ' +
      'the citation:\n  ' + dangling.join('\n  '),
  );
});

test('the quirk-citation reader expands ranges, follows qualifiers, and spares quarters', () => {
  const known = new Map([
    ['surface-kit', new Set(['Q9'])],
    ['docket', new Set()],
  ]);
  const read = (rel, line) => quirkCitations(rel, line, known).map((h) => `${h.target}:${h.quirk}`);

  // The #51 shape: a range in a changelog line, every member a real citation.
  assert.deepEqual(read('specs/surface-kit/index.md', 'Q17-Q19 were attributed to D9'), [
    'surface-kit:Q17',
    'surface-kit:Q18',
    'surface-kit:Q19',
  ]);
  assert.deepEqual(read('specs/surface-kit/index.md', 'see Q17–Q18 above'), [
    'surface-kit:Q17',
    'surface-kit:Q18',
  ]);

  // A qualifier binds the citation to the spec that owns the quirk.
  assert.deepEqual(read('specs/docket/decisions.md', 'nowhere to persist (surface-kit Q9)'), [
    'surface-kit:Q9',
  ]);
  // An unknown word before a citation is prose, not a qualifier.
  assert.deepEqual(read('specs/surface-kit/decisions.md', 'the toggle Q16 covers'), [
    'surface-kit:Q16',
  ]);
  // Possessives and parentheticals are ordinary citations.
  assert.deepEqual(read('specs/surface-kit/quirks.md', "Q10's polarity test checks the core"), [
    'surface-kit:Q10',
  ]);

  // A heading declares; it does not cite. Otherwise every quirk cites itself
  // and the test can never fail.
  assert.deepEqual(read('specs/surface-kit/quirks.md', '## Q26 — opt-in behaviour'), []);

  // Quarters are not quirks.
  assert.deepEqual(read('specs/surface-kit/index.md', 'shipped in Q1 2026'), []);
  assert.deepEqual(read('specs/surface-kit/index.md', 'Q3 2027 at the earliest'), []);
});

// Docket #80: `**Commit:**` stamps in `specs/*/index.md` cited feature-branch
// hashes. Every PR here squash-merges, so main only ever carries the squash;
// a branch hash resolves in clones that had the branch and nowhere else
// (blueprint's 3e31e7f and discovery-presentation's a8b07b7 were orphaned
// that way, and blueprint's 2.29.0 changelog hash was already unresolvable in
// a fresh clone). The stamp is written before the PR exists, so the hash it
// names is wrong by construction. The convention is now `**Commit:** PR #N`:
// knowable once the PR is open, stable after the squash; the scaffold writes
// `PR #pending` until then, and this test keeps the PR red until it is filled.
//
// Three rules over every spec index — the stamp line and the changelog prose
// alike, since several stamps carry prose after the value:
// - a `**Commit:**` line, where one exists, opens with `PR #N` or a 7-hex
//   hash — a placeholder is neither. Not every spec stamps; none is forced to;
// - every hash is an ancestor of main — on the stamp line any 7-hex value, in
//   prose only a token with a letter and a digit, so words and years are
//   spared. Grandfathers the valid stamps and rejects the next branch hash on
//   the branch that writes it;
// - every `PR #N` is a merged PR (its squash subject ends in `(#N)` on main),
//   or is newer than every merged PR — the offline stand-in for "this branch's
//   own open PR". A stamp naming a PR that never merged is caught as soon as a
//   later one does.
const HASH = /\b(?=[0-9a-f]*[0-9])(?=[0-9a-f]*[a-f])[0-9a-f]{7}\b/g;
const PR_STAMP = /\bPR #(\d+)\b/g;
const COMMIT_LINE = /^\*\*Commit:\*\* (.*)$/;

function git(...args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

// `origin/main` is what is published, and the only main a PR build has;
// a clone without a remote falls back to its local main.
function mainRef() {
  for (const ref of ['origin/main', 'main']) {
    try {
      git('rev-parse', '--verify', '-q', `${ref}^{commit}`);
      return ref;
    } catch {
      // try the next ref
    }
  }
  throw new Error('neither origin/main nor main resolves — this test needs the repository history');
}

function onMain(hash, ref) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', hash, ref], { cwd: REPO_ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function mergedPrs(ref) {
  const numbers = git('log', '--format=%s', ref)
    .split('\n')
    .map((subject) => subject.match(/\(#(\d+)\)$/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  return { set: new Set(numbers), max: Math.max(0, ...numbers) };
}

// What a `**Commit:**` value names: a PR, a hash, or nothing usable.
export function readStamp(value) {
  const pr = value.match(/^PR #(\d+)\b/);
  if (pr) return { pr: Number(pr[1]) };
  const hash = value.match(/^[0-9a-f]{7}\b/);
  if (hash) return { hash: hash[0] };
  return null;
}

export function prProblem(n, merged) {
  if (merged.set.has(n) || n > merged.max) return null;
  return `PR #${n} never merged`;
}

test('the stamp reader catches hashes and PR numbers, spares words, years, and placeholders', () => {
  const hashes = (line) => [...line.matchAll(HASH)].map((m) => m[0]);
  assert.deepEqual(hashes('2026-09-10 (3e31e7f): shipped as ed4cbb4, decoded 1234567 times'), ['3e31e7f', 'ed4cbb4']);
  assert.deepEqual(hashes('**Commit:** cd70976 (design stage — pre-implementation)'), ['cd70976']);
  assert.deepEqual(hashes('PR #153 at 0011ac6 + condux'), ['0011ac6']);

  assert.deepEqual(readStamp('PR #153'), { pr: 153 });
  assert.deepEqual(readStamp('3a872c6 (initial spec; later entries in the changelog below)'), { hash: '3a872c6' });
  assert.deepEqual(readStamp('8914577'), { hash: '8914577' }, 'on the stamp line an all-digit hash is still a hash');
  assert.equal(readStamp('PR #pending'), null);
  assert.equal(readStamp('no-git'), null);

  const merged = { set: new Set([120, 150, 153]), max: 153 };
  assert.equal(prProblem(153, merged), null);
  assert.equal(prProblem(154, merged), null, "a number above every merged PR is the branch's own open PR");
  assert.match(prProblem(149, merged), /never merged/);
});

test('every spec index stamps a merged PR or a commit on main, never an orphaned branch hash (docket #80)', () => {
  const ref = mainRef();
  const merged = mergedPrs(ref);
  const indexes = markdownUnder('specs').filter((rel) => path.basename(rel) === 'index.md' && rel !== 'specs/index.md');
  const problems = [];
  const orphaned = (hash) => `${hash} is not on ${ref} (a branch hash squash-merge orphans — stamp the PR instead)`;

  for (const rel of indexes) {
    const lines = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const where = `${rel}:${i + 1}`;
      const stamp = line.match(COMMIT_LINE);
      if (stamp) {
        const read = readStamp(stamp[1]);
        if (!read) problems.push(`${where} → **Commit:** ${stamp[1]} — stamp the PR that carries the change (\`PR #N\`) once it is open`);
        else if (read.hash && !onMain(read.hash, ref)) problems.push(`${where} → ${orphaned(read.hash)}`);
        else if (read.pr !== undefined && prProblem(read.pr, merged)) problems.push(`${where} → ${prProblem(read.pr, merged)} to ${ref}`);
        return;
      }
      for (const m of line.matchAll(HASH)) {
        if (!onMain(m[0], ref)) problems.push(`${where} → ${orphaned(m[0])}`);
      }
      for (const m of line.matchAll(PR_STAMP)) {
        const problem = prProblem(Number(m[1]), merged);
        if (problem) problems.push(`${where} → ${problem} to ${ref}`);
      }
    });
  }

  assert.deepEqual(problems, [], 'spec stamps must survive a fresh clone:\n  ' + problems.join('\n  '));
});
