import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
