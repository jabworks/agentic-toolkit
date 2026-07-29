/**
 * Concord — Codex rollout reader.
 *
 * Turns a Codex rollout JSONL file into the handful of facts worth remembering.
 * This is the only module that understands the transcript format.
 *
 * Record shape (verified against codex-cli 0.145.0 rollouts):
 *
 *   { timestamp, type, payload }              <- timestamp is TOP level
 *
 *   session_meta                              <- first record; sets identity
 *   event_msg/user_message   payload.message
 *   event_msg/agent_message  payload.message
 *   response_item/custom_tool_call  payload.name, payload.input
 *   response_item/message           <- IGNORED, see below
 *
 * Messages come from `event_msg`; tool calls come from `response_item`. Both
 * must be walked, but `response_item/message` must NOT be: it is the model-API
 * mirror of the same user/agent messages already emitted as `event_msg`, so
 * reading both double-counts every message in the session.
 *
 * Reference for these shapes: skills/session-report/analyze-codex.mjs. It is
 * deliberately not imported — different plugin, different lifecycle, and
 * coupling them means a session-report refactor breaks memory capture.
 */

import fs from 'node:fs';

/** Per-entry text caps, so one pasted file cannot dominate a day of memory. */
const MAX_MESSAGE_CHARS = 2000;
const MAX_TOOL_INPUT_CHARS = 200;

/** Clip on a character boundary and mark that clipping happened. */
function clip(text, max) {
  const s = String(text ?? '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/**
 * Is this session_meta a subagent rollout?
 *
 * `agent_role` is null even on genuine subagents, so keying off it alone misses
 * all of them. `thread_source` is the explicit signal; the other two are
 * belt-and-braces for older and newer rollouts.
 */
function isSubagentMeta(payload) {
  return (
    payload?.thread_source === 'subagent' ||
    Boolean(payload?.source?.subagent) ||
    Boolean(payload?.agent_nickname)
  );
}

function toMeta(record) {
  const p = record?.payload ?? {};
  return {
    sessionId: p.session_id ?? p.id ?? null,
    cwd: p.cwd ?? null,
    startedAt: p.timestamp ?? record?.timestamp ?? null,
    isSubagent: isSubagentMeta(p),
  };
}

/**
 * Map one record to an Entry, or null when it carries nothing worth keeping.
 * @returns {{ at: string|null, kind: 'user'|'agent'|'tool', text: string, tool?: string } | null}
 */
function toEntry(record) {
  const type = record?.type;
  const p = record?.payload;
  if (!p || typeof p !== 'object') return null;
  const at = record.timestamp ?? null;

  if (type === 'event_msg') {
    if (p.type === 'user_message') {
      const text = clip(p.message, MAX_MESSAGE_CHARS);
      return text ? { at, kind: 'user', text } : null;
    }
    if (p.type === 'agent_message') {
      const text = clip(p.message, MAX_MESSAGE_CHARS);
      return text ? { at, kind: 'agent', text } : null;
    }
    return null;
  }

  if (type === 'response_item' && p.type === 'custom_tool_call') {
    const tool = typeof p.name === 'string' ? p.name : 'tool';
    return { at, kind: 'tool', tool, text: clip(p.input, MAX_TOOL_INPUT_CHARS) };
  }

  // Everything else — reasoning, token_count, turn_context, world_state,
  // tool outputs, and the response_item/message mirror — is deliberately dropped.
  return null;
}

/** Split file contents into lines without inventing a trailing empty one. */
function splitLines(contents) {
  const lines = contents.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * Read a rollout forward from `fromLine`.
 *
 * `fromLine` is a LINE NUMBER, not a byte offset. Rollouts are append-only
 * JSONL, so line numbers are stable and byte offsets buy nothing but encoding
 * bugs.
 *
 * A truncated final line is normal for a live session — unparseable lines are
 * skipped, never thrown on. `lastLine` therefore counts only lines actually
 * consumed, so a partially-written tail is re-read (and completed) next pass.
 *
 * @param {string} rolloutPath
 * @param {{ fromLine?: number }} [opts]
 * @returns {{ meta: object|null, entries: object[], lastLine: number, skipped: { subagent: boolean } }}
 */
export function readRollout(rolloutPath, { fromLine = 0 } = {}) {
  const empty = { meta: null, entries: [], lastLine: fromLine, skipped: { subagent: false } };

  let contents;
  try {
    contents = fs.readFileSync(rolloutPath, 'utf8');
  } catch {
    // Deleted, unreadable, or never existed — all a no-op for capture.
    return empty;
  }

  const lines = splitLines(contents);
  const start = Math.max(0, Math.min(fromLine, lines.length));

  // Identity lives in the first record. When resuming mid-file we still need it,
  // so read line 0 for meta regardless of where the content scan starts.
  let meta = null;
  if (lines.length > 0) {
    const head = tryParse(lines[0]);
    if (head?.type === 'session_meta') meta = toMeta(head);
  }

  // Bail before parsing the body — a subagent's tool spam is exactly what we are
  // avoiding, and there is no reason to pay to parse it.
  if (meta?.isSubagent) {
    return { meta, entries: [], lastLine: lines.length, skipped: { subagent: true } };
  }

  const entries = [];
  let consumed = start;

  for (let i = start; i < lines.length; i++) {
    const record = tryParse(lines[i]);
    if (record === null) {
      // Only the final line may legitimately be a partial write. Anything else
      // is a corrupt line we skip and count as consumed.
      if (i === lines.length - 1) break;
      consumed = i + 1;
      continue;
    }

    if (record.type === 'session_meta') {
      if (!meta) meta = toMeta(record);
      if (meta.isSubagent) {
        return { meta, entries: [], lastLine: lines.length, skipped: { subagent: true } };
      }
      consumed = i + 1;
      continue;
    }

    const entry = toEntry(record);
    if (entry) entries.push(entry);
    consumed = i + 1;
  }

  return { meta, entries, lastLine: consumed, skipped: { subagent: false } };
}

function tryParse(line) {
  if (!line || !line.trim()) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/** Total line count, used to tell whether a rollout has moved on. Missing file → 0. */
export function lineCount(rolloutPath) {
  try {
    return splitLines(fs.readFileSync(rolloutPath, 'utf8')).length;
  } catch {
    return 0;
  }
}
