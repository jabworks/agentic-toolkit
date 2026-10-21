import { expect, test } from 'claude-code/testing';

test('the mod registers /condux when a session starts', async ($, on) => {
  const registered: string[] = [];

  // The kit has no engine beneath the module, so the test answers what the module calls.
  on('session.start', (_$, e) => ({ cwd: e.cwd }));
  on('command.register', (_$, e) => {
    registered.push(e.name);

    return { value: { command: e.name } };
  });
  on('ui.panes', () => ({ value: [] }));

  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true });

  expect(registered).toEqual(['condux']);
});
