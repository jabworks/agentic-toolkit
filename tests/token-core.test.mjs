import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyCore,
  checkSurface,
  checkTokens,
  CORE_PATH,
  END,
  expectedBody,
  findRegion,
  readCore,
  START,
  SURFACES,
} from '../scripts/check-tokens.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const CORE = readCore();

const wrap = (body, { before = '', after = '' } = {}) => `${before}${START}${body}${END}${after}`;

// ---------------------------------------------------------------------------
// The live surfaces
// ---------------------------------------------------------------------------

test('every shipped surface carries the canonical core', () => {
  const { ok, findings } = checkTokens();

  assert.equal(ok, true, findings.map((f) => `${f.file}: ${f.reason}`).join('\n'));
});

test('the surface registry is literal and every entry exists on disk', () => {
  assert.ok(SURFACES.length > 0);

  for (const rel of SURFACES) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, rel)), `${rel} is registered but missing`);
  }
});

// The core is inlined into a JS template literal in docket-render.mjs. A
// backtick or an interpolation opener would not break the CSS surfaces at all —
// it would break exactly one file, at runtime. Guard it at the source.
test('the canonical core is safe to inline into a template literal', () => {
  const core = fs.readFileSync(path.join(REPO_ROOT, CORE_PATH), 'utf8');

  assert.equal(core.includes('`'), false, 'core.css contains a backtick');
  assert.equal(core.includes('${'), false, 'core.css contains an interpolation opener');
});

// Type, space, radius and motion are theme-invariant — a 4px gap and a 200ms
// ease do not change with the palette, so they belong in the base block only.
// Colour and elevation do vary: a shadow tuned for the #111110 ground reads as
// dirt on #f6f5ef. Stated as a rule rather than a frozen list, because the list
// was ['--mono', '--radius'] until the scale landed and a list has to be edited
// every time the core grows — which is the moment the check stops being read.
const THEME_INVARIANT = /^--(mono|sans|text-|leading-|tracking-|space-|radius|dur|ease-)/;

test('theme-invariant tokens stay in the base block; theme-varying ones are restated', () => {
  const split = CORE.indexOf('@media');

  // [a-z0-9-] not [a-z-]: --text-2xs and --space-1 carry digits, and the old
  // pattern silently skipped every token that did.
  const names = (chunk) => new Set([...chunk.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const base = names(CORE.slice(0, split));
  const overrides = names(CORE.slice(split));

  const wronglyRestated = [...overrides].filter((n) => THEME_INVARIANT.test(n)).sort();
  const missingOverride = [...base].filter((n) => !THEME_INVARIANT.test(n) && !overrides.has(n)).sort();

  assert.deepEqual(wronglyRestated, [], 'theme-invariant token restated inside a theme block');
  assert.deepEqual(missingOverride, [], 'theme-varying token has no light override');
});

// The categorical ramp (D7) is the one group whose VALUES carry the whole
// point: the base block is dark-first, so writing the light row into `:root`
// ships cream hues on the #111110 ground. Nothing else in this suite would
// notice — the checks above compare token *names*, and check-tokens.mjs is
// byte-exact against core.css, so neither validates a value.
test('the categorical ramp is complete and per-theme distinct', () => {
  const CAT = ['--cat-1', '--cat-2', '--cat-3', '--cat-4', '--cat-5', '--cat-6', '--cat-7', '--cat-8', '--cat-other'];

  const blocks = {
    base: CORE.slice(0, CORE.indexOf('@media')),
    media: CORE.match(/:root:not\(\[data-theme="dark"\]\) \{([\s\S]*?)\n {2}\}/)[1],
    stamped: CORE.match(/:root\[data-theme="light"\] \{([\s\S]*?)\n\}/)[1],
  };

  const valueOf = (chunk, name) => (chunk.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`)) || [])[1];

  for (const name of CAT) {
    for (const [label, chunk] of Object.entries(blocks)) {
      assert.ok(valueOf(chunk, name), `${name} missing from the ${label} block`);
    }

    assert.notEqual(
      valueOf(blocks.base, name),
      valueOf(blocks.media, name),
      `${name} is identical in the dark and light blocks — one row was copied over the other`,
    );
    assert.equal(
      valueOf(blocks.media, name),
      valueOf(blocks.stamped, name),
      `${name} disagrees between the two light blocks`,
    );
  }

  // Polarity: the dark row is the one that sits beside --background: #111110.
  assert.match(blocks.base, /--background: #111110/);
  assert.equal(valueOf(blocks.base, '--cat-1'), '#cf686e', 'the base block must carry the DARK ramp (see quirks Q10)');
  assert.equal(valueOf(blocks.media, '--cat-1'), '#b04d54', 'the light blocks must carry the LIGHT ramp');
});

test('both light blocks define the same token set', () => {
  // The OS-default block and the explicitly-stamped block must agree, or the
  // toggle and the system preference disagree about what "light" means.
  const media = CORE.match(/:root:not\(\[data-theme="dark"\]\) \{([\s\S]*?)\n {2}\}/);
  const stamped = CORE.match(/:root\[data-theme="light"\] \{([\s\S]*?)\n\}/);

  assert.ok(media, 'core.css has no OS-default light block');
  assert.ok(stamped, 'core.css has no [data-theme="light"] block');

  const names = (chunk) => [...chunk.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]).sort();

  assert.deepEqual(names(media[1]), names(stamped[1]));
});

// ---------------------------------------------------------------------------
// Marker handling — a missing marker is not mechanically fixable
// ---------------------------------------------------------------------------

test('a missing marker is reported rather than silently skipped', () => {
  assert.match(findRegion('body { color: red }', 'x').problem, /missing the start marker/);
  assert.match(findRegion(`${START}\n${CORE}`, 'x').problem, /missing the end marker/);
});

test('duplicate or inverted markers are rejected', () => {
  const body = expectedBody(CORE);

  assert.match(findRegion(`${END}${body}${START}`, 'x').problem, /precedes/);
  assert.match(findRegion(`${wrap(body)}${START}`, 'x').problem, /duplicate start marker/);
  assert.match(findRegion(`${wrap(body)}${END}`, 'x').problem, /duplicate end marker/);
});

test('applyCore refuses a file with no markers instead of appending one', () => {
  const src = 'body { color: red }';
  const result = applyCore(src, CORE, 'x');

  assert.equal(result.changed, false);
  assert.equal(result.src, src);
  assert.match(result.problem, /missing/);
});

// ---------------------------------------------------------------------------
// Byte-exact comparison and --fix
// ---------------------------------------------------------------------------

test('a single altered value fails the check', () => {
  const drifted = expectedBody(CORE).replace('#111110', '#000000');

  assert.equal(checkSurface(wrap(drifted), CORE, 'x').ok, false);
});

test('reindenting the region fails the check — the region has one canonical form', () => {
  const indented = expectedBody(CORE).replace(/^ {2}--background/m, '    --background');

  assert.equal(checkSurface(wrap(indented), CORE, 'x').ok, false);
});

test('--fix restores a drifted region and is idempotent', () => {
  const src = wrap(expectedBody(CORE).replace('#111110', '#000000'));

  const first = applyCore(src, CORE, 'x');
  assert.equal(first.changed, true);
  assert.equal(checkSurface(first.src, CORE, 'x').ok, true);

  const second = applyCore(first.src, CORE, 'x');
  assert.equal(second.changed, false, '--fix churns a file that already conforms');
  assert.equal(second.src, first.src);
});

test('--fix replaces only the marked region, never the surrounding file', () => {
  const before = '<style>\n:root { --hl: gold; }\n';
  const after = '\n:root { --chip: silver; }\n</style>\n';
  const src = wrap(expectedBody(CORE).replace('#978365', '#ffffff'), { before, after });

  const result = applyCore(src, CORE, 'x');

  assert.equal(result.changed, true);
  assert.ok(result.src.startsWith(before), 'content before the start marker was modified');
  assert.ok(result.src.endsWith(after), 'content after the end marker was modified');
  assert.equal(checkSurface(result.src, CORE, 'x').ok, true);
});

test('extension tokens outside the markers survive --fix', () => {
  const extensions = '\n:root { --hl: rgba(255, 202, 22, 0.30); --hl-active: rgba(255, 202, 22, 0.55); }\n';
  const src = wrap(expectedBody(CORE).replace('#191918', '#123456'), { after: extensions });

  const result = applyCore(src, CORE, 'x');

  assert.ok(result.src.includes('--hl-active: rgba(255, 202, 22, 0.55)'));
  assert.equal(result.src.includes('#123456'), false);
});
