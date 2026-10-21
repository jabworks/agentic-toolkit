import { expect, test } from 'claude-code/testing';

import { parseLedger } from '../board/parse-ledger';
import { LEDGER_BACKTICKED, LEDGER_HEADER_ONLY, LEDGER_ODD, LEDGER_REAL } from './fixtures';

test('reads the header and every line of the real ledger in file order', async () => {
  const ledger = parseLedger(LEDGER_REAL, 'diagram-routing-gate.md', 1234);

  expect(ledger.file).toBe('diagram-routing-gate.md');
  expect(ledger.planFile).toBe('2026-09-08-diagram-routing-gate.md');
  expect(ledger.baseSha).toBe('97b0f89');
  expect(ledger.mtimeMs).toBe(1234);
  expect(ledger.lines.map(line => line.taskNumber)).toEqual([2, 1, 3, null, null, null, null]);
  expect(ledger.lines.every(line => line.isChecked)).toBe(true);
});

test('keeps each line verbatim after the checkbox, wrap-up lines included', async () => {
  const ledger = parseLedger(LEDGER_REAL, 'diagram-routing-gate.md', 0);

  expect(ledger.lines[0]?.text).toMatch(/^Task 2: routing rules/);
  expect(ledger.lines[3]?.text).toMatch(/^code-review: 1 Important/);
  expect(ledger.lines[6]?.text).toContain('PR #150 open');
});

test('a header with no task lines is a valid, empty ledger', async () => {
  const ledger = parseLedger(LEDGER_HEADER_ONLY, 'fresh.md', 5);

  expect(ledger.planFile).toBe('2026-10-01-fresh.md');
  expect(ledger.baseSha).toBe(null);
  expect(ledger.lines).toEqual([]);
});

test('reads leniently: unchecked boxes, upper-case X, star bullets, plural "Tasks", prose and a Windows plan path', async () => {
  const ledger = parseLedger(LEDGER_ODD, 'odd.md', 0);

  expect(ledger.planFile).toBe('2026-10-03-odd.md');
  expect(ledger.baseSha).toBe('abc1234');
  expect(ledger.lines).toEqual([
    { taskNumber: 4, isChecked: false, text: 'Task 4: not done yet' },
    { taskNumber: 12, isChecked: true, text: 'Task 12: upper-case X still counts as checked' },
    { taskNumber: null, isChecked: true, text: 'Tasks all done: plural is a wrap-up line, not a task' },
    { taskNumber: 5, isChecked: true, text: 'task 5: a star bullet and a lower-case word' },
  ]);
});

test('a ledger with no Plan header has no plan file, and empty text has no lines', async () => {
  expect(parseLedger('- [x] Task 1: a\n', 'a.md', 0).planFile).toBe(null);
  expect(parseLedger('', 'empty.md', 0)).toEqual({ file: 'empty.md', planFile: null, baseSha: null, lines: [], mtimeMs: 0 });
});

test('Windows line endings do not leak into the header or the lines', async () => {
  const ledger = parseLedger(LEDGER_REAL.replace(/\n/g, '\r\n'), 'x.md', 0);

  expect(ledger.planFile).toBe('2026-09-08-diagram-routing-gate.md');
  expect(ledger.baseSha).toBe('97b0f89');
  expect(ledger.lines[0]?.text.endsWith('\r')).toBe(false);
});

test('a Plan: header with the path in backticks and commentary after it still names the plan file', async () => {
  const ledger = parseLedger(LEDGER_BACKTICKED, '2026-09-15-pocket-haven.md', 0);

  expect(ledger.planFile).toBe('2026-09-15-pocket-haven.md');
  expect(ledger.lines.length).toBe(1);
});

test('quotes, angle brackets and a bare path all reduce to the file name; a header naming no .md falls back to its text', async () => {
  expect(parseLedger('Plan: "plans/a.md"\n', 'x.md', 0).planFile).toBe('a.md');
  expect(parseLedger("Plan: <.condux/plans/b.md>\n", 'x.md', 0).planFile).toBe('b.md');
  expect(parseLedger('Plan: see the design doc\n', 'x.md', 0).planFile).toBe('see the design doc');
});
