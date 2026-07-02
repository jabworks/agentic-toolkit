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

test('scaffold.sh: acronym-safe slugs and root-mirrored monorepo layout', () => {
  // realpath: on macOS mkdtemp returns /tmp/… but git resolves /private/tmp/…
  const tmpRepo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ci-scaffold-mono-')));
  execFileSync('git', ['init', '-q'], { cwd: tmpRepo });
  const pkgDir = path.join(tmpRepo, 'apps', 'web');
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(path.join(pkgDir, 'package.json'), '{}');

  // Scaffolding from inside a package mirrors its path under <git-root>/specs/
  const pkgRun = execFileSync('bash', [SCRIPT, 'UIFormControls'], { cwd: pkgDir }).toString().trim();
  assert.equal(
    pkgRun.match(/^created:(\S+) /)[1],
    path.join(tmpRepo, 'specs', 'apps', 'web', 'ui-form-controls')
  );

  // Scaffolding from the repo root lands directly under specs/
  const rootRun = execFileSync('bash', [SCRIPT, 'AOGrcIntegration'], { cwd: tmpRepo }).toString().trim();
  assert.equal(
    rootRun.match(/^created:(\S+) /)[1],
    path.join(tmpRepo, 'specs', 'ao-grc-integration')
  );

  fs.rmSync(tmpRepo, { recursive: true, force: true });
});
