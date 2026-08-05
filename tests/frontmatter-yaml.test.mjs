import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectSkillFiles } from '../scripts/check-frontmatter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// The real oracle. tests/frontmatter-canonical.test.mjs narrows the grammar so a
// break cannot be written; this file proves the grammar's premise by handing every
// SKILL.md to an actual YAML parser. Codex parses frontmatter strictly and refuses
// to load the skill on error — `claude plugin validate` does not (verified
// 2026-08-05: it passed the file that broke Codex), so it can never fill this role.
let YAML = null;
try {
  YAML = await import('yaml');
} catch {
  // Reported as a failure below, never as a skip. `scripts/validate-plugins.sh`
  // exits 0 when the claude CLI is absent, and that skip is why the 2026-08-05
  // break shipped. A missing oracle is a failing build, not a quiet pass.
}

function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

// Parses one frontmatter block, returning the errors a strict parser reports.
function strictErrors(block) {
  const doc = YAML.parseDocument(block, { strict: true, uniqueKeys: true, prettyErrors: false });
  return [...doc.errors, ...doc.warnings].map((e) => e.message);
}

test('the strict YAML oracle is installed', () => {
  assert.ok(
    YAML,
    'the `yaml` devDependency is missing — run `pnpm install`. This test fails rather than '
    + 'skipping on purpose: a guard that disappears when its tool is absent is how the '
    + '2026-08-05 frontmatter break reached users.',
  );
});

test('every SKILL.md frontmatter parses under a strict YAML parser', () => {
  assert.ok(YAML, 'yaml devDependency missing — see the previous test');

  const files = collectSkillFiles(REPO_ROOT);
  assert.ok(files.length > 50, `expected the full SKILL.md corpus, collected ${files.length}`);

  const problems = [];
  for (const rel of files) {
    const src = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    const block = frontmatter(src);
    if (block === null) { problems.push(`${rel}: no frontmatter block`); continue; }

    const errors = strictErrors(block);
    if (errors.length > 0) { problems.push(`${rel}: ${errors.join('; ')}`); continue; }

    // Parsing cleanly is not enough — `d754c63` parsed to a document whose fields
    // hosts then dropped. Assert the metadata actually survives the round trip.
    const parsed = YAML.parse(block, { strict: true });
    if (typeof parsed?.name !== 'string' || parsed.name.trim() === '') {
      problems.push(`${rel}: "name" does not parse to a non-empty string`);
    }
    if (typeof parsed?.description !== 'string' || parsed.description.trim() === '') {
      problems.push(`${rel}: "description" does not parse to a non-empty string`);
    }
  }

  assert.deepEqual(problems, [], 'strict YAML failures:\n' + problems.join('\n'));
});

test('the strict parser rejects the same historical breaks the canonical gate does', () => {
  assert.ok(YAML, 'yaml devDependency missing — see the first test');

  // Both gates must agree on real history; if the oracle accepts one of these,
  // the canonical rule that covers it needs re-deriving, not loosening.
  const breaks = {
    cff6133: 'name: code-review\ndescription: Review a diff. Ask the user: "ready to merge?"',
    a13e094: 'name: systematic-debugging\ndescription: > debug systematically',
    d754c63: 'name: session-handoff\ndescription: Save state.\nwhen_to_use: Trigger phrases: "save state"',
    '2026-08-05': "name: code-review\ndescription: 'Not for a plan — that's plan-review.'",
  };

  const accepted = Object.entries(breaks)
    .filter(([, block]) => strictErrors(block).length === 0)
    .map(([hash]) => hash);

  assert.deepEqual(accepted, [], 'strict YAML accepted a break that actually shipped:\n' + accepted.join('\n'));
});
