import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkFrontmatter,
  collectSkillFiles,
  normalizeFrontmatter,
  renderValue,
} from '../scripts/check-frontmatter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Every frontmatter break this repo has shipped, reproduced verbatim. These are
// the regression bar: a guard that does not reject all four is not a guard.
// Hashes are in skills/toolkit-failure-archaeology/references/incident-ledger.md.
const HISTORICAL_BREAKS = [
  {
    hash: 'cff6133',
    what: 'unquoted value containing `user: "…"` — read as a nested mapping key',
    src: '---\nname: code-review\ndescription: Review a diff. Ask the user: "ready to merge?"\n---\n',
    rule: 'R3',
  },
  {
    hash: 'a13e094',
    what: 'unquoted description opening with a YAML indicator',
    src: '---\nname: systematic-debugging\ndescription: > debug systematically\n---\n',
    rule: 'R3',
  },
  {
    hash: 'd754c63',
    what: 'unquoted `Trigger phrases: "…"` — shipped with metadata silently dropped',
    src: '---\nname: session-handoff\ndescription: Save state.\nwhen_to_use: Trigger phrases: "save state", "handoff"\n---\n',
    rule: 'R3',
  },
  {
    hash: '2026-08-05',
    what: 'single-quoted value with a bare apostrophe — ended the scalar early',
    src: "---\nname: code-review\ndescription: 'Not for a plan — that's plan-review.'\n---\n",
    rule: 'R1',
  },
];

test('the canonical-form gate rejects every frontmatter break this repo has shipped', () => {
  const missed = [];
  for (const { hash, what, src, rule } of HISTORICAL_BREAKS) {
    const { ok, issues } = checkFrontmatter(src);
    if (ok) {
      missed.push(`${hash}: NOT rejected — ${what}`);
      continue;
    }
    if (!issues.some((i) => i.rule === rule)) {
      missed.push(`${hash}: rejected under ${issues.map((i) => i.rule).join(',')}, expected ${rule} — ${what}`);
    }
  }
  assert.deepEqual(missed, [], 'historical breaks the gate would let through again:\n' + missed.join('\n'));
});

test('every SKILL.md in the repo is in canonical form', () => {
  const files = collectSkillFiles(REPO_ROOT);
  // A guard that silently scans nothing is the failure mode this whole change
  // exists to prevent, so assert the corpus is real before trusting the result.
  assert.ok(files.length > 50, `expected the full SKILL.md corpus, collected ${files.length}`);

  const problems = [];
  for (const rel of files) {
    const { ok, issues } = checkFrontmatter(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
    if (ok) continue;
    for (const i of issues) problems.push(`${rel}:${i.line} [${i.rule}] ${i.key ? i.key + ': ' : ''}${i.message}`);
  }
  assert.deepEqual(
    problems,
    [],
    'illegal frontmatter — run `node scripts/check-frontmatter.mjs --fix`:\n' + problems.join('\n'),
  );
});

test('the gate covers the generated trees, not just skills/', () => {
  // dist/ and packages/ have their own quoting path (the OpenCode build folds
  // when_to_use into description), so a generator bug must fail here too.
  const roots = collectSkillFiles(REPO_ROOT).map((f) => f.split(path.sep)[0]);
  for (const root of ['skills', 'dist', 'packages']) {
    assert.ok(roots.includes(root), `no SKILL.md collected under ${root}/ — the gate is not covering it`);
  }
});

test('--fix output is legal and idempotent', () => {
  for (const { hash, src } of HISTORICAL_BREAKS) {
    const once = normalizeFrontmatter(src);
    const { ok, issues } = checkFrontmatter(once);
    assert.ok(ok, `${hash}: --fix produced still-illegal output:\n${issues.map((i) => i.message).join('\n')}`);
    assert.equal(normalizeFrontmatter(once), once, `${hash}: --fix is not idempotent`);
  }
});

test('--fix preserves the decoded value and never touches the body', () => {
  const value = 'Ask once: "ready?" — that is plan-review, not a plan.';
  const src = `---\nname: x\ndescription: '${value.replace(/'/g, "''")}'\n---\n\n# Body\n\nUnchanged — do not rewrite.\n`;
  const fixed = normalizeFrontmatter(src);

  const line = fixed.split('\n').find((l) => l.startsWith('description:'));
  assert.equal(JSON.parse(line.slice('description: '.length)), value, 'decoded value changed');
  assert.equal(fixed.split('---\n')[2], src.split('---\n')[2], 'body was modified');
});

test('renderValue emits plain scalars when safe and double quotes otherwise', () => {
  assert.equal(renderValue('Use when reviewing a diff.'), 'Use when reviewing a diff.');
  assert.equal(renderValue('Ask: "ready?"'), '"Ask: \\"ready?\\""');
  // Leading indicators must be quoted even when the rest is innocuous.
  assert.equal(renderValue('> folded'), '"> folded"');
});

test('single quotes are banned repo-wide, not merely discouraged', () => {
  // The 2026-08-05 break passed `claude plugin validate` and every regex test.
  // Banning the construct outright is what makes it unrepeatable.
  const offenders = collectSkillFiles(REPO_ROOT).filter((rel) => {
    const src = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    const block = src.match(/^---\n([\s\S]*?)\n---/);
    return block ? /^[A-Za-z0-9_-]+: '/m.test(block[1]) : false;
  });
  assert.deepEqual(offenders, [], 'single-quoted frontmatter values:\n' + offenders.join('\n'));
});
