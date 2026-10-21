// The desktop's vector charts, as plain SVG strings. Mid-tone colours, so one drawing reads in both themes.
export const PALETTE = ['#3f8f5b', '#c8643c', '#2f6db5', '#b8860b', '#7b5ea7', '#2a9d8f', '#b5527a'];

export type Share = { name: string; count: number; color: string };

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Done leads in green; each section after it takes the next colour, so a long board does not repeat one until the
// palette runs out.
export const colorFor = (index: number): string => PALETTE[index % PALETTE.length] ?? '#888888';

const GAP = 3;

// Each share's span along a track of `length`, proportional to its count except that none is shorter than `minSpan`: a
// round-capped segment is at least as wide as it is thick, so a thinner share would spill over its neighbours. What the
// small ones are lent is taken from the large ones in proportion.
export const allot = (counts: number[], length: number, minSpan: number): number[] => {
  const total = counts.reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return counts.map(() => 0);
  }

  const raw = counts.map(count => (count / total) * length);
  const isSmall = raw.map(span => span < minSpan);
  const lent = isSmall.filter(Boolean).length * minSpan;
  const largeTotal = raw.reduce((sum, span, index) => sum + (isSmall[index] ? 0 : span), 0);

  if (largeTotal <= 0 || lent >= length) {
    return raw;
  }

  const scale = (length - lent) / largeTotal;

  return raw.map((span, index) => (isSmall[index] ? minSpan : span * scale));
};

export const ringSvg = (shares: Share[], doneCount: number): string => {
  const total = shares.reduce((sum, share) => sum + share.count, 0);
  const stroke = 10;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const visibleShares = shares.filter(share => share.count > 0);

  // The drawn arc is its `visible` length plus a round cap of half the stroke at each end, centred in the span it owns.
  const spans = allot(visibleShares.map(share => share.count), circumference, stroke + GAP);

  let offset = 0;

  const arcs = visibleShares
    .map((share, index) => {
      const span = spans[index] ?? 0;
      const title = `<title>${escapeXml(`${share.count} ${share.name.toLowerCase()}`)}</title>`;

      // One segment is the whole ring: a gap would only be a notch.
      if (visibleShares.length === 1) {
        return `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="${share.color}" stroke-width="${stroke}">${title}</circle>`;
      }

      const visible = Math.max(0.01, span - stroke - GAP);
      const start = offset + (span - visible) / 2;
      const arc = `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="${share.color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${visible.toFixed(2)} ${(circumference - visible).toFixed(2)}" stroke-dashoffset="${(-start).toFixed(2)}" transform="rotate(-90 50 50)">${title}</circle>`;

      offset += span;

      return arc;
    })
    .join('');

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">',
    arcs,
    `<text x="50" y="47" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="600" fill="#888888">${percent}%</text>`,
    '<text x="50" y="65" text-anchor="middle" dominant-baseline="central" font-size="9" fill="#888888">done</text>',
    '</svg>',
  ].join('');
};

// Rounded progress segments: each is a line with round caps, so a share narrower than the bar is tall stays a dot. Drawn
// large and sized by its own width/height: an SVG with a viewBox alone has no intrinsic size, and the desktop gives it a
// tall default box instead.
export const BAR_HEIGHT = 22;

export const barSvg = (shares: Share[], width = 1200, height = BAR_HEIGHT): string => {
  const total = shares.reduce((sum, share) => sum + share.count, 0);
  const visibleShares = shares.filter(share => share.count > 0);
  const middle = height / 2;
  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

  if (total === 0) {
    return `${open}</svg>`;
  }

  // Each share owns a span of the full width; a round cap overhangs its line by half the height, so the line runs between
  // the caps' centres and the drawn segment fills the span minus the gap.
  const gap = visibleShares.length > 1 ? height / 3 : 0;

  const spans = allot(visibleShares.map(share => share.count), width, height + gap);

  let cursor = 0;

  const segments = visibleShares
    .map((share, index) => {
      const span = spans[index] ?? 0;
      const from = cursor + gap / 2 + middle;
      // A span holding only a cap's worth is a dot: the two ends meet.
      const to = Math.max(from, cursor + span - gap / 2 - middle);

      cursor += span;

      return `<line x1="${from.toFixed(1)}" y1="${middle}" x2="${to.toFixed(1)}" y2="${middle}" stroke="${share.color}" stroke-width="${height}" stroke-linecap="round"><title>${escapeXml(`${share.count} ${share.name.toLowerCase()}`)}</title></line>`;
    })
    .join('');

  return `${open}${segments}</svg>`;
};

export const sparklineSvg = (counts: number[], color: string): string => {
  const barWidth = 10;
  const gap = 4;
  const height = 36;
  const width = counts.length * (barWidth + gap) - gap;
  const max = Math.max(1, ...counts);

  const bars = counts
    .map((count, index) => {
      const barHeight = count === 0 ? 2 : Math.max(4, (count / max) * height);
      const weeksAgo = counts.length - 1 - index;
      const when = weeksAgo === 0 ? 'this week' : `${weeksAgo} ${weeksAgo === 1 ? 'week' : 'weeks'} ago`;

      return `<rect x="${index * (barWidth + gap)}" y="${(height - barHeight).toFixed(1)}" width="${barWidth}" height="${barHeight.toFixed(1)}" rx="2" fill="${color}" fill-opacity="${count === 0 ? 0.25 : 1}"><title>${count} closed ${when}</title></rect>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${bars}</svg>`;
};
