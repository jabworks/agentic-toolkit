import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'release-plugins.mjs');

// A synthetic repo rather than this one: the detector's contract is about
// version history, and a fixture makes "which commit is version X's release
// point" an assertion instead of a guess about real history.
function fixtureRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-plugins-'));
  const run = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });

  run('init', '-q', '-b', 'main');
  run('config', 'user.email', 'test@example.com');
  run('config', 'user.name', 'Test');

  // `date` backdates the commit, which is what makes a release a
  // reconstruction rather than a same-day publish.
  const bump = (plugin, version, subject, date) => {
    const manifest = path.join(dir, 'dist', 'plugins', plugin, '.claude-plugin', 'plugin.json');
    fs.mkdirSync(path.dirname(manifest), { recursive: true });
    fs.writeFileSync(manifest, JSON.stringify({ name: plugin, version }, null, 2) + '\n');
    execFileSync('git', ['-C', dir, 'add', '-A'], { encoding: 'utf8' });
    execFileSync('git', ['-C', dir, 'commit', '-q', '-m', subject], {
      encoding: 'utf8',
      env: date ? { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : process.env,
    });

    return run('rev-parse', 'HEAD').trim();
  };

  // A commit that ships a change in the plugin without bumping its version —
  // the ordinary case, and the one that must not produce a second release point.
  let nonce = 0;
  const touch = (plugin, subject) => {
    const file = path.join(dir, 'dist', 'plugins', plugin, 'skills', `note-${nonce++}.md`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${subject}\n`);
    run('add', '-A');
    run('commit', '-q', '-m', subject);

    return run('rev-parse', 'HEAD').trim();
  };

  return { dir, run, bump, touch };
}

function planOf(dir, args = []) {
  const res = spawnSync(process.execPath, [SCRIPT, '--repo-root', dir, ...args], { encoding: 'utf8' });

  return {
    status: res.status,
    stdout: res.stdout ?? '',
    rows: (res.stdout ?? '')
      .split('\n')
      .map((line) => line.match(/^(CREATE|tagged)\s+(\S+)\s+(\S+)\s+(\S+)/))
      .filter(Boolean)
      .map(([, mark, tag, date, sha]) => ({ mark, tag, date, sha })),
  };
}

test('each version is detected once, at the first commit that carries it', () => {
  const { dir, bump, touch } = fixtureRepo();
  try {
    bump('alpha', '1.0.0', 'feat(alpha): initial');
    const second = bump('alpha', '1.1.0', 'feat(alpha): a feature');
    touch('alpha', 'docs(alpha): tweak wording');

    const plan = planOf(dir);
    const alpha = plan.rows.filter((row) => row.tag.startsWith('alpha--'));

    assert.deepEqual(alpha.map((row) => row.tag), ['alpha--v1.0.0', 'alpha--v1.1.0']);
    assert.ok(second.startsWith(alpha[1].sha), 'the release point is the first commit carrying the version');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('an existing tag becomes a watermark — older untagged versions stay history', () => {
  const { dir, run, bump } = fixtureRepo();
  try {
    bump('alpha', '1.0.0', 'feat(alpha): initial');
    const tagged = bump('alpha', '1.1.0', 'feat(alpha): a feature');
    run('tag', 'alpha--v1.1.0', tagged);
    bump('alpha', '1.2.0', 'feat(alpha): another');

    const plan = planOf(dir);
    const creates = plan.rows.filter((row) => row.mark === 'CREATE');

    assert.deepEqual(creates.map((row) => row.tag), ['alpha--v1.2.0'],
      '1.0.0 predates the tag, so it must not come back as pending');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('--initial selects one release per plugin, at its current version', () => {
  const { dir, bump } = fixtureRepo();
  try {
    bump('alpha', '1.0.0', 'feat(alpha): initial');
    bump('alpha', '1.1.0', 'feat(alpha): a feature');
    bump('beta', '0.1.0', 'feat(beta): initial');

    const plan = planOf(dir, ['--initial']);
    const creates = plan.rows.filter((row) => row.mark === 'CREATE').map((row) => row.tag).sort();

    assert.deepEqual(creates, ['alpha--v1.1.0', 'beta--v0.1.0']);
    assert.match(plan.stdout, /1 older version\(s\) stay in CHANGELOG\.md only/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('versions on a branch that is not the default are held back', () => {
  const { dir, run, bump } = fixtureRepo();
  try {
    bump('alpha', '1.0.0', 'feat(alpha): initial');
    run('switch', '-q', '-c', 'feature');
    bump('alpha', '1.1.0', 'feat(alpha): unmerged work');

    const plan = planOf(dir);
    const creates = plan.rows.filter((row) => row.mark === 'CREATE').map((row) => row.tag);

    assert.deepEqual(creates, ['alpha--v1.0.0'], 'an unmerged version must not be released');
    assert.match(plan.stdout, /held back .* not on the default branch yet: alpha--v1\.1\.0/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a dry run writes nothing — no tags, no working-tree change', () => {
  const { dir, run, bump } = fixtureRepo();
  try {
    bump('alpha', '1.0.0', 'feat(alpha): initial');
    const before = run('rev-parse', 'HEAD').trim();

    planOf(dir);

    assert.equal(run('tag', '--list').trim(), '', 'a dry run must create no tags');
    assert.equal(run('status', '--porcelain').trim(), '', 'a dry run must not touch the tree');
    assert.equal(run('rev-parse', 'HEAD').trim(), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('--write-changelog records every version, including ones with no release', () => {
  const { dir, run, bump } = fixtureRepo();
  try {
    bump('alpha', '1.0.0', 'feat(alpha): initial');
    const tagged = bump('alpha', '1.1.0', 'feat(alpha): a feature');
    run('tag', 'alpha--v1.1.0', tagged);
    bump('beta', '0.1.0', 'feat(beta): initial');

    execFileSync(process.execPath, [SCRIPT, '--repo-root', dir, '--write-changelog'], { encoding: 'utf8' });
    const changelog = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');

    for (const heading of ['## alpha 1.0.0', '## alpha 1.1.0', '## beta 0.1.0']) {
      assert.ok(changelog.includes(heading), `${heading} must appear`);
    }
    assert.ok(
      changelog.indexOf('## beta 0.1.0') < changelog.indexOf('## alpha 1.0.0'),
      'entries run newest first',
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The invariant that keeps the file honest without needing tags or a deep
// clone: a byte-equality test against regeneration would need full history and
// tags, which actions/checkout fetches by default in neither case.
test('every shipped plugin version has a CHANGELOG entry', () => {
  const changelog = fs.readFileSync(path.join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
  const pluginsDir = path.join(REPO_ROOT, 'dist', 'plugins');
  const missing = [];

  for (const plugin of fs.readdirSync(pluginsDir)) {
    const manifest = path.join(pluginsDir, plugin, '.claude-plugin', 'plugin.json');
    if (!fs.existsSync(manifest)) continue;

    const { version } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (!changelog.includes(`## ${plugin} ${version} —`)) missing.push(`${plugin} ${version}`);
  }

  assert.deepEqual(missing, [],
    'run `node scripts/release-plugins.mjs --write-changelog` after bumping a version');
});

// The property that keeps CI honest: a push releases what it introduced, not
// everything that was ever missed. Without it the first run after any gap
// publishes the whole backlog.
test('--since releases only versions introduced after the given ref', () => {
  const { dir, bump } = fixtureRepo();
  try {
    bump('alpha', '1.0.0', 'feat(alpha): initial');
    const base = bump('alpha', '1.1.0', 'feat(alpha): a feature');
    bump('alpha', '1.2.0', 'feat(alpha): another');
    bump('beta', '0.1.0', 'feat(beta): initial');

    const scoped = planOf(dir, ['--since', base]);
    const creates = scoped.rows.filter((row) => row.mark === 'CREATE').map((row) => row.tag).sort();

    assert.deepEqual(creates, ['alpha--v1.2.0', 'beta--v0.1.0'],
      'versions from before the push base must be left alone');

    const unscoped = planOf(dir).rows.filter((row) => row.mark === 'CREATE');
    assert.equal(unscoped.length, 4, 'without --since the whole backlog is still offered');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('--since falls back to the last commit when the ref does not resolve', () => {
  const { dir, bump } = fixtureRepo();
  try {
    bump('alpha', '1.0.0', 'feat(alpha): initial');
    bump('alpha', '1.1.0', 'feat(alpha): a feature');

    // GitHub sends all-zeros for a branch's first push.
    const plan = planOf(dir, ['--since', '0000000000000000000000000000000000000000']);
    const creates = plan.rows.filter((row) => row.mark === 'CREATE').map((row) => row.tag);

    assert.deepEqual(creates, ['alpha--v1.1.0'], 'an unresolvable ref must not release the backlog');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A fake gh that answers `release list` from a fixture and records every
// invocation, so the release-creation arguments are assertable without a token.
function fakeGh(dir, releasedTags) {
  const bin = path.join(dir, 'fake-gh.mjs');
  const log = path.join(dir, 'gh-calls.log');
  fs.writeFileSync(bin, `#!/usr/bin/env node
import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + '\\n');
if (args[0] === 'release' && args[1] === 'list') {
  process.stdout.write(JSON.stringify(${JSON.stringify(releasedTags)}.map((tagName) => ({ tagName }))));
}
process.exit(0);
`);
  fs.chmodSync(bin, 0o755);

  return {
    env: { RELEASE_PLUGINS_GH: bin },
    calls: () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []),
  };
}

test('--repair targets tags whose release creation failed, and nothing else', () => {
  const { dir, run, bump } = fixtureRepo();
  try {
    const first = bump('alpha', '1.0.0', 'feat(alpha): initial');
    const second = bump('beta', '0.1.0', 'feat(beta): initial');
    run('tag', 'alpha--v1.0.0', first);
    run('tag', 'beta--v0.1.0', second);

    // beta got its release; alpha's tag exists but its release never landed.
    const gh = fakeGh(dir, ['beta--v0.1.0']);
    const res = spawnSync(process.execPath, [SCRIPT, '--repo-root', dir, '--repair'], {
      encoding: 'utf8',
      env: { ...process.env, ...gh.env },
    });
    const creates = (res.stdout ?? '').split('\n').filter((line) => line.startsWith('CREATE'));

    assert.equal(creates.length, 1);
    assert.match(creates[0], /alpha--v1\.0\.0/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --target makes GitHub re-point the tag ref, which a token without the
// `workflow` scope may not do when the commit touches .github/workflows. It
// stranded six releases on the seeding run; the tag push already fixes the
// commit, so the flag must never come back.
test('release creation never passes --target, and reconstructions do not claim Latest', () => {
  const { dir, run, bump } = fixtureRepo();
  try {
    bump('alpha', '1.0.0', 'feat(alpha): initial', '2026-01-15T10:00:00+00:00');

    // --execute pushes the tag before creating the release, so the fixture
    // needs somewhere to push to.
    const remote = fs.mkdtempSync(path.join(os.tmpdir(), 'release-plugins-remote-'));
    execFileSync('git', ['init', '-q', '--bare', remote]);
    run('remote', 'add', 'origin', remote);
    run('push', '-q', 'origin', 'main');

    const gh = fakeGh(dir, []);
    execFileSync(process.execPath, [SCRIPT, '--repo-root', dir, '--execute'], {
      encoding: 'utf8',
      env: { ...process.env, ...gh.env },
    });

    const create = gh.calls().find((args) => args[0] === 'release' && args[1] === 'create');

    assert.ok(create, 'a release must have been attempted');
    assert.ok(!create.includes('--target'), '--target must never be passed');
    assert.ok(create.includes('--latest=false'), 'a reconstructed release must not claim Latest');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
