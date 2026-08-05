import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const INSTALL = 'bash scripts/install-hooks.sh';

// Front C3 made this warn-only in 2026-07-08, on the reasoning that the hook is
// a convenience and CI catches drift anyway. That held while the hook only
// synced dist/. It stopped holding on 2026-08-05, when the hook became a
// frontmatter gate: the clone this repo is developed in turned out to have no
// hook at all, so that gate silently did not exist locally. A guard that is
// opt-in per clone is the same shape as the skips behind all four frontmatter
// incidents, so this now FAILS.
//
// CI keeps the carve-out for a real reason, not convenience: CI checkouts never
// install hooks, and the workflow runs check-frontmatter.mjs and the drift tests
// directly, so the hook would be redundant there rather than missing.

// Resolves .git/hooks/pre-commit through git so linked worktrees (where .git is
// a file, and hooks live in the common dir) resolve correctly. Returns null when
// this is not a git checkout at all — a tarball export has no hooks to install.
function hookPath() {
  try {
    const rel = execFileSync('git', ['rev-parse', '--git-path', 'hooks/pre-commit'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return path.resolve(REPO_ROOT, rel);
  } catch {
    return null;
  }
}

test('the local pre-commit hook is installed and current', (t) => {
  if (process.env.CI) {
    t.diagnostic('CI checkout — hooks are not installed there; the workflow runs the same gates directly');
    return;
  }

  const hook = hookPath();
  if (hook === null) {
    t.diagnostic('not a git checkout — no hooks to install');
    return;
  }

  assert.ok(
    fs.existsSync(hook),
    `.git/hooks/pre-commit is missing on this clone, so neither the frontmatter gate nor the `
    + `dist/ sync runs when you commit. Install it: ${INSTALL}`,
  );

  // A hook installed before a gate was added is stale, not present. Assert the
  // gates it must carry, so an old copy fails loudly instead of passing quietly.
  const body = fs.readFileSync(hook, 'utf8');
  const missing = [
    ['check-frontmatter.mjs', 'the SKILL.md frontmatter gate'],
    ['scripts/sync.sh', 'the skills/ → dist/ sync'],
  ].filter(([needle]) => !body.includes(needle));

  assert.deepEqual(
    missing.map(([, what]) => what),
    [],
    `.git/hooks/pre-commit is stale — it does not run: ${missing.map(([, w]) => w).join(', ')}. `
    + `Reinstall it: ${INSTALL}`,
  );
});
