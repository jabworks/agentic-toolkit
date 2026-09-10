// diagram-check.mjs
//
// The eyes of an agent that hand-authors inline SVG diagrams (see
// diagram-kit.md) and cannot see its own render. It reads one file, finds
// every inline <svg>…</svg> block, and reports the geometry mistakes a human
// would catch on sight: an edge that runs through a box it does not connect
// to, a label sitting on another label or on a node's own title text, a
// title wider than its own box, an edge nobody labeled, and text that falls
// outside the canvas.
//
// This is a regex-level reader, not a DOM. It understands exactly the
// idioms diagram-kit.md teaches — `<g transform="translate(x,y)">` offsets,
// `var(--…)` fills/strokes (never resolved — colors play no part in any
// check), one shared `<marker>` — and two known approximations:
//
//   - text width is estimated at 0.6 em per character (no font metrics) —
//     measured exact for the kit's mono labels, generous for regular sans,
//     a little narrow for semibold titles on wide fallback fonts;
//   - Bézier and arc commands (C S Q T A) contribute only their final
//     endpoint as a straight segment — curvature itself is invisible to it.
//
// Font size is resolved the way a browser cascades it, restricted to what a
// regex can see: a `.class { font-size: Npx }` rule matching the text's
// `class`, then a bare `text` / `svg text` rule, then the element's own
// `font-size` attribute, then one inherited from an enclosing `<g>` or the
// `<svg>` tag, and finally the browser default of 16px — reported on stderr
// when it has to be assumed, because an unsized diagram is read blind. Any
// other selector shape, and any unit but px, is invisible to it.
//
// No dependencies, no network, no shelling out, no filesystem writes.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Small geometry helpers. A "box" is always { x0, y0, x1, y1 } in viewBox
// units; nodes/boundaries are boxes with a `line` and (once assigned) a
// `title`; texts are boxes with `text`, `line`, `ax`/`ay` (the anchor
// point), `free`, `owner`, `ownEdge`.
// ---------------------------------------------------------------------------

// What a browser uses when nothing in the document sizes the text.
const DEFAULT_FONT_SIZE = 16;

const shrinkBox = (box, n) => ({ x0: box.x0 + n, y0: box.y0 + n, x1: box.x1 - n, y1: box.y1 - n });

const expandBox = (box, n) => shrinkBox(box, -n);

const rectIntersect = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

const pointInBox = (px, py, box) => px >= box.x0 && px <= box.x1 && py >= box.y0 && py <= box.y1;

// inner fits inside outer, both ways rounded by `tol` viewBox units.
const fullyInside = (inner, outer, tol) =>
  inner.x0 >= outer.x0 - tol && inner.x1 <= outer.x1 + tol && inner.y0 >= outer.y0 - tol && inner.y1 <= outer.y1 + tol;

const containsBox = (outer, inner) => fullyInside(inner, outer, 0);

// Liang-Barsky clip of a segment against a box. Returns the clipped segment
// and its length, or null when the segment misses the box entirely.
const liangBarsky = (x1, y1, x2, y2, box) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - box.x0, box.x1 - x1, y1 - box.y0, box.y1 - y1];
  let t0 = 0;
  let t1 = 1;

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;

      continue;
    }

    const r = q[i] / p[i];
    if (p[i] < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }

  if (t0 > t1) return null;

  const cx1 = x1 + t0 * dx;
  const cy1 = y1 + t0 * dy;
  const cx2 = x1 + t1 * dx;
  const cy2 = y1 + t1 * dy;

  return { length: Math.hypot(cx2 - cx1, cy2 - cy1) };
};

const distPointToSegment = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  // A zero-length segment is a point — clamp collapses to it on its own,
  // but guard the division explicitly rather than relying on NaN behavior.
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;

  return Math.hypot(px - nx, py - ny);
};

// Distance from a box to a segment: zero when the segment enters the box,
// else the nearest of the box's corners. Label attribution measures this, not
// the box centre — a long start-anchored label beside a vertical edge has its
// centre far from the line and its near edge right on it, and real diagrams
// (the 2026-09-08 reporting one, six of seven labels) are drawn that way.
const distBoxToSegment = (box, x1, y1, x2, y2) => {
  if (liangBarsky(x1, y1, x2, y2, box)) return 0;

  const corners = [
    [box.x0, box.y0],
    [box.x1, box.y0],
    [box.x0, box.y1],
    [box.x1, box.y1],
  ];

  return Math.min(...corners.map(([px, py]) => distPointToSegment(px, py, x1, y1, x2, y2)));
};

const fmt = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Line-number lookup. Built once per source string and reused across every
// block and element in it, rather than rescanning from zero each time.
// ---------------------------------------------------------------------------

const makeLineFinder = (source) => {
  const offsets = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') offsets.push(i + 1);

  return (idx) => {
    let lo = 0;
    let hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }

    return lo + 1;
  };
};

// ---------------------------------------------------------------------------
// Attribute and transform parsing.
// ---------------------------------------------------------------------------

const getAttr = (tag, name) => {
  const dq = new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`).exec(tag);
  if (dq) return dq[1];

  const sq = new RegExp(`(?:^|\\s)${name}\\s*=\\s*'([^']*)'`).exec(tag);

  return sq ? sq[1] : undefined;
};

// translate(x,y) / translate(x y) / translate(x) — the only transform kind
// diagram-kit.md uses. Anything else is reported once and treated as identity.
const parseTranslate = (transform) => {
  const m = /translate\(\s*(-?[\d.]+)(?:[ ,]+(-?[\d.]+))?\s*\)/.exec(transform);
  if (!m) return null;

  return { dx: parseFloat(m[1]), dy: m[2] !== undefined ? parseFloat(m[2]) : 0 };
};

// The kit's labels lean on entities (`HTTP &#183; ReportingBatchRequest`);
// left undecoded, `&#183;` counts as five characters and every label box
// grows by four em-fifths per dot — wide enough to invent overlaps.
const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', rarr: '→' };

const decodeEntities = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = hex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);

      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }

    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });

const stripTags = (s) =>
  decodeEntities(s.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

// ---------------------------------------------------------------------------
// <path d="…"> grammar: M L H V Z absolute/relative, one straight segment per
// command; C S Q T A keep only the final endpoint (curvature is invisible to
// this checker — see the header). A second M starts a new subpath, returned
// as a separate segment list per diagram-kit's "multiple edges in one path"
// idiom.
// ---------------------------------------------------------------------------

// The two style-rule shapes the checker reads, from every <style> block in
// the document (comments already blanked): `text { font-size: Npx }` or
// `svg text { … }` sets the base, `.name { … }` / `text.name { … }` /
// `svg .name { … }` maps a class. Later rules win, as in a stylesheet.
// Anything else — element ids, descendant chains, `em`/`rem`/`var()` — is
// skipped: a size the checker cannot resolve must not become a guess.
const BASE_SELECTOR = /^(?:svg\s+)?text$/;
const CLASS_SELECTOR = /^(?:svg\s+)?(?:text)?\.([\w-]+)$/;

const parseStyleFontSizes = (source) => {
  const styles = { base: null, classes: new Map() };
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  const ruleRe = /([^{}]+)\{([^}]*)\}/g;
  let sm;

  while ((sm = styleRe.exec(source))) {
    // A CSS comment is not a rule, and left in place it glues itself onto
    // the selector that follows it.
    const css = sm[1].replace(/\/\*[\s\S]*?\*\//g, ' ');
    let rm;
    while ((rm = ruleRe.exec(css))) {
      const size = /(?:^|[\s;{])font-size\s*:\s*(\d+(?:\.\d+)?)px\b/.exec(rm[2]);
      if (!size) continue;

      for (const selector of rm[1].split(',')) {
        const s = selector.trim();
        if (BASE_SELECTOR.test(s)) styles.base = parseFloat(size[1]);
        const cm = CLASS_SELECTOR.exec(s);
        if (cm) styles.classes.set(cm[1], parseFloat(size[1]));
      }
    }
  }

  return styles;
};

const CURVE_ARG_COUNTS = { C: 6, S: 4, Q: 4, T: 2, A: 7 };

const parsePathSegments = (d, warnCurve) => {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let cmd = null;
  let seenM = false;
  let current = [];
  const subpaths = [];

  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) {
      cmd = tokens[i];
      i++;
    }

    if (!cmd) break;

    const letter = cmd.toUpperCase();
    const isRel = cmd !== letter;

    if (letter === 'M') {
      if (seenM) {
        subpaths.push(current);
        current = [];
      }

      seenM = true;
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      cx = isRel ? cx + x : x;
      cy = isRel ? cy + y : y;
      startX = cx;
      startY = cy;
      // Bare coordinate pairs after M are an implicit lineto.
      cmd = isRel ? 'l' : 'L';

      continue;
    }

    if (letter === 'L') {
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      const nx = isRel ? cx + x : x;
      const ny = isRel ? cy + y : y;
      current.push({ x1: cx, y1: cy, x2: nx, y2: ny });
      cx = nx;
      cy = ny;

      continue;
    }

    if (letter === 'H') {
      const x = parseFloat(tokens[i++]);
      const nx = isRel ? cx + x : x;
      current.push({ x1: cx, y1: cy, x2: nx, y2: cy });
      cx = nx;

      continue;
    }

    if (letter === 'V') {
      const y = parseFloat(tokens[i++]);
      const ny = isRel ? cy + y : y;
      current.push({ x1: cx, y1: cy, x2: cx, y2: ny });
      cy = ny;

      continue;
    }

    if (letter === 'Z') {
      current.push({ x1: cx, y1: cy, x2: startX, y2: startY });
      cx = startX;
      cy = startY;

      continue;
    }

    if (CURVE_ARG_COUNTS[letter]) {
      warnCurve();
      const n = CURVE_ARG_COUNTS[letter];
      const args = [];
      for (let k = 0; k < n; k++) args.push(tokens[i++]);

      const x = parseFloat(args[n - 2]);
      const y = parseFloat(args[n - 1]);
      const nx = isRel ? cx + x : x;
      const ny = isRel ? cy + y : y;
      current.push({ x1: cx, y1: cy, x2: nx, y2: ny });
      cx = nx;
      cy = ny;

      continue;
    }

    // Unknown command letter — skip it rather than spin forever.
    i++;
  }

  subpaths.push(current);

  return subpaths.filter((s) => s.length > 0);
};

// ---------------------------------------------------------------------------
// Per-<svg>-block walk. A single left-to-right tag scan tracks a stack of
// <g> offsets (and font-size inheritance), skips <defs>/<marker> subtrees
// entirely, and special-cases <text>…</text> to pull out its raw content
// (and any positioned <tspan> children) without a general text-node model.
// ---------------------------------------------------------------------------

const walkBlock = (source, blockOffset, blockSource, findLine, notify, styles) => {
  const rects = [];
  const texts = [];
  const edges = [];
  let defaulted = 0;
  const onDefault = () => {
    defaulted++;
  };

  const svgOpenMatch = /^<svg\b[^>]*>/.exec(blockSource);
  const svgOpenTag = svgOpenMatch ? svgOpenMatch[0] : '<svg>';
  const viewBoxAttr = getAttr(svgOpenTag, 'viewBox');
  let viewBox = null;
  if (viewBoxAttr) {
    const nums = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
    if (nums.length === 4 && nums.every((n) => Number.isFinite(n))) {
      const [minX, minY, w, h] = nums;
      viewBox = { minX, minY, w, h, x0: minX, y0: minY, x1: minX + w, y1: minY + h };
    }
  }

  let curOffsetX = 0;
  let curOffsetY = 0;
  // null until some enclosing tag carries a font-size — the text element then
  // decides between its own attribute, the style rules, and the default.
  let curFontSize = parseFloat(getAttr(svgOpenTag, 'font-size') ?? '') || null;
  let skipDepth = 0;
  const stack = [];
  // The frame a closing tag restores: offsets, inherited font size, and
  // whether the subtree was inside <defs>/<marker>.
  const snapshot = () => ({ prevX: curOffsetX, prevY: curOffsetY, prevFontSize: curFontSize, skip: skipDepth > 0 });

  const tagRe = /<\/?[a-zA-Z][^>]*>/g;
  let m;

  while ((m = tagRe.exec(blockSource))) {
    const tag = m[0];
    const idx = m.index;
    const lineNo = findLine(blockOffset + idx);
    const closing = tag.startsWith('</');
    const selfClosing = /\/\s*>$/.test(tag);
    const nameMatch = /^<\/?([a-zA-Z][\w:-]*)/.exec(tag);
    const name = nameMatch ? nameMatch[1] : '';

    if (closing) {
      const frame = stack.pop();
      if (frame) {
        curOffsetX = frame.prevX;
        curOffsetY = frame.prevY;
        curFontSize = frame.prevFontSize;
        if (frame.skip) skipDepth--;
      }

      continue;
    }

    if (name === 'text' && !selfClosing) {
      const contentStart = tagRe.lastIndex;
      const closeIdx = blockSource.indexOf('</text>', contentStart);
      const rawContent = closeIdx === -1 ? blockSource.slice(contentStart) : blockSource.slice(contentStart, closeIdx);

      if (skipDepth === 0) {
        processTextElement({
          tag,
          rawContent,
          contentOffset: blockOffset + contentStart,
          findLine,
          offX: curOffsetX,
          offY: curOffsetY,
          curFontSize,
          styles,
          onDefault,
          texts,
          lineNo,
        });
      }

      tagRe.lastIndex = closeIdx === -1 ? blockSource.length : closeIdx + '</text>'.length;

      continue;
    }

    if (name === 'defs' || name === 'marker') {
      if (!selfClosing) {
        stack.push({ prevX: curOffsetX, prevY: curOffsetY, prevFontSize: curFontSize, skip: true });
        skipDepth++;
      }

      continue;
    }

    if (name === 'g') {
      if (!selfClosing) {
        const transform = getAttr(tag, 'transform');
        let dx = 0;
        let dy = 0;
        if (transform) {
          const parsed = parseTranslate(transform);
          if (parsed) {
            dx = parsed.dx;
            dy = parsed.dy;
          } else {
            notify(`diagram-check: unsupported transform "${transform}" at line ${lineNo} — treated as identity`);
          }
        }

        const fontSizeAttr = getAttr(tag, 'font-size');
        stack.push(snapshot());

        if (skipDepth === 0) {
          curOffsetX += dx;
          curOffsetY += dy;
          if (fontSizeAttr) curFontSize = parseFloat(fontSizeAttr);
        }
      }

      continue;
    }

    if (name === 'svg') {
      if (!selfClosing) stack.push(snapshot());

      continue;
    }

    if (skipDepth === 0) {
      if (name === 'rect') processRect(tag, lineNo, curOffsetX, curOffsetY, rects);
      else if (name === 'line') processLine(tag, lineNo, curOffsetX, curOffsetY, edges, notify);
      else if (name === 'polyline') processPolyline(tag, lineNo, curOffsetX, curOffsetY, edges, notify);
      else if (name === 'path') processPath(tag, lineNo, curOffsetX, curOffsetY, edges, notify);
    }

    // Any other container tag (unlikely inside a diagram-kit SVG, but a
    // stray <a> or <clipPath> would otherwise desync the stack) — push a
    // neutral frame so its closing tag pops correctly.
    if (!selfClosing) stack.push(snapshot());
  }

  if (defaulted > 0) {
    notify(
      `diagram-check: ${defaulted} text element(s) carry no font-size from an attribute, an enclosing tag, or a text/.class style rule — assumed ${DEFAULT_FONT_SIZE}px; set font-size on the <svg> tag so widths are read as drawn`,
    );
  }

  return { rects, texts, edges, viewBox };
};

const processRect = (tag, lineNo, offX, offY, rects) => {
  const x = parseFloat(getAttr(tag, 'x') ?? '0');
  const y = parseFloat(getAttr(tag, 'y') ?? '0');
  const w = parseFloat(getAttr(tag, 'width') ?? '0');
  const h = parseFloat(getAttr(tag, 'height') ?? '0');
  const stroke = getAttr(tag, 'stroke');

  // No stroke, or an explicit "none", means a decoration (a label halo) —
  // it never obstructs an edge and never receives a label.
  if (!stroke || stroke === 'none') return;

  rects.push({ x0: x + offX, y0: y + offY, x1: x + offX + w, y1: y + offY + h, line: lineNo });
};

// A NaN coordinate compares false against everything, so an edge carrying
// one would pass every check unseen. Report it and leave it out instead.
const pushEdge = (edges, edge, notify) => {
  const finite = edge.segments.every((s) => [s.x1, s.y1, s.x2, s.y2].every(Number.isFinite));
  if (!finite) {
    notify(`diagram-check: ${edge.kind} at line ${edge.line} has a non-numeric coordinate — skipped`);

    return;
  }

  edges.push(edge);
};

const processLine = (tag, lineNo, offX, offY, edges, notify) => {
  const x1 = parseFloat(getAttr(tag, 'x1') ?? '0') + offX;
  const y1 = parseFloat(getAttr(tag, 'y1') ?? '0') + offY;
  const x2 = parseFloat(getAttr(tag, 'x2') ?? '0') + offX;
  const y2 = parseFloat(getAttr(tag, 'y2') ?? '0') + offY;

  pushEdge(edges, { kind: 'line', segments: [{ x1, y1, x2, y2 }], line: lineNo }, notify);
};

const processPolyline = (tag, lineNo, offX, offY, edges, notify) => {
  const pointsStr = getAttr(tag, 'points');
  if (!pointsStr) return;

  const nums = pointsStr.trim().split(/[\s,]+/).map(Number);
  const points = [];
  for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i] + offX, y: nums[i + 1] + offY });

  const segments = [];
  for (let i = 0; i + 1 < points.length; i++) {
    segments.push({ x1: points[i].x, y1: points[i].y, x2: points[i + 1].x, y2: points[i + 1].y });
  }

  if (segments.length > 0) pushEdge(edges, { kind: 'polyline', segments, line: lineNo }, notify);
};

const processPath = (tag, lineNo, offX, offY, edges, notify) => {
  const fill = getAttr(tag, 'fill');
  if (fill && fill !== 'none') return; // fill !== none/absent is a filled shape, not an edge

  const d = getAttr(tag, 'd');
  if (!d) return;

  for (const segs of parsePathSegments(d, () => notify.curve())) {
    const offsetSegs = segs.map((s) => ({ x1: s.x1 + offX, y1: s.y1 + offY, x2: s.x2 + offX, y2: s.y2 + offY }));
    pushEdge(edges, { kind: 'path', segments: offsetSegs, line: lineNo }, notify);
  }
};

const pushTextBox = (texts, text, absX, absY, anchor, fontSize, lineNo) => {
  if (!text) return;

  const width = text.length * fontSize * 0.6;
  const top = absY - 0.75 * fontSize;
  const bottom = absY + 0.25 * fontSize;
  let x0;
  let x1;

  if (anchor === 'middle') {
    x0 = absX - width / 2;
    x1 = absX + width / 2;
  } else if (anchor === 'end') {
    x0 = absX - width;
    x1 = absX;
  } else {
    x0 = absX;
    x1 = absX + width;
  }

  texts.push({ x0, y0: top, x1, y1: bottom, ax: absX, ay: absY, text, line: lineNo });
};

// The cascade a browser applies to a <text>, restricted to the shapes the
// style scan understands: a matching class rule beats a bare `text` rule,
// which beats the element's own attribute, which beats an inherited one.
// `inherited` is null when no enclosing tag carried a size; `onDefault` is
// called when the browser default has to stand in.
const resolveFontSize = (tag, inherited, styles, onDefault) => {
  const classAttr = getAttr(tag, 'class');
  if (classAttr) {
    for (const cls of classAttr.trim().split(/\s+/)) {
      if (styles.classes.has(cls)) return styles.classes.get(cls);
    }
  }

  if (styles.base !== null) return styles.base;

  const attr = getAttr(tag, 'font-size');
  if (attr) return parseFloat(attr);

  if (inherited !== null) return inherited;

  onDefault();

  return DEFAULT_FONT_SIZE;
};

const processTextElement = ({ tag, rawContent, contentOffset, findLine, offX, offY, curFontSize, styles, onDefault, texts, lineNo }) => {
  const x = parseFloat(getAttr(tag, 'x') ?? '0');
  const y = parseFloat(getAttr(tag, 'y') ?? '0');
  const anchor = getAttr(tag, 'text-anchor') ?? 'start';
  const fontSize = resolveFontSize(tag, curFontSize, styles, onDefault);

  const tspanRe = /<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g;
  const tspans = [];
  let tm;
  while ((tm = tspanRe.exec(rawContent))) {
    const tspanTag = `<tspan ${tm[1]}>`;
    const tx = getAttr(tspanTag, 'x');
    const ty = getAttr(tspanTag, 'y');
    const text = stripTags(tm[2]);

    if (tx !== undefined && ty !== undefined && text) {
      tspans.push({ tag: tspanTag, x: parseFloat(tx), y: parseFloat(ty), text, index: tm.index });
    }
  }

  if (tspans.length > 0) {
    for (const t of tspans) {
      const tAnchor = getAttr(t.tag, 'text-anchor') ?? anchor;
      const tFontSizeAttr = getAttr(t.tag, 'font-size');
      const tFontSize = tFontSizeAttr ? parseFloat(tFontSizeAttr) : fontSize;
      const tLine = findLine(contentOffset + t.index);
      pushTextBox(texts, t.text, t.x + offX, t.y + offY, tAnchor, tFontSize, tLine);
    }

    return;
  }

  const content = stripTags(rawContent);
  pushTextBox(texts, content, x + offX, y + offY, anchor, fontSize, lineNo);
};

// ---------------------------------------------------------------------------
// Findings for one parsed block.
// ---------------------------------------------------------------------------

const describeEdge = (edge) => {
  const first = edge.segments[0];
  const last = edge.segments[edge.segments.length - 1];

  return `${edge.kind} (${fmt(first.x1)},${fmt(first.y1)})→(${fmt(last.x2)},${fmt(last.y2)})`;
};

const describeNode = (node) => (node.title ? `"${node.title}"` : `rect (${fmt(node.x0)},${fmt(node.y0)})`);

const edgeEndpoints = (edge) => {
  const first = edge.segments[0];
  const last = edge.segments[edge.segments.length - 1];

  return { start: { x: first.x1, y: first.y1 }, end: { x: last.x2, y: last.y2 } };
};

const crossesBox = (edge, box) =>
  edge.segments.some((seg) => {
    const clip = liangBarsky(seg.x1, seg.y1, seg.x2, seg.y2, box);

    return clip && clip.length > 2;
  });

const findingsForBlock = ({ rects, texts, edges, viewBox }) => {
  const findings = [];

  // Classify rects: a stroked rect that fully contains another stroked rect
  // is a boundary and is never an obstacle; the rest are nodes.
  for (const r of rects) r.isBoundary = rects.some((o) => o !== r && containsBox(r, o));
  const nodes = rects.filter((r) => !r.isBoundary);

  // Owned vs. free text, and each node's title (first owned text, in
  // document order). A text belongs to the node its box sits in — or, when
  // the box has outgrown the node, the node its anchor point sits in: a
  // title too wide for its box is still that box's title, and reporting it
  // as a free label straddling the node would misname the defect.
  for (const text of texts) {
    const owner = nodes.find((node) => fullyInside(text, node, 1) || pointInBox(text.ax, text.ay, node));
    if (owner) {
      text.free = false;
      text.owner = owner;
      if (!owner.title) owner.title = text.text;
    } else {
      text.free = true;
    }
  }

  // Each free text's own edge: the edge whose nearest segment comes closest
  // to the text box, when that distance is within labeling range.
  for (const text of texts) {
    if (!text.free) continue;

    let best = null;
    let bestDist = Infinity;

    for (const edge of edges) {
      for (const seg of edge.segments) {
        const d = distBoxToSegment(text, seg.x1, seg.y1, seg.x2, seg.y2);
        if (d < bestDist) {
          bestDist = d;
          best = edge;
        }
      }
    }

    text.ownEdge = best && bestDist <= 24 ? best : null;
  }

  // An edge attaches to a node when either endpoint lands on it (4 units of
  // slack for arrowheads that stop short of the border).
  const isAttached = (edge, node) => {
    const { start, end } = edgeEndpoints(edge);
    const expanded = expandBox(node, 4);

    return pointInBox(start.x, start.y, expanded) || pointInBox(end.x, end.y, expanded);
  };

  // 1. edge-through-box
  for (const edge of edges) {
    for (const node of nodes) {
      if (isAttached(edge, node)) continue;

      if (crossesBox(edge, shrinkBox(node, 1))) {
        findings.push({
          code: 'edge-through-box',
          line: edge.line,
          detail: `${describeEdge(edge)} crosses ${describeNode(node)}`,
        });
      }
    }
  }

  // 2. label-over-label
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];
      if (rectIntersect(shrinkBox(a, 1), shrinkBox(b, 1))) {
        findings.push({
          code: 'label-over-label',
          line: Math.min(a.line, b.line),
          detail: `"${a.text}" overlaps "${b.text}"`,
        });
      }
    }
  }

  // 3. label-over-box (a text box straddling the border of a node it does
  // not belong to) and text-overflows-box (a node's own text wider or
  // taller than the node, past the 1-unit tolerance)
  for (const text of texts) {
    for (const node of nodes) {
      if (node === text.owner) continue;

      if (rectIntersect(shrinkBox(text, 1), node)) {
        findings.push({
          code: 'label-over-box',
          line: text.line,
          detail: `"${text.text}" straddles ${describeNode(node)}`,
        });
      }
    }

    if (text.owner && !fullyInside(text, text.owner, 1)) {
      const { owner } = text;
      const over = Math.max(owner.x0 - text.x0, text.x1 - owner.x1, owner.y0 - text.y0, text.y1 - owner.y1);
      const where =
        owner.title === text.text
          ? `its own ${fmt(owner.x1 - owner.x0)}×${fmt(owner.y1 - owner.y0)} box`
          : describeNode(owner);
      findings.push({
        code: 'text-overflows-box',
        line: text.line,
        detail: `"${text.text}" overflows ${where} by ${fmt(over)}`,
      });
    }
  }

  // 4. edge-through-label (excluding a free text's own edge)
  for (const edge of edges) {
    for (const text of texts) {
      if (text.ownEdge === edge) continue;

      // A node's own text under an edge that does not attach to the node is
      // the edge-through-box finding already reported — naming the title too
      // would print one defect twice.
      if (text.owner && !isAttached(edge, text.owner)) continue;

      if (crossesBox(edge, shrinkBox(text, 1))) {
        findings.push({
          code: 'edge-through-label',
          line: edge.line,
          detail: `${describeEdge(edge)} crosses label "${text.text}"`,
        });
      }
    }
  }

  // 5. unlabeled-edge
  const labeled = new Set(texts.filter((t) => t.ownEdge).map((t) => t.ownEdge));
  for (const edge of edges) {
    if (!labeled.has(edge)) {
      findings.push({
        code: 'unlabeled-edge',
        line: edge.line,
        detail: `${describeEdge(edge)} has no label within 24px`,
      });
    }
  }

  // 6. text-outside-canvas
  if (viewBox) {
    const canvas = `${viewBox.minX} ${viewBox.minY} ${viewBox.w} ${viewBox.h}`;

    for (const text of texts) {
      const fully = fullyInside(text, viewBox, 0);
      if (!fully) {
        findings.push({
          code: 'text-outside-canvas',
          line: text.line,
          detail: `"${text.text}" falls outside the canvas (viewBox ${canvas})`,
        });
      }
    }
  }

  return findings;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Finds every <svg>…</svg> block in `source` and runs all seven checks
// against each. Returns Finding[] = { code, line, detail }[], sorted by line
// then code.
export const checkSvg = (rawSource) => {
  // The kit's own marker block carries `<!-- usage: <line … /> -->`, and the
  // kit says to paste it verbatim — scanned raw, that comment is a phantom
  // zero-length edge at the origin and every diagram fails "clean". Blank
  // comments character-for-character (newlines kept) so line numbers hold.
  const source = rawSource.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ' '));
  const findLine = makeLineFinder(source);
  const styles = parseStyleFontSizes(source);
  let curveWarned = false;
  const notify = (msg) => process.stderr.write(msg + '\n');
  notify.curve = () => {
    if (curveWarned) return;
    curveWarned = true;
    notify('diagram-check: curve command (C/S/Q/T/A) approximated as its endpoint only');
  };

  const findings = [];
  const blockRe = /<svg\b[^>]*>[\s\S]*?<\/svg>/g;
  let m;

  while ((m = blockRe.exec(source))) {
    const parsed = walkBlock(source, m.index, m[0], findLine, notify, styles);
    findings.push(...findingsForBlock(parsed));
  }

  findings.sort((a, b) => a.line - b.line || a.code.localeCompare(b.code));

  return findings;
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const runCli = (argv) => {
  const jsonMode = argv.includes('--json');
  const file = argv.find((a) => !a.startsWith('--'));

  if (!file) {
    process.stderr.write('usage: diagram-check.mjs <file.html|file.svg> [--json]\n');

    return 2;
  }

  let source;
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch (err) {
    process.stderr.write(`diagram-check: cannot read ${file}: ${err.message}\n`);

    return 2;
  }

  if (!/<svg\b[^>]*>[\s\S]*?<\/svg>/.test(source)) {
    process.stderr.write(`diagram-check: no <svg> block found in ${file}\n`);

    return 2;
  }

  const findings = checkSvg(source);

  if (jsonMode) {
    process.stdout.write(JSON.stringify({ file, findings }) + '\n');
  } else if (findings.length === 0) {
    process.stdout.write('clean\n');
  } else {
    for (const f of findings) process.stdout.write(`${f.code}  line ${f.line}  ${f.detail}\n`);
    process.stdout.write(`${findings.length} finding(s)\n`);
  }

  return findings.length === 0 ? 0 : 1;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(runCli(process.argv.slice(2)));
}
