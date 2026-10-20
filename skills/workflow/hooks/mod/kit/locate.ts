import { type EngineInterface } from 'claude-code';

import { ancestors, joinPath } from './paths';

export type WorkingState = { root: string; dir: string };

// The working-state directory of the repository the session is in: `<git-root>/.condux`. The walk stops at the first
// `.git`, so a nested repository never adopts its parent's plans. A function declaration, not an arrow: this is called
// from another file with `$`, and past an import the validator follows `$` only into declarations.
export async function locateWorkingState($: EngineInterface, cwd: string): Promise<WorkingState | null> {
  for (const dir of ancestors(cwd)) {
    const candidate = joinPath(dir, '.condux');

    if (await $.fs.exists(candidate)) {
      return { root: dir, dir: candidate };
    }

    if (await $.fs.exists(joinPath(dir, '.git'))) {
      return null;
    }
  }

  return null;
}
