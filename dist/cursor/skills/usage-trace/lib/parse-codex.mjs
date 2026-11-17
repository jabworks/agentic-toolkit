import crypto from 'node:crypto';

import { makeEvent } from './schema.mjs';

// Bump when a fix changes what existing rollouts parse into; ingest then rereads every Codex file.
export const CODEX_PARSER_VERSION = 2;

const KNOWN_TYPES = new Set(['world_state', 'token_usage_record', 'compacted', 'inter_agent_communication_metadata']);

const eventId = (...parts) => crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 20);

const percent = window => (typeof window?.used_percent === 'number' ? window.used_percent : undefined);

// Names a subagent that has no role; fixed and not sensitive, so it stays readable.
const UNNAMED_SUBAGENT = 'subagent';

// Spawned agents carry any one of these; many carry only parent_thread_id.
const isSubagentMeta = payload =>
  Boolean(payload.parent_thread_id || payload.source?.subagent || payload.agent_role || payload.agent_nickname);

// The typed prompt only, never the injected AGENTS.md or environment blocks.
const typedPrompt = payload => {
  if (payload.type === 'user_message') {
    const text = typeof payload.message === 'string' ? payload.message : '';

    return { text, key: text.length };
  }

  if (payload.type === 'item_completed' && payload.item?.type === 'UserMessage') {
    const blocks = Array.isArray(payload.item.content) ? payload.item.content : [];
    const text = blocks
      .filter(block => block?.type === 'text' && typeof block.text === 'string')
      .map(block => block.text)
      .join('\n');

    return { text, key: payload.item.id };
  }

  return null;
};

export const parseCodexRecord = (record, ctx, privacy) => {
  const payload = record.payload || {};
  const ts = record.timestamp || ctx.ts;

  ctx.ts = ts;

  if (record.type === 'session_meta') {
    // Only the first meta names this file's session; later ones are replayed parents.
    if (ctx.session) {
      return { events: [], known: true };
    }

    ctx.session = payload.id;
    ctx.cwd = payload.cwd;
    ctx.startedAt = payload.timestamp || ts;
    ctx.subagent = isSubagentMeta(payload) ? payload.agent_role || payload.agent_nickname || UNNAMED_SUBAGENT : undefined;

    const events = [
      makeEvent('session', {
        id: eventId('codex', 'session', payload.id),
        ts: ctx.startedAt,
        host: 'codex',
        session: payload.id,
        project: privacy.hash(payload.cwd),
        project_name: privacy.isAllowlisted(payload.cwd) ? payload.cwd : undefined,
        version: payload.cli_version,
        entrypoint: payload.originator,
        branch: privacy.hash(payload.git?.branch),
      }),
    ];

    if (ctx.subagent) {
      events.push(
        makeEvent('subagent', {
          id: eventId('codex', 'subagent', payload.id),
          ts: ctx.startedAt,
          host: 'codex',
          session: payload.id,
          project: privacy.hash(payload.cwd),
          agent_type: ctx.subagent === UNNAMED_SUBAGENT ? UNNAMED_SUBAGENT : privacy.publicName(ctx.subagent),
        }),
      );
    }

    return { events, known: true };
  }

  if (record.type === 'turn_context') {
    ctx.model = payload.model || ctx.model;
    ctx.effort = payload.effort || ctx.effort;
    ctx.cwd = payload.cwd || ctx.cwd;

    return { events: [], known: true };
  }

  if (KNOWN_TYPES.has(record.type)) {
    return { events: [], known: true };
  }

  // Subagent files replay the parent's history, stamped before their own start.
  if (ctx.startedAt && ts < ctx.startedAt) {
    return { events: [], known: true };
  }

  const base = {
    ts,
    host: 'codex',
    session: ctx.session,
    project: privacy.hash(ctx.cwd),
    project_name: privacy.isAllowlisted(ctx.cwd) ? ctx.cwd : undefined,
  };

  if (record.type === 'response_item') {
    if (payload.type === 'function_call' || payload.type === 'custom_tool_call') {
      return {
        events: [
          makeEvent('tool_call', {
            ...base,
            id: eventId('codex', 'tool', ctx.session, payload.call_id),
            call: payload.call_id,
            tool: privacy.publicName(payload.name),
          }),
        ],
        known: true,
      };
    }

    if (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output') {
      return {
        events: [
          makeEvent('tool_result', {
            ...base,
            id: eventId('codex', 'result', ctx.session, payload.call_id),
            call: payload.call_id,
            outcome: 'ok',
          }),
        ],
        known: true,
      };
    }

    return { events: [], known: true };
  }

  if (record.type !== 'event_msg') {
    return { events: [], known: false };
  }

  const prompt = typedPrompt(payload);

  // A subagent's prompt is the parent's delegation, not a person's turn (as parse-claude skips sidechains).
  if (prompt && ctx.subagent) {
    return { events: [], known: true };
  }

  if (prompt) {
    return {
      events: [
        makeEvent('turn', {
          ...base,
          id: eventId('codex', 'prompt', ctx.session, ts, prompt.key),
          prompt_chars: prompt.text.length,
          prompt_text: privacy.isAllowlisted(ctx.cwd) ? prompt.text : undefined,
        }),
      ],
      known: true,
    };
  }

  if (payload.type !== 'token_count') {
    return { events: [], known: true };
  }

  const events = [];
  const usage = payload.info?.last_token_usage || payload.last_token_usage;

  if (usage) {
    const cacheRead = usage.cached_input_tokens || 0;
    const cacheWrite = usage.cache_write_input_tokens || 0;

    events.push(
      makeEvent('api_call', {
        ...base,
        id: eventId('codex', 'api', ctx.session, ts, usage.input_tokens, usage.output_tokens),
        model: ctx.model,
        effort: ctx.effort,
        // Current Codex logs count cached tokens inside input_tokens.
        input: Math.max(0, (usage.input_tokens || 0) - cacheRead - cacheWrite),
        output: usage.output_tokens || 0,
        cache_read: cacheRead,
        cache_write: cacheWrite,
        sidechain: ctx.subagent ? true : undefined,
      }),
    );
  }

  const fiveHour = percent(payload.rate_limits?.primary);
  const sevenDay = percent(payload.rate_limits?.secondary);

  if (fiveHour !== undefined || sevenDay !== undefined) {
    events.push(
      makeEvent('limit', {
        ...base,
        id: eventId('codex', 'limit', ctx.session, ts),
        five_hour: fiveHour,
        seven_day: sevenDay,
        source: 'codex-rollout',
      }),
    );
  }

  return { events, known: true };
};
