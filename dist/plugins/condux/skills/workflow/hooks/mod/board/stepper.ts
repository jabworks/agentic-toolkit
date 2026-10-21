import { type BoardPlan } from '../types';

export type Stage = { label: string; isDone: boolean; isGhost: boolean };

// The wrap-up the workflow runs after the tasks. A ledger names these loosely, so each is matched by a stem.
const GHOSTS: { label: string; match: RegExp }[] = [
  { label: 'review', match: /review/i },
  { label: 'preflight', match: /preflight|finalize/i },
  { label: 'verify', match: /verif/i },
  { label: 'commit', match: /commit/i },
];

// One stage per task, then the ledger's wrap-up lines in file order (a recognised one under its short name, any other
// verbatim), then a ghost for each of the four steps the ledger has not reached.
export const stepperStages = (plan: BoardPlan): Stage[] => {
  const tasks = plan.tasks.map(entry => ({
    label: String(entry.task.number),
    isDone: entry.state === 'done' && plan.status !== 'no-ledger',
    isGhost: false,
  }));

  const wrap = plan.wrapUp.map(line => ({
    label: GHOSTS.find(ghost => ghost.match.test(line.text))?.label ?? line.text,
    isDone: line.isChecked,
    isGhost: false,
  }));

  const ghosts = GHOSTS.filter(ghost => !plan.wrapUp.some(line => ghost.match.test(line.text))).map(ghost => ({
    label: ghost.label,
    isDone: false,
    isGhost: true,
  }));

  return plan.status === 'no-ledger' ? tasks : [...tasks, ...wrap, ...ghosts];
};
