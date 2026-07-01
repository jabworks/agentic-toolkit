# Plan: CI Hardening — Smoke Tests + Mirror-Drift Check

> Date: 2026-07-01
> Design: docs/plans/2026-07-01-condux-hardening-design.md (workstream 2)

## Goal

Give the toolkit's own Node infrastructure (`annotate-server.js`,
`preview-server.js`, `scaffold.sh`) and plugin manifests automated
verification via GitHub Actions — this repo currently has zero tests and no
CI.

## Approach

`node:test` + `node:assert` only (Node 20+, stdlib built-in test runner) — no
`package.json`, no new dependency, first CI config the repo has had. Smoke
tests spawn each script/server, exercise its real interface, and assert on
observed behavior. A separate check enforces the existing "`dist/` mirrors
`skills/`" invariant.

## Files Affected

- `.github/workflows/ci.yml` — new
- `tests/helpers.mjs` — new (shared server-spawn helper)
- `tests/annotate-server.test.mjs` — new
- `tests/preview-server.test.mjs` — new
- `tests/scaffold.test.mjs` — new
- `tests/plugin-manifests.test.mjs` — new
- `tests/dist-mirror.test.mjs` — new

## Tasks

- [ ] Task 1: `tests/helpers.mjs`
- [ ] Task 2: Server smoke tests (`annotate-server`, `preview-server`)
- [ ] Task 3: `scaffold.sh` smoke test
- [ ] Task 4: Plugin manifest validity test
- [ ] Task 5: dist/skills mirror-drift test
- [ ] Task 6: `.github/workflows/ci.yml`

---

### Task 1: `tests/helpers.mjs`

**What:** Create a shared helper for spawning the toolkit's stdlib Node
servers and waiting for their "ready" stdout line (condition-based, not an
arbitrary sleep) instead of duplicating this logic in every server test.

```js
// tests/helpers.mjs
// Shared helpers for spawning the toolkit's stdlib Node servers in tests and
// waiting for them to report a ready URL, instead of an arbitrary sleep.
import { spawn } from 'node:child_process';

// Spawns `node <scriptPath> ...args`, waits for stdout to match `urlPattern`
// (capture group 1 = port), and resolves with { proc, port }. Rejects if the
// pattern doesn't appear within `timeoutMs`.
export function spawnServer(scriptPath, args, urlPattern, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [scriptPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let buffer = '';
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(
        'server did not report a ready URL within ' + timeoutMs + 'ms. Output so far:\n' + buffer
      ));
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(urlPattern);
      if (match) {
        clearTimeout(timer);
        resolve({ proc, port: Number(match[1]) });
      }
    });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

// Stops a spawned server. Manual-mode servers never call process.exit() on
// their own, so SIGTERM (default action: terminate) is the reliable path;
// SIGKILL is a fallback if it hasn't exited after 1s.
export function stopServer(proc) {
  return new Promise((resolve) => {
    proc.once('exit', () => resolve());
    proc.kill('SIGTERM');
    setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 1000);
  });
}
```

**Why:** `annotate-server.js` and `preview-server.js` both bind port `0`
(OS-assigned) and print the assigned port to stdout rather than a fixed
value — every test that spawns one of them needs the same
wait-for-stdout-then-extract-port logic.

**Files:**
- Create: `tests/helpers.mjs`

**Gotchas:**
- Requires Node 18+ for global `fetch` (used by the tests that import this
  helper) — CI pins Node 20 (Task 6), so this isn't a portability concern in
  practice, but don't add a `node-fetch` dependency if this ever runs on an
  older local Node.

**Dependencies:** None

---

### Task 2: Server smoke tests (`annotate-server`, `preview-server`)

**What:** Create `tests/annotate-server.test.mjs` and
`tests/preview-server.test.mjs`, exercising each server's real HTTP
interface end-to-end.

`tests/annotate-server.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnServer, stopServer } from './helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(__dirname, '../skills/plan-review/references/annotate-server.js');

test('annotate-server manual mode: serves plan, accepts feedback, writes feedback file', async () => {
  const fixture = path.join(os.tmpdir(), 'ci-plan-review-' + process.pid + '.md');
  const feedbackFile = fixture + '.feedback.md';
  fs.writeFileSync(fixture, '# Sample Plan\n\nContent for the smoke test.\n');

  const { proc, port } = await spawnServer(
    SERVER, [fixture], /Plan review\s+→\s+http:\/\/127\.0\.0\.1:(\d+)/
  );
  try {
    const base = 'http://127.0.0.1:' + port;

    const rootRes = await fetch(base + '/');
    assert.equal(rootRes.status, 200);
    const html = await rootRes.text();
    assert.match(html, new RegExp(path.basename(fixture)));

    const planRes = await fetch(base + '/api/plan');
    assert.equal(await planRes.text(), fs.readFileSync(fixture, 'utf8'));

    const feedbackRes = await fetch(base + '/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'Approve', thread: [] }),
    });
    assert.equal(feedbackRes.status, 200);
    const feedbackJson = await feedbackRes.json();
    assert.equal(feedbackJson.status, 'received');
    assert.equal(feedbackJson.mode, 'manual');

    const deadline = Date.now() + 2000;
    while (!fs.existsSync(feedbackFile) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.ok(fs.existsSync(feedbackFile), 'feedback file was not written');
    assert.match(fs.readFileSync(feedbackFile, 'utf8'), /\*\*Decision:\*\* Approve/);
  } finally {
    await stopServer(proc);
    fs.rmSync(fixture, { force: true });
    fs.rmSync(feedbackFile, { force: true });
  }
});
```

`tests/preview-server.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnServer, stopServer } from './helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(__dirname, '../skills/technical-spec/references/preview-server.js');

test('preview-server: lists and serves spec markdown files', async () => {
  const specDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-spec-'));
  fs.writeFileSync(path.join(specDir, 'index.md'), '# Sample Spec\n');
  fs.writeFileSync(path.join(specDir, 'decisions.md'), '# Decisions\n');

  const { proc, port } = await spawnServer(
    SERVER, [specDir], /Spec preview\s+→\s+http:\/\/localhost:(\d+)/
  );
  try {
    const base = 'http://localhost:' + port;

    const filesRes = await fetch(base + '/api/files');
    assert.deepEqual(await filesRes.json(), ['index.md', 'decisions.md']);

    const fileRes = await fetch(base + '/api/file/index.md');
    assert.equal(await fileRes.text(), '# Sample Spec\n');
  } finally {
    await stopServer(proc);
    fs.rmSync(specDir, { recursive: true, force: true });
  }
});
```

**Why:** These two servers currently have zero verification anywhere in the
repo — this exercises their actual HTTP surface (root render, plan/file
read, feedback write) rather than just `node --check` syntax validity.

**Files:**
- Create: `tests/annotate-server.test.mjs`
- Create: `tests/preview-server.test.mjs`

**Gotchas:**
- `annotate-server.js` prints `Plan review   →  http://127.0.0.1:<port>`
  (note `127.0.0.1`); `preview-server.js` prints `Spec preview  →
  http://localhost:<port>` (note `localhost`, not `127.0.0.1`) — the regexes
  are not interchangeable between the two tests.
- Both servers call `exec(<platform-opener> + ' ' + url, function(){})` to
  try opening a browser — this fails silently in CI (no display, no
  `xdg-open`) since the callback ignores its error argument; no special
  handling needed, but don't assume a browser actually opens.
- `preview-server.js`'s `getMdFiles()` sorts `index.md` first, then the rest
  alphabetically — the fixture's two files were chosen so the expected order
  is unambiguous.

**Dependencies:** Task 1

---

### Task 3: `scaffold.sh` smoke test

**What:** Create `tests/scaffold.test.mjs` — runs `scaffold.sh` against a
fresh temporary git repo (so `git rev-parse --show-toplevel` resolves inside
the temp dir, not the real toolkit repo) and asserts both the `created:` and
`exists:` output paths.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, '../skills/technical-spec/references/scaffold.sh');

test('scaffold.sh: creates a spec dir with index.md, then reports exists on re-run', () => {
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-scaffold-'));
  execFileSync('git', ['init', '-q'], { cwd: tmpRepo });

  const firstRun = execFileSync('bash', [SCRIPT, 'CiSmokeFeature'], { cwd: tmpRepo }).toString().trim();
  assert.match(firstRun, /^created:.*\/specs\/ci-smoke-feature commit:\S+ date:\d{4}-\d{2}-\d{2}$/);

  const specPath = firstRun.match(/^created:(\S+) /)[1];
  const indexContent = fs.readFileSync(path.join(specPath, 'index.md'), 'utf8');
  assert.match(indexContent, /# CiSmokeFeature — Tech Spec/);
  assert.match(indexContent, /## Contents/);

  const secondRun = execFileSync('bash', [SCRIPT, 'CiSmokeFeature'], { cwd: tmpRepo }).toString().trim();
  assert.match(secondRun, /^exists:/);

  fs.rmSync(tmpRepo, { recursive: true, force: true });
});
```

**Why:** `scaffold.sh` has real branching logic (PascalCase→kebab-case,
package-root detection, created-vs-exists) that's never been exercised
automatically; running it against the real toolkit repo would pollute it
with a stray `specs/` directory, so it needs an isolated fixture repo.

**Files:**
- Create: `tests/scaffold.test.mjs`

**Gotchas:**
- Must `git init` the temp dir first — `scaffold.sh` calls `git rev-parse
  --show-toplevel`, and without it the script would resolve to (and write
  into) the real checked-out toolkit repo.
- No commit is needed in the temp repo — `scaffold.sh` already falls back to
  `no-git` for the commit field via `2>/dev/null || echo "no-git"` when
  `git rev-parse --short HEAD` fails on a repo with zero commits.
- The temp repo has no `package.json`/`Cargo.toml`/etc., so
  `detect_spec_base` falls through to `$REPO_ROOT` (the temp dir itself) —
  same as this toolkit's own repo root today.

**Dependencies:** None

---

### Task 4: Plugin manifest validity test

**What:** Create `tests/plugin-manifests.test.mjs` — walks the repo for
every `plugin.json`, parses each as JSON (fails the test on invalid JSON),
and asserts required fields; separately validates
`.claude-plugin/marketplace.json`.

```js
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
  const files = findFiles(REPO_ROOT, 'plugin.json');
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
```

**Why:** Directly enforces two invariants already stated in this repo's own
`CLAUDE.md` ("`skills` path in plugin.json must start with `./`") that
currently have no automated check — a typo in any of the 12 `plugin.json`
files or the marketplace registry would otherwise only surface when a user
tries to install and it fails.

**Files:**
- Create: `tests/plugin-manifests.test.mjs`

**Gotchas:**
- This walks the whole repo tree for files named `plugin.json` — it will
  pick up both the root `.codex-plugin/plugin.json` and every
  `dist/plugins/*/.claude-plugin/plugin.json` /
  `dist/plugins/*/.codex-plugin/plugin.json`; don't scope it to `dist/`
  only.

**Dependencies:** None

---

### Task 5: dist/skills mirror-drift test

**What:** Create `tests/dist-mirror.test.mjs` — re-implements
`scripts/sync.sh`'s own target-detection logic (condux-bundle path vs.
standalone-plugin path, skip if neither exists) and, for every skill that
does have a dist target, asserts the file list and file contents are
byte-identical between `skills/<name>/` and its dist mirror.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const DIST_DIR = path.join(REPO_ROOT, 'dist', 'plugins');

function listFilesRelative(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFilesRelative(full, base, out);
    else out.push(path.relative(base, full));
  }
  return out.sort();
}

test('every skill with a dist target is a verbatim mirror of its skills/ source', () => {
  const names = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const mismatches = [];
  let checked = 0;

  for (const name of names) {
    const src = path.join(SKILLS_DIR, name);
    const conduxDst = path.join(DIST_DIR, 'condux', 'skills', 'condux', name);
    const standaloneDst = path.join(DIST_DIR, name, 'skills', name);
    const dst = fs.existsSync(conduxDst) ? conduxDst : fs.existsSync(standaloneDst) ? standaloneDst : null;

    if (!dst) continue; // matches scripts/sync.sh's own SKIP behavior for un-scaffolded skills

    checked++;
    const srcFiles = listFilesRelative(src);
    const dstFiles = listFilesRelative(dst);

    if (JSON.stringify(srcFiles) !== JSON.stringify(dstFiles)) {
      mismatches.push(name + ': file lists differ\n  src: ' + srcFiles.join(', ') + '\n  dst: ' + dstFiles.join(', '));
      continue;
    }
    for (const rel of srcFiles) {
      const a = fs.readFileSync(path.join(src, rel));
      const b = fs.readFileSync(path.join(dst, rel));
      if (!a.equals(b)) mismatches.push(name + ': ' + rel + ' differs from its dist mirror');
    }
  }

  assert.ok(checked > 0, 'expected at least one skill with a dist target to check');
  assert.deepEqual(mismatches, [], 'dist/ has drifted from skills/ — run scripts/sync.sh:\n' + mismatches.join('\n'));
});
```

**Why:** This repo's own `CLAUDE.md` states "`dist/` is a verbatim mirror of
`skills/` — never diverge them," but nothing currently checks it — it
depends entirely on the author remembering to run `scripts/sync.sh` (or a
local, non-committed pre-commit hook) before every commit.

**Files:**
- Create: `tests/dist-mirror.test.mjs`

**Gotchas:**
- Mirrors `scripts/sync.sh`'s own two-target detection order (condux-bundle
  path checked before standalone-plugin path) — keep both in sync if
  `sync.sh`'s detection logic ever changes.
- A skill directory under `skills/` with no dist target at all (newly
  scaffolded, not yet published) is intentionally skipped, not failed —
  same as `sync.sh`'s own `SKIP` behavior. The test still asserts at least
  one skill *was* checked, so an empty/no-op run can't pass silently.

**Dependencies:** None

---

### Task 6: `.github/workflows/ci.yml`

**What:** Create the GitHub Actions workflow running on push to `main` and
on every pull request: syntax-check every `.js` file under `skills/`, then
run the full `node:test` suite.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Syntax-check reference scripts
        run: find skills -name '*.js' -print0 | xargs -0 -n1 node --check
      - name: Run test suite
        run: node --test
```

**Why:** Ties Tasks 1-5 into an actual gate that runs on every push/PR
instead of only being runnable locally.

**Files:**
- Create: `.github/workflows/ci.yml`

**Gotchas:**
- `node --test tests/` (directory-argument form) fails on Node 24 with
  `Cannot find module '.../tests'` — verified locally. Bare `node --test`
  (no arguments) auto-discovers `**/*.test.{js,mjs,cjs}` from the current
  directory and is what actually works; use that form, not the directory
  path.
- Pin `node-version: '20'` explicitly rather than `'lts/*'`, since the
  mirror-drift test's recursive directory walk and global `fetch` usage are
  both assumed stable at 20, not verified further back.
- Run the full suite locally first (`node --test`) before relying on this
  workflow to catch the first real failure — none of Tasks 1-5 have been
  exercised in CI until this task's workflow actually runs.

**Dependencies:** Task 1, Task 2, Task 3, Task 4, Task 5
