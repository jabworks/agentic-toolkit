import { EASE_OUT, ENTRANCE_MS, motionStyle } from '../kit/charts';
import { type TaskState } from '../types';
import { STATE_HEX } from './graph';

// The desktop's task glyphs, drawn the way the app draws its own checklist: a filled circle holding a check, an open
// arc for the task under way, a dashed ring for one still to come. Text glyphs (✓ ▶ ⏸) are not one width in a
// proportional font and cannot turn, so the desktop draws these instead; the terminal keeps its text.
export type GlyphKind = TaskState | 'cycle' | 'unknown';

export const GLYPH_SIZE = 13;

// What each drawing says to a reader that cannot see it.
export const GLYPH_ALT: Record<GlyphKind, string> = {
  done: 'done',
  'next-ready': 'under way',
  ready: 'ready',
  blocked: 'blocked',
  cycle: 'in a dependency cycle',
  unknown: 'state unknown',
};

const CYCLE_HEX = '#c0392b';
const RING = 'cx="7" cy="7" r="5.5" fill="none"';

const shapeOf = (kind: GlyphKind): string => {
  switch (kind) {
    case 'done': {
      return [
        `<circle cx="7" cy="7" r="6" fill="${STATE_HEX.done}"/>`,
        '<path d="M4.2 7.2 L6.2 9.1 L9.9 5.2" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      ].join('');
    }

    case 'next-ready': {
      // Three quarters of the ring: the gap is what shows the turn when it spins.
      return `<circle class="arc" ${RING} stroke="${STATE_HEX['next-ready']}" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="24 11"/>`;
    }

    case 'ready': {
      return `<circle ${RING} stroke="${STATE_HEX.blocked}" stroke-width="1.4" stroke-dasharray="2 2.3"/>`;
    }

    case 'blocked': {
      return `<circle ${RING} stroke="${STATE_HEX.blocked}" stroke-opacity="0.5" stroke-width="1.4" stroke-dasharray="2 2.3"/>`;
    }

    case 'cycle': {
      return `<circle ${RING} stroke="${CYCLE_HEX}" stroke-width="1.4" stroke-dasharray="2 2.3"/>`;
    }

    case 'unknown': {
      return `<circle cx="7" cy="7" r="1.6" fill="${STATE_HEX.blocked}"/>`;
    }
  }
};

// Every glyph fades in once; only the task being worked while a main turn runs spins, at a steady rate, as a spinner
// does. Reduced motion stills both.
export const glyphSvg = (kind: GlyphKind, isSpinning = false): string =>
  [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${GLYPH_SIZE}" height="${GLYPH_SIZE}" viewBox="0 0 14 14">`,
    motionStyle(
      `.glyph{animation:fade ${ENTRANCE_MS}ms ${EASE_OUT} both}@keyframes fade{from{opacity:0}to{opacity:1}}` +
        (isSpinning ? '.arc{transform-origin:7px 7px;animation:spin 900ms linear infinite}@keyframes spin{to{transform:rotate(360deg)}}' : ''),
    ),
    `<g class="glyph">${shapeOf(kind)}</g>`,
    '</svg>',
  ].join('');
