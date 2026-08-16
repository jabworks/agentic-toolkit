import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, '../skills/spec-browser/references/build-index.js');
const REPO_ROOT = path.resolve(__dirname, '..');

// Build a throwaway specs/ tree and return the generated catalog.
function buildCatalog(specs) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-spec-index-'));
  for (const [name, body] of Object.entries(specs)) {
    fs.mkdirSync(path.join(root, name), { recursive: true });
    fs.writeFileSync(path.join(root, name, 'index.md'), body);
  }
  execFileSync('node', [SCRIPT, root]);
  const catalog = fs.readFileSync(path.join(root, 'index.md'), 'utf8');
  fs.rmSync(root, { recursive: true, force: true });
  return catalog;
}

function purposeOf(catalog, specPath) {
  const row = catalog.split('\n').find((l) => l.includes('`' + specPath + '`'));
  assert.ok(row, 'no catalog row for ' + specPath);
  // Split on unescaped pipes only — an escaped \| is cell content, not a
  // column break, which is the whole point of escaping it.
  return row.split(/(?<!\\)\|/)[2].trim();
}

// The scaffold shipped by technical-spec opens every index.md with this block.
// A first-non-heading-line rule reports "**Last updated:** …" as the purpose of
// every spec it writes — which is what the catalog did for 6 of this repo's 9
// specs before the extractor learned to skip bookkeeping.
const SCAFFOLD = `# Scaffolded — Tech Spec

**Last updated:** 2026-08-16
**Commit:** abc1234
**Status:** draft

## Contents

- [decisions.md](decisions.md) — the ratified calls
- [quirks.md](quirks.md) — edge cases
`;

test('build-index: scaffold metadata is never reported as a purpose', () => {
  const catalog = buildCatalog({ scaffolded: SCAFFOLD });
  const purpose = purposeOf(catalog, 'scaffolded');
  assert.doesNotMatch(purpose, /Last updated|Commit:|Status:/, 'metadata leaked into the purpose');
  assert.equal(purpose, '—', 'a spec with no description should read as an honest em dash');
});

test('build-index: a Contents bullet is not promoted to a purpose', () => {
  // Skipping only the metadata block moves the bug rather than fixing it: the
  // next non-heading line is the first "## Contents" bullet.
  const catalog = buildCatalog({ scaffolded: SCAFFOLD });
  assert.doesNotMatch(purposeOf(catalog, 'scaffolded'), /decisions\.md|ratified/);
});

test('build-index: a > note wins, joined across its wrapped lines', () => {
  const catalog = buildCatalog({
    noted: `# Noted — Tech Spec

> Plugin composition declared as data: composition.json is the single
> source for bundle membership.

**Last updated:** 2026-08-16
`,
  });
  assert.equal(
    purposeOf(catalog, 'noted'),
    'Plugin composition declared as data: composition.json is the single source for bundle membership.',
  );
});

test('build-index: hard-wrapped prose is joined, not cut at the wrap column', () => {
  const catalog = buildCatalog({
    prose: `# Prose — Tech Spec

The toolkit's fourth distribution channel: Cursor consumes skills as
native SKILL.md from a merged-trigger tree.

## Contents
`,
  });
  const purpose = purposeOf(catalog, 'prose');
  assert.match(purpose, /consumes skills as native SKILL\.md from a merged-trigger tree\.$/);
});

test('build-index: a pipe in a purpose cannot break the table row', () => {
  const catalog = buildCatalog({ piped: '# Piped\n\n> Reads a | b from config.\n' });
  assert.equal(purposeOf(catalog, 'piped'), 'Reads a \\| b from config.');
});

test('build-index: only directories holding index.md count as specs', () => {
  const catalog = buildCatalog({ real: '# Real\n\n> A real spec.\n' });
  assert.match(catalog, /^1 spec\.$/m);
});

test('build-index: long purposes are clamped on a boundary, never mid-word', () => {
  const long = 'word '.repeat(80).trim();
  const catalog = buildCatalog({ verbose: `# Verbose\n\n> ${long}\n` });
  const purpose = purposeOf(catalog, 'verbose');
  assert.ok(purpose.length <= 201, 'purpose should be clamped, got ' + purpose.length);
  assert.match(purpose, /(word|\.)…?$/, 'clamp landed mid-word');
});

test("build-index: this repo's own committed catalog is current", () => {
  // spec-browser tells users to keep specs/index.md committed so a fresh
  // checkout can reference it without running anything. A stale catalog is
  // worse than none — it names specs that moved.
  const committed = path.join(REPO_ROOT, 'specs', 'index.md');
  assert.ok(fs.existsSync(committed), 'specs/index.md is missing — run build-index.js');

  const before = fs.readFileSync(committed, 'utf8');
  execFileSync('node', [SCRIPT, path.join(REPO_ROOT, 'specs')]);
  const after = fs.readFileSync(committed, 'utf8');

  // The generated header carries today's date; compare everything below it.
  const body = (s) => s.slice(s.indexOf('| Spec |'));
  if (body(before) !== body(after)) {
    fs.writeFileSync(committed, before);
    assert.fail('specs/index.md is stale — re-run build-index.js and commit it');
  }
  fs.writeFileSync(committed, before);
});
