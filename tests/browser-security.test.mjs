import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { spawnServer, stopServer } from './helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(__dirname, '../skills/plan-review/references/plan-review-template.html');
const SERVER = path.resolve(__dirname, '../skills/plan-review/references/annotate-server.js');

test('plan-review sanitizes dangerous Markdown link targets and attributes', () => {
  const html = fs.readFileSync(TEMPLATE, 'utf8');
  const start = html.indexOf('function esc(s)');
  const end = html.indexOf('function renderBlocks(md)');
  assert.ok(start >= 0 && end > start, 'Markdown inline renderer not found');

  const context = {};
  vm.runInNewContext(
    html.slice(start, end) + `
      result = {
        scheme: inline('[bad](javascript:evil)'),
        attribute: inline('[bad](" autofocus onfocus="evil)')
      };
    `,
    context,
  );

  assert.match(context.result.scheme, /href="#"/);
  assert.doesNotMatch(context.result.attribute, /href=""\s+autofocus/i);
  assert.match(context.result.attribute, /&quot;/);
});

test('plan-review escapes the reviewed filename in its HTML shell', async () => {
  const fixture = path.join(os.tmpdir(), 'ci-plan-review-<img onerror=evil>.md');
  fs.writeFileSync(fixture, '# Safe content\n');
  const { proc, port } = await spawnServer(
    SERVER,
    [fixture, '--no-open'],
    /Plan review\s+→\s+http:\/\/127\.0\.0\.1:(\d+)/,
  );
  try {
    const html = await (await fetch('http://127.0.0.1:' + port + '/')).text();
    assert.doesNotMatch(html, /<title>[^<]*<img/i);
    assert.match(html, /&lt;img onerror=evil&gt;/);
  } finally {
    await stopServer(proc);
    fs.rmSync(fixture, { force: true });
  }
});
