#!/usr/bin/env node
// Stdio MCP server over docket-core — a thin wrapper so Claude Code gets
// first-class tools without a permission prompt per operation. Hand-rolled
// JSON-RPC 2.0: the protocol subset MCP needs here is small enough that an
// SDK dependency would violate the toolkit's no-deps rule for nothing.
//
// The CLI (docket.mjs) is the portable surface; this wrapper must never grow
// behaviour of its own — both call the same core so they cannot disagree.

import process from 'node:process';
import { resolveDocket, nextId, addItem, closeItem, checkDocket } from './docket-core.mjs';

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'docket', version: '0.1.0' };

// Dates are injected into core everywhere else (tests pass fixtures); the
// wrapper is a leaf process, so like the CLI it is a legitimate clock reader.
function today() {
  return new Date().toISOString().slice(0, 10);
}

const TOOLS = [
  {
    name: 'docket_next',
    description: 'Print the next free docket id without allocating it.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'docket_add',
    description: 'Add an open item to the docket with the next free id. Sections: committed, someday (default), loose.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Item title (without id or date — both are added)' },
        section: { type: 'string', description: 'Target section name prefix, default someday' },
        body: { type: 'string', description: 'Freeform markdown body' },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'docket_close',
    description: 'Close an open item: stamp it DONE with today and a verification note, move it to the archive, and return the suggested commit subject.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'The item id to close' },
        note: { type: 'string', description: 'Verification note — how the work was verified' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'docket_check',
    description: 'Run the docket integrity check: duplicate ids, next_id drift, malformed headings, orphaned legacy files.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

function callTool(name, args) {
  const d = resolveDocket(process.cwd());

  switch (name) {
    case 'docket_next':
      return { id: nextId(d) };
    case 'docket_add':
      return addItem(d, {
        title: args.title,
        section: args.section ?? 'someday',
        body: args.body ?? '',
        date: today(),
      });
    case 'docket_close':
      return closeItem(d, args.id, { note: args.note ?? '', date: today() });
    case 'docket_check':
      return checkDocket(d);
    default:
      throw new Error('unknown tool: ' + name);
  }
}

function handle(message) {
  const { id, method, params } = message;

  // Notifications (no id) get no response — including notifications/initialized.
  if (id === undefined || id === null) return null;

  try {
    switch (method) {
      case 'initialize':
        return result(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        });
      case 'ping':
        return result(id, {});
      case 'tools/list':
        return result(id, { tools: TOOLS });
      case 'tools/call': {
        try {
          const output = callTool(params?.name, params?.arguments ?? {});

          return result(id, { content: [{ type: 'text', text: JSON.stringify(output) }], isError: false });
        } catch (err) {
          // Tool-level failures are results, not protocol errors — the model
          // should see the reason and adapt, not watch the server die.
          return result(id, { content: [{ type: 'text', text: String(err?.message ?? err) }], isError: true });
        }
      }
      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: 'method not found: ' + method } };
    }
  } catch (err) {
    return { jsonrpc: '2.0', id, error: { code: -32603, message: String(err?.message ?? err) } };
  }
}

function result(id, payload) {
  return { jsonrpc: '2.0', id, result: payload };
}

function send(message) {
  if (message !== null) process.stdout.write(JSON.stringify(message) + '\n');
}

// MCP stdio framing is newline-delimited JSON; a Content-Length header form
// (LSP-style) is tolerated on input because some clients still emit it.
let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;

  while (true) {
    const header = buffer.match(/^Content-Length:\s*(\d+)\r?\n\r?\n/i);

    if (header) {
      const length = parseInt(header[1], 10);
      // Content-Length counts bytes; the string buffer counts chars. Frame on
      // a Buffer so multibyte payloads (em dashes are endemic to this format)
      // cannot desync the stream.
      const rest = Buffer.from(buffer.slice(header[0].length), 'utf8');
      if (rest.length < length) return;

      buffer = rest.subarray(length).toString('utf8');
      dispatch(rest.subarray(0, length).toString('utf8'));
      continue;
    }

    const newline = buffer.indexOf('\n');
    if (newline === -1) return;

    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (line !== '') dispatch(line);
  }
});

function dispatch(raw) {
  let message;

  try {
    message = JSON.parse(raw);
  } catch {
    // Undecodable input gets a parse error only when it carried no id we
    // could echo — per JSON-RPC the id field is null in that case.
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });
    return;
  }

  send(handle(message));
}

process.stdin.on('end', () => process.exit(0));
