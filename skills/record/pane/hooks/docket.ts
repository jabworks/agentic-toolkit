import { type DocketItem, type DocketSection } from '../types';

// Mirrors skills/record/server/docket-core.mjs; the hooks environment has no Node, so everything here is string work.
const ITEM_RE = /^###\s+(\d+(?:\s*\([^)]*\))?)\.\s+(.*)$/;
const ARCHIVE_ENTRY_RE = /^##\s+(\d+(?:\s*\([^)]*\))?)\.\s+/;
const SECTION_RE = /^##\s+(.+)$/;
const BLOCK_END_RE = /^#{2,3}\s/;
const BULLET_RE = /^[-*]\s+(.*)$/;
const DATE_GROUP_RE = /\s*\((\d{4}-\d{2}-\d{2})[^)]*\)\s*$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DRIVE_RE = /^[A-Za-z]:$/;
const DAY_MS = 86_400_000;

export const splitTitle = (raw: string): { title: string; date: string | null } => {
  let rest = raw;
  let date: string | null = null;
  let match = rest.match(DATE_GROUP_RE);

  while (match) {
    // Groups peel off right to left, so the last one peeled is the leftmost: the date the item was added.
    date = match[1] ?? null;
    rest = rest.slice(0, match.index).trimEnd();
    match = rest.match(DATE_GROUP_RE);
  }

  const title = rest.trim();

  if (title === '') {
    return { title: raw.trim(), date: null };
  }

  return { title, date };
};

const trimBlankLines = (lines: string[]): string[] => {
  let start = 0;
  let end = lines.length;

  while (start < end && (lines[start] ?? '').trim() === '') {
    start += 1;
  }

  while (end > start && (lines[end - 1] ?? '').trim() === '') {
    end -= 1;
  }

  return lines.slice(start, end);
};

export const parseDocket = (text: string): DocketSection[] => {
  const lines = text.replace(/\r/g, '').split('\n');
  const sections: DocketSection[] = [];

  let current: DocketSection | null = null;
  // Index of the thread a following indented line would continue, or -1 outside a bullet run.
  let openThread = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const section = line.match(SECTION_RE);

    if (section && !ARCHIVE_ENTRY_RE.test(line)) {
      current = { name: (section[1] ?? '').trim(), items: [], threads: [] };
      sections.push(current);
      openThread = -1;
      continue;
    }

    const item = line.match(ITEM_RE);

    if (item) {
      let end = i + 1;

      while (end < lines.length && !BLOCK_END_RE.test(lines[end] ?? '')) {
        end += 1;
      }

      if (current) {
        const idPart = (item[1] ?? '').trim();
        const { title, date } = splitTitle(item[2] ?? '');
        const entry: DocketItem = {
          idPart,
          id: parseInt(idPart, 10),
          title,
          date,
          body: trimBlankLines(lines.slice(i + 1, end)).join('\n'),
        };

        current.items.push(entry);
      }

      openThread = -1;
      i = end - 1;
      continue;
    }

    if (!current) {
      continue;
    }

    const bullet = line.match(BULLET_RE);

    if (bullet) {
      current.threads.push((bullet[1] ?? '').trim());
      openThread = current.threads.length - 1;
      continue;
    }

    if (openThread >= 0 && /^\s+\S/.test(line)) {
      current.threads[openThread] = `${current.threads[openThread] ?? ''} ${line.trim()}`.trim();
      continue;
    }

    if (line.trim() !== '') {
      openThread = -1;
    }
  }

  return sections;
};

const separatorOf = (path: string): string => (path.includes('\\') && !path.includes('/') ? '\\' : '/');

export const ancestors = (dir: string): string[] => {
  const sep = separatorOf(dir);
  const parts = dir.split(/[\\/]/).filter(part => part !== '');
  const isUnc = dir.startsWith('\\\\');
  const isAbsolute = dir.startsWith('/') || dir.startsWith('\\');
  const hasDrive = parts.length > 0 && DRIVE_RE.test(parts[0] ?? '');
  const result: string[] = [];

  let prefix = '';

  if (isUnc) {
    prefix = '\\\\';
  } else if (isAbsolute) {
    prefix = sep;
  }

  for (let count = parts.length; count >= 1; count -= 1) {
    // A bare drive (`C:`) is not a directory; the root entry below stands in for it.
    if (hasDrive && count === 1) {
      break;
    }

    result.push(prefix + parts.slice(0, count).join(sep));
  }

  if (hasDrive) {
    result.push(`${parts[0]}${sep}`);
  } else if (isAbsolute && !isUnc) {
    result.push(sep);
  }

  return result;
};

export const joinPath = (dir: string, ...parts: string[]): string => {
  const sep = separatorOf(dir);
  const isRoot = dir === '/' || dir === '\\';
  let result = isRoot ? '' : dir.replace(/[\\/]+$/, '');

  for (const part of parts) {
    const clean = part.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '');

    if (clean === '') {
      continue;
    }

    result = `${result}${sep}${clean}`;
  }

  return result === '' ? dir : result;
};

export const baseName = (path: string): string => {
  const parts = path.split(/[\\/]/).filter(part => part !== '');

  return parts[parts.length - 1] ?? '';
};

export const ageInDays = (date: string, nowMs: number): number | null => {
  const match = date.match(DATE_RE);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const then = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC rolls 2026-02-31 into March; a round-trip mismatch means the text named no real day.
  if (then.getUTCFullYear() !== year || then.getUTCMonth() !== month - 1 || then.getUTCDate() !== day) {
    return null;
  }

  return Math.max(0, Math.floor((nowMs - then.getTime()) / DAY_MS));
};

const DONE_RE = /\bDONE\s+(\d{4}-\d{2}-\d{2})/;
const HEADING_RE = /^##\s+(.+)$/;

// Items closed per week, oldest first, the last entry being this week. A combined entry ("## 2 + 17.") closed two items.
export const closesByWeek = (archives: string[], nowMs: number, weeks = 12): number[] => {
  const counts = new Array<number>(weeks).fill(0);

  for (const text of archives) {
    for (const line of text.replace(/\r/g, '').split('\n')) {
      const heading = line.match(HEADING_RE)?.[1];
      const date = heading?.match(DONE_RE)?.[1];

      if (heading === undefined || date === undefined) {
        continue;
      }

      const age = ageInDays(date, nowMs);
      const ids = (heading.match(/^(\d[\d\s+]*)\./)?.[1] ?? '').split('+').filter(part => part.trim() !== '').length;

      if (age === null || ids === 0) {
        continue;
      }

      const week = Math.floor(age / 7);

      if (week < weeks) {
        counts[weeks - 1 - week] = (counts[weeks - 1 - week] ?? 0) + ids;
      }
    }
  }

  return counts;
};
