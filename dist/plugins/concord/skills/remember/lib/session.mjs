/**
 * Concord — the sync primitive.
 *
 * One operation sits behind all three hooks: read the rollout forward from its
 * recorded line, append what is new, advance the position.
 *
 * That is the whole design. Because the position advances past exactly what was
 * appended, calling sync from three different hooks — or twice in a row, or
 * from two sessions at once — is always safe. It is what makes hook ordering
 * and hook duplication non-issues, and it is why there are no lock files here.
 *
 * The rollout is the SINGLE SOURCE OF TRUTH. No hook ever captures content
 * handed to it in the payload — not the submitted prompt, not
 * `last_assistant_message` — because that content also lands in the rollout,
 * and capturing both double-counts every message.
 */

import fs from 'node:fs';

import { readRollout } from './rollout.mjs';
import { appendBuffer } from './store.mjs';

/**
 * Sync one rollout into the buffer.
 *
 * Mutates `state` in place; the caller is responsible for persisting it, so a
 * batch of syncs costs one state write rather than N.
 *
 * @returns {{ appended: number, skipped: boolean, dropped: boolean }}
 */
export function sync(paths, state, sessionId, rolloutPath = null, now = new Date()) {
  if (!sessionId) return { appended: 0, skipped: false, dropped: false };

  const existing = state.rollouts[sessionId];
  const target = existing?.path ?? rolloutPath;
  if (!target) return { appended: 0, skipped: false, dropped: false };

  // A rollout that has been deleted is not coming back — stop tracking it, or
  // the catch-up loop grows without bound over months.
  if (!fs.existsSync(target)) {
    delete state.rollouts[sessionId];
    return { appended: 0, skipped: false, dropped: true };
  }

  const record = existing ?? { path: target, line: 0 };
  state.rollouts[sessionId] = record;

  const { entries, lastLine, skipped } = readRollout(record.path, { fromLine: record.line });

  if (skipped.subagent) {
    state.skippedSubagents = (state.skippedSubagents ?? 0) + 1;
    delete state.rollouts[sessionId];
    return { appended: 0, skipped: true, dropped: false };
  }

  const appended = appendBuffer(paths, entries, now);
  record.line = lastLine;
  return { appended, skipped: false, dropped: false };
}

/**
 * Sync every rollout we are tracking.
 *
 * This is catch-up-on-start: a hard-killed session never fires SessionEnd, but
 * its rollout is already on disk, so the trailing position is recoverable work
 * rather than lost work. This is what buys crash-resilience without the
 * PostToolUse cooldowns and lock files the design deliberately avoids.
 */
export function catchUp(paths, state, now = new Date()) {
  let appended = 0;
  for (const sessionId of Object.keys(state.rollouts)) {
    appended += sync(paths, state, sessionId, null, now).appended;
  }
  return appended;
}
