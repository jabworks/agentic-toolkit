import { type Ledger, type LedgerLine } from '../types';

const PLAN_RE = /^Plan:\s*(.+?)\s*$/;
const BASE_RE = /^BASE:\s*(\S+)/;
const CHECKBOX_RE = /^[-*]\s+\[([ xX])\]\s*(.*?)\s*$/;
const TASK_RE = /^Task\s+(\d+)\b/i;

// The ledger is written by an agent while it works, so it is read leniently: a line that is not a checkbox is prose and
// is skipped, never an error.
export const parseLedger = (text: string, file: string, mtimeMs: number): Ledger => {
  let planFile: string | null = null;
  let baseSha: string | null = null;

  const lines: LedgerLine[] = [];

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    const plan = line.match(PLAN_RE)?.[1];
    const base = line.match(BASE_RE)?.[1];
    const box = line.match(CHECKBOX_RE);

    if (plan !== undefined && planFile === null) {
      // The header names a path from the repo root; only the file name links it to a plan.
      planFile = plan.split(/[\\/]/).pop() || null;
    } else if (base !== undefined && baseSha === null) {
      baseSha = base;
    } else if (box) {
      const body = box[2] ?? '';
      const task = body.match(TASK_RE)?.[1];

      lines.push({ taskNumber: task === undefined ? null : Number(task), isChecked: box[1] !== ' ', text: body });
    }
  }

  return { file, planFile, baseSha, lines, mtimeMs };
};
