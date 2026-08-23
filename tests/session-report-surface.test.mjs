// tests/session-report-surface.test.mjs
// Pins the session-report dashboard surface's structure (surface-kit D9).
//
// Every assertion here is an invariant that was measured into existence during
// the D9 redesign, and most of them were found by breaking the page rather than
// by reading it. The render is not null-guarded and the folds are new, so the
// two loudest failures this file guards against are both silent: a removed
// container throws mid-render and leaves the section nav empty with nothing on
// screen to say so, and a collapsed section swallows both navigation and print.
//
// Assertions run against `skills/`, the editable source. The three dist mirrors
// are already byte-compared by dist-mirror / opencode-dist / cursor-dist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML_PATH = path.join(ROOT, 'skills/session-report/template.html');
const SKILL_PATH = path.join(ROOT, 'skills/session-report/SKILL.md');

const html = fs.readFileSync(HTML_PATH, 'utf8');
const skill = fs.readFileSync(SKILL_PATH, 'utf8');

// The surface's own CSS, markup and render — everything outside the three kit
// regions. Assertions about surface rules must never accidentally match kit
// source. Same helper as session-handoff-surface.test.mjs.
function outsideKitRegions(source) {
  const cuts = [
    ['/* tokens:core:start */', '/* tokens:core:end */'],
    ['/* kit:css:start */', '/* kit:css:end */'],
    ['/* kit:js:start */', '/* kit:js:end */'],
  ];
  let out = source;

  for (const [start, end] of cuts) {
    const from = out.indexOf(start);
    const to = out.indexOf(end);
    if (from !== -1 && to !== -1) out = out.slice(0, from) + out.slice(to + end.length);
  }

  return out;
}

const surface = outsideKitRegions(html);
const stripComments = (source) => source.replace(/<!--[\s\S]*?-->/g, '');
const markup = stripComments(html.slice(html.indexOf('<body>'), html.indexOf('<script id="report-data"')));

const SECTION_ORDER = [
  'findings',
  'summary',
  'tokens by project',
  'session timeline by day',
  'most expensive prompts',
  'cache breaks',
  'projects',
  'subagent types',
  'skills',
  'model usage',
  'tool calls',
  'recommendations',
];

test('every section folds, opens by default, and keeps its heading navigable', () => {
  const sections = [...markup.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map((m) => m[0]);

  assert.equal(sections.length, SECTION_ORDER.length, 'the section set is the D9 set');

  const labels = [];
  for (const section of sections) {
    assert.match(section, /data-kit-section/, 'every <section> carries data-kit-section');

    // The fold is a CHILD of the section, not a wrapper around it — three
    // render call sites query `.term-body section`, so the section element has
    // to stay exactly where it is.
    assert.match(section, /<details class="fold" open>/, 'the body is inside an open fold: ' + section.slice(0, 80));

    // C2 — the nav builder labels each chip from h2.childNodes[0], so the
    // heading text must be the h2's first child and any hint <span> must be a
    // later child of that same h2, never a sibling of it.
    const h2 = section.match(/<summary><h2[^>]*>([\s\S]*?)<\/h2><\/summary>/);
    assert.ok(h2, 'the h2 sits inside the summary: ' + section.slice(0, 80));
    assert.doesNotMatch(h2[1], /^\s*</, 'the h2 opens with its label text, not a tag: ' + h2[1]);
    labels.push(h2[1].split('<span')[0].trim());
  }

  assert.deepEqual(labels, SECTION_ORDER, 'section order is the D9 order');
});

test('the trimmed section leaves its container behind', () => {
  // C7, and the reason this file exists. The render does
  // $("prompt-histogram").innerHTML = … with no null guard, so deleting the
  // container throws and kills every render step that follows it — including
  // the section nav, which then builds zero chips. Nothing on the page says so.
  assert.match(markup, /<div id="prompt-histogram" hidden><\/div>/, 'the stub container survives the trim');
  assert.equal(
    /<h2[^>]*>prompt size distribution/.test(markup),
    false,
    'but its section is gone — the stub is a landing pad, not a hidden section',
  );
  assert.match(html, /\$\("prompt-histogram"\)\.innerHTML/, 'the render still writes to it, which is why it stays');
});

test('navigation opens a collapsed target, and only the section fold', () => {
  // C8 — a chip or a deep link into a collapsed section otherwise lands on a
  // 48px closed bar and shows nothing at all.
  const nav = surface.slice(surface.indexOf('const nav = document.getElementById("secnav")'));

  assert.match(nav, /const reveal = \(node\) => \{/, 'the nav block defines reveal');

  const reveal = nav.slice(nav.indexOf('const reveal'), nav.indexOf('const secs ='));
  // Scoped to details.fold on purpose: the drill lists are <details> too, and
  // an unscoped querySelectorAll would expand all hundred prompt rows.
  assert.match(reveal, /querySelectorAll\("details\.fold"\)/, 'reveal is scoped to section folds');
  assert.doesNotMatch(reveal, /querySelectorAll\("details"\)/, 'reveal must not open the drill rows');
  // The fold is a child of the section, so walking up alone finds nothing.
  assert.match(reveal, /parentNode/, 'reveal also walks up, for an element inside a fold');

  assert.match(nav, /chip\.addEventListener\("click", \(\) => \{\s*reveal\(sec\);/, 'a chip reveals before it scrolls');
  assert.match(nav, /window\.addEventListener\("hashchange", jump\)/, 'hashchange reveals');
  // A hash present at load never fires hashchange, and the ids do not exist
  // until the nav builder has assigned them.
  assert.match(nav, /window\.addEventListener\("hashchange", jump\);\s*jump\(\);/, 'and the load case runs once directly');

  // The third route into a section is kit:js's `g` + digit, which indexes
  // [data-kit-section] and never touches the nav — so wiring reveal into the
  // chip handler alone closed two of three doors and left this one shut.
  assert.match(nav, /document\.addEventListener\(\s*"keydown",/, 'the keyboard route is handled');
  assert.match(nav, /reveal\(document\.querySelectorAll\("\[data-kit-section\]"\)\[Number\(e\.key\) - 1\]\)/, 'and reveals the indexed section');
  assert.match(nav, /pendingG = e\.key === "g"/, 'mirroring kit:js\'s two-key sequence');
  assert.match(nav, /el\.isContentEditable === true/, 'with kit:js\'s own typing guard, so a filter box stays typeable');
  assert.match(nav, /\},\s*true,\s*\)/, 'in the capture phase, so the fold opens before kit:js scrolls');
});

test('printing opens every fold and puts back exactly what it opened', () => {
  // C9 — a collapsed <details> prints nothing at all, so without this a printed
  // report silently loses whole sections.
  assert.match(surface, /window\.addEventListener\("beforeprint"/, 'beforeprint is handled');
  assert.match(surface, /window\.addEventListener\("afterprint"/, 'afterprint is handled');

  const before = surface.slice(surface.indexOf('"beforeprint"'), surface.indexOf('"afterprint"'));
  assert.match(before, /filter\(\(d\) => !d\.open\)/, 'it remembers which folds were closed');
  assert.match(before, /querySelectorAll\("details\.fold"\)/, 'and only touches section folds');
});

test('the surface prints as one column, with the rail released', () => {
  // The strip and the rail are both sticky and the shell is two columns; all
  // three survive into print otherwise, and the rail overlaps the body.
  const print = surface.match(/@media print \{[\s\S]*?\n {6}\}/);

  assert.ok(print, 'the surface defines its own @media print block');
  assert.match(print[0], /\.shell \{[^}]*display:\s*block/, 'the two-column shell collapses');
  assert.match(print[0], /\.rail \{[^}]*position:\s*static/, 'the sticky rail is released');
  assert.match(print[0], /\.strip \{[^}]*position:\s*static/, 'so is the sticky strip');
});

test('data-kit-chrome marks the nav box and nothing that carries a finding', () => {
  // Q13 — [data-kit-chrome] is print suppression. On Direction C the strip
  // holds the three anomaly figures and the rail holds the project and per-day
  // comparison, which together ARE the report's stated job: a printed report
  // wearing that attribute on either would come out with its headline removed.
  const tagged = [...markup.matchAll(/<(\w+)[^>]*data-kit-chrome[^>]*>/g)].map((m) => m[0]);

  assert.equal(tagged.length, 2, 'exactly two elements are marked as chrome');
  assert.ok(
    tagged.some((t) => t.includes('class="kit-theme"')),
    'the theme toggle is chrome',
  );
  assert.ok(
    tagged.some((t) => t.includes('class="railbox"')),
    'and so is the rail box holding the section nav',
  );
  // Read the actual opening tags rather than pattern-matching around them: an
  // attribute-order change would slip past a "does this substring appear" test
  // and quietly delete these blocks from every printout.
  const stripTag = markup.match(/<div class="strip"[^>]*>/);
  assert.ok(stripTag, 'the anomaly strip exists');
  assert.equal(stripTag[0].includes('data-kit-chrome'), false, 'the anomaly strip prints');

  const railBoxes = [...markup.matchAll(/<div class="railbox"[^>]*>([\s\S]*?)<div class="rail-h"[^>]*>([^<]*)<\/div>/g)];
  assert.equal(railBoxes.length, 3, 'the rail has its three blocks');
  for (const [tag, , label] of railBoxes.map((m) => [m[0].slice(0, m[0].indexOf('>') + 1), m[1], m[2]])) {
    if (label === 'sections') continue;
    assert.equal(tag.includes('data-kit-chrome'), false, 'the ' + label + ' comparison block prints');
  }
});

test('the sticky offsets are measured, not guessed', () => {
  // 3.25rem was 9px short of the strip's real height, which slid the rail under
  // it on every scroll — and the strip wraps at narrow widths, so no constant
  // is right for long. The CSS value stays as the pre-JS fallback.
  assert.match(surface, /--strip-h:\s*3\.25rem/, 'a CSS fallback exists');
  assert.match(surface, /top:\s*var\(--strip-h\)/, 'the rail sticks below the strip');
  assert.match(surface, /max-height:\s*calc\(100dvh - var\(--strip-h\)\)/, 'and is bounded by it');
  assert.match(surface, /scroll-margin-top:\s*var\(--strip-h\)/, 'deep links clear it too');
  assert.match(surface, /setProperty\("--strip-h", strip\.offsetHeight/, 'the render measures the real height');
  assert.match(surface, /new ResizeObserver\(sync\)\.observe\(strip\)/, 'and re-measures when the strip reflows');
});

test('the rail stays reachable and the layout stacks when narrow', () => {
  assert.match(surface, /\.rail \{[\s\S]*?max-height:\s*calc\(100dvh[^)]*\)/, 'rail is height-bounded');
  assert.match(surface, /\.rail \{[\s\S]*?overflow-y:\s*auto/, 'rail scrolls within itself');
  assert.match(surface, /@media \(max-width: 62rem\)/, 'the shell stacks at session-handoff\'s breakpoint');
  assert.match(surface, /min-height:\s*100dvh/, 'dvh, not vh');
  assert.equal(/[^d]100vh/.test(surface), false, 'no bare 100vh');
});

test('no column this redesign adds floors at min-content', () => {
  // Q14 — a bare `1fr` resolves to minmax(auto, 1fr), and auto-as-minimum is
  // min-content. The rail's labels are filesystem paths, which is the worst
  // case for it, and the ellipsis hides the blowout rather than preventing it.
  // Scoped to the rules D9 introduces: six pre-existing ch-based grids in the
  // drill and bar rows still use a bare 1fr and are a separate change.
  for (const selector of ['.shell', '.proj', '#hero', '#overall-grid']) {
    const rule = surface.match(new RegExp('\\' + selector.replace('#', '#') + ' \\{[^}]*\\}'));
    assert.ok(rule, 'the surface defines ' + selector);
    const columns = rule[0].match(/grid-template-columns:\s*([^;]+);/);
    if (!columns) continue;
    assert.equal(
      /(^|\s)1fr(\s|$)/.test(columns[1]),
      false,
      selector + ' must use minmax(0, 1fr), not a bare 1fr: ' + columns[1].trim(),
    );
  }
});

test('figures are tabular by default, not by exception', () => {
  // F9. The `font` shorthand resets font-variant-numeric, so the longhand has
  // to come after it in the same rule or it is silently discarded.
  const body = surface.match(/\n {6}body \{[^}]*\}/);

  assert.ok(body, 'the surface defines a body rule');
  assert.match(body[0], /font-variant-numeric:\s*tabular-nums/, 'body opts into tabular figures');
  assert.ok(
    body[0].indexOf('font:') < body[0].indexOf('font-variant-numeric:'),
    'and does so after the font shorthand, which would otherwise reset it',
  );
  assert.match(surface, /th \{[^}]*font-variant-numeric:\s*normal/, 'th opts back out — a header is a label');
});

test('the surface extension tokens follow the theme toggle, not only the system', () => {
  // Docket #48 / Q16. The extension tokens are dark-first like the core, so
  // their light values are an override. Written as a bare media query, clicking
  // Dark on a light system flipped every core token but left --secondary (and
  // so --titlebar) cream: the media query still matched. Tokens aliasing a core
  // token followed the toggle and literal hexes did not, so the card inverted
  // and its own header did not.
  assert.match(
    surface,
    /@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme="dark"\]\)/,
    'the system-light block must exclude an explicit dark override',
  );
  assert.match(surface, /:root\[data-theme="light"\] \{/, 'an explicit light override exists');

  const guarded = surface.match(/:root:not\(\[data-theme="dark"\]\) \{([^}]*)\}/);
  const explicit = surface.match(/:root\[data-theme="light"\] \{([^}]*)\}/);

  // Compare declarations, not just token names: the light palette is written
  // twice, so a names-only check would pass while the two copies drifted to
  // different values — the same toggle-vs-system disagreement this catches.
  const declarations = (block) =>
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => m[1] + ':' + m[2].trim()).sort();

  assert.deepEqual(
    declarations(guarded[1]),
    declarations(explicit[1]),
    'both light blocks must declare the same tokens with the same values',
  );
});

test('per-row model attribution survives a report with no pricing', () => {
  // A Codex report without prices has costTotal 0 on every model, so ranking on
  // cost alone would return whichever key happened to be enumerated first.
  const top = surface.slice(surface.indexOf('const topModel'), surface.indexOf('function statRows'));

  assert.match(top, /entries\.some\(\(\[, m\]\) => \(m\.costTotal \|\| 0\) > 0\)/, 'it checks whether prices exist');
  assert.match(top, /priced \? m\.costTotal \|\| 0 : tokens\(m\)/, 'and falls back to tokens when they do not');
  assert.match(surface, /\{ h: "top model" \}/, 'the column is declared');
});

test('the fill instructions match the markup the agent edits', () => {
  // The two agent-filled blocks moved inside their <details> with the rest of
  // the section bodies. If the markup moves and SKILL.md does not, every future
  // report is filled slightly wrong and nothing fails.
  for (const marker of ['<!-- AGENT: anomalies -->', '<!-- AGENT: optimizations -->']) {
    assert.ok(html.includes(marker), 'the template carries ' + marker);
    assert.ok(skill.includes(marker.replace('<!-- ', '`<!-- ').replace(' -->', ' -->`')), 'SKILL.md names ' + marker);
  }

  assert.match(skill, /details class="fold" open/, 'SKILL.md describes the fold the markers now sit inside');
  assert.match(skill, /#prompt-histogram/, 'and warns against deleting the unguarded stub container');

  // "More comprehensive recommendations" is a fill-instruction change by
  // definition — vague instructions are what produced the empty default.
  for (const dataPath of [
    'overall.cache_breaks_over_100k',
    'overall.subagent.avg_tokens_per_call',
    'by_project[].efficiency_score',
    'overall.input_tokens.pct_cached',
  ]) {
    assert.ok(skill.includes(dataPath), 'the recommendations checklist names ' + dataPath);
  }
});
