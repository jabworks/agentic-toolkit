#!/usr/bin/env node
// Local option-picker surface for /brainstorm visual mockups. Serves an
// agent-authored, self-contained HTML mockup, injects click-to-select wiring,
// and delivers the user's pick back to the agent over a long-poll. No npm deps.
// Binds 127.0.0.1 only. One-shot: the server exits once a choice is delivered.
//
// Usage:
//   node choice-server.js <mockup.html> [--multi] [--port 7788]
//
//   The agent tags each option element in the mockup with data-choice="<label>",
//   launches this server in the background, then BLOCKS on
//   GET /api/choice (a long-poll) which resolves when the user picks:
//     {"choices":["Option B"],"note":"<free text>","submittedAt":"<iso>"}
//
//   Single mode (default): clicking an option submits it immediately.
//   Multi mode (--multi):   clicking toggles; a bottom bar sends the set + note.
//
//   Default port 7788 (distinct from plan-review's 7777) so a brainstorm picker
//   and a plan-review steer server can run at once. Diagnostics go to stderr.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const log = console.error; // stdout stays clean; the agent talks to us over HTTP

const MULTI = process.argv.includes('--multi');
const portArg = (function () { const i = process.argv.indexOf('--port'); return i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN; })();
const PORT = !isNaN(portArg) ? portArg : 7788;

let choiceWaiter = null;   // pending GET /api/choice response
let pendingChoice = null;  // choice that arrived before the agent polled
let delivered = false;     // one-shot guard

let mockupFile;

function fail(msg) { console.error('  choice-picker: ' + msg); process.exit(1); }

function readMockup() {
  try { return fs.readFileSync(mockupFile, 'utf8'); } catch (e) { return ''; }
}

// Injected client: wires [data-choice] elements to POST /api/choice. Kept
// dependency-free and defensive so it works inside whatever HTML the agent wrote.
function injectedScript() {
  return `
<style>
  #__vc_banner{position:fixed;top:0;left:0;right:0;z-index:99998;font:600 13px/1.4 system-ui,sans-serif;
    background:#1f2937;color:#fff;padding:10px 16px;text-align:center;box-shadow:0 1px 6px rgba(0,0,0,.25)}
  body{padding-top:44px}
  [data-choice]{cursor:pointer;transition:outline-color .12s,box-shadow .12s;outline:2px solid transparent;outline-offset:2px}
  [data-choice]:hover{outline-color:#93c5fd}
  [data-choice].__vc_sel{outline-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.18)}
  #__vc_bar{position:fixed;bottom:0;left:0;right:0;z-index:99998;display:none;gap:10px;align-items:center;
    background:#111827;color:#fff;padding:12px 16px;box-shadow:0 -1px 8px rgba(0,0,0,.3);font:14px system-ui,sans-serif}
  #__vc_bar.__vc_show{display:flex}
  #__vc_note{flex:1;padding:8px 10px;border-radius:6px;border:1px solid #374151;background:#1f2937;color:#fff;font:14px system-ui,sans-serif}
  #__vc_send{padding:8px 16px;border:0;border-radius:6px;background:#2563eb;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer}
  #__vc_send:disabled{background:#374151;cursor:default}
  #__vc_done{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;
    background:rgba(17,24,39,.92);color:#fff;font:600 18px system-ui,sans-serif;text-align:center;padding:24px}
  #__vc_done.__vc_show{display:flex}
</style>
<div id="__vc_banner"></div>
<div id="__vc_bar"><span id="__vc_count">0 selected</span>
  <input id="__vc_note" placeholder="Optional note (e.g. B, but with A's header)…" />
  <button id="__vc_send" disabled>Send selection →</button></div>
<div id="__vc_done">✓ Sent to the agent — you can close this tab.</div>
<script>
(function(){
  var MULTI = ${MULTI ? 'true' : 'false'};
  var opts = [].slice.call(document.querySelectorAll('[data-choice]'));
  var banner = document.getElementById('__vc_banner');
  var done = document.getElementById('__vc_done');
  if(!opts.length){ banner.textContent = 'No options found — tag each option element with data-choice="…".'; return; }
  banner.textContent = MULTI
    ? 'Click options to select, add an optional note, then Send. Your pick goes back to the agent.'
    : 'Click an option to send your choice to the agent.';
  var locked = false;
  function post(payload){
    if(locked) return; locked = true;
    fetch('/api/choice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(){ done.classList.add('__vc_show'); })
      .catch(function(){ locked = false; alert('Could not reach the picker server.'); });
  }
  if(!MULTI){
    opts.forEach(function(el){
      el.addEventListener('click', function(){ post({choices:[el.getAttribute('data-choice')]}); });
    });
    return;
  }
  var bar = document.getElementById('__vc_bar');
  var count = document.getElementById('__vc_count');
  var note = document.getElementById('__vc_note');
  var send = document.getElementById('__vc_send');
  var sel = [];
  function refresh(){
    count.textContent = sel.length + ' selected';
    send.disabled = sel.length === 0;
    bar.classList.toggle('__vc_show', true);
  }
  opts.forEach(function(el){
    el.addEventListener('click', function(){
      var label = el.getAttribute('data-choice');
      var i = sel.indexOf(label);
      if(i >= 0){ sel.splice(i,1); el.classList.remove('__vc_sel'); }
      else { sel.push(label); el.classList.add('__vc_sel'); }
      refresh();
    });
  });
  send.addEventListener('click', function(){ if(sel.length) post({choices:sel, note:note.value.trim()}); });
})();
</script>`;
}

function serveMockup(res) {
  let html = readMockup();
  const inject = injectedScript();
  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, inject + '\n</body>');
  else html += inject;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// Deliver a choice to the agent's long-poll, then shut down (one-shot).
function deliver(payload) {
  if (delivered) return;
  delivered = true;
  if (choiceWaiter) {
    try { choiceWaiter.writeHead(200, { 'Content-Type': 'application/json' }); choiceWaiter.end(JSON.stringify(payload)); } catch (e) { /* client gone */ }
    choiceWaiter = null;
  } else {
    pendingChoice = payload; // agent hasn't polled yet — the next GET picks it up
    delivered = false;       // not truly delivered until a GET drains it
    return;
  }
  log('\n  Choice: ' + JSON.stringify(payload.choices) + (payload.note ? '  note: ' + payload.note : '') + ' — delivered to agent. Stopping.\n');
  setTimeout(function () { process.exit(0); }, 300);
}

function handler(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname;

  if (req.method === 'GET' && p === '/') return serveMockup(res);

  if (req.method === 'GET' && p === '/api/choice') {
    if (pendingChoice) { const c = pendingChoice; pendingChoice = null; delivered = true; sendJson(res, 200, c); log('\n  Choice delivered to agent. Stopping.\n'); return setTimeout(function () { process.exit(0); }, 300); }
    res.setTimeout(0); // a human may take minutes — don't close the idle socket
    choiceWaiter = res;
    req.on('close', function () { if (choiceWaiter === res) choiceWaiter = null; });
    return;
  }

  if (req.method === 'POST' && p === '/api/choice') {
    let body = '';
    req.on('data', function (c) { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', function () {
      try {
        const data = JSON.parse(body);
        const choices = Array.isArray(data.choices) ? data.choices : (data.choice ? [data.choice] : []);
        if (!choices.length) return sendJson(res, 400, { error: 'no choices' });
        sendJson(res, 200, { status: 'received' });
        deliver({ choices: choices, note: (data.note || '').trim(), submittedAt: new Date().toISOString() });
      } catch (e) {
        sendJson(res, 400, { error: 'invalid JSON' });
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
}

let server;
function listen() {
  server = http.createServer(handler);
  server.on('error', function (e) {
    if (e && e.code === 'EADDRINUSE') fail('port ' + PORT + ' is in use — pass a free --port <n>.');
    fail(String((e && e.message) || e));
  });
  server.listen(PORT, '127.0.0.1', function () {
    const url = 'http://127.0.0.1:' + server.address().port;
    log('\n  Option picker  →  ' + url + (MULTI ? '   (multi-select)' : ''));
    log('  Mockup         →  ' + mockupFile);
    log('  Choice         →  GET ' + url + '/api/choice (long-poll)');
    log('\n  Pick in the browser; the choice returns to the agent. Ctrl+C to stop.\n');
    const opener = process.platform === 'darwin' ? 'open' :
                   process.platform === 'win32' ? 'start ""' : 'xdg-open';
    exec(opener + ' ' + url, function () {});
  });
}

process.on('SIGINT', function () {
  log('\n  Option picker stopped.\n');
  if (server) server.close(function () { process.exit(0); }); else process.exit(0);
});

// First non-flag arg is the mockup file (skip --port's value).
const args = process.argv.slice(2);
let file = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port') { i++; continue; }
  if (args[i][0] !== '-') { file = args[i]; break; }
}
if (!file || !fs.existsSync(file)) fail('mockup file not found — pass a self-contained HTML file path.');
mockupFile = path.resolve(file);
listen();
