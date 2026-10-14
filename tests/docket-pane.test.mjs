// docket ships a Claude Code function-hooks module (the /docket pane) in hooks/hooks.json.
// Codex must never see it. That holds only while docket keeps its root Agent Plugins
// manifest: Codex then loads docket through the Agent Plugins loader, which reads no hooks
// at all, conventional hooks/hooks.json included (specs/agent-plugins-conformance/quirks.md
// Q4). Declaring `hooks` in the Codex manifest would drop the root manifest and hand Codex a
// hooks file it cannot run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCKET = path.join(ROOT, 'dist', 'plugins', 'docket');
const readJson = file => JSON.parse(fs.readFileSync(path.join(DOCKET, file), 'utf8'));

test('docket hooks file is a Claude function-hooks module, not a command-hooks map', () => {
  const hooks = readJson('hooks/hooks.json');

  assert.deepEqual(hooks, { modules: ['./register.tsx'] });
  assert.ok(fs.existsSync(path.join(DOCKET, 'hooks', 'register.tsx')));
});

test('docket stays invisible to Codex hooks: root manifest present, no Codex hooks field', () => {
  assert.ok(fs.existsSync(path.join(DOCKET, 'plugin.json')), 'root plugin.json routes Codex to the hook-less loader');
  assert.equal(readJson('.codex-plugin/plugin.json').hooks, undefined);
});

test('the pane state contract is named on the Claude manifest only', () => {
  assert.equal(readJson('.claude-plugin/plugin.json').types, './types/index.d.ts');
  assert.equal(readJson('.codex-plugin/plugin.json').types, undefined);
  assert.ok(fs.existsSync(path.join(DOCKET, 'types', 'index.d.ts')));
});
