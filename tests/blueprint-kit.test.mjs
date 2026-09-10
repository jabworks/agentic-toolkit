import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const KIT_DIR = path.join(REPO_ROOT, 'skills', 'blueprint', 'references');

// Blueprint's mockups ship into OTHER repos, where scripts/tokens/core.css
// does not exist — so the skill carries its own copy of the token core and
// tells the agent to paste it. A carried copy is a drift bomb: the surface-kit
// core moves (it did five times in Aug 2026) and blueprint quietly keeps
// generating last month's design language. blueprint can't join check-tokens'
// target list — every target there carries all three regions, and kit:js has
// no meaning in a markdown kit — so the coupling is asserted here instead.

test('blueprint token-core.css is byte-identical to scripts/tokens/core.css', () => {
  const kit = fs.readFileSync(path.join(KIT_DIR, 'token-core.css'), 'utf8');
  const core = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'tokens', 'core.css'), 'utf8');
  assert.equal(kit, core, 'skills/blueprint/references/token-core.css drifted from scripts/tokens/core.css — copy it over');
});

// The kit's two mode blocks, extracted by the heading that introduces each.
// The wireframe-kit contract (rule 2): wireframe mode is neutral — semantic,
// categorical, and elevation tokens are render-mode vocabulary. Without this,
// "wireframe stays structural" is a hope; with it, a chromatic token creeping
// into the wireframe block is a failing build.
function modeBlock(md, heading) {
  const at = md.indexOf(`## ${heading}`);
  assert.ok(at >= 0, `wireframe-kit.md lost its "## ${heading}" section`);
  const fence = md.indexOf('```css', at);
  const end = md.indexOf('```', fence + 6);
  assert.ok(fence > at && end > fence, `no css fence under "## ${heading}"`);
  return md.slice(fence + 6, end);
}

const NEUTRAL_ALLOWLIST = new Set([
  // colour roles a wireframe may use
  'background', 'card', 'foreground', 'muted', 'muted-foreground',
  'border', 'input', 'accent', 'subtle',
  // annotation callouts only (rule 2)
  'primary', 'primary-muted', 'primary-text', 'primary-foreground', 'primary-hover',
  // the full non-colour ramps
  'mono', 'sans',
  'text-2xs', 'text-xs', 'text-sm', 'text-base', 'text-md', 'text-lg',
  'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
  'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed',
  'tracking-tight', 'tracking-normal', 'tracking-wide',
  'space-1', 'space-2', 'space-3', 'space-4', 'space-5', 'space-6', 'space-8', 'space-12',
  'radius-sm', 'radius', 'radius-md', 'radius-lg', 'radius-full',
  'dur-fast', 'dur', 'dur-slow', 'ease-out', 'ease-spring',
]);

const tokensIn = (css) => [...css.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]);

test('wireframe mode CSS references only neutral-allowlisted tokens', () => {
  const md = fs.readFileSync(path.join(KIT_DIR, 'wireframe-kit.md'), 'utf8');
  const bad = tokensIn(modeBlock(md, 'Wireframe Mode CSS')).filter((t) => !NEUTRAL_ALLOWLIST.has(t));
  assert.deepEqual([...new Set(bad)], [], 'chromatic tokens in the wireframe block — that vocabulary is render-mode only');
});

test('every token either mode CSS references exists in the core', () => {
  // A typo like var(--boarder) resolves to nothing and renders as the
  // property's initial value — invisibly wrong, same silence class as a
  // misspelled skill name in the trigger corpus.
  const core = fs.readFileSync(path.join(KIT_DIR, 'token-core.css'), 'utf8');
  const defined = new Set([...core.matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1]));
  const md = fs.readFileSync(path.join(KIT_DIR, 'wireframe-kit.md'), 'utf8');
  const diagram = fs.readFileSync(path.join(KIT_DIR, 'diagram-kit.md'), 'utf8');
  const used = [
    ...tokensIn(modeBlock(md, 'Wireframe Mode CSS')),
    ...tokensIn(modeBlock(md, 'Render Mode CSS')),
    ...tokensIn(diagram),
  ];
  const bad = [...new Set(used.filter((t) => !defined.has(t)))];
  assert.deepEqual(bad, [], 'kit CSS references tokens the core never defines');
});

// The Visual Language section's fenced blocks, carried copies of the same
// kind as the token core above: diagram-kit.md ships into other repos and
// an agent pastes these blocks verbatim, so a drift here is a drift bomb the
// same way a stale token-core.css is. Modeled on modeBlock — a "### <heading>"
// line, then the first html fence after it, tolerating prose in between.
function kitFence(md, heading) {
  const at = md.indexOf(`### ${heading}`);
  assert.ok(at >= 0, `diagram-kit.md lost its "### ${heading}" section`);
  const fence = md.indexOf('```html', at);
  const end = md.indexOf('```', fence + 7);
  assert.ok(fence > at && end > fence, `no html fence under "### ${heading}"`);
  return md.slice(fence + 7, end);
}

const EXPECTED_MARK_IDS = ['mark-store', 'mark-external', 'mark-ui', 'mark-actor', 'mark-queue', 'mark-batch'];

test('the Marks fence carries exactly the six mark ids, each a stroke-only currentColor path', () => {
  const md = fs.readFileSync(path.join(KIT_DIR, 'diagram-kit.md'), 'utf8');
  const marks = kitFence(md, 'Marks');

  const ids = [...marks.matchAll(/<g id="(mark-[a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    ids,
    EXPECTED_MARK_IDS,
    'the Marks fence drifted from the six-mark set — service has no mark and boundary uses its title strip, so exactly store/external/ui/actor/queue/batch',
  );

  const paths = [...marks.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(paths.length > 0, 'no <path> found inside the Marks fence');
  for (const p of paths) {
    assert.match(p, /fill="none"/, `a mark path with a real fill renders as a blob: ${p}`);
    assert.match(p, /stroke="currentColor"/, `a mark path with a fixed colour ignores the role: ${p}`);
  }
});

test('the Legend fence has a .legend root with at most four row divs and a style block', () => {
  const md = fs.readFileSync(path.join(KIT_DIR, 'diagram-kit.md'), 'utf8');
  const legend = kitFence(md, 'Legend');

  assert.match(
    legend.trim(),
    /^<div class="legend">/,
    'the Legend fence must open with <div class="legend"> — that is the root the checker (and a carrying repo) expects',
  );

  const allDivOpens = [...legend.matchAll(/<div(?:\s[^>]*)?>/g)].length;
  const rowCount = allDivOpens - 1; // minus the .legend root itself
  assert.ok(
    rowCount >= 1 && rowCount <= 4,
    `Legend fence has ${rowCount} row divs — at most four (role, kind, edge, accent) per the five-role cap`,
  );

  assert.match(legend, /<style>[\s\S]*<\/style>/, 'the Legend fence must carry its own <style> block');
});

const EXPECTED_ROLES = [
  ['frontend runtime', '--cat-4'],
  ['API / service', '--cat-2'],
  ['persistence', '--cat-3'],
  ['external system', '--cat-7'],
  ['messaging / queue / bus', '--cat-8'],
  ['actor / user', '--cat-6'],
  ['batch / scheduler', '--cat-5'],
  ['unassigned', '--cat-other'],
];

test('the Roles table lists exactly the eight fixed role-to-slot pairs, in order', () => {
  const md = fs.readFileSync(path.join(KIT_DIR, 'diagram-kit.md'), 'utf8');
  const at = md.indexOf('### Roles');
  assert.ok(at >= 0, 'diagram-kit.md lost its "### Roles" section');
  const nextHeading = md.indexOf('\n### ', at + 1);
  const section = md.slice(at, nextHeading === -1 ? undefined : nextHeading);

  // Parse the markdown table rows themselves — grepping the prose for a
  // token mention would pass even if the table's own slot column drifted.
  const rows = section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'))
    .slice(2); // drop the header row and the |---|---|---| separator

  const parsed = rows.map((line) => {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

    return [cells[0], cells[1].replace(/`/g, '')];
  });

  assert.deepEqual(
    parsed,
    EXPECTED_ROLES,
    'the Roles table drifted from the fixed role slots — a per-diagram choice is decoration, a fixed table is a language',
  );
});

const SCRIPT = path.join(REPO_ROOT, 'skills', 'blueprint', 'references', 'diagram-check.mjs');
const { checkSvg } = await import(SCRIPT);

test('the Marks fence, pasted into a minimal diagram, is checker-inert', () => {
  const md = fs.readFileSync(path.join(KIT_DIR, 'diagram-kit.md'), 'utf8');
  const marks = kitFence(md, 'Marks');

  // Two nodes, one labeled edge between them, and a mark placed on one node
  // via <use> — the same shapes checkSvg's own "clean" fixtures use. This is
  // the pin that the checker's defs skip (specs/blueprint quirks Q10, Q11)
  // and the kit's block agree: the marks fence, wrapped exactly as the kit's
  // own prose instructs (pasted into <defs>), must never itself read as a
  // finding.
  const svg = `<svg viewBox="0 0 300 200" font-size="13">
  <defs>
${marks}
  </defs>
  <rect x="20" y="80" width="80" height="40" fill="#fff" stroke="#1b1f23" />
  <use href="#mark-store" x="34" y="92" width="18" height="16" style="color:var(--cat-4)"/>
  <rect x="200" y="80" width="80" height="40" fill="#fff" stroke="#1b1f23" />
  <line x1="100" y1="100" x2="200" y2="100" stroke="#8a8f98" />
  <text x="150" y="94" text-anchor="middle" font-size="11">calls</text>
</svg>`;

  assert.deepEqual(checkSvg(svg), [], 'the Marks fence, pasted verbatim into <defs>, must not itself trip any finding');
});
