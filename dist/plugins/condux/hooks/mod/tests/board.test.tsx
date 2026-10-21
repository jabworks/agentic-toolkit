import { expect, test } from 'claude-code/testing';

import {
  answerBeneath,
  DAY,
  ledgerText,
  MINUTE,
  mountPane,
  PLANS,
  planText,
  PROGRESS,
  ROOT,
  run,
  sampleFiles,
  SURFACES,
  type VFile,
} from './harness';

for (const surface of SURFACES) {
  test(`lists active plans with glyph rows, and the key hints sit above the list on ${surface}`, async ($, on) => {
    answerBeneath(on, sampleFiles);
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    expect((await ui.find({ key: 'plan:2026-10-10-active.md' }))?.text).toContain('Active work');
    expect((await ui.find({ key: 'plan:2026-10-10-active.md' }))?.text).toContain('1/3 done');
    expect((await ui.find({ key: 'task:2026-10-10-active.md:1' }))?.text).toContain('✓');
    expect((await ui.find({ key: 'task:2026-10-10-active.md:2' }))?.text).toContain('▶');
    expect((await ui.find({ key: 'task:2026-10-10-active.md:3' }))?.text).toContain('waits on 2');

    // Document order. A container's `text` holds all its descendants', so only the hint's own Text node counts.
    const tree = await ui.findAll({});
    const hintsAt = tree.findIndex(node => node.type === 'Text' && /tab move/.test(node.text));
    const firstPlanAt = tree.findIndex(node => node.key === 'plan:2026-10-10-active.md');

    expect(hintsAt).toBeGreaterThanOrEqual(0);
    expect(hintsAt).toBeLessThan(firstPlanAt);
  });

  test(`expanding a task shows its card, and collapsing an active plan hides its tasks on ${surface}`, async ($, on) => {
    answerBeneath(on, sampleFiles);
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    expect(await ui.find({ text: /Card text for step 2/ })).toBe(undefined);

    await ui.press({ key: 'task:2026-10-10-active.md:2' });

    expect(await ui.find({ text: /Card text for step 2/ })).toBeDefined();

    await ui.press({ key: 'plan:2026-10-10-active.md' });

    expect(await ui.find({ key: 'task:2026-10-10-active.md:2' })).toBe(undefined);
  });

  test(`finished, stale and no-ledger plans are collapsed groups that open on press on ${surface}`, async ($, on) => {
    answerBeneath(on, sampleFiles);
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    expect((await ui.find({ key: 'plan:2026-09-01-shipped.md' }))?.text).toContain('complete');
    expect((await ui.find({ key: 'plan:2026-08-01-quiet.md' }))?.text).toContain('no ledger, state unknown');
    // No ledger means no recorded progress: the row reports a task count, never "0/2 done".
    expect((await ui.find({ key: 'plan:2026-08-01-quiet.md' }))?.text).toContain('2 tasks');
    expect((await ui.find({ key: 'plan:2026-08-01-quiet.md' }))?.text).not.toContain('done');
    expect((await ui.find({ key: 'plan:2026-07-01-abandoned.md' }))?.text).toContain('stale');
    expect(await ui.find({ key: 'task:2026-09-01-shipped.md:1' })).toBe(undefined);

    await ui.press({ key: 'plan:2026-09-01-shipped.md' });

    expect(await ui.find({ key: 'task:2026-09-01-shipped.md:1' })).toBeDefined();

    // A plan with no ledger shows neutral marks: no "next ready" glyph and no "waits on" for progress nobody recorded.
    await ui.press({ key: 'plan:2026-08-01-quiet.md' });

    expect((await ui.find({ key: 'task:2026-08-01-quiet.md:1' }))?.text).toContain('·');
    expect((await ui.find({ key: 'task:2026-08-01-quiet.md:1' }))?.text).not.toContain('▶');
    expect((await ui.find({ key: 'task:2026-08-01-quiet.md:2' }))?.text).not.toContain('waits on');
  });

  test(`only the five newest finished plans are listed, with a count and /condux all for the rest on ${surface}`, async ($, on) => {
    answerBeneath(on, now => {
      const files: Record<string, VFile> = {};

      for (let i = 1; i <= 7; i += 1) {
        const file = `2026-09-0${i}-done${i}.md`;

        files[`${PLANS}/${file}`] = { text: planText(`Done ${i}`, 1), mtimeMs: now - 30 * DAY };
        files[`${PROGRESS}/done${i}.md`] = {
          text: ledgerText(file, ['- [x] Task 1: step 1', '- [x] committed abc1234']),
          mtimeMs: now - i * DAY,
        };
      }

      return files;
    });
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    expect(await ui.find({ text: /\+2 older finished plans/ })).toBeDefined();
    expect(await ui.find({ key: 'plan:2026-09-01-done1.md' })).toBeDefined();
    expect(await ui.find({ key: 'plan:2026-09-07-done7.md' })).toBe(undefined);

    const all = await $.command.run(run('all'));

    expect(all.text).toContain('Done 7');
  });

  test(`explains a missing working-state directory instead of showing an empty board on ${surface}`, async ($, on) => {
    const { world } = answerBeneath(on, () => ({}));

    world.hasCondux = false;
    await $.command.run(run(''));

    const ui = await mountPane(surface, $);

    expect(await ui.find({ text: /No condux working state found/ })).toBeDefined();
  });
}

test('the board redraws as the agent appends to a ledger: a ticked task appears within a poll', async ($, on) => {
  const { world, clock, now } = answerBeneath(on, sampleFiles);

  await $.command.run(run(''));

  const ui = await mountPane('terminal', $);

  expect((await ui.find({ key: 'task:2026-10-10-active.md:2' }))?.text).toContain('▶');

  world.files[`${PROGRESS}/active.md`] = {
    text: ledgerText('2026-10-10-active.md', ['- [x] Task 1: step 1', '- [x] Task 2: step 2']),
    mtimeMs: now + 3 * MINUTE,
  };
  await clock.advance(3000);

  expect((await ui.find({ key: 'task:2026-10-10-active.md:2' }))?.text).toContain('✓');
  expect((await ui.find({ key: 'task:2026-10-10-active.md:3' }))?.text).toContain('▶');
});

test('without a working-state directory the poll runs only while the pane is up, even when no ui.close hook ran', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  // No `.condux` means the status line never arms, so the pane is the poll's only reason to run.
  world.hasCondux = false;
  await $.command.run(run(''));

  // Control: with the pane up, every tick looks again.
  const before = world.exists;

  await clock.advance(6000);

  expect(world.exists).toBeGreaterThan(before);

  world.isPaneUp = false;
  await clock.advance(3000);

  const after = world.exists;

  await clock.advance(9000);

  expect(world.exists).toBe(after);
});

test('a surface that never answers ui.open gets the board as text instead of a hang', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  world.open = 'silent';

  const running = $.command.run(run(''));

  await clock.advance(2000);

  const result = await running;

  expect(result.text).toContain('this surface did not answer');
  expect(result.text).toContain('Active work');
  expect(result.text).toContain('▶ Task 2');
});

test('an unknown argument lists the subcommands', async ($, on) => {
  answerBeneath(on, () => ({}));

  const result = await $.command.run(run('nonsense'));

  expect(result.text).toContain('/condux all');
});

test('a pane that survived a hot reload loads and polls again on session start', async ($, on) => {
  const { world, clock } = answerBeneath(on, sampleFiles);

  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true });
  await clock.settle();

  const ui = await mountPane('terminal', $);

  expect(await ui.find({ key: 'plan:2026-10-10-active.md' })).toBeDefined();

  const before = world.lists;

  await clock.advance(3000);

  expect(world.lists).toBeGreaterThan(before);
});
