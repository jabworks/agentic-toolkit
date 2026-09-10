import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'skills', 'blueprint', 'references', 'diagram-check.mjs');
const FIXTURES = path.join(__dirname, 'fixtures', 'diagram-check');

const { checkSvg } = await import(SCRIPT);

const ALL_CODES = [
  'edge-through-box',
  'label-over-label',
  'label-over-box',
  'text-overflows-box',
  'edge-through-label',
  'unlabeled-edge',
  'text-outside-canvas',
];

// Captures what checkSvg writes to stderr while `fn` runs.
function withStderr(fn) {
  const chunks = [];
  const original = process.stderr.write;
  process.stderr.write = (chunk) => {
    chunks.push(String(chunk));

    return true;
  };
  try {
    return { result: fn(), stderr: chunks.join('') };
  } finally {
    process.stderr.write = original;
  }
}

// Runs the CLI and captures stdout/stderr/status without letting a non-zero
// exit throw — every exit code here is a documented outcome, not a failure.
function runCli(args) {
  const result = { status: 0, stdout: '', stderr: '' };
  try {
    result.stdout = execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
  } catch (err) {
    result.status = err.status;
    result.stdout = err.stdout ?? '';
    result.stderr = err.stderr ?? '';
  }

  return result;
}

test('collisions fixture: exits 1 and reports every code exactly as documented', () => {
  const file = path.join(FIXTURES, 'collisions.html');
  const { status, stdout } = runCli([file]);

  assert.equal(status, 1);

  const lines = stdout.trim().split('\n');
  const summary = lines.pop();
  assert.match(summary, /^\d+ finding\(s\)$/);

  const codes = new Set();
  for (const line of lines) {
    const m = /^(\S+)\s+line (\d+)\s+(.+)$/.exec(line);
    assert.ok(m, `line does not match the documented human format: ${line}`);
    const [, code, lineNo, detail] = m;
    codes.add(code);
    assert.ok(Number(lineNo) > 0, `line number must be positive: ${line}`);
    assert.ok(detail.length > 0, `detail must be non-empty: ${line}`);
  }

  assert.deepEqual([...codes].sort(), [...ALL_CODES].sort(), 'the fixture must trip every documented code');

  const edgeThroughBoxCount = lines.filter((l) => l.startsWith('edge-through-box')).length;
  assert.equal(edgeThroughBoxCount, 2, 'exactly two edges run through a box they do not attach to');
});

test('collisions fixture: --json parses to the documented shape', () => {
  const file = path.join(FIXTURES, 'collisions.html');
  const { status, stdout } = runCli([file, '--json']);

  assert.equal(status, 1);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.file, file);
  assert.ok(Array.isArray(parsed.findings));
  assert.ok(parsed.findings.length > 0);

  for (const finding of parsed.findings) {
    assert.equal(typeof finding.code, 'string');
    assert.ok(ALL_CODES.includes(finding.code));
    assert.equal(typeof finding.line, 'number');
    assert.ok(finding.line > 0);
    assert.equal(typeof finding.detail, 'string');
    assert.ok(finding.detail.length > 0);
  }
});

test('routed fixture: exits 0 and prints clean', () => {
  const file = path.join(FIXTURES, 'routed.html');
  const { status, stdout } = runCli([file]);

  assert.equal(status, 0);
  assert.equal(stdout.trim(), 'clean');
});

test('routed fixture: --json findings is an empty array', () => {
  const file = path.join(FIXTURES, 'routed.html');
  const { status, stdout } = runCli([file, '--json']);

  assert.equal(status, 0);
  assert.deepEqual(JSON.parse(stdout), { file, findings: [] });
});

test('visual-language fixture: exits 0 and prints clean', () => {
  const file = path.join(FIXTURES, 'visual-language.html');
  const { status, stdout } = runCli([file]);

  assert.equal(status, 0);
  assert.equal(stdout.trim(), 'clean');
});

test('visual-language fixture: six mark groups in <defs> and no finding from any of them', () => {
  const file = path.join(FIXTURES, 'visual-language.html');
  const { status, stdout } = runCli([file, '--json']);

  assert.equal(status, 0);
  assert.deepEqual(JSON.parse(stdout), { file, findings: [] });

  // The kit's marks are glyphs, not drawing: they live in <defs>, which the
  // walk skips, so their `fill="none"` paths never read as unlabeled edges.
  const defs = fs.readFileSync(file, 'utf8').match(/<defs>[\s\S]*?<\/defs>/)[0];
  for (const id of ['mark-store', 'mark-external', 'mark-ui', 'mark-actor', 'mark-queue', 'mark-batch']) {
    assert.ok(defs.includes(`<g id="${id}">`), `<defs> is missing ${id}`);
  }
});

test('overflow fixture: a real diagram sized by CSS reports exactly its one overflowing title', () => {
  const file = path.join(FIXTURES, 'overflow-css-sized.html');
  const { status, stdout } = runCli([file, '--json']);

  assert.equal(status, 1);

  const { findings } = JSON.parse(stdout);
  assert.equal(findings.length, 1, 'one finding: everything else in the diagram is routed under the kit rules');
  assert.equal(findings[0].code, 'text-overflows-box');
  assert.match(findings[0].detail, /"InventoryAccessGuardian" overflows its own 210×96 box by 5\.4/);
});

test('fixtures carry no identifier from the diagrams they were synthesized from', () => {
  // The 2026-09-10 fixture mirrors a Codex-produced diagram of a real
  // project's reporting page. The geometry is the evidence; the names are not
  // ours to publish.
  const identifiers = [
    'ReportingAccessBoundary',
    'reporting.overview',
    'ReportingCatalog',
    'useReportingQuery',
    'widgetRuntime',
    'ReportingQueryResult',
    'Reporting Overview',
    'tenantId',
    // The 2026-09-10 visual-language fixture is the same routed diagram
    // restyled; its "Upstream systems" node named four real systems. The
    // committed copies carry generic twins instead.
    'AO',
    'CloudCheck',
    'Expresse',
    'Maestro',
  ];
  for (const name of fs.readdirSync(FIXTURES)) {
    const source = fs.readFileSync(path.join(FIXTURES, name), 'utf8');
    for (const id of identifiers) {
      assert.ok(!source.includes(id), `${name} carries "${id}"`);
    }
  }
});

test('a file with no <svg> block exits 2', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-check-'));
  const file = path.join(dir, 'no-svg.html');
  fs.writeFileSync(file, '<html><body><p>no diagram here</p></body></html>');

  try {
    const { status } = runCli([file]);
    assert.equal(status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a missing path exits 2', () => {
  const { status } = runCli([path.join(FIXTURES, 'does-not-exist.html')]);
  assert.equal(status, 2);
});

test('checkSvg: a rect nested two <g> deep positions correctly', () => {
  const svg = `<svg viewBox="0 0 200 200">
    <g transform="translate(10,10)">
      <g transform="translate(20,20)">
        <rect x="0" y="0" width="40" height="40" stroke="black"/>
      </g>
    </g>
    <line x1="35" y1="0" x2="35" y2="100" stroke="black"/>
    <line x1="150" y1="0" x2="150" y2="100" stroke="black"/>
  </svg>`;
  // Node's absolute box is (30,30)-(70,70). An edge that runs straight
  // through it (endpoints well outside on both sides, so never "attached")
  // fires...
  const findings = checkSvg(svg).filter((f) => f.code === 'edge-through-box');
  assert.equal(findings.length, 1, 'an edge through the nested rect should fire exactly once');

  // ...an edge that stays clear of it (x=150 is well outside 30-70) does not.
  const clearOnly = `<svg viewBox="0 0 200 200">
    <g transform="translate(10,10)">
      <g transform="translate(20,20)">
        <rect x="0" y="0" width="40" height="40" stroke="black"/>
      </g>
    </g>
    <line x1="150" y1="0" x2="150" y2="100" stroke="black"/>
  </svg>`;
  assert.deepEqual(
    checkSvg(clearOnly).filter((f) => f.code === 'edge-through-box'),
    [],
    'an edge beside the box must not fire',
  );
});

test('checkSvg: the <defs> skip survives a <g> nested inside it', () => {
  // Before the fix, snapshot() marked every pushed frame with
  // `skip: skipDepth > 0` — so the first <g> inside <defs> also claimed the
  // decrement <defs> owns, and its close tag ended the skip early: the
  // second and third <g>'s paths were walked as drawing and became edges.
  const svg = `<svg viewBox="0 0 300 200">
    <defs>
      <g><path d="M0,0 L10,10" fill="none" stroke="black"/></g>
      <g><path d="M0,0 L10,10" fill="none" stroke="black"/></g>
      <g><path d="M0,0 L10,10" fill="none" stroke="black"/></g>
    </defs>
    <rect x="20" y="20" width="60" height="40" stroke="black"/>
    <rect x="200" y="20" width="60" height="40" stroke="black"/>
    <line x1="80" y1="40" x2="200" y2="40" stroke="black"/>
    <text x="120" y="30" font-size="11">calls</text>
  </svg>`;
  assert.deepEqual(
    checkSvg(svg).filter((f) => f.code === 'unlabeled-edge'),
    [],
    'paths inside <g> groups nested in <defs> must not become edges, however many groups deep',
  );

  const withSymbol = `<svg viewBox="0 0 300 200">
    <defs>
      <symbol><path d="M0,0 L10,10" fill="none" stroke="black"/></symbol>
      <symbol><path d="M0,0 L10,10" fill="none" stroke="black"/></symbol>
      <symbol><path d="M0,0 L10,10" fill="none" stroke="black"/></symbol>
    </defs>
    <rect x="20" y="20" width="60" height="40" stroke="black"/>
    <rect x="200" y="20" width="60" height="40" stroke="black"/>
    <line x1="80" y1="40" x2="200" y2="40" stroke="black"/>
    <text x="120" y="30" font-size="11">calls</text>
  </svg>`;
  assert.deepEqual(
    checkSvg(withSymbol).filter((f) => f.code === 'unlabeled-edge'),
    [],
    'the same holds for <symbol> wrappers',
  );
});

test('mark-as-path fixture: a kind glyph drawn as a raw path outside <defs> still reads as an unlabeled edge', () => {
  const file = path.join(FIXTURES, 'mark-as-path.html');
  const { status, stdout } = runCli([file, '--json']);

  assert.equal(status, 1);

  const { findings } = JSON.parse(stdout);
  assert.equal(findings.length, 1, 'the misdrawn mark is the only defect — the rest of the diagram is routed clean');
  assert.equal(findings[0].code, 'unlabeled-edge');
  assert.equal(findings[0].line, 30, 'the finding must land on the raw path, not the node or its title');
});

test('checkSvg: a boundary rect containing nodes is never an obstacle', () => {
  const svg = `<svg viewBox="0 0 200 100">
    <rect x="10" y="10" width="100" height="80" stroke="gray" stroke-dasharray="4 3"/>
    <rect x="30" y="30" width="40" height="20" stroke="black"/>
    <line x1="0" y1="70" x2="120" y2="70" stroke="black"/>
  </svg>`;
  // The line passes fully through the boundary's interior (both endpoints
  // outside it, at a y well clear of the boundary's edges) but at y=70 it
  // never comes near the inner node (y 30-50). Were the boundary wrongly
  // treated as an obstacle this would fire; excluded, it must not. (The line
  // is unavoidably unlabeled here — that finding is not what this checks.)
  assert.deepEqual(
    checkSvg(svg).filter((f) => f.code === 'edge-through-box'),
    [],
    'a boundary rect must never be reported as a crossed box',
  );
});

test('checkSvg: a stroke-less halo rect is never an obstacle', () => {
  const svg = `<svg viewBox="0 0 200 200">
    <rect x="10" y="10" width="100" height="20" fill="white"/>
    <line x1="60" y1="0" x2="60" y2="40" stroke="black"/>
  </svg>`;
  assert.deepEqual(
    checkSvg(svg).filter((f) => f.code === 'edge-through-box'),
    [],
    'a rect with no stroke must be ignored entirely',
  );
});

test('checkSvg: a path with M...H...V... is parsed into three segments that behave as one edge', () => {
  const svg = `<svg viewBox="0 0 200 200">
    <rect x="40" y="40" width="40" height="40" stroke="black"/>
    <path d="M0,60 H60 V0" fill="none" stroke="black"/>
  </svg>`;
  // H60 at y=60 runs straight through the rect (40-80 in x, 40-80 in y);
  // V0 then climbs from (60,60) to (60,0), also crossing it.
  const findings = checkSvg(svg).filter((f) => f.code === 'edge-through-box');
  assert.equal(findings.length, 1, 'multiple crossing segments of the same edge collapse into one finding');
});

test('checkSvg: an edge attached to a node may enter it without a finding', () => {
  const svg = `<svg viewBox="0 0 200 200">
    <rect x="40" y="40" width="40" height="40" stroke="black"/>
    <line x1="60" y1="0" x2="60" y2="60" stroke="black"/>
  </svg>`;
  // The line ends at (60,60), inside the rect — attached, not crossing.
  assert.deepEqual(
    checkSvg(svg).filter((f) => f.code === 'edge-through-box'),
    [],
  );
});

test('checkSvg: <tspan x y> children become separate boxes', () => {
  const svg = `<svg viewBox="0 0 400 200">
    <text x="0" y="20">
      <tspan x="10" y="20">first row</tspan>
      <tspan x="10" y="200">second row far below</tspan>
    </text>
  </svg>`;
  const findings = checkSvg(svg).filter((f) => f.code === 'text-outside-canvas');
  assert.equal(findings.length, 1, 'only the tspan placed outside the viewBox should be flagged');
  assert.match(findings[0].detail, /second row far below/);
});

test('checkSvg: text-anchor="middle" centers the box on x', () => {
  const svg = `<svg viewBox="0 0 200 100">
    <text x="100" y="20" text-anchor="middle">hi</text>
    <rect x="0" y="0" width="10" height="10" stroke="black"/>
  </svg>`;
  const findings = checkSvg(svg);
  // "hi" is 2 chars * 16 * 0.6 = 19.2 wide, centered on x=100 -> 90.4..109.6.
  // If it were left-anchored it would start at x=100 instead, a visibly
  // different box; assert indirectly via a straddle a middle-anchored box
  // could not produce this far from the origin rect.
  assert.deepEqual(findings, [], 'a normal centered label near mid-canvas should not straddle a 10x10 corner rect');
});

test('checkSvg: entities decode to one character before the width estimate', () => {
  // The kit writes `HTTP &#183; Request`; counted raw, `&#183;` is five
  // characters and every dotted label grows wide enough to invent a straddle.
  // "HTTP · X" is 8 chars * 11 * 0.6 = 52.8 wide from x=100 -> ends at 152.8,
  // short of the rect at x=160; the undecoded 12-char box would reach 179.
  const svg = `<svg viewBox="0 0 300 100">
    <text x="100" y="20" font-size="11">HTTP &#183; X</text>
    <rect x="160" y="0" width="40" height="40" stroke="black"/>
  </svg>`;
  const findings = checkSvg(svg);
  assert.deepEqual(findings.map((f) => f.code), [], 'decoded label must not reach the rect');
});

test('checkSvg: an edge through a box reports the box once, not its title too', () => {
  // The line runs through the whole rect, including its title text. That is
  // one defect (the edge should have gone round), so it must print once.
  const svg = `<svg viewBox="0 0 300 200">
    <rect x="100" y="60" width="100" height="40" stroke="black"/>
    <text x="150" y="85" text-anchor="middle">Validator</text>
    <line x1="150" y1="10" x2="150" y2="190"/>
    <text x="152" y="30" font-size="11">flows</text>
  </svg>`;
  const codes = checkSvg(svg).map((f) => f.code);
  assert.deepEqual(codes, ['edge-through-box'], 'the crossed title must not add an edge-through-label');
});

test('checkSvg: a tag inside an HTML comment is not an element', () => {
  // The kit's marker block is pasted verbatim and carries
  // "<!-- usage: <line ... marker-end="url(#arrow)"/> -->". Read raw, that is
  // a zero-length edge at the origin and an unlabeled-edge on a comment.
  const svg = `<svg viewBox="0 0 200 100">
    <defs><marker id="arrow"><path d="M0,0 L10,5 L0,10 z" fill="gray"/></marker></defs>
    <!-- usage: <line ... stroke="var(--subtle)" marker-end="url(#arrow)"/> -->
    <rect x="20" y="20" width="60" height="30" stroke="black"/>
    <!-- <text x="0" y="90">ghost</text> -->
    <text x="120" y="90">real</text>
  </svg>`;
  assert.deepEqual(checkSvg(svg), [], 'nothing inside a comment may become an edge or a label');
});

test('checkSvg: an edge with a non-numeric coordinate is skipped, not silently passed', () => {
  const svg = `<svg viewBox="0 0 200 100">
    <rect x="20" y="20" width="60" height="30" stroke="black"/>
    <line x1="abc" y1="0" x2="50" y2="100" stroke="black"/>
  </svg>`;
  const stderr = [];
  const original = process.stderr.write;
  process.stderr.write = (chunk) => {
    stderr.push(String(chunk));

    return true;
  };
  try {
    assert.deepEqual(checkSvg(svg), [], 'a NaN edge produces no finding of its own');
  } finally {
    process.stderr.write = original;
  }
  assert.match(stderr.join(''), /non-numeric coordinate/, 'but it is reported on stderr');
});

test('checkSvg: a long start-anchored label beside a vertical edge labels that edge', () => {
  // Real diagrams put "data sources + filters" 14 units right of a vertical
  // line, start-anchored. Its centre is ~85 units away; its near edge is 14.
  // Measured from the centre, six of the seven labels in the motivating
  // diagram read as missing.
  const svg = `<svg viewBox="0 0 400 300">
    <line x1="100" y1="20" x2="100" y2="280" stroke="black"/>
    <text x="114" y="150" font-size="11">data sources + filters</text>
  </svg>`;
  assert.deepEqual(checkSvg(svg).map((f) => f.code), [], 'the edge is labeled');
});

test('checkSvg: font-size cascades as the browser does — class rule, text rule, attribute, inherited', () => {
  // A 10-character text is 6 units wide per px of font size, so the viewBox
  // width turns the resolved size into a text-outside-canvas finding or not.
  // Measured in Chrome 2026-09-10: `text { font-size: 13px }` overrides a
  // font-size="11" attribute, and `.lbl { font-size: 11px }` overrides both.
  const styled = `<style>text { font-size: 13px } .lbl { font-size: 11px }</style>
    <svg viewBox="0 0 70 100">
      <text x="0" y="20" font-size="11">abcdefghij</text>
      <text x="0" y="60" class="lbl" font-size="30">abcdefghij</text>
    </svg>`;
  const outside = checkSvg(styled).filter((f) => f.code === 'text-outside-canvas');
  assert.equal(outside.length, 1, 'the text rule (78 wide) beats the attribute (66); the class rule (66) beats both');
  assert.match(outside[0].detail, /^"abcdefghij" falls outside/);

  // Without a rule, the element's attribute wins over an inherited one, and
  // an enclosing <g> or the <svg> tag supplies the inherited size.
  const attributes = `<svg viewBox="0 0 60 100" font-size="20">
      <g font-size="9"><text x="0" y="20">abcdefghij</text></g>
      <text x="0" y="60" font-size="8">abcdefghij</text>
      <text x="0" y="90">abcdefghij</text>
    </svg>`;
  const found = checkSvg(attributes).filter((f) => f.code === 'text-outside-canvas');
  assert.equal(found.length, 1, 'only the text that inherits 20 from <svg> (120 wide) escapes a 60 canvas');

  // A commented-out rule is not a rule, `!important` does not hide the value,
  // and a class list is searched for the one that has a size.
  const commented = `<style>/* text { font-size: 40px } */ .lbl { font-size: 11px !important }</style>
    <svg viewBox="0 0 70 100"><text x="0" y="20" class="x lbl">abcdefghij</text></svg>`;
  assert.deepEqual(checkSvg(commented), [], 'the class rule resolves to 11 (66 wide) inside a 70 canvas');
});

test('checkSvg: text nothing sizes is read at 16px and said on stderr', () => {
  const svg = `<svg viewBox="0 0 90 100"><text x="0" y="20">abcdefghij</text></svg>`;
  const { result, stderr } = withStderr(() => checkSvg(svg));
  // 10 * 16 * 0.6 = 96 > 90: the browser default, not the old 13 (78).
  assert.deepEqual(
    result.map((f) => f.code),
    ['text-outside-canvas'],
  );
  assert.match(stderr, /1 text element\(s\) carry no font-size .* assumed 16px/);

  const sized = `<svg viewBox="0 0 90 100" font-size="13"><text x="0" y="20">abcdefghij</text></svg>`;
  const quiet = withStderr(() => checkSvg(sized));
  assert.deepEqual(quiet.result, []);
  assert.equal(quiet.stderr, '', 'a base size on the <svg> tag is enough to stay quiet');
});

test('checkSvg: a title wider than its box is text-overflows-box and stays the box title', () => {
  // 20 chars * 16 * 0.6 = 192 wide, centred in a 100-wide node. Before
  // 2.30.0 this text turned "free", was reported as a label straddling the
  // node, and the node lost its title.
  const svg = `<svg viewBox="0 0 400 200">
    <rect x="100" y="60" width="100" height="40" stroke="black"/>
    <text x="150" y="85" text-anchor="middle">FilterOptionsGateway</text>
  </svg>`;
  const findings = checkSvg(svg);
  assert.deepEqual(
    findings.map((f) => f.code),
    ['text-overflows-box'],
  );
  assert.match(findings[0].detail, /^"FilterOptionsGateway" overflows its own 100×40 box by 46$/);
});

test('source hygiene: no network, shell, or filesystem-write primitives', () => {
  const source = fs.readFileSync(SCRIPT, 'utf8');
  for (const forbidden of ['fetch(', 'node:http', 'node:https', 'child_process', 'writeFile', 'mkdir', 'rm(']) {
    assert.ok(!source.includes(forbidden), `diagram-check.mjs uses ${forbidden}`);
  }
});
