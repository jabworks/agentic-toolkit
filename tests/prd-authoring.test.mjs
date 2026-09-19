import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Docket #84: PRD authoring is not a skill, it is four skills agreeing about
// one file. technical-spec owns prd.md's shape, discovery writes it from its
// §0 requirements card, and the workflow router and preflight's drift check
// read it. Nothing at runtime notices when one of them stops agreeing — a
// template with no author, or an author with no reader, is exactly the pair of
// alternatives the design rejected (specs/prd-authoring/decisions.md, 1).
// So the wiring is pinned here. Anchors are minimal and String.includes only,
// as in skill-artifact-templates.test.mjs: prose can evolve, the contract
// cannot drift silently.
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

// The six headings are the contract every other file is written against:
// discovery's §0 uses them verbatim so sign-off copies rather than re-authors,
// and the drift row names Scope and the Non-goal table by these exact words.
const PRD_HEADINGS = [
  '## Problem',
  '## Users',
  '## Goals and non-goals',
  '## Success metrics',
  '## Scope',
  '## Open questions',
];

const prdTemplate = () => {
  const body = read('skills/technical-spec/references/templates.md');
  const start = body.indexOf('\n## prd.md\n');
  assert.notEqual(start, -1, 'templates.md has no "## prd.md" section');

  // The section runs to the next template's rule line.
  const end = body.indexOf('\n---\n', start);
  return body.slice(start, end === -1 ? undefined : end);
};

test('technical-spec: the prd.md template carries all six sections, in order', () => {
  const template = prdTemplate();
  const positions = PRD_HEADINGS.map((heading) => template.indexOf(`\n${heading}\n`));

  assert.deepEqual(
    PRD_HEADINGS.filter((_, i) => positions[i] === -1),
    [],
    'prd.md template lost a section heading',
  );
  assert.deepEqual(
    positions,
    [...positions].sort((a, b) => a - b),
    'prd.md template sections are out of order',
  );
});

test('technical-spec: the prd.md template keeps the table layer the drift check reads', () => {
  const template = prdTemplate();
  const tables = ['| Section | In one line |', '| Non-goal | Why excluded |', '| In | Out |'];

  assert.deepEqual(
    tables.filter((header) => !template.includes(header)),
    [],
    'prd.md template lost a table header — free prose cannot be checked as a claim',
  );
});

test('technical-spec: SKILL.md lists prd.md in the spec layout', () => {
  const layoutLine = read('skills/technical-spec/SKILL.md')
    .split('\n')
    .find((line) => /^\s+prd\.md\s+#/.test(line));

  assert.ok(layoutLine, 'the Spec Folder Layout block no longer names prd.md');
});

test('discovery: the §0 requirements part exists in the design template and the skill', () => {
  assert.ok(
    read('skills/discovery/references/design-template.md').includes('## §0 · requirements'),
    'design-template.md lost the §0 requirements part — the PRD has no home in the design file',
  );
  assert.ok(
    read('skills/discovery/SKILL.md').includes('§0 · requirements'),
    'discovery SKILL.md never presents §0 — the PRD has no author',
  );
});

test('discovery: sign-off writes prd.md', () => {
  const missing = [
    'skills/discovery/SKILL.md',
    'skills/discovery/references/spec-integration.md',
  ].filter((rel) => !read(rel).includes('prd.md'));

  assert.deepEqual(missing, [], 'the sign-off write-back no longer names prd.md');
});

test('workflow: the router loads prd.md for new-feature tasks', () => {
  const body = read('skills/workflow/SKILL.md');
  const clause = body.slice(body.indexOf('new feature →'), body.indexOf('Carry this'));

  assert.ok(
    clause.includes('`prd.md`'),
    'the new-feature load list dropped prd.md — the PRD is durable but never read',
  );
});

test('preflight: the drift table has a prd.md row that names scope and non-goals', () => {
  const row = read('skills/preflight/SKILL.md')
    .split('\n')
    .find((line) => line.startsWith('| `prd.md` |'));

  assert.ok(row, 'preflight drift table has no prd.md row');
  assert.ok(row.includes('Scope') && row.includes('Non-goal'), 'the prd.md drift row no longer names Scope and the Non-goal table');
});

test('trigger evals: the two corpora agree on who owns a PRD request', () => {
  const load = (skill) => JSON.parse(read(`skills/${skill}/evals/trigger_eval.json`));
  const owner = new Map();

  for (const skill of ['discovery', 'technical-spec']) {
    for (const { query, expected_skill: expected } of load(skill)) {
      if (!/\bprd\b|requirements/i.test(query)) continue;

      if (owner.has(query)) {
        assert.equal(expected, owner.get(query), `"${query}" expects different skills in the two corpora`);
      }
      owner.set(query, expected);
    }
  }

  const owners = new Set(owner.values());
  assert.ok(owners.has('discovery'), 'no eval case routes a PRD request to discovery');
  assert.ok(owners.has('technical-spec'), 'no eval case routes a PRD save to technical-spec');
});
