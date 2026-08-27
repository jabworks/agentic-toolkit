import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Docket #62: discovery and live-verification persisted artifacts with no
// template, so every design doc and verification run reinvented its structure.
// The templates are the enforced surface — instances live in gitignored
// .condux/ working state and are untestable by design. Anchors are minimal so
// template prose can evolve without test churn; what they pin is the contract:
// the design frontmatter gate, the four-facts §-entry, and the claim table
// that makes verification runs comparable. String.includes only — the anchors
// contain table pipes.
const TEMPLATES = {
  'skills/discovery/references/design-template.md': {
    skillMd: 'skills/discovery/SKILL.md',
    anchors: ['status: in-progress', '## §', '| Rejected | Why not |'],
  },
  'skills/live-verification/references/report-template.md': {
    skillMd: 'skills/live-verification/SKILL.md',
    anchors: ['| Claim | Evidence | Verdict |'],
  },
};

for (const [template, { skillMd, anchors }] of Object.entries(TEMPLATES)) {
  test(`${template} exists`, () => {
    assert.ok(
      fs.existsSync(path.join(REPO_ROOT, template)),
      `${template} missing — the artifact contract has no canonical home without it`,
    );
  });

  test(`${skillMd} points at its template`, () => {
    const body = fs.readFileSync(path.join(REPO_ROOT, skillMd), 'utf8');
    const pointer = `references/${path.basename(template)}`;

    assert.ok(
      body.includes(pointer),
      `${skillMd} never references ${pointer} — the template is unreachable from the skill`,
    );
  });

  test(`${template} carries its contract anchors`, () => {
    const body = fs.readFileSync(path.join(REPO_ROOT, template), 'utf8');
    const missing = anchors.filter((anchor) => !body.includes(anchor));

    assert.deepEqual(
      missing,
      [],
      `${template} lost contract anchor(s) — the shape drifted out of its canonical home`,
    );
  });
}
