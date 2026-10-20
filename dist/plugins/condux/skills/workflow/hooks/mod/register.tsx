import { type Register } from 'claude-code';

import { armStatus, disarmStatus, registerBoard, resumeBoard } from './board/board';

// Features register here, one `registerX(on)` each, so a new slice is a new file and one line rather than a rewrite.
// session.start is the exception: the validator rejects two hooks on it without a matcher, so this one hook starts
// every feature through a plain function it imports.
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // A literal name lets `claude plugin validate` see that each command.run hook answers only its own command.
    await $.command.register({ name: 'condux', description: "Show this repo's condux plans and their progress" });
    await resumeBoard($);
    await armStatus($);

    return next(e);
  });

  on('session.end', ($, e, next) => {
    disarmStatus($, e.reason);

    return next(e);
  });

  registerBoard(on);
};
