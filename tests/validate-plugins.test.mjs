// scripts/validate-plugins.sh is CI's publish-surface dry-run: every plugin must pass `claude plugin validate` with
// exactly the one known warning. CI installs the CLI fresh on every run, so a new message class turns the job red on
// every plugin overnight (2026-10-21: ICON_MISSING, from the CLI's "Plugin directory checks" block). These tests run the
// real script against a fake `claude` that prints the shapes CI actually saw.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-plugins.sh');

const MANIFEST_WITH_KNOWN_WARNING = [
  'Validating plugin manifest: /repo/dist/plugins/demo/.claude-plugin/plugin.json',
  '',
  '⚠ Found 1 warning:',
  '',
  "  ❯ interface: Unknown field 'interface' (it is ignored at load time)",
  '',
].join('\n');

const DIRECTORY_BLOCK = [
  'Plugin directory checks for /repo/dist/plugins/demo. The plugin directory is the catalog that plugin users browse.',
  '',
  '⚠ Found 1 plugin directory warning:',
  '',
  '  ❯ .claude-plugin/plugin.json icon: No icon (ICON_MISSING). No icon found in the plugin.',
  '    Fix: Add a square PNG to the plugin folder at .claude-plugin/icon.png.',
  '',
  'These plugin directory checks do not change the result below.',
  '',
  'The directory also runs a safety scan and a policy review that this command does not.',
  '',
  '✔ Validation passed',
  '',
].join('\n');

// Runs the script in a scratch repo with one plugin, a fake `claude` printing `output`, and CI set.
const run = output => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-plugins-'));
  const bin = path.join(root, 'bin');

  fs.mkdirSync(path.join(root, 'dist', 'plugins', 'demo'), { recursive: true });
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(root, 'out.txt'), output);
  fs.writeFileSync(path.join(bin, 'claude'), '#!/bin/sh\ncat "$FAKE_CLAUDE_OUT"\n', { mode: 0o755 });

  const result = spawnSync('bash', [SCRIPT], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CI: '1', FAKE_CLAUDE_OUT: path.join(root, 'out.txt') },
  });

  fs.rmSync(root, { recursive: true, force: true });

  return result;
};

test('the known interface warning alone passes', () => {
  const result = run(`${MANIFEST_WITH_KNOWN_WARNING}\n✔ Validation passed\n`);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('the CLI\'s "Plugin directory checks" block (ICON_MISSING) does not count as a finding', () => {
  const result = run(`${MANIFEST_WITH_KNOWN_WARNING}\n${DIRECTORY_BLOCK}`);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('a real extra warning in the manifest section still fails, even beside the directory block', () => {
  const extra = `${MANIFEST_WITH_KNOWN_WARNING}  ❯ author: Something genuinely new is wrong\n`;
  const result = run(`${extra}\n${DIRECTORY_BLOCK}`);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /findings beyond the known interface warning/);
});

test('if a later CLI rewords the block\'s closing line, the skip ends at the next section and cannot hide a finding after it', () => {
  const reworded = DIRECTORY_BLOCK.replace('These plugin directory checks do not change the result below.', 'Reworded closing line.')
    .replace('✔ Validation passed\n', 'Validating hooks: /repo/dist/plugins/demo/hooks/hooks.json\n  ❯ ./mod/register.tsx something unexpected\n✔ Validation passed\n');
  const result = run(`${MANIFEST_WITH_KNOWN_WARNING}\n${reworded}`);

  assert.notEqual(result.status, 0, 'a finding after a reworded block must still be counted');
});

test('a validation error still fails', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-plugins-err-'));
  const bin = path.join(root, 'bin');

  fs.mkdirSync(path.join(root, 'dist', 'plugins', 'demo'), { recursive: true });
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'claude'), '#!/bin/sh\necho "✘ Validation failed"\nexit 1\n', { mode: 0o755 });

  const result = spawnSync('bash', [SCRIPT], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CI: '1' },
  });

  fs.rmSync(root, { recursive: true, force: true });

  assert.notEqual(result.status, 0);
});
