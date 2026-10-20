// The desktop's vector charts, as plain SVG strings. Mid-tone colours, so one drawing reads in both themes.
export const PALETTE = ['#3f8f5b', '#c8643c', '#2f6db5', '#b8860b', '#7b5ea7', '#2a9d8f', '#b5527a'];

export type Share = { name: string; count: number; color: string };

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Done leads in green; each section after it takes the next colour, so a long board does not repeat one until the
// palette runs out.
export const colorFor = (index: number): string => PALETTE[index % PALETTE.length] ?? '#888888';

export const ringSvg = (shares: Share[], doneCount: number): string => {
  const total = shares.reduce((sum, share) => sum + share.count, 0);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  let offset = 0;

  const arcs = shares
    .filter(share => share.count > 0)
    .map(share => {
      const length = (share.count / total) * circumference;
      const arc = `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="${share.color}" stroke-width="12" stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 50 50)"><title>${escapeXml(`${share.count} ${share.name.toLowerCase()}`)}</title></circle>`;

      offset += length;

      return arc;
    })
    .join('');

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    '<circle cx="50" cy="50" r="38" fill="none" stroke="#888888" stroke-opacity="0.2" stroke-width="12"/>',
    arcs,
    `<text x="50" y="47" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="600" fill="#888888">${percent}%</text>`,
    '<text x="50" y="65" text-anchor="middle" dominant-baseline="central" font-size="9" fill="#888888">done</text>',
    '</svg>',
  ].join('');
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
