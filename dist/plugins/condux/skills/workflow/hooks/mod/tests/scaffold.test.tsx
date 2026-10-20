import { expect, test } from 'claude-code/testing';

test('the mod registers /condux and answers it', async ($, on) => {
  // The kit has no engine beneath the module, so the test answers what the module calls.
  on('session.start', (_$, e) => ({ cwd: e.cwd }));
  on('command.register', (_$, e) => ({ value: { command: e.name } }));

  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true });

  const result = await $.command.run({
    command: 'condux',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  });

  expect(result.text).toContain('condux');
});
