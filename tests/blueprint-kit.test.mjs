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
