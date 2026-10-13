import { expect, test } from 'claude-code/testing';

import { ageInDays, ancestors, baseName, joinPath, parseDocket, splitTitle } from '../hooks/docket';

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
