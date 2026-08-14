import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function findFiles(dir, name, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findFiles(full, name, out);
    else if (entry.name === name) out.push(full);
  }
  return out;
}

test('every plugin.json is valid JSON with required fields and a ./-prefixed skills path', () => {
  // Root plugin.json files are Agent Plugins manifests — a different, closed
  // schema with no "skills" field (discovery is by fixed location). They are
  // generated and guarded by tests/agent-plugins.test.mjs; this test owns the
  // host manifests in .claude-plugin/ and .codex-plugin/.
  const files = findFiles(REPO_ROOT, 'plugin.json')
    .filter((f) => f.includes('.claude-plugin') || f.includes('.codex-plugin'));
  assert.ok(files.length > 0, 'expected to find at least one plugin.json');
  for (const file of files) {
    const json = JSON.parse(fs.readFileSync(file, 'utf8')); // throws on invalid JSON
    assert.ok(json.name, file + ' missing "name"');
    assert.ok(json.version, file + ' missing "version"');
    assert.ok(json.description, file + ' missing "description"');
    assert.ok(json.author && json.author.name, file + ' missing "author.name"');
    assert.ok(json.skills, file + ' missing "skills"');
    assert.ok(json.skills.startsWith('./'), file + ' "skills" must start with "./", got: ' + json.skills);
  }
});

test('marketplace.json is valid JSON with required fields on every plugin entry', () => {
  const file = path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(json.name, 'marketplace.json missing "name"');
  assert.ok(json.owner && json.owner.name, 'marketplace.json missing "owner.name"');
  assert.ok(Array.isArray(json.plugins) && json.plugins.length > 0, 'marketplace.json "plugins" must be a non-empty array');
  for (const plugin of json.plugins) {
    assert.ok(plugin.name, 'marketplace.json plugin entry missing "name"');
    assert.ok(plugin.description, 'plugin "' + plugin.name + '" missing "description"');
    assert.ok(plugin.source, 'plugin "' + plugin.name + '" missing "source"');
    assert.ok(plugin.source.startsWith('./'), 'plugin "' + plugin.name + '" source must start with "./", got: ' + plugin.source);
    assert.ok(plugin.category, 'plugin "' + plugin.name + '" missing "category"');
  }
});
