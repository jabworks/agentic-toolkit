import { type BoardPlan, type TaskState } from '../types';

// Mid-tone, so one drawing reads in both themes (the same family as the shared charts).
export const STATE_HEX: Record<TaskState, string> = {
  done: '#3f8f5b',
  'next-ready': '#c8643c',
  ready: '#2f6db5',
  blocked: '#8a8a85',
};

const CYCLE_HEX = '#c0392b';
const NODE_W = 30;
const NODE_H = 22;
const GAP_X = 20;
const GAP_Y = 12;
const PAD = 4;

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A task's column: one past its deepest dependency. A dependency loop is cut where it is re-entered, so the layout
// always ends.
const layersOf = (plan: BoardPlan): Map<number, number> => {
  const byNumber = new Map(plan.tasks.map(entry => [entry.task.number, entry]));
  const layers = new Map<number, number>();
  const visiting = new Set<number>();

  const depth = (number: number): number => {
    const known = layers.get(number);

    if (known !== undefined) {
      return known;
    }

    if (visiting.has(number)) {
      return 0;
    }

    visiting.add(number);

    const deps = byNumber.get(number)?.task.dependsOn ?? [];
    const layer = deps.reduce((deepest, dep) => Math.max(deepest, depth(dep) + 1), 0);

    visiting.delete(number);
    layers.set(number, layer);

    return layer;
  };

  plan.tasks.forEach(entry => depth(entry.task.number));

  return layers;
};

// Only a plan whose tasks depend on each other has a graph worth drawing.
export const hasGraph = (plan: BoardPlan): boolean =>
  plan.tasks.length > 1 && plan.tasks.some(entry => entry.task.dependsOn.length > 0);

// Left to right, one column per dependency depth; an edge runs from a dependency's right side to its dependant's left,
// green once the dependency is done. Drawn at its natural size and scaled into `maxWidth` by the viewBox, so a long
// chain stays inside the pane.
export const graphSvg = (plan: BoardPlan, maxWidth = 640): { svg: string; width: number; height: number } => {
  const layers = layersOf(plan);
  const isUnknown = plan.status === 'no-ledger';
  const rowsInLayer = new Map<number, number>();
  const spots = new Map<number, { x: number; y: number }>();

  for (const entry of plan.tasks) {
    const layer = layers.get(entry.task.number) ?? 0;
    const row = rowsInLayer.get(layer) ?? 0;

    rowsInLayer.set(layer, row + 1);
    spots.set(entry.task.number, { x: PAD + layer * (NODE_W + GAP_X), y: PAD + row * (NODE_H + GAP_Y) });
  }

  const columns = Math.max(1, ...[...rowsInLayer.keys()].map(layer => layer + 1));
  const rows = Math.max(1, ...rowsInLayer.values());
  const naturalWidth = PAD * 2 + columns * NODE_W + (columns - 1) * GAP_X;
  const naturalHeight = PAD * 2 + rows * NODE_H + (rows - 1) * GAP_Y;
  const scale = Math.min(1, maxWidth / naturalWidth);
  const width = Math.round(naturalWidth * scale);
  const height = Math.round(naturalHeight * scale);
  const colorOf = (entry: BoardPlan['tasks'][number]): string => {
    if (entry.inCycle) {
      return CYCLE_HEX;
    }

    return isUnknown ? STATE_HEX.blocked : STATE_HEX[entry.state];
  };

  const edges = plan.tasks.flatMap(entry =>
    entry.task.dependsOn.flatMap(dep => {
      const from = spots.get(dep);
      const to = spots.get(entry.task.number);
      const source = plan.tasks.find(candidate => candidate.task.number === dep);

      if (!from || !to || !source) {
        return [];
      }

      const x1 = from.x + NODE_W;
      const y1 = from.y + NODE_H / 2;
      const x2 = to.x;
      const y2 = to.y + NODE_H / 2;
      const bend = Math.max(6, (x2 - x1) / 2);
      const isDoneEdge = source.state === 'done' && !isUnknown;
      const idle = isDoneEdge ? STATE_HEX.done : STATE_HEX.blocked;
      const stroke = entry.inCycle ? CYCLE_HEX : idle;

      return [
        `<path d="M${x1} ${y1} C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-opacity="0.8"/>`,
      ];
    }),
  );

  const nodes = plan.tasks.map(entry => {
    const spot = spots.get(entry.task.number) ?? { x: PAD, y: PAD };
    const title = escapeXml(`Task ${entry.task.number}: ${entry.task.name}`);

    return [
      `<g><title>${title}</title>`,
      `<rect x="${spot.x}" y="${spot.y}" width="${NODE_W}" height="${NODE_H}" rx="${NODE_H / 2}" fill="${colorOf(entry)}"/>`,
      `<text x="${spot.x + NODE_W / 2}" y="${spot.y + NODE_H / 2}" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="600" fill="#ffffff">${entry.task.number}</text>`,
      '</g>',
    ].join('');
  });

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${naturalWidth} ${naturalHeight}">`,
    ...edges,
    ...nodes,
    '</svg>',
  ].join('');

  return { svg, width, height };
};
