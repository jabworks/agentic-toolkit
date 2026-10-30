/**
 * The store format. An allowlist on purpose: a field not named here cannot be
 * written, so transcript content cannot reach the store by accident. Readers
 * rely on specs/usage-telemetry/fields.md, which documents the same table.
 */
export const SCHEMA_VERSION = 1;

const COMMON = ['id', 'ts', 'host', 'session', 'project', 'project_name'];

const FIELDS = {
  session: ['version', 'entrypoint', 'permission_mode', 'branch'],
  api_call: [
    'model',
    'effort',
    'input',
    'output',
    'cache_read',
    'cache_write',
    'thinking_ms',
    'skill',
    'plugin',
    'mcp_server',
    'mcp_tool',
    'agent',
    'sidechain',
    'api_error',
  ],
  tool_call: ['call', 'tool', 'file', 'skill', 'agent', 'sidechain'],
  tool_result: ['call', 'outcome', 'denial_kind', 'duration_ms'],
  turn: ['prompt_chars', 'prompt_source', 'prompt_text', 'interrupted', 'duration_ms', 'message_count'],
  context: ['kind', 'pre_tokens', 'context_window'],
  subagent: ['agent_type', 'model'],
  outcome: ['pr', 'lines_added', 'lines_removed', 'merged', 'ci', 'merge_ms', 'reverted'],
  limit: ['five_hour', 'seven_day', 'source'],
  coverage: ['files', 'events', 'unknown', 'failures'],
};

export const EVENT_TYPES = Object.keys(FIELDS);

export const makeEvent = (type, fields) => {
  const allowed = FIELDS[type];

  if (!allowed) {
    throw new Error(`unknown event type: ${type}`);
  }

  const event = { v: SCHEMA_VERSION, type };

  for (const [key, value] of Object.entries(fields)) {
    if (!COMMON.includes(key) && !allowed.includes(key)) {
      throw new Error(`unknown field for ${type}: ${key}`);
    }

    // Absent stays absent: a host that lacks a field must not read as zero.
    if (value !== undefined && value !== null) {
      event[key] = value;
    }
  }

  if (!event.id || !event.ts) {
    throw new Error(`${type} event needs id and ts`);
  }

  return event;
};
