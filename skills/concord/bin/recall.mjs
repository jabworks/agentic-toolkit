#!/usr/bin/env node
/**
 * Concord — recall entrypoint (SessionStart).
 *
 * Two jobs, in order:
 *   1. Catch-up — sync every rollout whose recorded position trails the file.
 *      A hard-killed session never fired SessionEnd, but its rollout is on disk.
 *   2. Emit the budgeted recall block on stdout.
 *
 * stdout is the injected session context, so it carries the recall block and
 * NOTHING else — a stray log line here would land in the user's context window.
 * All diagnostics go to the log file. Exits 0 always.
 */

import { tierPathsFor } from '../lib/paths.mjs';
import { readState, writeState } from '../lib/store.mjs';
import { catchUp, sync } from '../lib/session.mjs';
import { composeRecall } from '../lib/budget.mjs';
import { readPayload, rolloutPathOf, cwdOf, sessionIdOf, runHook, logQuietly } from '../lib/hook.mjs';

runHook((ctx) => {
  const payload = readPayload();

  const paths = tierPathsFor(cwdOf(payload));
  if (!paths) return;
  ctx.paths = paths;

  const state = readState(paths);

  // Seed this session's entry so later hooks can sync it even if their own
  // payload lacks a rollout path.
  const sessionId = sessionIdOf(payload);
  const rolloutPath = rolloutPathOf(payload);
  if (sessionId && rolloutPath) sync(paths, state, sessionId, rolloutPath);

  const appended = catchUp(paths, state);
  if (appended) logQuietly(paths, `catch-up recovered ${appended} entries`);
  writeState(paths, state);

  const recall = composeRecall(paths);
  if (recall) process.stdout.write(recall + '\n');
});
