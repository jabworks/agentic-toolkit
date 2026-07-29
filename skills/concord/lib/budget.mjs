/**
 * Concord — recall composition.
 *
 * Builds the text injected at session start. This is the only part of Concord
 * the user sees on every single session, so its size and ordering discipline is
 * what decides whether the plugin feels useful or noisy.
 *
 * Order:  pinned → preferences (global) → recent → today
 *
 * Budget: pinned and preferences are EXEMPT and always emitted whole. Only the
 * aging tiers absorb trimming, and they are trimmed oldest-first — `recent`
 * gives way before `today`, and within a section the newest lines survive.
 * Trimming what the user explicitly asked to remember would defeat the point of
 * having asked.
 *
 * When there is no memory, this emits the empty string. No banner, no headers,
 * no "(no memories yet)" — an empty plugin should be invisible.
 */

import { globalNotesPath } from './paths.mjs';
import { readTier, readToday } from './store.mjs';

/** Default character budget for the injected block. */
export const DEFAULT_LIMIT = 3000;

const HEADINGS = {
  pinned: 'Pinned',
  preferences: 'Preferences',
  recent: 'Recent',
  today: 'Today',
};

function section(key, body) {
  const text = String(body ?? '').trim();
  return text ? { key, heading: HEADINGS[key], text } : null;
}

function render(s) {
  return `## ${s.heading}\n${s.text}`;
}

/**
 * Keep the LAST whole lines that fit in `budget`.
 *
 * Clipping happens on line boundaries — never mid-character — because a cut
 * through a multi-byte sequence produces mojibake in the injected context. If
 * not even one line fits, the section is dropped entirely rather than emitted
 * as a fragment.
 */
function clipToLastLines(s, budget) {
  const header = `## ${s.heading}\n`;
  const ELISION = '…\n';
  // Reserve the elision marker up front. Adding it after measuring is how a
  // clipped section quietly overshoots the budget it was clipped to fit.
  const room = budget - header.length - ELISION.length;
  if (room <= 0) return null;

  const lines = s.text.split('\n');
  const kept = [];
  let used = 0;

  for (let i = lines.length - 1; i >= 0; i--) {
    const cost = lines[i].length + (kept.length ? 1 : 0);
    if (used + cost > room) break;
    used += cost;
    kept.unshift(lines[i]);
  }
  if (!kept.length) return null;

  const elided = kept.length < lines.length ? ELISION : '';
  return `${header}${elided}${kept.join('\n')}`;
}

/**
 * Compose the recall block for a memory directory.
 *
 * @param {object} paths tier paths from `tierPaths()`
 * @param {{ limit?: number, now?: Date, globalNotes?: string }} [opts]
 *        `globalNotes` overrides where preferences are read from (tests).
 * @returns {string} the block to inject, or '' when there is nothing to say
 */
export function composeRecall(paths, { limit = DEFAULT_LIMIT, now = new Date(), globalNotes } = {}) {
  const notesPath = globalNotes ?? globalNotesPath();

  const exempt = [
    section('pinned', readTier(paths.pinned)),
    section('preferences', readTier(notesPath)),
  ].filter(Boolean);

  const trimmable = [
    section('recent', readTier(paths.recent)),
    section('today', readToday(paths, now)),
  ].filter(Boolean);

  if (!exempt.length && !trimmable.length) return '';

  const head = exempt.map(render).join('\n\n');
  const separatorCost = head ? 2 : 0;
  let remaining = limit - head.length - separatorCost;

  // The exempt tiers alone can outgrow the budget. They are exempt, so emit them
  // anyway — and say so, because that overflow is the signal to prune pinned.
  if (remaining <= 0) {
    const note = '_(recall budget exceeded by pinned memory — consider pruning)_';
    return head ? `${head}\n\n${note}` : note;
  }

  // Newest first: `today` claims budget before `recent` gives any up.
  const tail = [];
  for (let i = trimmable.length - 1; i >= 0; i--) {
    const s = trimmable[i];
    const cost = render(s).length + (tail.length ? 2 : 0);

    if (cost <= remaining) {
      tail.unshift(render(s));
      remaining -= cost;
      continue;
    }
    const clipped = clipToLastLines(s, remaining - (tail.length ? 2 : 0));
    if (clipped) tail.unshift(clipped);
    break; // anything older than a section we had to clip cannot fit either
  }

  return [head, ...tail].filter(Boolean).join('\n\n');
}
