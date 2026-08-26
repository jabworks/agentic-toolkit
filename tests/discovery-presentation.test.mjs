import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS = path.join(REPO_ROOT, 'skills');

const read = (...p) => fs.readFileSync(path.join(SKILLS, ...p), 'utf8');

// Every contract below is hard-wrapped prose, so a phrase can straddle a newline
// at any moment someone reflows a paragraph. Match against a whitespace-collapsed
// copy: the assertion is about what the contract says, not where it wraps.
const flat = (md) => md.replace(/\s+/g, ' ');

// Everything guarded here is prose in a markdown contract, and prose drifts.
// Assert on the contract — the key name, the fallback, the mode — never on a
// sentence, or the guard becomes a rewrite tax on every wording change.
//
// Only skills/ is checked: dist-mirror.test.mjs already pins dist/ byte-for-byte,
// so asserting both would be the same claim twice.

// ---------------------------------------------------------------------------
// The status contract
// ---------------------------------------------------------------------------

// discovery creates the design file at its FIRST SECTION, not at sign-off, so
// the file existing stopped meaning "the user approved this". Three places read
// that file (found by grepping .condux/designs across skills/), and all three
// have to read the status field instead of trusting the glob hit.
const STATUS_READERS = [
  ['draft-plan', 'SKILL.md'],
  ['subagent-execution', 'agents', 'planner.md'],
  ['discovery', 'SKILL.md'],
];

for (const parts of STATUS_READERS) {
  const label = parts.join('/');

  test(`${label} reads the design file's status rather than its existence`, () => {
    const md = read(...parts);
    assert.match(md, /\bstatus\b/, `${label} never mentions the status field`);
    assert.match(md, /in-progress/, `${label} never mentions the in-progress value`);
    assert.match(md, /signed-off/, `${label} never mentions the signed-off value`);
  });

  // The fallback fails silently in the direction that looks like success, which
  // is why it is asserted separately from the values above. Every design file on
  // disk when this shipped had no frontmatter at all and had only ever been
  // written at sign-off; reading absence as in-progress would retroactively
  // invalidate all of them, and nothing would error.
  test(`${label} states that a missing status means signed-off`, () => {
    const md = flat(read(...parts));
    const near = md.match(/[^.]*\b(absent|absence|no `?status`?|without a status|predates?)\b[^.]*\./gi) || [];
    assert.ok(
      near.some((s) => /signed-off/.test(s)),
      `${label} does not say that a design file with no status field counts as signed-off`,
    );
  });
}

// ---------------------------------------------------------------------------
// The section card (discovery Step 3)
// ---------------------------------------------------------------------------

test('discovery announces the section list before the first section', () => {
  const md = read('discovery', 'SKILL.md');
  assert.match(md, /section list/i, 'discovery never tells the agent to announce the section list');
});

test('discovery states the per-card position marker', () => {
  const md = read('discovery', 'SKILL.md');
  assert.match(md, /§n of N/, 'the "§n of N" marker is the orientation cue — it must be stated literally');
});

// A density rule without a number is advice, and advice is what produced the
// walls this section exists to prevent.
test('discovery states a numeric density budget for a section card', () => {
  const md = flat(read('discovery', 'SKILL.md'));
  assert.match(md, /\b25 lines\b/, 'the one-screen budget must name a line count, not just say "keep it short"');
  assert.match(md, /three lines|3 lines/i, 'the paragraph ceiling must be stated');
});

// ---------------------------------------------------------------------------
// The design file and the preview
// ---------------------------------------------------------------------------

// --steer long-polls /api/decision and blocks; manual mode renders, watches and
// live-reloads without blocking, which is the only reason one server can cover a
// whole discovery. Naming --steer here would silently reintroduce the block.
test('discovery launches the preview in manual mode, not --steer', () => {
  const md = read('discovery', 'SKILL.md');
  const launch = md.match(/^.*annotate-server\.js.*$/gm) || [];
  assert.ok(launch.length > 0, 'discovery no longer shows how to launch the preview');
  for (const line of launch) {
    assert.doesNotMatch(
      line,
      /--steer/,
      `discovery launches the preview with --steer, which blocks on a decision: ${line.trim()}`,
    );
  }
  assert.ok(
    launch.some((l) => /--no-reject/.test(l)),
    'the design stage is accept-or-fix — the launch must carry --no-reject',
  );
});

test('discovery requires the preview to fail open', () => {
  const md = read('discovery', 'SKILL.md');
  assert.match(md, /fail open/i, 'discovery must say the preview fails open when it cannot run');
});

// ---------------------------------------------------------------------------
// Blueprint: the question trigger and the specificity rule
// ---------------------------------------------------------------------------

// The noun test had a blind spot: a design whose subjects are a terminal output
// shape and a markdown file has neither a UI surface nor a data model, and still
// needs a flow diagram. The question test has no such gap.
test('blueprint no longer triggers on the noun test', () => {
  const md = flat(read('blueprint', 'SKILL.md'));
  assert.doesNotMatch(
    md,
    /when the feature has a UI surface or a data model/,
    'blueprint still carries the noun-shaped discovery trigger',
  );
});

test('blueprint states the five trigger questions', () => {
  const md = read('blueprint', 'SKILL.md');
  for (const q of [
    /what entities exist/i,
    /what happens, in what order/i,
    /what (services exist and what )?talks to what/i,
    /what states are legal/i,
    /what goes where on a screen/i,
  ]) {
    assert.match(md, q, `blueprint's trigger is missing a question: ${q}`);
  }
});

test('blueprint does not open a tab when it runs inside discovery', () => {
  const md = flat(read('blueprint', 'SKILL.md'));
  assert.match(
    md,
    /inside \/?discovery[^.]*(open nothing|never by opening|deliver by linking)/i,
    'blueprint must say it opens nothing inside discovery — a tab per section is the interruption',
  );
});

for (const kit of ['diagram-kit.md', 'wireframe-kit.md']) {
  test(`${kit} carries the specificity rule`, () => {
    const md = flat(read('blueprint', 'references', kit));
    assert.match(
      md,
      /equally true of (a different|another) feature/i,
      `${kit} is missing the specificity rule — "too vague to judge" was the reported failure`,
    );
  });
}

// ---------------------------------------------------------------------------
// plan-review renders the status field as junk unless it is stripped
// ---------------------------------------------------------------------------

// renderBlocks maps a bare `---` to <hr>, so without stripFrontmatter the reader
// sees a rule, a stray `status: …` paragraph and a second rule at the top of the
// surface this whole change makes primary. The function lives inside an inline
// script in an HTML template, so it is extracted and evaluated rather than
// imported — restructuring the template to make it importable is not worth it.
const TEMPLATE = fs.readFileSync(
  path.join(SKILLS, 'plan-review', 'references', 'plan-review-template.html'),
  'utf8',
);

function loadStripFrontmatter() {
  const src = TEMPLATE.match(/function stripFrontmatter\(md\)\{[\s\S]*?\n {6}\}/);
  assert.ok(src, 'stripFrontmatter is gone from plan-review-template.html');
  return new Function(`${src[0]}; return stripFrontmatter;`)();
}

test('stripFrontmatter removes a leading frontmatter block', () => {
  const strip = loadStripFrontmatter();
  const md = '---\nstatus: signed-off\ndate: 2026-08-26\n---\n# Title\n\nBody.\n';
  assert.equal(strip(md), '# Title\n\nBody.\n');
});

// The spec files this repo ships use `---` as a section separator throughout.
// Anchoring anywhere but position 0 would eat the first one and everything above it.
test('stripFrontmatter spares a mid-document horizontal rule', () => {
  const strip = loadStripFrontmatter();
  const md = '# Title\n\nBody.\n\n---\n\n## Next\n';
  assert.equal(strip(md), md, 'a `---` in the body is a horizontal rule, not frontmatter');
});

test('stripFrontmatter leaves a document with no frontmatter untouched', () => {
  const strip = loadStripFrontmatter();
  const md = '# Title\n\nBody.\n';
  assert.equal(strip(md), md);
});

// Stripping at render keeps st.md raw, which the revision diff and scanDocPaths
// both read — strip there and a frontmatter-only change becomes invisible in the
// diff view, which is the one place a status flip most needs to show up.
test('plan-review strips at render time, leaving st.md raw', () => {
  assert.match(
    TEMPLATE,
    /renderBlocks\(stripFrontmatter\(md\)\)/,
    'stripFrontmatter must wrap the renderBlocks call, not the stored document',
  );
  assert.match(TEMPLATE, /st\.md=md;/, 'st.md must keep the raw text for the diff view');
});
