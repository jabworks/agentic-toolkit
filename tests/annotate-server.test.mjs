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
    SERVER, [fixture, '--no-open'], /Plan review\s+→\s+http:\/\/127\.0\.0\.1:(\d+)/
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

test('annotate-server directory mode: doc manifest, per-doc content, grouped feedback', async () => {
  const specDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-spec-review-'));
  // Pin the git root to the fixture: gitRoot() walks upward from the reviewed
  // dir, and a stray .git anywhere above the tmpdir would hijack resolution.
  fs.mkdirSync(path.join(specDir, '.git'));
  fs.writeFileSync(path.join(specDir, 'index.md'), '# Sample Spec\n');
  fs.writeFileSync(path.join(specDir, 'decisions.md'), '# Decisions\n\nBody.\n');
  const feedbackFile = path.join(specDir, 'review.feedback.md');

  const { proc, port } = await spawnServer(
    SERVER, [specDir, '--no-open'], /Plan review\s+→\s+http:\/\/127\.0\.0\.1:(\d+)/
  );
  try {
    const base = 'http://127.0.0.1:' + port;

    const docsRes = await fetch(base + '/api/docs');
    assert.deepEqual(await docsRes.json(), { dir: true, docs: ['index.md', 'decisions.md'], noReject: true });

    const docRes = await fetch(base + '/api/plan?doc=decisions.md');
    assert.equal(await docRes.text(), fs.readFileSync(path.join(specDir, 'decisions.md'), 'utf8'));

    // Only enumerated docs are servable — traversal comes back empty
    const escapeRes = await fetch(base + '/api/plan?doc=' + encodeURIComponent('../outside.md'));
    assert.equal(await escapeRes.text(), '');

    // Files-tab path verification resolves against the reviewed dir (its .git pins the root)
    const verifyRes = await fetch(base + '/api/verify-paths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: ['index.md', 'nope/missing.ts', '../escape.md'] }),
    });
    const verify = await verifyRes.json();
    assert.equal(verify.results['index.md'], true);
    assert.equal(verify.results['nope/missing.ts'], false);
    assert.ok(!('../escape.md' in verify.results), 'escaping paths must be refused');

    const feedbackRes = await fetch(base + '/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'Request Revisions',
        thread: [{ kind: 'note', cat: 'Issue', quote: 'Body.', text: 'fix this', doc: 'decisions.md' }],
      }),
    });
    assert.equal((await feedbackRes.json()).status, 'received');

    const deadline = Date.now() + 2000;
    while (!fs.existsSync(feedbackFile) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }
    const feedback = fs.readFileSync(feedbackFile, 'utf8');
    assert.match(feedback, /\*\*Decision:\*\* Request Revisions/);
    assert.match(feedback, /### `decisions\.md`/);
    assert.match(feedback, /fix this/);
  } finally {
    await stopServer(proc);
    fs.rmSync(specDir, { recursive: true, force: true });
  }
});
