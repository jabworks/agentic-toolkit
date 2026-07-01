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
