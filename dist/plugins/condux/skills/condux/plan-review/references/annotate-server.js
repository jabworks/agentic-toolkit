#!/usr/bin/env node
// Local plan-review surface. Renders a plan in the browser, collects inline
// annotations + an approval decision. No npm deps. Binds 127.0.0.1 only.
//
// Three modes:
//
//   Manual:  node annotate-server.js <plan-file.md>
//            Serves the plan, writes the decision to <plan-file>.feedback.md,
//            stays running until Ctrl+C.
//
//   Hook:    node annotate-server.js --hook   (Claude Code)
//            Reads a Claude Code PreToolUse(ExitPlanMode) payload on stdin,
//            renders tool_input.plan, blocks until you decide, then prints a
//            hookSpecificOutput JSON decision to stdout and exits:
//              Approve          -> permissionDecision "allow"
//              Request Revisions -> permissionDecision "deny" (reason = feedback)
//              Deny             -> permissionDecision "deny" (reason = feedback)
//
//   Codex:   node annotate-server.js --codex-stop   (Codex Stop hook)
//            Reads a Codex Stop payload on stdin. Only reviews planning turns
//            (permission_mode === 'plan'); otherwise emits "{}" and exits so the
//            turn completes untouched. The plan is taken from last_assistant_message
//            (falling back to transcript_path). On decide it prints a Stop result:
//              Approve          -> "{}"  (turn completes, plan accepted)
//              Request Revisions -> {"decision":"block","reason":<feedback>}  (Codex revises)
//              Deny             -> {"decision":"block","reason":<feedback>}  (Codex revises)
//
//            In hook/codex modes all diagnostics go to stderr so stdout stays clean JSON.
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

const HOOK_MODE = process.argv.includes('--hook');
const CODEX_STOP_MODE = process.argv.includes('--codex-stop');
const STDOUT_JSON = HOOK_MODE || CODEX_STOP_MODE; // these modes emit JSON on stdout
const log = STDOUT_JSON ? console.error : console.log; // keep stdout clean for hooks
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
      const cat = t.cat ? '**[' + t.cat + ']** ' : '';
      lines.push((i + 1) + '. ' + cat + anchor + '   ' + (t.text || '').trim());
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
  } else if (CODEX_STOP_MODE) {
    // Codex Stop: "block" continues the turn with `reason` as a new prompt; an
    // empty object lets the turn complete (= approve). Codex has no approve-with-
    // notes channel, so approval simply completes; the notes are still logged.
    let out;
    if (decision === 'Approve') {
      out = {};
    } else {
      out = {
        decision: 'block',
        reason: 'Plan review: ' + decision + '. Revise the plan to address:\n\n' + md,
      };
    }
    process.stdout.write(JSON.stringify(out));
    log('\n  Decision: ' + decision + ' — returned to Codex. Stopping.\n');
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
        sendJson(res, 200, { status: 'received', mode: CODEX_STOP_MODE ? 'codex' : HOOK_MODE ? 'hook' : 'manual', file: feedbackFile });
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
    if (!STDOUT_JSON) log('  Feedback      →  ' + feedbackFile);
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

// Best-effort: pull the latest assistant message text out of a Codex transcript.
// The transcript format is explicitly not a stable interface, so this is wrapped
// defensively and only used when last_assistant_message is absent.
function readCodexTranscriptPlan(transcriptPath) {
  try {
    const raw = fs.readFileSync(transcriptPath, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      let entry;
      try { entry = JSON.parse(lines[i]); } catch (e) { continue; }
      const role = entry.role || (entry.message && entry.message.role);
      if (role !== 'assistant') continue;
      const content = (entry.message && entry.message.content) || entry.content;
      if (typeof content === 'string' && content.trim()) return content;
      if (Array.isArray(content)) {
        const text = content
          .map(function (c) { return typeof c === 'string' ? c : (c && c.text) || ''; })
          .join('').trim();
        if (text) return text;
      }
    }
  } catch (e) { /* fall through */ }
  return '';
}

function readStdinJSON(cb) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (c) { input += c; });
  process.stdin.on('end', function () {
    let payload = {};
    try { payload = JSON.parse(input || '{}'); } catch (e) { /* keep {} */ }
    cb(payload);
  });
}

if (HOOK_MODE) {
  readStdinJSON(function (payload) {
    const ti = payload.tool_input || {};
    const plan = ti.plan || ti.message || payload.plan || '';
    start(plan, null);
  });
} else if (CODEX_STOP_MODE) {
  readStdinJSON(function (payload) {
    // Only intercept planning turns — every other turn-stop must pass through
    // untouched, and Stop requires valid JSON on stdout when exiting 0.
    if (payload.permission_mode !== 'plan') { process.stdout.write('{}'); return process.exit(0); }
    let plan = (payload.last_assistant_message || '').trim();
    if (!plan && payload.transcript_path) plan = readCodexTranscriptPlan(payload.transcript_path).trim();
    if (!plan) { process.stdout.write('{}'); return process.exit(0); } // nothing to review
    start(plan, null);
  });
} else {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) fail('plan file not found — pass a markdown file path, or use --hook / --codex-stop.');
  start(null, file);
}
