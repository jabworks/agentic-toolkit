// The desktop's vector charts, as plain SVG strings. Mid-tone colours, so one drawing reads in both themes.
export const PALETTE = ['#3f8f5b', '#c8643c', '#2f6db5', '#b8860b', '#7b5ea7', '#2a9d8f', '#b5527a'];

export type Share = { name: string; count: number; color: string };

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Done leads in green; each section after it takes the next colour, so a long board does not repeat one until the
// palette runs out.
export const colorFor = (index: number): string => PALETTE[index % PALETTE.length] ?? '#888888';

const GAP = 3;

export const ringSvg = (shares: Share[], doneCount: number): string => {
  const total = shares.reduce((sum, share) => sum + share.count, 0);
  const stroke = 10;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const visibleShares = shares.filter(share => share.count > 0);

  let offset = 0;

  const arcs = visibleShares
    .map(share => {
      const length = (share.count / total) * circumference;
      const title = `<title>${escapeXml(`${share.count} ${share.name.toLowerCase()}`)}</title>`;

      // One segment is the whole ring: a gap would only be a notch.
      if (visibleShares.length === 1) {
        return `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="${share.color}" stroke-width="${stroke}">${title}</circle>`;
      }

      // A round cap reaches half the stroke past each end, so the drawn arc is `visible` plus a full stroke; shrinking it
      // by the stroke and the gap leaves a gap between neighbours, and a share too small for that stays a dot.
      const visible = Math.max(0.01, length - stroke - GAP);
      const start = offset + (GAP + stroke) / 2;
      const arc = `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="${share.color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${visible.toFixed(2)} ${(circumference - visible).toFixed(2)}" stroke-dashoffset="${(-start).toFixed(2)}" transform="rotate(-90 50 50)">${title}</circle>`;

      offset += length;

      return arc;
    })
    .join('');

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="#888888" stroke-opacity="0.2" stroke-width="${stroke}"/>`,
    arcs,
    `<text x="50" y="47" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="600" fill="#888888">${percent}%</text>`,
    '<text x="50" y="65" text-anchor="middle" dominant-baseline="central" font-size="9" fill="#888888">done</text>',
    '</svg>',
  ].join('');
};

// Rounded progress segments: each is a line with round caps, so a share narrower than the bar is tall stays a dot.
export const barSvg = (shares: Share[], width = 560, height = 12): string => {
  const total = shares.reduce((sum, share) => sum + share.count, 0);
  const visibleShares = shares.filter(share => share.count > 0);
  const middle = height / 2;
  const track = `<line x1="${middle}" y1="${middle}" x2="${width - middle}" y2="${middle}" stroke="#888888" stroke-opacity="0.2" stroke-width="${height}" stroke-linecap="round"/>`;

  if (total === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${track}</svg>`;
  }

  // Each share owns a span of the full width; a round cap overhangs its line by half the height, so the line runs between
  // the caps' centres and the drawn segment fills the span minus the gap. A span too short for that collapses to a dot.
  const gap = visibleShares.length > 1 ? GAP : 0;

  let cursor = 0;

  const segments = visibleShares
    .map(share => {
      const span = (share.count / total) * width;
      const start = cursor + gap / 2;
      const end = cursor + span - gap / 2;
      const isDot = end - start < height;
      // A dot is clamped inside the track, or the last share's would be cut by the edge of the drawing.
      const from = isDot ? Math.min(width - middle, Math.max(middle, (start + end) / 2)) : start + middle;
      const to = isDot ? from : end - middle;

      cursor += span;

      return `<line x1="${from.toFixed(1)}" y1="${middle}" x2="${to.toFixed(1)}" y2="${middle}" stroke="${share.color}" stroke-width="${height}" stroke-linecap="round"><title>${escapeXml(`${share.count} ${share.name.toLowerCase()}`)}</title></line>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${track}${segments}</svg>`;
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
