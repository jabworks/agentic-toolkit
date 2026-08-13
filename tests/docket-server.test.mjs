import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const SRC = path.join(REPO_ROOT, 'skills', 'record', 'server');
const PLUGIN = path.join(REPO_ROOT, 'dist', 'plugins', 'docket');

// The plugin loads its MCP server from the PLUGIN root (.mcp.json →
// server/mcp-server.mjs), which no skill-tree copy reaches. The
// verbatim-mirror assertion for dist/plugins/docket/server/ lives in
// tests/composition.test.mjs now — the pair is declared in composition.json
// and guarded generically. What stays here is the server's behavior.

test('.mcp.json registers the mirrored server via the Claude plugin root variable', () => {
  const raw = fs.readFileSync(path.join(PLUGIN, '.mcp.json'), 'utf8');
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(raw); }, '.mcp.json is not valid JSON');

  const docket = parsed.mcpServers?.docket;
  assert.ok(docket, '.mcp.json must define mcpServers.docket');
  assert.equal(docket.command, 'node');
  assert.deepEqual(docket.args, ['${CLAUDE_PLUGIN_ROOT}/server/mcp-server.mjs']);

  // The path it points at must actually exist in the mirrored tree —
  // a registration that resolves to nothing is a silent no-op server.
  assert.ok(fs.existsSync(path.join(PLUGIN, 'server', 'mcp-server.mjs')), '.mcp.json points at a missing file');
});

test('the server stays dependency-free — node: builtins only', () => {
  // The no-deps rule is what lets the CLI run on any host the day the skill
  // installs; a bare package import would break that silently.
  for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.mjs'))) {
    const source = fs.readFileSync(path.join(SRC, file), 'utf8');

    for (const match of source.matchAll(/from\s+'([^']+)'/g)) {
      const spec = match[1];
      const allowed = spec.startsWith('node:') || spec.startsWith('./') || spec.startsWith('../');
      assert.ok(allowed, file + ' imports "' + spec + '" — only node: builtins and relative paths are allowed');
    }
  }
});
