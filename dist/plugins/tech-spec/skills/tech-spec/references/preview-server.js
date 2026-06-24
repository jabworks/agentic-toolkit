#!/usr/bin/env node
// Usage: node preview-server.js <spec-dir>
// Serves a live HTML preview of a spec folder. No npm deps. Ctrl+C to stop.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const specDir = path.resolve(process.argv[2] || '.');
const sseClients = new Set();

function getMdFiles() {
  try {
    return fs.readdirSync(specDir)
      .filter(function(f) { return f.endsWith('.md'); })
      .sort(function(a, b) {
        if (a === 'index.md') return -1;
        if (b === 'index.md') return 1;
        return a.localeCompare(b);
      });
  } catch (e) {
    return [];
  }
}

fs.watch(specDir, {}, function(_, filename) {
  if (filename && filename.endsWith('.md')) {
    sseClients.forEach(function(res) {
      try { res.write('data: ' + filename + '\n\n'); } catch (e) {}
    });
  }
});

const HTML = fs.readFileSync(path.join(__dirname, 'preview-template.html'), 'utf8');

const server = http.createServer(function(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  if (p === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(HTML);
  }

  if (p === '/api/files') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(getMdFiles()));
  }

  if (p.startsWith('/api/file/')) {
    const name = decodeURIComponent(p.slice('/api/file/'.length));
    const filepath = path.join(specDir, path.basename(name));
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(content);
    } catch (e) {
      res.writeHead(404);
      return res.end('Not found');
    }
  }

  if (p === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(':\n\n');
    sseClients.add(res);
    req.on('close', function() { sseClients.delete(res); });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(0, '127.0.0.1', function() {
  const port = server.address().port;
  const url = 'http://localhost:' + port;
  console.log('\n  Spec preview  →  ' + url);
  console.log('  Watching      →  ' + specDir);
  console.log('\n  Edit spec files and the preview updates live.');
  console.log('  Ctrl+C to stop.\n');
  const opener = process.platform === 'darwin' ? 'open' :
                 process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(opener + ' ' + url, function() {});
});

process.on('SIGINT', function() {
  console.log('\n  Preview stopped.\n');
  sseClients.forEach(function(res) { try { res.end(); } catch (e) {} });
  server.close(function() { process.exit(0); });
});
