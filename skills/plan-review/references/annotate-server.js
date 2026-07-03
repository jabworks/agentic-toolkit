#!/usr/bin/env node
// Local plan-review surface. Renders a plan in the browser, collects inline
// annotations + an approval decision. No npm deps. Binds 127.0.0.1 only.
//
// Four modes:
//
//   Manual:  node annotate-server.js <plan-file.md | spec-dir>
//            Serves the plan, writes the decision to <plan-file>.feedback.md,
//            stays running until Ctrl+C. No agent attached.
//            Passing a DIRECTORY (e.g. a tech-spec folder) reviews every
//            top-level *.md in it: the UI lists the documents, notes are
//            tagged with their source file, and the decision lands in
//            <dir>/review.feedback.md grouped by file. Directory mode works
//            in manual and steer modes.
//
//   Steer:   node annotate-server.js <plan-file.md> --steer [--port 7777]
//            (agent-invoked) Long-lived review server for the iterative loop.
//            The agent launches it once in the background, then BLOCKS on
//            GET /api/decision (a long-poll) which resolves when you submit:
//              {"decision":"Approve|Request Revisions|Reject","feedback":<md>,"feedbackFile":<path>}
//            On "Request Revisions" the agent edits <plan-file.md> in place — the
//            SAME browser tab live-reloads over SSE — and re-polls. On Approve or
//            Reject the review is over and the server exits. Default port 7777 so
//            the agent knows the URL without discovery. Diagnostics go to stderr.
//
//   Hook:    node annotate-server.js --hook   (Claude Code)
//            Reads a Claude Code PreToolUse(ExitPlanMode) payload on stdin,
//            renders tool_input.plan, blocks until you decide, then prints a
//            hookSpecificOutput JSON decision to stdout and exits:
//              Approve          -> permissionDecision "allow"
//              Request Revisions -> permissionDecision "deny" (reason: revise this plan)
//              Reject           -> permissionDecision "deny" (reason: do not implement, reconsider)
//
//   Codex:   node annotate-server.js --codex-stop   (Codex Stop hook)
//            Reads a Codex Stop payload on stdin. Only reviews planning turns
//            (permission_mode === 'plan'); otherwise emits "{}" and exits so the
//            turn completes untouched. The plan is taken from last_assistant_message
//            (falling back to transcript_path). On decide it prints a Stop result:
//              Approve          -> "{}"  (turn completes, plan accepted)
//              Request Revisions -> {"decision":"block", reason: revise this plan}
//              Reject           -> {"decision":"block", reason: do not implement, reconsider}
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
const STEER_MODE = process.argv.includes('--steer');
const STDOUT_JSON = HOOK_MODE || CODEX_STOP_MODE || STEER_MODE; // these modes emit JSON on stdout
const log = STDOUT_JSON ? console.error : console.log; // keep stdout clean for hooks
const sseClients = new Set();

// Steer mode: the agent long-polls GET /api/decision; a decision resolves the
// waiter. Default to a fixed port so the agent knows the URL without discovery.
const portArg = (function () { const i = process.argv.indexOf('--port'); return i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN; })();
const PORT = !isNaN(portArg) ? portArg : (STEER_MODE ? 7777 : 0);
let decisionWaiter = null;   // pending GET /api/decision response (steer)
let pendingDecision = null;  // decision that arrived before a waiter (steer)

let planFile;       // path to the markdown file — or directory — being reviewed
let feedbackFile;   // manual/steer modes
let DIR_MODE = false; // reviewing a directory of markdown docs (spec folder)
let tmpPlanFile = null; // hook-mode temp plan we created and must remove on exit

// Remove the hook-mode temp plan file. Registered on 'exit' so it runs on every
// termination path (decision delivered, SIGINT, fail()) without repeating cleanup.
process.on('exit', function () {
  if (tmpPlanFile) { try { fs.unlinkSync(tmpPlanFile); } catch (e) { /* already gone */ } }
});

function fail(msg) { console.error('  plan-review: ' + msg); process.exit(1); }

function start(planText, sourcePath) {
  if (sourcePath) {
    planFile = path.resolve(sourcePath);
    DIR_MODE = fs.statSync(planFile).isDirectory();
    feedbackFile = DIR_MODE ? path.join(planFile, 'review.feedback.md') : planFile + '.feedback.md';
  } else {
    // hook mode: persist the plan to a temp file so render + live-reload work uniformly
    planFile = path.join(os.tmpdir(), 'plan-review-' + process.pid + '.md');
    fs.writeFileSync(planFile, planText || '# (empty plan)\n');
    tmpPlanFile = planFile; // mark for removal on exit
  }
  watchPlan();
  listen();
}

// Directory mode: the reviewable documents — every *.md in the tree, as POSIX
// relative paths. Ordering groups docs by folder (root first), index.md first
// within each folder. Skips dotfiles/dotdirs and the feedback file we write.
function listDocs() {
  const out = [];
  (function walk(rel) {
    let entries;
    try { entries = fs.readdirSync(path.join(planFile, rel || '.'), { withFileTypes: true }); }
    catch (e) { return; }
    const dirs = [], files = [];
    entries.forEach(function (e) {
      if (e.name[0] === '.') return;
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) dirs.push(r);
      else if (/\.md$/i.test(e.name) && !/\.feedback\.md$/i.test(e.name)) files.push(r);
    });
    files.sort(function (a, b) {
      const ab = path.basename(a), bb = path.basename(b);
      if (ab === 'index.md') return -1;
      if (bb === 'index.md') return 1;
      return ab.localeCompare(bb);
    });
    out.push.apply(out, files);
    dirs.sort().forEach(walk);
  })('');
  return out;
}

function readPlan(doc) {
  try {
    if (DIR_MODE) {
      if (listDocs().indexOf(doc) < 0) return ''; // only enumerated docs are servable
      return fs.readFileSync(path.join.apply(path, [planFile].concat(doc.split('/'))), 'utf8');
    }
    return fs.readFileSync(planFile, 'utf8');
  } catch (e) { return ''; }
}

function watchPlan() {
  try {
    if (DIR_MODE) {
      // Watch every folder that holds a doc (fs.watch recursion is unsupported
      // on Linux). Tag events with the doc's relative path so the client
      // reloads (and diffs) only the changed document.
      const dirs = new Set(['']);
      listDocs().forEach(function (d) { const i = d.lastIndexOf('/'); if (i >= 0) dirs.add(d.slice(0, i)); });
      dirs.forEach(function (rel) {
        try {
          fs.watch(path.join(planFile, rel || '.'), {}, function (_, filename) {
            if (!filename || !/\.md$/i.test(filename)) return;
            if (/\.feedback\.md$/i.test(filename) || filename[0] === '.') return;
            const relpath = rel ? rel + '/' + filename : filename;
            sseClients.forEach(function (res) { try { res.write('data: change:' + relpath + '\n\n'); } catch (e) {} });
          });
        } catch (e) {}
      });
      return;
    }
    fs.watch(path.dirname(planFile), {}, function (_, filename) {
      if (filename && path.basename(planFile) === filename) {
        sseClients.forEach(function (res) { try { res.write('data: change\n\n'); } catch (e) {} });
      }
    });
  } catch (e) { /* live reload simply won't fire */ }
}

// Files-tab support: resolve mentioned paths against the git root of the
// reviewed file (walking up to the filesystem root), so exists/new badges
// reflect the repo under review, not the server's CWD.
function gitRoot() {
  let dir = DIR_MODE ? planFile : path.dirname(planFile);
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return DIR_MODE ? planFile : path.dirname(planFile);
    dir = up;
  }
}

function feedbackMarkdown(decision, thread) {
  const lines = ['# Plan Review Feedback', '',
    '- **Decision:** ' + decision,
    '- **Submitted:** ' + new Date().toISOString(), ''];
  const notes = (thread || []).filter(function (t) { return t.kind === 'note'; });
  const chat = (thread || []).filter(function (t) { return t.kind !== 'note'; });
  if (notes.length) {
    lines.push('## Inline notes', '');
    // Directory mode tags each note with its source doc — group under a
    // per-file heading so the agent knows which spec file each note targets.
    const byDoc = {};
    notes.forEach(function (t) {
      const key = (t.doc || '');
      (byDoc[key] = byDoc[key] || []).push(t);
    });
    Object.keys(byDoc).sort().forEach(function (doc) {
      if (doc) lines.push('### `' + doc + '`', '');
      byDoc[doc].forEach(function (t, i) {
        const quote = (t.quote || '').trim();
        const anchor = quote ? '> ' + quote.replace(/\n+/g, ' ') + '\n\n' : '';
        const cat = t.cat ? '**[' + t.cat + ']** ' : '';
        lines.push((i + 1) + '. ' + cat + anchor + '   ' + (t.text || '').trim());
      });
      lines.push('');
    });
  }
  if (chat.length) {
    lines.push('## Messages', '');
    chat.forEach(function (t) { lines.push('- ' + (t.text || '').trim()); });
    lines.push('');
  }
  if (!notes.length && !chat.length) lines.push('_No notes or messages._', '');
  return lines.join('\n');
}

// The agent-facing reason string. "Reject" and "Request Revisions" are distinct
// intents: Reject = do not implement, reconsider the whole approach; Request
// Revisions = iterate on this plan and re-present it.
function feedbackReason(decision, md) {
  if (decision === 'Reject') {
    return 'Plan review: Rejected. Do NOT implement this plan. Step back and ' +
      'reconsider whether this feature or approach should be built at all — then ' +
      'propose a fundamentally different approach or stop. Context:\n\n' + md;
  }
  return 'Plan review: Request Revisions. Revise the plan to address the ' +
    'following, then re-present it:\n\n' + md;
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
      out.hookSpecificOutput.permissionDecisionReason = feedbackReason(decision, md);
    }
    process.stdout.write(JSON.stringify(out));
    log('\n  Decision: ' + decision + ' — returned to agent. Stopping.\n');
    setTimeout(function () { process.exit(0); }, 150);
  } else if (CODEX_STOP_MODE) {
    // Codex Stop: "block" continues the turn with `reason` as a new user prompt;
    // an empty object lets the turn complete. Codex has no approve-with-notes
    // channel, so we reuse the continuation prompt to carry the notes: a bare
    // Approve completes the turn, but Approve *with* notes continues it so the
    // agent actually receives them (mirrors Claude Code's additionalContext).
    let out;
    if (decision === 'Approve') {
      out = (thread && thread.length)
        ? { decision: 'block', reason: 'Plan approved with notes. Address these while implementing:\n\n' + md }
        : {};
    } else {
      out = { decision: 'block', reason: feedbackReason(decision, md) };
    }
    process.stdout.write(JSON.stringify(out));
    log('\n  Decision: ' + decision + ' — returned to Codex. Stopping.\n');
    setTimeout(function () { process.exit(0); }, 150);
  } else if (STEER_MODE) {
    // Agent-invoked, long-lived: deliver the decision to the agent's pending
    // GET /api/decision long-poll. The server stays up across rounds so the same
    // browser tab live-reloads when the agent revises the plan on disk. On a
    // terminal decision (Approve/Reject) the review is over, so we exit after the
    // response flushes; on "Request Revisions" we keep serving the next round.
    fs.writeFileSync(feedbackFile, md);
    const payload = { decision: decision, feedback: md, feedbackFile: feedbackFile };
    if (decisionWaiter) {
      try { decisionWaiter.writeHead(200, { 'Content-Type': 'application/json' }); decisionWaiter.end(JSON.stringify(payload)); } catch (e) { /* client gone */ }
      decisionWaiter = null;
    } else {
      pendingDecision = payload; // agent hasn't polled yet — hand it to the next GET
    }
    log('\n  Decision: ' + decision + ' — delivered to agent.\n');
    if (decision === 'Approve' || decision === 'Reject') {
      log('  Review concluded (' + decision + '). Stopping.\n');
      setTimeout(function () { process.exit(0); }, 400);
    }
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
    return res.end(readPlan(url.searchParams.get('doc') || ''));
  }
  if (req.method === 'GET' && p === '/api/docs') {
    // Document manifest. Single-file reviews report dir:false so the client
    // keeps the classic one-document layout.
    return sendJson(res, 200, DIR_MODE
      ? { dir: true, docs: listDocs() }
      : { dir: false, docs: [path.basename(planFile)] });
  }
  if (req.method === 'POST' && p === '/api/verify-paths') {
    // Files tab: check which mentioned paths exist in the repo under review.
    // Read-only existsSync against the git root; refuses escapes and absolutes.
    let body = '';
    req.on('data', function (c) { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', function () {
      try {
        const paths = (JSON.parse(body).paths || []).slice(0, 500);
        const root = gitRoot();
        const results = {};
        paths.forEach(function (rel) {
          if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || rel.split(/[\\/]/).indexOf('..') >= 0) return;
          results[rel] = fs.existsSync(path.join(root, rel));
        });
        sendJson(res, 200, { root: root, results: results });
      } catch (e) {
        sendJson(res, 400, { error: 'invalid JSON' });
      }
    });
    return;
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
  if (req.method === 'GET' && p === '/api/decision') {
    // Steer long-poll: block until a decision is submitted in the browser.
    if (pendingDecision) { const d = pendingDecision; pendingDecision = null; return sendJson(res, 200, d); }
    res.setTimeout(0); // a human may take minutes — don't let Node close the idle socket
    decisionWaiter = res;
    req.on('close', function () { if (decisionWaiter === res) decisionWaiter = null; });
    return;
  }
  if (req.method === 'POST' && p === '/api/feedback') {
    let body = '';
    req.on('data', function (c) { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', function () {
      try {
        const data = JSON.parse(body);
        sendJson(res, 200, { status: 'received', mode: CODEX_STOP_MODE ? 'codex' : HOOK_MODE ? 'hook' : STEER_MODE ? 'steer' : 'manual', file: feedbackFile });
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
  server.on('error', function (e) {
    if (e && e.code === 'EADDRINUSE') fail('port ' + PORT + ' is in use — pass a free --port <n>.');
    fail(String((e && e.message) || e));
  });
  server.listen(PORT, '127.0.0.1', function () {
    const url = 'http://127.0.0.1:' + server.address().port;
    log('\n  Plan review   →  ' + url);
    log('  Plan          →  ' + planFile);
    if (STEER_MODE) log('  Decisions     →  GET ' + url + '/api/decision (long-poll)');
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
  // Manual or steer: first non-flag arg is the plan file (skip --port's value).
  const args = process.argv.slice(2);
  let file = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port') { i++; continue; }
    if (args[i][0] !== '-') { file = args[i]; break; }
  }
  if (!file || !fs.existsSync(file)) fail('plan file not found — pass a markdown file or spec directory, or use --hook / --codex-stop.');
  if (fs.statSync(file).isDirectory()) {
    const docs = fs.readdirSync(file).filter(function (n) { return /\.md$/i.test(n) && !/\.feedback\.md$/i.test(n) && n[0] !== '.'; });
    if (!docs.length) fail('no markdown files in ' + file + ' — a spec directory needs at least one top-level *.md.');
  }
  start(null, file);
}
