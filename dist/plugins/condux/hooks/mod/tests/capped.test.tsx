import { expect, test } from 'claude-code/testing';

import { answerBeneath, ledgerText, mountPane, PLANS, planText, PROGRESS, run, type VFile } from './harness';

// Eight plans that never had a ledger and seven that went stale, named so the newest sort first.
const pile = (now: number): Record<string, VFile> => {
  const files: Record<string, VFile> = {};

  for (let i = 1; i <= 8; i += 1) {
    files[`${PLANS}/2026-08-0${i}-bare${i}.md`] = { text: planText(`Bare ${i}`, 2), mtimeMs: now };
  }

  for (let i = 1; i <= 7; i += 1) {
    const file = `2026-07-0${i}-old${i}.md`;

    files[`${PLANS}/${file}`] = { text: planText(`Old ${i}`, 2), mtimeMs: now };
    files[`${PROGRESS}/old${i}.md`] = {
      text: ledgerText(file, ['- [x] Task 1: step 1 — done']),
      mtimeMs: now - 40 * 86_400_000,
    };
  }

  return files;
};

test('the no-ledger and stale groups each keep their newest five, with the rest counted, and the header counts the unledgered', async ($, on) => {
  answerBeneath(on, pile);
  await $.command.run(run(''));

  const ui = await mountPane('terminal', $);
  const rows = (await ui.findAll({ type: 'Button' })).map(node => node.key ?? '');

  expect(rows.filter(key => /^plan:.*-bare\d\.md$/.test(key))).toHaveLength(5);
  expect(rows.filter(key => /^plan:.*-old\d\.md$/.test(key))).toHaveLength(5);

  const texts = (await ui.findAll({ type: 'Text' })).map(node => node.text);

  expect(texts).toContain('+3 older plans with no ledger · /condux all');
  expect(texts).toContain('+2 older stale plans · /condux all');
  expect(texts.some(text => /15 plans · 0 active · 8 unledgered/.test(text))).toBe(true);
});

test('typing a filter shows every match, old ones included', async ($, on) => {
  answerBeneath(on, pile);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);

  await ui.input({ key: 'filter', text: 'Bare' });

  const rows = (await ui.findAll({ type: 'Button' })).map(node => node.key ?? '');

  expect(rows.filter(key => /^plan:.*-bare\d\.md$/.test(key))).toHaveLength(8);
  expect((await ui.findAll({ type: 'Text' })).some(node => /older plans with no ledger/.test(node.text))).toBe(false);
});

test('the text board counts the older ones and `/condux all` lists them', async ($, on) => {
  answerBeneath(on, pile);

  const short = await $.command.run(run('all'));
  const text = String((short as { text?: string }).text ?? '');

  expect(text).toContain('Bare 8');
  expect(text).toContain('Bare 1');
  expect(text).not.toContain('older plans with no ledger');
});

test('a quiet board with only a few unledgered plans shows no "older" line', async ($, on) => {
  answerBeneath(on, now => Object.fromEntries(Object.entries(pile(now)).filter(([path]) => /bare[123]\.md$/.test(path))));
  await $.command.run(run(''));

  const ui = await mountPane('terminal', $);

  expect((await ui.findAll({ type: 'Text' })).some(node => /older/.test(node.text))).toBe(false);
});
