import { type Register } from 'claude-code';

// Features register here, one `registerX(on)` each, so a new slice is a new file and one line rather than a rewrite.
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // A literal name lets `claude plugin validate` see that the command.run hook answers only its own command.
    await $.command.register({ name: 'condux', description: "Show this repo's condux plans and their progress" });

    return next(e);
  });

  on('command.run', { command: 'condux' }, async () => ({
    text: 'condux board: not built yet.',
  }));
};
