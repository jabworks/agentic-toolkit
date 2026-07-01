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
