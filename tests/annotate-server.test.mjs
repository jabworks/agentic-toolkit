import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnServer, stopServer } from './helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(__dirname, '../skills/plan-review/references/annotate-server.js');

// Wait for CONTENT, not for existence. The server writes the feedback file from
// another process; polling `existsSync` is satisfied the instant the file is
// created, so a read can land before the bytes and come back ''. The try/catch
// also keeps an expired deadline reporting as a failed match rather than an
// ENOENT stack trace.
async function readWhenReady(file, marker, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  let body = '';
  while (Date.now() < deadline) {
    try { body = fs.readFileSync(file, 'utf8'); } catch { /* not created yet */ }
    if (body.includes(marker)) return body;
    await new Promise((r) => setTimeout(r, 50));
  }
  return body;
}

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

    const feedback = await readWhenReady(feedbackFile, '**Decision:** Approve');
    assert.match(feedback, /\*\*Decision:\*\* Approve/);
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

    const feedback = await readWhenReady(feedbackFile, '**Decision:** Request Revisions');
    assert.match(feedback, /\*\*Decision:\*\* Request Revisions/);
    assert.match(feedback, /### `decisions\.md`/);
    assert.match(feedback, /fix this/);
  } finally {
    await stopServer(proc);
    fs.rmSync(specDir, { recursive: true, force: true });
  }
});

// Artifact serving (specs/artifact-serving): enumerated sibling .html/.svg
// files are served at their root-relative paths, script-dead. Membership in
// the walk is the only door — these tests assert the allowlist refuses, not
// that any path sanitization catches (none was built; see D2).
test('annotate-server directory mode: serves enumerated artifacts script-dead, 404s everything else', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-artifact-serving-'));
  const specDir = path.join(parent, 'spec');
  fs.mkdirSync(path.join(specDir, 'mockups'), { recursive: true });
  fs.mkdirSync(path.join(specDir, '.git'));
  fs.writeFileSync(path.join(specDir, 'index.md'), '# Spec\n');
  fs.writeFileSync(path.join(specDir, 'mockups', 'flow.html'), '<h1>flow</h1>');
  fs.writeFileSync(path.join(specDir, 'mockups', 'diagram.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  fs.writeFileSync(path.join(specDir, '.hidden.html'), 'hidden');
  fs.writeFileSync(path.join(specDir, 'a.feedback.html'), 'feedback-shaped');
  fs.writeFileSync(path.join(specDir, 'notes.txt'), 'text');
  fs.writeFileSync(path.join(parent, 'outside.html'), 'outside'); // above the served root

  const { proc, port } = await spawnServer(
    SERVER, [specDir, '--no-open'], /Plan review\s+→\s+http:\/\/127\.0\.0\.1:(\d+)/
  );
  try {
    const base = 'http://127.0.0.1:' + port;

    const htmlRes = await fetch(base + '/mockups/flow.html');
    assert.equal(htmlRes.status, 200);
    assert.match(htmlRes.headers.get('content-type'), /text\/html/);
    assert.equal(htmlRes.headers.get('content-security-policy'), 'sandbox');
    assert.equal(await htmlRes.text(), '<h1>flow</h1>');

    const svgRes = await fetch(base + '/mockups/diagram.svg');
    assert.equal(svgRes.status, 200);
    assert.equal(svgRes.headers.get('content-type'), 'image/svg+xml');
    assert.equal(svgRes.headers.get('content-security-policy'), 'sandbox');

    // Not members of the enumeration → the existing 404, unchanged
    for (const p of ['/.hidden.html', '/a.feedback.html', '/notes.txt', '/%2e%2e/outside.html']) {
      assert.equal((await fetch(base + p)).status, 404, p + ' must 404');
    }

    // fetch() normalizes ../ away, so send the raw traversal path over node:http
    const rawStatus = await new Promise((resolve, reject) => {
      const req = http.request(
        { host: '127.0.0.1', port, path: '/../outside.html', method: 'GET' },
        (res) => { res.resume(); resolve(res.statusCode); }
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(rawStatus, 404, 'raw ../ traversal must 404');

    // Enumeration is per request: a file written mid-review is servable
    fs.writeFileSync(path.join(specDir, 'late.html'), 'late');
    assert.equal((await fetch(base + '/late.html')).status, 200);

    // The doc manifest is untouched by artifact serving
    assert.deepEqual(await (await fetch(base + '/api/docs')).json(),
      { dir: true, docs: ['index.md'], noReject: true });
  } finally {
    await stopServer(proc);
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('annotate-server single-file mode: sibling artifacts served; {{MODE}} injected per mode', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-artifact-single-'));
  const plan = path.join(dir, 'plan.md');
  fs.writeFileSync(plan, '# Plan\n');
  fs.writeFileSync(path.join(dir, 'mock.html'), '<p>mock</p>');

  const manual = await spawnServer(
    SERVER, [plan, '--no-open'], /Plan review\s+→\s+http:\/\/127\.0\.0\.1:(\d+)/
  );
  try {
    const base = 'http://127.0.0.1:' + manual.port;
    const mockRes = await fetch(base + '/mock.html');
    assert.equal(mockRes.status, 200);
    assert.equal(mockRes.headers.get('content-security-policy'), 'sandbox');

    const page = await (await fetch(base + '/')).text();
    assert.match(page, /const SERVER_MODE='manual'/, 'manual mode must inject manual');
    assert.doesNotMatch(page, /\{\{MODE\}\}/, 'no unreplaced {{MODE}} may reach the page');
  } finally {
    await stopServer(manual.proc);
  }

  const steer = await spawnServer(
    SERVER, [plan, '--steer', '--no-open', '--port', '0'], /Plan review\s+→\s+http:\/\/127\.0\.0\.1:(\d+)/
  );
  try {
    const page = await (await fetch('http://127.0.0.1:' + steer.port + '/')).text();
    assert.match(page, /const SERVER_MODE='steer'/, 'steer mode must inject steer');
  } finally {
    await stopServer(steer.proc);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
