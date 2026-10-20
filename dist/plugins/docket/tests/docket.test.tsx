import { expect, test } from 'claude-code/testing';

import { ageInDays, ancestors, baseName, closesByWeek, joinPath, parseDocket, splitTitle } from '../hooks/docket';
import { barSvg, colorFor, ringSvg, sparklineSvg } from '../hooks/charts';

const FIXTURE = [
  '# DOCKET',
  '',
  'Header prose that must not leak into any section.',
  '',
  '## Committed',
  '',
  '## Someday',
  '',
  '### 89. Native-app path (2026-10-09)',
  '',
  'Body of eighty-nine.',
  '',
  '#### Status 2026-08-28 — built',
  '',
  'Follow-up stays with its item.',
  '',
  '### 24 (follow-ups). Slice title (2026-07-14)',
  '',
  'Slice body.',
  '',
  '## Loose threads',
  '',
  '- First thread',
  '- Second thread that',
  '  continues here',
  '',
].join('\n');

test('parseDocket groups items by section and ignores the header', async () => {
  const sections = parseDocket(FIXTURE);

  expect(sections.map(section => section.name)).toEqual(['Committed', 'Someday', 'Loose threads']);
  expect(sections[0]).toEqual({ name: 'Committed', items: [], threads: [] });
  expect(sections[1]?.items.length).toBe(2);
  expect(sections[1]?.threads).toEqual([]);
  expect(sections[2]?.items).toEqual([]);
});

test('parseDocket reads item fields, id-slot references and keeps Status blocks in the body', async () => {
  const items = parseDocket(FIXTURE)[1]?.items ?? [];

  expect(items[0]).toEqual({
    idPart: '89',
    id: 89,
    title: 'Native-app path',
    date: '2026-10-09',
    body: 'Body of eighty-nine.\n\n#### Status 2026-08-28 — built\n\nFollow-up stays with its item.',
  });
  expect(items[1]).toEqual({
    idPart: '24 (follow-ups)',
    id: 24,
    title: 'Slice title',
    date: '2026-07-14',
    body: 'Slice body.',
  });
});

test('parseDocket collects top-level bullets and joins indented continuations', async () => {
  const sections = parseDocket(FIXTURE);

  expect(sections[2]?.threads).toEqual(['First thread', 'Second thread that continues here']);
});

test('parseDocket treats CRLF input like LF', async () => {
  expect(parseDocket(FIXTURE.replace(/\n/g, '\r\n'))).toEqual(parseDocket(FIXTURE));
});

test('parseDocket skips archive entries as sections and drops items before any section', async () => {
  const sections = parseDocket(['### 1. Orphan', '', '## Real', '', '## 5. Archived entry — DONE', ''].join('\n'));

  expect(sections).toEqual([{ name: 'Real', items: [], threads: [] }]);
});

test('splitTitle strips a trailing date group', async () => {
  expect(splitTitle('Title (2026-07-18)')).toEqual({ title: 'Title', date: '2026-07-18' });
});

test('splitTitle keeps the leftmost date and leaves non-date groups alone', async () => {
  expect(splitTitle('Title (2026-07-18, corrected 2026-07-23)')).toEqual({ title: 'Title', date: '2026-07-18' });
  expect(splitTitle('Title (split from #26, 2026-07-14)')).toEqual({
    title: 'Title (split from #26, 2026-07-14)',
    date: null,
  });
  expect(splitTitle('Plain title')).toEqual({ title: 'Plain title', date: null });
});

test('splitTitle never returns an empty title', async () => {
  expect(splitTitle('(2026-07-18)')).toEqual({ title: '(2026-07-18)', date: null });
});

test('ancestors walks a posix path to the root', async () => {
  expect(ancestors('/a/b')).toEqual(['/a/b', '/a', '/']);
  expect(ancestors('/a/b/')).toEqual(['/a/b', '/a', '/']);
});

test('ancestors walks a Windows path in its own separator style', async () => {
  expect(ancestors('C:\\Users\\me')).toEqual(['C:\\Users\\me', 'C:\\Users', 'C:\\']);
});

test('joinPath and baseName handle both separator styles', async () => {
  expect(joinPath('/a/b', 'docket', 'DOCKET.md')).toBe('/a/b/docket/DOCKET.md');
  expect(joinPath('/a/b/', '/docket')).toBe('/a/b/docket');
  expect(joinPath('/', 'a')).toBe('/a');
  expect(joinPath('C:\\Users', 'docket')).toBe('C:\\Users\\docket');
  expect(baseName('/a/b/c.md')).toBe('c.md');
  expect(baseName('C:\\a\\c.md')).toBe('c.md');
});

test('ageInDays counts whole UTC days and rejects unparsable dates', async () => {
  const now = Date.UTC(2026, 9, 11, 15, 30);

  expect(ageInDays('2026-10-11', now)).toBe(0);
  expect(ageInDays('2026-10-01', now)).toBe(10);
  expect(ageInDays('not a date', now)).toBe(null);
  expect(ageInDays('2026-02-31', now)).toBe(null);
});

const NOW = Date.UTC(2026, 9, 20, 12);

test('closesByWeek buckets DONE dates by week, oldest first, and counts a combined entry twice', async () => {
  const archive = [
    '# DOCKET ARCHIVE 2026',
    '',
    '## 19. Closed this week (2026-10-01) — ✅ DONE 2026-10-19',
    '## 2 + 17. Closed together (2026-08-05) — ✅ DONE 2026-10-15',
    '## 5. Closed last week — ✅ DONE 2026-10-09',
    '## 6. Too old to chart — ✅ DONE 2026-01-02',
    '## 7. No close stamp at all',
  ].join('\n');

  const counts = closesByWeek([archive], NOW, 4);

  expect(counts).toEqual([0, 0, 1, 3]);
});

test('closesByWeek is all zeros for an empty archive', async () => {
  expect(closesByWeek([], NOW, 3)).toEqual([0, 0, 0]);
});

test('colorFor gives distinct colours to the first seven segments', async () => {
  const colors = new Set([0, 1, 2, 3, 4, 5, 6].map(colorFor));

  expect(colors.size).toBe(7);
});

test('ringSvg draws one arc per non-empty share, the done percentage, and escapes names', async () => {
  const svg = ringSvg(
    [
      { name: 'Done', count: 3, color: '#111111' },
      { name: 'A & B', count: 1, color: '#222222' },
      { name: 'Empty', count: 0, color: '#333333' },
    ],
    3,
  );

  expect(svg.match(/stroke-dasharray/g)?.length).toBe(2);
  expect(svg.match(/stroke-linecap="round"/g)?.length).toBe(2);
  expect(svg).toContain('75%');
  expect(svg).toContain('1 a &amp; b');
  expect(svg).not.toContain('#333333');
});

test('sparklineSvg draws a bar per week with a tooltip, and a quiet week stays visible', async () => {
  const svg = sparklineSvg([0, 2, 4], '#3f8f5b');

  expect(svg.match(/<rect/g)?.length).toBe(3);
  expect(svg).toContain('4 closed this week');
  expect(svg).toContain('2 closed 1 week ago');
  expect(svg).toContain('fill-opacity="0.25"');
});

test('ringSvg draws a lone segment as a whole ring, with no notch', async () => {
  const svg = ringSvg([{ name: 'Done', count: 5, color: '#111111' }], 5);

  expect(svg).not.toContain('stroke-dasharray');
  expect(svg).toContain('100%');
});

test('barSvg rounds every segment, labels each, and leaves a share too thin for a bar as a dot', async () => {
  const svg = barSvg(
    [
      { name: 'Done', count: 99, color: '#111111' },
      { name: 'Someday', count: 1, color: '#222222' },
      { name: 'Empty', count: 0, color: '#333333' },
    ],
    200,
    12,
  );

  expect(svg.match(/stroke-linecap="round"/g)?.length).toBe(2);
  expect(svg).toContain('1 someday');
  expect(svg).not.toContain('#333333');

  const dot = svg.match(/<line x1="([\d.]+)" y1="6" x2="([\d.]+)"[^>]*stroke="#222222"/);

  expect(dot?.[1]).toBe(dot?.[2]);
});

test('barSvg draws nothing for an empty board, and has an intrinsic size so the desktop does not pad it', async () => {
  const svg = barSvg([], 100, 10);

  expect(svg).not.toContain('<line');
  expect(svg).toContain('width="100" height="10"');
});

test('neither chart draws a grey track behind its segments', async () => {
  const shares = [{ name: 'Done', count: 3, color: '#111111' }];

  expect(barSvg(shares)).not.toContain('#888888');
  expect(ringSvg(shares, 3).match(/stroke="#888888"/g)).toBe(null);
});
