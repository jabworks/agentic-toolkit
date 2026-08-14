#!/usr/bin/env node
/**
 * Concord — capture entrypoint.
 *
 *   capture.mjs --prompt        UserPromptSubmit: sync, folding in the previous turn
 *   capture.mjs --session-end   SessionEnd: sync, then promote tiers
 *
 * Both modes do the same thing first — sync the rollout — because the rollout is
 * the single source of truth. `--prompt` deliberately does NOT capture the
 * submitted prompt: it is already in the rollout, and capturing it here as well
 * would double-count every prompt in the session.
 *
 * Writes nothing to stdout. Exits 0 always.
 */

import { tierPathsFor } from '../lib/paths.mjs';
import { readState, writeState, promote } from '../lib/store.mjs';
import { sync } from '../lib/session.mjs';
import { readPayload, rolloutPathOf, cwdOf, sessionIdOf, runHook, logQuietly } from '../lib/hook.mjs';

runHook((ctx) => {
  const mode = process.argv.includes('--session-end') ? 'session-end' : 'prompt';
  const payload = readPayload();

  const paths = tierPathsFor(cwdOf(payload));
  if (!paths) return; // unresolvable cwd — nothing sensible to do
  ctx.paths = paths;

  const sessionId = sessionIdOf(payload);
  const rolloutPath = rolloutPathOf(payload);
  const state = readState(paths);

  if (sessionId) {
    const result = sync(paths, state, sessionId, rolloutPath);
    if (result.skipped) logQuietly(paths, `skipped subagent rollout for ${sessionId}`);
  } else {
    // No session id in the payload — the next SessionStart catch-up covers it,
    // provided something has already been tracked. Worth noting either way.
    logQuietly(paths, `${mode}: payload carried no session_id`);
  }

  if (mode === 'session-end') {
    const { promoted, archived } = promote(paths);
    if (promoted.length || archived.length) {
      logQuietly(paths, `promoted ${promoted.join(',') || 'none'}; archived ${archived.join(',') || 'none'}`);
    }
  }

  writeState(paths, state);
});
