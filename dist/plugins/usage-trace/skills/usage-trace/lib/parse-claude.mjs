import crypto from 'node:crypto';

import { makeEvent } from './schema.mjs';

const IGNORED_TYPES = new Set([
  'queue-operation',
  'attachment',
  'last-prompt',
  'custom-title',
  'agent-name',
  'file-history-snapshot',
  'file-history-delta',
  'atis-latch',
  'api-request-shape',
  'api-request-blob',
  'api-request',
  'bridge-session',
  'mode',
  'agent-color',
  'tools-used',
  'frame-link',
  'artifact-comment-monitor',
  'artifact-autoreact-ledger',
  'ai-title',
  'summary',
  'progress',
  'dev-mods',
]);

const IGNORED_SUBTYPES = new Set(['stop_hook_summary', 'informational', 'local_command', 'away_summary', 'bridge_status', 'scheduled_task_fire']);

const FILE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const AGENT_TOOLS = new Set(['Agent', 'Task']);

const eventId = (...parts) => crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 20);

const promptText = content => {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content) || content.some(block => block.type === 'tool_result')) {
    return null;
  }

  const text = content.filter(block => block.type === 'text').map(block => block.text);

  return text.length > 0 ? text.join('\n') : null;
};

const parseAssistant = (record, base, privacy) => {
  const events = [];
  const usage = record.message?.usage;
  const agent = record.agentId ? privacy.hash(record.agentId) : undefined;
  const sidechain = record.isSidechain ? true : undefined;
  const skill = privacy.publicName(record.attributionSkill);

  if (usage) {
    events.push(
      makeEvent('api_call', {
        ...base,
        id: eventId('claude', 'api', record.requestId || record.message?.id || record.uuid),
        model: record.message?.model,
        effort: record.effort,
        input: usage.input_tokens || 0,
        output: usage.output_tokens || 0,
        cache_read: usage.cache_read_input_tokens || 0,
        cache_write: usage.cache_creation_input_tokens || 0,
        thinking_ms: record.thinkingDurationMs,
        skill,
        plugin: privacy.publicName(record.attributionPlugin),
        mcp_server: privacy.publicName(record.attributionMcpServer),
        mcp_tool: privacy.publicName(record.attributionMcpTool),
        agent,
        sidechain,
        api_error: record.isApiErrorMessage ? true : undefined,
      }),
    );
  }

  for (const block of Array.isArray(record.message?.content) ? record.message.content : []) {
    if (block.type !== 'tool_use') {
      continue;
    }

    events.push(
      makeEvent('tool_call', {
        ...base,
        id: eventId('claude', 'tool', block.id),
        call: block.id,
        tool: privacy.publicName(block.name),
        file: FILE_TOOLS.has(block.name) ? privacy.hash(block.input?.file_path) : undefined,
        skill,
        agent,
        sidechain,
      }),
    );

    if (AGENT_TOOLS.has(block.name)) {
      events.push(
        makeEvent('subagent', {
          ...base,
          id: eventId('claude', 'subagent', block.id),
          agent_type: privacy.publicName(block.input?.subagent_type || 'general-purpose'),
          model: block.input?.model,
        }),
      );
    }
  }

  return events;
};

const parseUser = (record, base, privacy, ctx) => {
  const events = [];
  const content = record.message?.content;

  for (const block of Array.isArray(content) ? content : []) {
    if (block.type !== 'tool_result') {
      continue;
    }

    const denied = Boolean(record.toolDenialKind) || record.permissionDecision === 'deny';

    events.push(
      makeEvent('tool_result', {
        ...base,
        id: eventId('claude', 'result', block.tool_use_id),
        call: block.tool_use_id,
        outcome: denied ? 'denied' : block.is_error ? 'error' : 'ok',
        denial_kind: record.toolDenialKind,
        duration_ms: typeof record.toolUseResult?.durationMs === 'number' ? record.toolUseResult.durationMs : undefined,
      }),
    );
  }

  if (record.isSidechain || record.isMeta || record.isCompactSummary) {
    return events;
  }

  const text = promptText(content);

  if (text !== null) {
    events.push(
      makeEvent('turn', {
        ...base,
        id: eventId('claude', 'prompt', record.uuid),
        prompt_chars: text.length,
        prompt_source: record.promptSource,
        // Measured above, then dropped, unless the user allowlisted this project.
        prompt_text: privacy.isAllowlisted(ctx.cwd) ? text : undefined,
        interrupted: text.startsWith('[Request interrupted') ? true : undefined,
      }),
    );
  }

  return events;
};

export const parseClaudeRecord = (record, ctx, privacy) => {
  ctx.cwd = record.cwd || ctx.cwd;
  ctx.ts = record.timestamp || ctx.ts;
  ctx.session = record.sessionId || ctx.session;

  const base = {
    ts: record.timestamp || ctx.ts,
    host: 'claude',
    session: ctx.session,
    project: privacy.hash(ctx.cwd),
    project_name: privacy.isAllowlisted(ctx.cwd) ? ctx.cwd : undefined,
  };
  const events = [];

  if (!base.ts) {
    // Records that precede any timestamp can't be placed; nothing is lost that
    // matters, since they're metadata the next record repeats.
    return { events, known: true };
  }

  if (ctx.session && !ctx.sessionSeen) {
    ctx.sessionSeen = true;
    events.push(
      makeEvent('session', {
        ...base,
        id: eventId('claude', 'session', ctx.session, record.uuid || base.ts),
        version: record.version,
        entrypoint: record.entrypoint,
        branch: privacy.hash(record.gitBranch),
      }),
    );
  }

  const kind = record.type;

  if (kind === 'assistant') {
    return { events: [...events, ...parseAssistant(record, base, privacy)], known: true };
  }

  if (kind === 'user') {
    return { events: [...events, ...parseUser(record, base, privacy, ctx)], known: true };
  }

  if (kind === 'permission-mode') {
    // Rewritten constantly as the session runs; only a change means anything.
    if (record.permissionMode === ctx.permissionMode) {
      return { events, known: true };
    }

    ctx.permissionMode = record.permissionMode;
    events.push(
      makeEvent('session', {
        ...base,
        id: eventId('claude', 'mode', ctx.session, record.permissionMode, base.ts),
        permission_mode: record.permissionMode,
      }),
    );

    return { events, known: true };
  }

  if (kind === 'pr-link') {
    events.push(
      makeEvent('outcome', {
        ...base,
        id: eventId('claude', 'pr', ctx.session, record.prUrl),
        pr: privacy.hash(record.prUrl),
      }),
    );

    return { events, known: true };
  }

  if (kind === 'cost-state') {
    // A running total with no timestamp of its own, so readers take the last per session.
    events.push(
      makeEvent('outcome', {
        ...base,
        id: eventId('claude', 'lines', ctx.session, record.totalLinesAdded, record.totalLinesRemoved),
        lines_added: record.totalLinesAdded,
        lines_removed: record.totalLinesRemoved,
      }),
    );

    return { events, known: true };
  }

  if (kind === 'system') {
    if (record.subtype === 'turn_duration') {
      events.push(
        makeEvent('turn', {
          ...base,
          id: eventId('claude', 'duration', record.uuid),
          duration_ms: record.durationMs,
          message_count: record.messageCount,
        }),
      );

      return { events, known: true };
    }

    if (record.subtype === 'compact_boundary') {
      events.push(
        makeEvent('context', {
          ...base,
          id: eventId('claude', 'compact', record.uuid),
          kind: 'compact',
          pre_tokens: record.compactMetadata?.preTokens,
        }),
      );

      return { events, known: true };
    }

    return { events, known: IGNORED_SUBTYPES.has(record.subtype) };
  }

  return { events, known: IGNORED_TYPES.has(kind) };
};
