/**
 * Concord — path resolution.
 *
 * Decides where memory lives for a given working directory, and derives every
 * tier file path from a memory directory.
 *
 * Three cases:
 *   - git repo      → <git-root>/.concord/
 *   - git worktree  → <MAIN worktree root>/.concord/, so branches share one
 *                     memory. This is the case worth being careful about.
 *   - not a repo    → a per-cwd bucket under the Codex home, so scratch work is
 *                     still remembered rather than silently dropped.
 *
 * Non-git buckets live at <codex-home>/concord/projects/<slug>/ — a SIBLING of
 * the global tier, never inside it. The global tier carries user preferences
 * only; mixing project memory into it is the cross-repo leak the design forbids.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

/** Directory name used for project-tier memory, per the toolkit artifact contract. */
const DIR_NAME = '.concord';

/**
 * Expand a leading `~` and resolve to an absolute path.
 * CODEX_HOME arrives from the environment, so it may be relative or use `~`.
 */
function absolutize(p) {
  let out = p;
  if (out === '~') out = os.homedir();
  else if (out.startsWith('~/') || out.startsWith('~\\')) {
    out = path.join(os.homedir(), out.slice(2));
  }
  return path.resolve(out);
}

/** Root of Codex's own config/state directory. Honours CODEX_HOME. */
export function codexHome() {
  const raw = process.env.CODEX_HOME;
  return raw && raw.trim() ? absolutize(raw) : path.join(os.homedir(), '.codex');
}

/** Concord's area inside the Codex home — parent of both `global/` and `projects/`. */
export function concordHome() {
  return path.join(codexHome(), 'concord');
}

/**
 * The global tier: cross-project user preferences and working patterns.
 * Never project facts — see decisions.md D6.
 */
export function globalDir() {
  return path.join(concordHome(), 'global');
}

/** Path to the global notes file. */
export function globalNotesPath() {
  return path.join(globalDir(), 'notes.md');
}

/**
 * A deterministic, filesystem-safe bucket name for an absolute path.
 *
 * Readable prefix so a human can tell buckets apart, plus a short digest so two
 * different directories with the same basename never collide. Windows rejects a
 * pile of punctuation, so everything outside [a-z0-9] collapses to a dash.
 */
export function slugForPath(absPath) {
  const normalized = absPath.replace(/[/\\]+$/, '');
  const digest = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 8);
  const readable = path
    .basename(normalized)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return readable ? `${readable}-${digest}` : digest;
}

/**
 * Resolve the main worktree root for `cwd`, or null when it is not a git repo.
 *
 * `--git-common-dir` is the load-bearing flag: in a linked worktree it points at
 * the MAIN repository's `.git`, not the worktree's own. Its parent is therefore
 * the main root in both the plain-repo and worktree cases, with no branching.
 *
 * Do not substitute `--show-toplevel` — that returns the *worktree* root, which
 * would give each branch its own memory and lose continuity exactly when you
 * switch worktrees mid-feature.
 */
export function mainWorktreeRoot(cwd) {
  let out;
  try {
    out = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // git absent, cwd gone, or not a repo — all "not a git project" for us.
    return null;
  }
  if (!out) return null;

  // `--path-format=absolute` landed in git 2.31. On older git the flag errors out
  // (caught above); if a build ever returns a relative path instead, anchor it.
  const commonDir = path.isAbsolute(out) ? out : path.resolve(cwd, out);
  const root = path.dirname(commonDir);
  return root && root !== commonDir ? root : null;
}

/**
 * Where memory lives for `cwd`.
 *
 * Returns null only when there is nothing sensible to do — a missing or
 * unreadable cwd. Callers treat null as a no-op; a memory plugin degrades to
 * amnesia, never to an error.
 *
 * @returns {{ kind: 'git' | 'nongit', root: string, dir: string } | null}
 */
export function resolveMemoryDir(cwd) {
  if (!cwd || typeof cwd !== 'string') return null;

  let absCwd;
  try {
    absCwd = fs.realpathSync(path.resolve(cwd));
  } catch {
    return null;
  }

  const gitRoot = mainWorktreeRoot(absCwd);
  if (gitRoot) {
    return { kind: 'git', root: gitRoot, dir: path.join(gitRoot, DIR_NAME) };
  }
  return {
    kind: 'nongit',
    root: absCwd,
    dir: path.join(concordHome(), 'projects', slugForPath(absCwd)),
  };
}

/**
 * Every tier path derived from a memory directory.
 *
 * `days` and `logs` are directories; the rest are files. Nothing here touches
 * the filesystem — creation is the store's job, on demand.
 *
 * @returns {{ dir, buffer, days, recent, archive, pinned, state, logs }}
 */
export function tierPaths(dir) {
  return {
    dir,
    buffer: path.join(dir, 'buffer.md'),
    days: path.join(dir, 'days'),
    recent: path.join(dir, 'recent.md'),
    archive: path.join(dir, 'archive.md'),
    pinned: path.join(dir, 'pinned.md'),
    state: path.join(dir, 'state.json'),
    logs: path.join(dir, 'logs'),
  };
}

/** Convenience: resolve `cwd` straight to its tier paths, or null. */
export function tierPathsFor(cwd) {
  const resolved = resolveMemoryDir(cwd);
  return resolved ? tierPaths(resolved.dir) : null;
}
