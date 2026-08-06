import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(REPO_ROOT, 'skills', 'record', 'server', 'mcp-server.mjs');
const FIXTURES = path.join(__dirname, 'fixtures', 'docket');

// One spawned server, a scripted request/response conversation, then EOF.
// This is a smoke test of the wire, not of the ops — the ops are covered
// through the core suite; both surfaces share docket-core.
function converse(cwd, requests) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    const responses = [];
    let buffer = '';

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('MCP server did not answer all requests within 15s; got ' + responses.length));
    }, 15000);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let newline;

      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line !== '') responses.push(JSON.parse(line));

        if (responses.length === requests.length) {
          clearTimeout(timer);
          child.kill();
          resolve(responses);
          return;
        }
      }
    });
    child.on('error', reject);

    for (const request of requests) child.stdin.write(JSON.stringify(request) + '\n');
  });
}

test('MCP server: initialize round-trip, tools/list, and a tool call over stdio', async () => {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, 'node_modules', '.dockettest-'));
  try {
    fs.cpSync(path.join(FIXTURES, 'layout-a'), dir, { recursive: true });

    const [init, list, next] = await converse(dir, [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {} } },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'docket_next', arguments: {} } },
    ]);

    assert.equal(init.result.serverInfo.name, 'docket');
    assert.ok(init.result.capabilities.tools, 'server must advertise the tools capability');

    const names = list.result.tools.map((tool) => tool.name).sort();
    assert.deepEqual(names, ['docket_add', 'docket_check', 'docket_close', 'docket_next']);

    assert.equal(next.result.isError, false);
    assert.deepEqual(JSON.parse(next.result.content[0].text), { id: 5 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('MCP server: Content-Length framing survives multibyte payloads and mixes with newline framing', async () => {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, 'node_modules', '.dockettest-'));
  try {
    fs.cpSync(path.join(FIXTURES, 'layout-a'), dir, { recursive: true });

    // An em dash makes byte length differ from char length — the exact
    // desync a char-offset framing bug produces.
    const framed = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'docket_add', arguments: { title: 'Em — dash', body: 'more — dashes' } },
    });

    const child = spawn(process.execPath, [SERVER], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
    const responses = [];

    const done = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out; got ' + responses.length)), 15000);
      let buffer = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        buffer += chunk;
        let newline;
        while ((newline = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line !== '') responses.push(JSON.parse(line));
          if (responses.length === 2) {
            clearTimeout(timer);
            child.kill();
            resolve();
            return;
          }
        }
      });
    });

    child.stdin.write('Content-Length: ' + Buffer.byteLength(framed, 'utf8') + '\r\n\r\n' + framed);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'ping' }) + '\n');
    await done;

    assert.equal(responses[0].result.isError, false, 'framed multibyte call must succeed');
    assert.deepEqual(JSON.parse(responses[0].result.content[0].text), { id: 5 });
    assert.deepEqual(responses[1].result, {}, 'the newline-framed request after it must still parse');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('MCP server: tool failures come back as isError results, not dead processes', async () => {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, 'node_modules', '.dockettest-'));
  try {
    fs.cpSync(path.join(FIXTURES, 'layout-a'), dir, { recursive: true });

    const [bad, stillAlive] = await converse(dir, [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'docket_close', arguments: { id: 999 } } },
      { jsonrpc: '2.0', id: 2, method: 'ping' },
    ]);

    assert.equal(bad.result.isError, true);
    assert.match(bad.result.content[0].text, /#999 not found/);
    assert.deepEqual(stillAlive.result, {}, 'the server must survive a failed tool call');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
