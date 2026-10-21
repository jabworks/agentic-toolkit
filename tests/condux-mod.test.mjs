// The condux mod (docs: specs/condux-mod) is a Claude Code function-hooks module nested under
// skills/workflow/hooks/mod/. It rides in the one hooks dir condux already maps, so composition needs no new pair
// and these pins hold the rest of the contract: Claude-only keys, no other host's mirror, tests that run, read-only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'skills', 'workflow', 'hooks');
const MOD = path.join(SRC, 'mod');
const DIST = path.join(ROOT, 'dist', 'plugins', 'condux');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

test('the Claude hooks.json carries the module beside the routing hook; the Codex one does not', () => {
  const claude = readJson(path.join(SRC, 'hooks.json'));

  assert.deepEqual(claude.modules, ['./mod/register.tsx']);
  assert.ok(claude.hooks?.SessionStart, 'the routing SessionStart hook must survive the modules key');
  assert.ok(fs.existsSync(path.join(DIST, 'hooks', 'mod', 'register.tsx')), 'the module is mirrored into the plugin');

  const codex = readJson(path.join(SRC, 'codex-hooks.json'));

  assert.equal(codex.modules, undefined, 'Codex must never be handed a function-hooks module');
});

test('the contract is named on the Claude manifest only, and the Codex manifest still points at its own hooks file', () => {
  const claude = readJson(path.join(DIST, '.claude-plugin', 'plugin.json'));
  const codex = readJson(path.join(DIST, '.codex-plugin', 'plugin.json'));

  assert.equal(claude.types, './hooks/mod/types/index.d.ts');
  assert.ok(fs.existsSync(path.join(DIST, 'hooks', 'mod', 'types', 'index.d.ts')));
  assert.equal(claude.hooks, undefined, 'Claude auto-discovers hooks/hooks.json');
  assert.equal(codex.types, undefined);
  assert.equal(codex.hooks, './hooks/codex-hooks.json', 'Codex defaults to hooks/hooks.json unless its manifest overrides it');
});

test('no unit test under the mod is named .test.ts: node --test runs it from every mirror copy and it cannot import claude-code/testing', () => {
  const offenders = [MOD, path.join(DIST, 'hooks', 'mod'), path.join(DIST, 'skills', 'workflow', 'hooks', 'mod')]
    .flatMap(walk)
    .filter(file => /\.test\.ts$/.test(file))
    .map(file => path.relative(ROOT, file));

  assert.deepEqual(offenders, []);
});

test('the mod ships to Claude Code only: OpenCode, Cursor and the npm package never receive its source', () => {
  for (const tree of [
    path.join('dist', 'opencode', 'skills', 'workflow', 'hooks'),
    path.join('dist', 'cursor', 'skills', 'workflow', 'hooks'),
    path.join('packages', 'condux-opencode', 'skills', 'workflow', 'hooks'),
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, tree, 'routing.md')), `${tree} still carries the routing payload`);
    assert.equal(fs.existsSync(path.join(ROOT, tree, 'mod')), false, `${tree} must not contain mod/`);
  }
});

test('the mod only reads: no file write, process or prompt call in its sources', () => {
  // Design R10 pinned this through `claude plugin validate`'s list of calls; CI has no claude CLI, so the source is
  // scanned instead and the validate output is recorded with the live checks.
  const FORBIDDEN = /\$\.(?:fs\.write|process|prompt)\b/;
  const offenders = walk(MOD)
    .filter(file => /\.(?:ts|tsx)$/.test(file) && !file.includes(`${path.sep}tests${path.sep}`))
    .filter(file => FORBIDDEN.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(ROOT, file));

  assert.deepEqual(offenders, []);
});

test('the state contract exports types and nothing else', () => {
  const text = fs.readFileSync(path.join(MOD, 'types', 'index.d.ts'), 'utf8');
  const bad = text.split('\n').filter(line => /^export\s+(?!type\b|interface\b)/.test(line));

  assert.deepEqual(bad, []);
});
