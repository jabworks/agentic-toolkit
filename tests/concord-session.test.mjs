import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { tierPaths } from '../skills/concord/lib/paths.mjs';
import { readState, readTier, writeState } from '../skills/concord/lib/store.mjs';
import { sync, catchUp } from '../skills/concord/lib/session.mjs';
import { rolloutPathOf, cwdOf, sessionIdOf } from '../skills/concord/lib/hook.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASIC = path.join(__dirname, 'fixtures', 'concord', 'rollout-basic.jsonl');
const SUBAGENT = path.join(__dirname, 'fixtures', 'concord', 'rollout-subagent.jsonl');
const CAPTURE = path.join(REPO_ROOT, 'skills', 'concord', 'bin', 'capture.mjs');
const RECALL = path.join(REPO_ROOT, 'skills', 'concord', 'bin', 'recall.mjs');

function freshPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-session-'));
  return tierPaths(path.join(dir, '.concord'));
}

function emptyState() {
  return { rollouts: {}, lastConsolidated: null, skippedSubagents: 0 };
}

function copyRollout(source = BASIC) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-roll-'));
  const file = path.join(dir, 'rollout.jsonl');
  fs.copyFileSync(source, file);
  return file;
}

// --- the sync primitive ------------------------------------------------------

test('sync appends new entries and advances the position', () => {
  const paths = freshPaths();
  const state = emptyState();

  const result = sync(paths, state, 's1', BASIC);
  assert.equal(result.appended, 3);
  assert.ok(state.rollouts.s1.line > 0);
  assert.match(readTier(paths.buffer), /Add a health check endpoint/);
});

test('sync is idempotent — the whole point of the design', () => {
  const paths = freshPaths();
  const state = emptyState();

  sync(paths, state, 's1', BASIC);
  const afterFirst = readTier(paths.buffer);

  // Called again from another hook, and again after that.
  assert.equal(sync(paths, state, 's1', BASIC).appended, 0);
  assert.equal(sync(paths, state, 's1', BASIC).appended, 0);
  assert.equal(readTier(paths.buffer), afterFirst, 'buffer unchanged by repeat syncs');
});

test('three hooks syncing in any order produce identical results', () => {
  // SessionStart then UserPromptSubmit then SessionEnd, versus the reverse.
  const a = freshPaths();
  const stateA = emptyState();
  sync(a, stateA, 's1', BASIC);
  sync(a, stateA, 's1', BASIC);
  sync(a, stateA, 's1', BASIC);

  const b = freshPaths();
  const stateB = emptyState();
  sync(b, stateB, 's1', BASIC);

  assert.equal(readTier(a.buffer), readTier(b.buffer));
  assert.equal(stateA.rollouts.s1.line, stateB.rollouts.s1.line);
});

test('sync picks up only what was appended since the last call', () => {
  const paths = freshPaths();
  const state = emptyState();
  const rollout = copyRollout();

  // Truncate to the first few lines, sync, then let the file grow.
  const lines = fs.readFileSync(BASIC, 'utf8').split('\n').filter(Boolean);
  fs.writeFileSync(rollout, lines.slice(0, 4).join('\n') + '\n');
  assert.equal(sync(paths, state, 's1', rollout).appended, 1);

  fs.writeFileSync(rollout, lines.join('\n') + '\n');
  assert.equal(sync(paths, state, 's1', rollout).appended, 2, 'only the new entries');

  const buffer = readTier(paths.buffer);
  assert.equal(buffer.match(/Add a health check endpoint/g).length, 1, 'nothing double-counted');
});

test('a subagent rollout is skipped, counted, and stops being tracked', () => {
  const paths = freshPaths();
  const state = emptyState();

  const result = sync(paths, state, 'sub1', SUBAGENT);
  assert.equal(result.skipped, true);
  assert.equal(result.appended, 0);
  assert.equal(state.skippedSubagents, 1);
  assert.equal(state.rollouts.sub1, undefined, 'no longer tracked');
  assert.equal(readTier(paths.buffer), '');
});

test('a deleted rollout is dropped from state rather than tracked forever', () => {
  const paths = freshPaths();
  const state = emptyState();
  const rollout = copyRollout();

  sync(paths, state, 's1', rollout);
  assert.ok(state.rollouts.s1);

  fs.rmSync(rollout);
  const result = sync(paths, state, 's1');
  assert.equal(result.dropped, true);
  assert.equal(state.rollouts.s1, undefined, 'state does not grow without bound');
});

test('sync without a session id or a path is a harmless no-op', () => {
  const paths = freshPaths();
  const state = emptyState();

  assert.deepEqual(sync(paths, state, null, BASIC), { appended: 0, skipped: false, dropped: false });
  assert.deepEqual(sync(paths, state, 's1', null), { appended: 0, skipped: false, dropped: false });
  assert.deepEqual(state.rollouts, {});
});

// --- catch-up ----------------------------------------------------------------

test('catch-up recovers work from a session that never fired SessionEnd', () => {
  const paths = freshPaths();
  const state = emptyState();
  const rollout = copyRollout();

  // A session that was tracked, then hard-killed: position recorded at 0 and
  // the rollout left complete on disk.
  const lines = fs.readFileSync(BASIC, 'utf8').split('\n').filter(Boolean);
  fs.writeFileSync(rollout, lines.slice(0, 3).join('\n') + '\n');
  sync(paths, state, 'killed', rollout);
  fs.writeFileSync(rollout, lines.join('\n') + '\n'); // the rest was written, hook never ran

  const recovered = catchUp(paths, state);
  assert.ok(recovered > 0, 'trailing work is recoverable, not lost');
  assert.match(readTier(paths.buffer), /Added GET \/healthz/);
});

test('catch-up over an empty state does nothing', () => {
  const paths = freshPaths();
  const state = emptyState();
  assert.equal(catchUp(paths, state), 0);
});

// --- entrypoints -------------------------------------------------------------

/** Run a hook executable with a piped JSON payload, as Codex would. */
function runHookScript(script, args, payload, env = {}) {
  return execFileSync('node', [script, ...args], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    // The hooks resolve the global tier out of CODEX_HOME. Inherited unset, that
    // is the developer's real ~/.codex — so a machine where concord has actually
    // captured preferences fails the assertions about an empty store, while CI
    // passes only for want of a home directory. Give every run its own.
    env: {
      ...process.env,
      CODEX_HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'concord-home-')),
      ...env,
    },
  });
}

test('capture --prompt syncs the rollout without capturing the prompt itself', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-repo-'));
  execFileSync('git', ['init', '-q'], { cwd: repo });
  const rollout = copyRollout();

  runHookScript(CAPTURE, ['--prompt'], {
    session_id: 's1',
    transcript_path: rollout,
    cwd: repo,
    hook_event_name: 'UserPromptSubmit',
    // Deliberately present, and deliberately ignored: capturing this as well as
    // the rollout is exactly the double-count the design forbids.
    prompt: 'Add a health check endpoint',
  });

  const paths = tierPaths(path.join(fs.realpathSync(repo), '.concord'));
  const buffer = readTier(paths.buffer);
  assert.equal(
    buffer.match(/Add a health check endpoint/g).length,
    1,
    'the prompt appears once — from the rollout, not from the payload',
  );
});

test('capture --session-end promotes tiers', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-repo-'));
  execFileSync('git', ['init', '-q'], { cwd: repo });
  const rollout = copyRollout();

  runHookScript(CAPTURE, ['--session-end'], {
    session_id: 's1',
    transcript_path: rollout,
    cwd: repo,
    hook_event_name: 'SessionEnd',
  });

  const paths = tierPaths(path.join(fs.realpathSync(repo), '.concord'));
  assert.equal(readTier(paths.buffer), '', 'buffer flushed');

  // Which tier it lands in depends on how old the fixture's entries are today:
  // promote() writes the day file and ages it in the same call, so once the
  // fixture drifts past the 7-day window the day file is created and rolled
  // straight out, leaving days/ empty. Asserting on days/ specifically was
  // really asserting the aging window — which ageDays' own tests own. What
  // promotion guarantees here is that the entry left the buffer for a durable
  // tier, whichever one that is.
  const durable = [
    ...fs.readdirSync(paths.days).map((f) => readTier(path.join(paths.days, f))),
    readTier(paths.recent),
    readTier(paths.archive),
  ].join('\n');
  assert.match(durable, /Add a health check endpoint/, 'entry reached a durable tier');
});

test('recall writes the memory block, and only that, to stdout', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-repo-'));
  execFileSync('git', ['init', '-q'], { cwd: repo });
  const paths = tierPaths(path.join(fs.realpathSync(repo), '.concord'));
  fs.mkdirSync(paths.dir, { recursive: true });
  fs.writeFileSync(paths.pinned, '- deploys need the VPN\n');

  const out = runHookScript(RECALL, [], { cwd: repo, hook_event_name: 'SessionStart' });
  assert.match(out, /## Pinned/);
  assert.match(out, /deploys need the VPN/);
  assert.doesNotMatch(out, /error|Error|at Object|\.mjs:/, 'no diagnostics leak into context');
});

test('recall on an empty store emits nothing at all', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-repo-'));
  execFileSync('git', ['init', '-q'], { cwd: repo });
  const out = runHookScript(RECALL, [], { cwd: repo, hook_event_name: 'SessionStart' });
  assert.equal(out, '');
});

test('hooks exit 0 and stay silent on a malformed payload', () => {
  for (const script of [RECALL, CAPTURE]) {
    const out = execFileSync('node', [script], {
      input: 'this is not json at all',
      encoding: 'utf8',
    });
    assert.doesNotMatch(out, /Error/, `${path.basename(script)} stayed quiet`);
  }
});

test('hooks exit 0 when the cwd cannot be resolved', () => {
  const out = runHookScript(RECALL, [], { cwd: '/definitely/not/a/path/xyzzy' });
  assert.equal(out, '');
});

test('an internal failure is logged rather than surfaced', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-repo-'));
  execFileSync('git', ['init', '-q'], { cwd: repo });
  const paths = tierPaths(path.join(fs.realpathSync(repo), '.concord'));

  // A rollout path that exists but is a directory — readRollout swallows it, so
  // the run should still succeed silently and leave the store usable.
  const dirAsRollout = fs.mkdtempSync(path.join(os.tmpdir(), 'concord-notafile-'));
  const out = runHookScript(CAPTURE, ['--prompt'], {
    session_id: 's1',
    rollout_path: dirAsRollout,
    cwd: repo,
  });

  assert.equal(out, '');
  assert.deepEqual(readState(paths).rollouts.s1?.line, 0, 'position did not advance past nothing');
});

// --- payload contract --------------------------------------------------------

test('transcript_path is the documented field and wins over rollout_path', () => {
  const real = copyRollout();
  assert.equal(rolloutPathOf({ transcript_path: real }), real);

  // rollout_path is Codex's internal name; accepted only as a fallback.
  assert.equal(rolloutPathOf({ rollout_path: real }), real);
  assert.equal(
    rolloutPathOf({ transcript_path: real, rollout_path: '/wrong.jsonl' }),
    real,
    'the documented field takes precedence',
  );
  assert.equal(rolloutPathOf({}), null);
  assert.equal(rolloutPathOf(null), null);
});

test('cwd falls back to the process cwd, and session_id to null', () => {
  assert.equal(cwdOf({ cwd: '/somewhere' }), '/somewhere');
  assert.equal(cwdOf({}), process.cwd());
  assert.equal(sessionIdOf({ session_id: 's1' }), 's1');
  assert.equal(sessionIdOf({}), null);
});

test('session_id falls back to the UUID in the rollout filename (codex exec omits it)', () => {
  const p = '/home/u/.codex/sessions/2026/08/03/rollout-2026-08-03T05-18-02-019fc60e-bddc-7be2-8a70-8c92b7701f8d.jsonl';
  assert.equal(sessionIdOf({ transcript_path: p }), '019fc60e-bddc-7be2-8a70-8c92b7701f8d');
  assert.equal(sessionIdOf({ rollout_path: p }), '019fc60e-bddc-7be2-8a70-8c92b7701f8d');
  // explicit session_id still wins over the filename
  assert.equal(sessionIdOf({ session_id: 's1', transcript_path: p }), 's1');
  // a transcript path with no UUID shape yields null, not garbage
  assert.equal(sessionIdOf({ transcript_path: '/tmp/not-a-rollout.jsonl' }), null);
});

// --- state persistence -------------------------------------------------------

test('state written by one hook is read by the next', () => {
  const paths = freshPaths();
  const state = emptyState();
  sync(paths, state, 's1', BASIC);
  writeState(paths, state);

  const reloaded = readState(paths);
  assert.equal(reloaded.rollouts.s1.line, state.rollouts.s1.line);
  assert.equal(sync(paths, reloaded, 's1', BASIC).appended, 0, 'resumes exactly where it left off');
});
