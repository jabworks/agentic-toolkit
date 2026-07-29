import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  codexHome,
  concordHome,
  globalDir,
  globalNotesPath,
  slugForPath,
  mainWorktreeRoot,
  resolveMemoryDir,
  tierPaths,
  tierPathsFor,
} from '../skills/concord/lib/paths.mjs';

// --- helpers -----------------------------------------------------------------

function tmpdir(prefix) {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function git(args, cwd) {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function initRepo(dir) {
  git(['init', '-q', '-b', 'main'], dir);
  git(['config', 'user.email', 'test@example.com'], dir);
  git(['config', 'user.name', 'Test'], dir);
  fs.writeFileSync(path.join(dir, 'seed.txt'), 'seed\n');
  git(['add', '.'], dir);
  git(['commit', '-qm', 'seed'], dir);
}

/** Run `fn` with CODEX_HOME pinned, restoring the previous value afterwards. */
function withCodexHome(value, fn) {
  const prev = process.env.CODEX_HOME;
  if (value === undefined) delete process.env.CODEX_HOME;
  else process.env.CODEX_HOME = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = prev;
  }
}

// --- CODEX_HOME --------------------------------------------------------------

test('codexHome honours CODEX_HOME', () => {
  withCodexHome('/custom/codex', () => {
    assert.equal(codexHome(), path.resolve('/custom/codex'));
  });
});

test('codexHome falls back to ~/.codex when CODEX_HOME is unset or blank', () => {
  const expected = path.join(os.homedir(), '.codex');
  withCodexHome(undefined, () => assert.equal(codexHome(), expected));
  withCodexHome('   ', () => assert.equal(codexHome(), expected));
});

test('codexHome expands a leading tilde', () => {
  withCodexHome('~/codex-alt', () => {
    assert.equal(codexHome(), path.join(os.homedir(), 'codex-alt'));
  });
});

test('global tier sits under the codex home, and projects are a sibling not a child', () => {
  withCodexHome('/custom/codex', () => {
    assert.equal(concordHome(), path.resolve('/custom/codex/concord'));
    assert.equal(globalDir(), path.resolve('/custom/codex/concord/global'));
    assert.equal(globalNotesPath(), path.resolve('/custom/codex/concord/global/notes.md'));

    // The leak boundary (decisions.md D6): non-git project memory must never be
    // nested inside the global tier.
    const dir = tmpdir('concord-nongit-');
    const resolved = resolveMemoryDir(dir);
    assert.equal(resolved.kind, 'nongit');
    assert.ok(
      !resolved.dir.startsWith(globalDir() + path.sep),
      `non-git bucket ${resolved.dir} must not live under ${globalDir()}`,
    );
    assert.ok(resolved.dir.startsWith(path.join(concordHome(), 'projects') + path.sep));
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

// --- slugs -------------------------------------------------------------------

test('slugForPath is deterministic, safe, and collision-resistant', () => {
  const a = slugForPath('/home/u/projects/api');
  assert.equal(a, slugForPath('/home/u/projects/api'), 'same input → same slug');
  assert.match(a, /^[a-z0-9-]+$/, 'no path separators or punctuation');

  // Same basename, different parent — must not collide.
  assert.notEqual(a, slugForPath('/home/u/work/api'));

  // Trailing separators are not a different directory.
  assert.equal(a, slugForPath('/home/u/projects/api/'));

  // A path whose basename has nothing alphanumeric still yields a usable slug.
  assert.match(slugForPath('/tmp/...'), /^[a-z0-9]+$/);
});

// --- git roots ---------------------------------------------------------------

test('a plain repo resolves to its own root, including from a subdirectory', () => {
  const repo = tmpdir('concord-repo-');
  initRepo(repo);
  const sub = path.join(repo, 'a', 'b');
  fs.mkdirSync(sub, { recursive: true });

  assert.equal(mainWorktreeRoot(repo), repo);
  assert.equal(mainWorktreeRoot(sub), repo);

  const resolved = resolveMemoryDir(sub);
  assert.equal(resolved.kind, 'git');
  assert.equal(resolved.root, repo);
  assert.equal(resolved.dir, path.join(repo, '.concord'));

  fs.rmSync(repo, { recursive: true, force: true });
});

test('a linked worktree resolves to the MAIN worktree root, so branches share memory', () => {
  const repo = tmpdir('concord-main-');
  initRepo(repo);

  const wt = path.join(tmpdir('concord-wt-'), 'feature');
  git(['worktree', 'add', '-q', '-b', 'feature', wt], repo);

  // The whole point: the worktree must NOT get its own memory dir.
  assert.equal(mainWorktreeRoot(fs.realpathSync(wt)), repo);
  assert.equal(resolveMemoryDir(wt).dir, path.join(repo, '.concord'));
  assert.equal(resolveMemoryDir(wt).dir, resolveMemoryDir(repo).dir);

  git(['worktree', 'remove', '--force', wt], repo);
  fs.rmSync(repo, { recursive: true, force: true });
});

// --- non-git and failure modes ----------------------------------------------

test('a non-git directory falls back to a stable per-cwd bucket', () => {
  const dir = tmpdir('concord-plain-');
  withCodexHome(tmpdir('concord-home-'), () => {
    const first = resolveMemoryDir(dir);
    assert.equal(first.kind, 'nongit');
    assert.equal(first.root, dir);
    // Stable across calls — the same directory always maps back to the same bucket.
    assert.equal(resolveMemoryDir(dir).dir, first.dir);
    // And distinct directories do not share one.
    const other = tmpdir('concord-plain-');
    assert.notEqual(resolveMemoryDir(other).dir, first.dir);
    fs.rmSync(other, { recursive: true, force: true });
  });
  fs.rmSync(dir, { recursive: true, force: true });
});

test('an unusable cwd resolves to null rather than throwing', () => {
  assert.equal(resolveMemoryDir(undefined), null);
  assert.equal(resolveMemoryDir(''), null);
  assert.equal(resolveMemoryDir(42), null);
  assert.equal(resolveMemoryDir('/definitely/not/a/real/path/xyzzy'), null);
  assert.equal(tierPathsFor('/definitely/not/a/real/path/xyzzy'), null);
});

// --- tier paths --------------------------------------------------------------

test('tierPaths derives every tier from the memory dir without touching disk', () => {
  const dir = '/tmp/example/.concord';
  const p = tierPaths(dir);

  assert.deepEqual(p, {
    dir,
    buffer: path.join(dir, 'buffer.md'),
    days: path.join(dir, 'days'),
    recent: path.join(dir, 'recent.md'),
    archive: path.join(dir, 'archive.md'),
    pinned: path.join(dir, 'pinned.md'),
    state: path.join(dir, 'state.json'),
    logs: path.join(dir, 'logs'),
  });

  assert.equal(fs.existsSync(dir), false, 'tierPaths must not create anything');
});

test('tierPathsFor threads resolution and tier derivation together', () => {
  const repo = tmpdir('concord-repo2-');
  initRepo(repo);
  assert.equal(tierPathsFor(repo).buffer, path.join(repo, '.concord', 'buffer.md'));
  fs.rmSync(repo, { recursive: true, force: true });
});
