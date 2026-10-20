import { type Plan, type PlanTask } from '../types';

const FENCE_RE = /^\s*(?:```|~~~)/;
const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const TASK_HEADING_RE = /^(#{2,3})\s+Task\s+(\d+)\s*[:.—–-]\s*(.+?)\s*$/;
const DEPENDENCIES_RE = /^\*{0,2}Dependencies:?\*{0,2}:?\s*(.*)$/i;
const DATED_FILE_RE = /^(\d{4}-\d{2}-\d{2})-(.+?)(?:\.md)?$/;
const TIER_RE = /\b(SMALL|MEDIUM|LARGE) tier\b/;
const RANGE_RE = /\bTasks?\s+(\d+)\s*[-–—]\s*(\d+)\b/g;
const LIST_RE = /\bTasks?\s+(\d+(?:\s*(?:,|and|&)\s*(?:Tasks?\s+)?\d+)*)/g;
// How far down a plan a stated tier is still the plan's own, not a line quoted from elsewhere.
const TIER_WINDOW = 15;
const MAX_RANGE = 200;

type Line = { text: string; isFenced: boolean };

// Fence state is decided per line up front, so every later pass agrees on which headings are real.
const markFences = (text: string): Line[] => {
  let isOpen = false;

  return text.split('\n').map(raw => {
    const line = raw.replace(/\r$/, '');

    if (FENCE_RE.test(line)) {
      isOpen = !isOpen;

      return { text: line, isFenced: true };
    }

    return { text: line, isFenced: isOpen };
  });
};

// "Task 1 (defines X)" keeps its dependency and "None (independent of Tasks 1–3)" has none: strip the parentheticals
// first so their contents never count, then read ranges, then plain mentions.
export const parseDependencies = (raw: string, own: number, known: Set<number>): number[] => {
  const stripped = raw.replace(/\([^)]*\)/g, '');

  if (/^\s*none\b/i.test(stripped)) {
    return [];
  }

  const numbers = new Set<number>();

  for (const match of stripped.matchAll(RANGE_RE)) {
    const from = Number(match[1]);
    const to = Math.min(Number(match[2]), from + MAX_RANGE);

    for (let n = from; n <= to; n += 1) {
      numbers.add(n);
    }
  }

  for (const match of stripped.replace(RANGE_RE, ' ').matchAll(LIST_RE)) {
    for (const digits of match[1]?.match(/\d+/g) ?? []) {
      numbers.add(Number(digits));
    }
  }

  return [...numbers].filter(n => n !== own && known.has(n)).sort((a, b) => a - b);
};

export const parsePlan = (text: string, file: string): Plan => {
  const lines = markFences(text);
  const dated = file.match(DATED_FILE_RE);
  const slug = dated ? (dated[2] ?? file) : file.replace(/\.md$/, '');

  let title = slug;
  let tier: Plan['tier'] = null;
  let hasTitle = false;

  lines.forEach((line, index) => {
    if (line.isFenced) {
      return;
    }

    const heading = line.text.match(HEADING_RE);

    if (!hasTitle && heading?.[1] === '#') {
      title = (heading[2] ?? slug).replace(/^Plan:\s*/i, '').trim() || slug;
      hasTitle = true;
    }

    if (tier === null && index < TIER_WINDOW) {
      tier = (line.text.match(TIER_RE)?.[1] as Plan['tier']) ?? null;
    }
  });

  // Card boundaries: a task heading opens a card, and any real heading of its own level or higher closes it.
  const cards: { number: number; name: string; start: number; level: number; end: number }[] = [];

  lines.forEach((line, index) => {
    if (line.isFenced) {
      return;
    }

    const task = line.text.match(TASK_HEADING_RE);

    if (task) {
      cards.push({
        number: Number(task[2]),
        name: task[3] ?? '',
        start: index + 1,
        level: (task[1] ?? '').length,
        end: lines.length,
      });
    }
  });

  cards.forEach(card => {
    for (let index = card.start; index < lines.length; index += 1) {
      const line = lines[index];
      const level = line && !line.isFenced ? (line.text.match(HEADING_RE)?.[1]?.length ?? 0) : 0;

      if (level > 0 && level <= card.level) {
        card.end = index;

        return;
      }
    }
  });

  const seen = new Set<number>();
  const unique = cards.filter(card => {
    if (seen.has(card.number)) {
      return false;
    }

    seen.add(card.number);

    return true;
  });

  const tasks: PlanTask[] = unique.map(card => {
    const body = lines.slice(card.start, card.end);
    const dependencies = body.find(line => !line.isFenced && DEPENDENCIES_RE.test(line.text));
    const raw = dependencies?.text.match(DEPENDENCIES_RE)?.[1] ?? '';

    return {
      number: card.number,
      name: card.name,
      dependsOn: parseDependencies(raw, card.number, seen),
      body: body
        .map(line => line.text)
        .join('\n')
        .trim(),
    };
  });

  return { file, slug, title, date: dated?.[1] ?? null, tier, tasks };
};
