#!/usr/bin/env node
// Local plan-review surface. Renders a plan in the browser, collects inline
// annotations + an approval decision. No npm deps. Binds 127.0.0.1 only.
//
// Two modes:
//
//   Manual:  node annotate-server.js <plan-file.md>
//            Serves the plan, writes the decision to <plan-file>.feedback.md,
//            stays running until Ctrl+C.
//
//   Hook:    node annotate-server.js --hook
//            Reads a Claude Code PreToolUse(ExitPlanMode) payload on stdin,
//            renders tool_input.plan, blocks until you decide, then prints a
//            hookSpecificOutput JSON decision to stdout and exits:
//              Approve          -> permissionDecision "allow"
//              Request Revisions -> permissionDecision "deny" (reason = feedback)
//              Deny             -> permissionDecision "deny" (reason = feedback)
//            In hook mode all diagnostics go to stderr so stdout stays clean JSON.
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

const HOOK_MODE = process.argv.includes('--hook');
const log = HOOK_MODE ? console.error : console.log; // keep stdout clean for hooks
const sseClients = new Set();

let planFile;       // path to the markdown being reviewed
let feedbackFile;   // manual mode only

function fail(msg) { console.error('  plan-review: ' + msg); process.exit(1); }

function start(planText, sourcePath) {
  if (sourcePath) {
    planFile = path.resolve(sourcePath);
    feedbackFile = planFile + '.feedback.md';
  } else {
    // hook mode: persist the plan to a temp file so render + live-reload work uniformly
    planFile = path.join(os.tmpdir(), 'plan-review-' + process.pid + '.md');
    fs.writeFileSync(planFile, planText || '# (empty plan)\n');
  }
  watchPlan();
  listen();
}

function readPlan() {
  try { return fs.readFileSync(planFile, 'utf8'); } catch (e) { return ''; }
}

function watchPlan() {
  try {
    fs.watch(path.dirname(planFile), {}, function (_, filename) {
      if (filename && path.basename(planFile) === filename) {
        sseClients.forEach(function (res) { try { res.write('data: change\n\n'); } catch (e) {} });
      }
    });
  } catch (e) { /* live reload simply won't fire */ }
}

function feedbackMarkdown(decision, thread) {
  const lines = ['# Plan Review Feedback', '',
    '- **Decision:** ' + decision,
    '- **Submitted:** ' + new Date().toISOString(), ''];
  const notes = (thread || []).filter(function (t) { return t.kind === 'note'; });
  const chat = (thread || []).filter(function (t) { return t.kind !== 'note'; });
  if (notes.length) {
    lines.push('## Inline notes', '');
    notes.forEach(function (t, i) {
      const quote = (t.quote || '').trim();
      const anchor = quote ? '> ' + quote.replace(/\n+/g, ' ') + '\n\n' : '';
      lines.push((i + 1) + '. ' + anchor + '   ' + (t.text || '').trim());
    });
    lines.push('');
  }
  if (chat.length) {
    lines.push('## Messages', '');
    chat.forEach(function (t) { lines.push('- ' + (t.text || '').trim()); });
    lines.push('');
  }
  if (!notes.length && !chat.length) lines.push('_No notes or messages._', '');
  return lines.join('\n');
}

// Decide what to do once the user submits in the browser.
function resolveDecision(decision, thread) {
  const md = feedbackMarkdown(decision, thread);

  if (HOOK_MODE) {
    const out = { hookSpecificOutput: { hookEventName: 'PreToolUse' } };
    if (decision === 'Approve') {
      out.hookSpecificOutput.permissionDecision = 'allow';
      if (thread && thread.length) {
        out.hookSpecificOutput.additionalContext =
          'Plan approved with notes. Address these while implementing:\n\n' + md;
      }
    } else {
      out.hookSpecificOutput.permissionDecision = 'deny';
      out.hookSpecificOutput.permissionDecisionReason =
        'Plan review: ' + decision + '. Revise the plan to address:\n\n' + md;
    }
    process.stdout.write(JSON.stringify(out));
    log('\n  Decision: ' + decision + ' — returned to agent. Stopping.\n');
    setTimeout(function () { process.exit(0); }, 150);
  } else {
    fs.writeFileSync(feedbackFile, md);
    log('\n[PLAN-REVIEW FEEDBACK -> ' + feedbackFile + ']\n' + md + '\n');
  }
}

const TEMPLATE = fs.readFileSync(path.join(__dirname, 'plan-review-template.html'), 'utf8');

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function handler(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname;

  if (req.method === 'GET' && p === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(TEMPLATE.replace(/\{\{PLAN_NAME\}\}/g, path.basename(planFile)));
  }
  if (req.method === 'GET' && p === '/api/plan') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(readPlan());
  }
  if (req.method === 'GET' && p === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive',
    });
    res.write(':\n\n');
    sseClients.add(res);
    req.on('close', function () { sseClients.delete(res); });
    return;
  }
  if (req.method === 'POST' && p === '/api/feedback') {
    let body = '';
    req.on('data', function (c) { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', function () {
      try {
        const data = JSON.parse(body);
        sendJson(res, 200, { status: 'received', mode: HOOK_MODE ? 'hook' : 'manual', file: feedbackFile });
        resolveDecision(data.decision || 'Request Revisions', data.thread || []);
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
  server.listen(0, '127.0.0.1', function () {
    const url = 'http://127.0.0.1:' + server.address().port;
    log('\n  Plan review   →  ' + url);
    log('  Plan          →  ' + planFile);
    if (!HOOK_MODE) log('  Feedback      →  ' + feedbackFile);
    log('\n  Annotate the plan, then submit your decision. Ctrl+C to stop.\n');
    const opener = process.platform === 'darwin' ? 'open' :
                   process.platform === 'win32' ? 'start ""' : 'xdg-open';
    exec(opener + ' ' + url, function () {});
  });
}

process.on('SIGINT', function () {
  log('\n  Plan review stopped.\n');
  sseClients.forEach(function (res) { try { res.end(); } catch (e) {} });
  if (server) server.close(function () { process.exit(0); }); else process.exit(0);
});

if (HOOK_MODE) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (c) { input += c; });
  process.stdin.on('end', function () {
    let plan = '';
    try {
      const payload = JSON.parse(input || '{}');
      const ti = payload.tool_input || {};
      plan = ti.plan || ti.message || payload.plan || '';
    } catch (e) { /* fall through with empty plan */ }
    start(plan, null);
  });
} else {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) fail('plan file not found — pass a markdown file path, or use --hook.');
  start(null, file);
}
