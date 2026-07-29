/**
 * Concord — hook plumbing.
 *
 * Reading the payload Codex hands a hook, and the safety wrapper every
 * entrypoint runs inside.
 *
 * The governing rule: a hook must never break the user's session. Every handler
 * exits 0 — including on internal error — and failures go to a log file, never
 * to stderr. A memory plugin that can wedge Codex is worse than no memory
 * plugin at all.
 *
 * Payload contract, per codex-rs `hooks/src/events/`: the payload is JSON on
 * stdin. SessionStart carries session_id, transcript_path, cwd, hook_event_name,
 * model, permission_mode, source. None of it is assumed present — every field is
 * probed and falls back, because hooks are experimental and the shape may move.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Read the hook payload.
 *
 * Prefers JSON on stdin, falls back to the environment. Both are optional: a
 * payload we cannot read yields an empty object, and the caller no-ops.
 */
export function readPayload() {
  const fromStdin = readStdinJson();
  const fromEnv = readEnvFallback();
  return { ...fromEnv, ...fromStdin };
}

function readStdinJson() {
  // A TTY means no piped payload; reading would block forever.
  if (process.stdin.isTTY) return {};
  let raw;
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {
    return {};
  }
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Environment fallback, for hosts that export rather than pipe. Only fields we
 * actually use are read; anything absent simply stays undefined.
 */
function readEnvFallback() {
  const e = process.env;
  const out = {};
  // Speculative: the documented delivery mechanism is stdin JSON. These are a
  // belt-and-braces fallback only, and cost nothing when unset.
  const map = {
    session_id: e.CODEX_SESSION_ID,
    transcript_path: e.CODEX_TRANSCRIPT_PATH,
    rollout_path: e.CODEX_ROLLOUT_PATH,
    hook_event_name: e.CODEX_HOOK_EVENT_NAME,
    cwd: e.CODEX_PROJECT_DIR ?? e.CODEX_CWD,
  };
  for (const [k, v] of Object.entries(map)) if (v) out[k] = v;
  return out;
}

/**
 * The transcript this hook is about.
 *
 * `transcript_path` is the documented payload field — codex-rs builds it in
 * `hooks/src/events/session_start.rs`. `rollout_path` is Codex's *internal*
 * name for the same file and is not what reaches a hook, but it is accepted as
 * a fallback in case a future version exposes it under that name.
 */
export function rolloutPathOf(payload) {
  const p = payload?.transcript_path ?? payload?.rollout_path;
  return typeof p === 'string' && p ? p : null;
}

/** The working directory this hook is about, falling back to the process cwd. */
export function cwdOf(payload) {
  const c = payload?.cwd;
  return typeof c === 'string' && c ? c : process.cwd();
}

/** The session this hook is about, or null. */
export function sessionIdOf(payload) {
  const s = payload?.session_id;
  return typeof s === 'string' && s ? s : null;
}

/**
 * Append a line to the plugin's own log. Best-effort: if logging itself fails,
 * that failure is swallowed too — there is nowhere useful left to report it.
 */
export function logQuietly(paths, message) {
  if (!paths?.logs) return;
  try {
    fs.mkdirSync(paths.logs, { recursive: true });
    const file = path.join(paths.logs, 'hook.log');
    const line = `${new Date().toISOString()} ${message}\n`;
    fs.appendFileSync(file, line, { mode: 0o600 });
  } catch {
    /* nothing sensible left to do */
  }
}

/**
 * Run a hook body under the never-break-the-session contract.
 *
 * `fn` receives a context it should set `ctx.paths` on as soon as it resolves
 * them — that is what gives a later throw somewhere to be logged. It may throw
 * freely; the throw is logged and swallowed, and the process always exits 0.
 */
export function runHook(fn) {
  const ctx = { paths: null };
  try {
    fn(ctx);
  } catch (err) {
    logQuietly(ctx.paths, `error: ${err?.stack ?? err}`);
  }
  process.exit(0);
}
