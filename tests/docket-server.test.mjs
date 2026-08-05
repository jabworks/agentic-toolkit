import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const SRC = path.join(REPO_ROOT, 'skills', 'record', 'server');
const DST = path.join(REPO_ROOT, 'dist', 'plugins', 'docket', 'server');
const PLUGIN = path.join(REPO_ROOT, 'dist', 'plugins', 'docket');

// The plugin loads its MCP server from the PLUGIN root (.mcp.json →
// server/mcp-server.mjs), which no skill-tree copy reaches — the same blind
// spot as condux agents/ (6ba6572) and hooks/. Doctrine: every out-of-tree
// mirror target needs its own sync step AND its own test. This is the test.
test('docket plugin-level server/ mirrors its skills/ source verbatim', () => {
  assert.ok(fs.existsSync(SRC), 'source server dir missing: ' + SRC);
  assert.ok(fs.existsSync(DST), 'plugin-level server dir missing: ' + DST);

  const srcFiles = fs.readdirSync(SRC).sort();
  const dstFiles = fs.readdirSync(DST).sort();
  assert.deepEqual(dstFiles, srcFiles, 'docket/server file list differs from source — run scripts/sync.sh');

  const drifted = srcFiles.filter(
    (f) => !fs.readFileSync(path.join(SRC, f)).equals(fs.readFileSync(path.join(DST, f))),
  );
  assert.deepEqual(drifted, [], 'docket/server drifted from source — run scripts/sync.sh:\n' + drifted.join('\n'));
});

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
