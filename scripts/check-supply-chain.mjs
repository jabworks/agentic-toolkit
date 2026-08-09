#!/usr/bin/env node
// Supply-chain gate for skill content.
//
// Every other check in tests/ is structural (frontmatter grammar, mirror
// parity, manifest validity) or behavioural (trigger-routing evals). None of
// them read a SKILL.md to see what it instructs an agent to *fetch or execute*
// — and this repo publishes to a public marketplace across three channels.
//
// We already enforced one rule of this family, for exactly one file:
// skill-invariants.test.mjs asserted that plan-review's HTML template makes no
// external network references. That was EXTERNAL-DOMAIN, hand-scoped to one
// artifact because that artifact was a known risk. This generalizes it and
// subsumes that test.
//
// Rule codes come from `vally lint` (@microsoft/vally, MIT), surveyed
// 2026-08-09 — see skills/toolkit-research-frontier/references/
// awesome-copilot-survey-2026-08-09.md. Where our semantics differ from
// vally's, the code is renamed rather than reused, so a shared name always
// means shared meaning:
//
//   vally SCRIPT-NO-SRI          → UNPINNED-REMOTE-REF (see below)
//   vally NON-BUILTIN-TOOL-REF   → not implemented (see below)
//
// SRI does not apply to a JSON fetch, and we have no canonical list of host
// builtin tools to check names against — a rule that cannot be right is worse
// than an absent one, so NON-BUILTIN-TOOL-REF is deliberately omitted and this
// comment is its record.
//
// Scans skills/ only. dist/ and packages/ are byte-parity mirrors already
// guarded by dist-mirror.test.mjs and opencode-dist.test.mjs, and keying the
// allow-list to source paths keeps one reason per fact.
//
// Dependency-free on purpose, matching scripts/check-frontmatter.mjs: it must
// run in a fresh clone with no node_modules.
//
// Usage:
//   node scripts/check-supply-chain.mjs            # check skills/
//   node scripts/check-supply-chain.mjs --json     # machine-readable findings

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ALLOWLIST_FILE = path.join(__dirname, 'supply-chain-allowlist.json');

const SCAN_ROOT = 'skills';
const PROSE_EXT = new Set(['.md']);
const SCRIPT_EXT = new Set(['.mjs', '.js', '.sh', '.py', '.ps1']);
// .html earns its place: a rendered template is where egress hides (script src,
// link href, remote fonts), and the one no-egress guarantee this repo had
// before this checker existed was a hand-scoped grep over exactly one of them.
const DATA_EXT = new Set(['.json', '.html', '.css']);

// Paths a skill may reference that this checker cannot resolve: placeholders the
// agent substitutes at runtime. Any token containing one is not a real path.
const PLACEHOLDER = /[<>${}*]/;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const URL_RE = /\bhttps?:\/\/[^\s"'`)>\]}\\]+/g;

// curl/wget fetching a real URL and piping it into a shell. Requires the URL:
// prose *about* the pattern ("curl … | sh") is documentation, not an
// instruction, and the survey file that named this rule tripped an earlier
// draft of it.
const PIPE_TO_SHELL_RE = /\b(?:curl|wget)\b[^\n|]*https?:\/\/[^\n|]*\|\s*(?:sudo\s+)?(?:ba|z|k)?sh\b/g;

// A markdown instruction to execute a script: `node foo/bar.mjs`, `bash x.sh`.
const INVOCATION_RE = /\b(?:node|bash|sh|python3?|pwsh)\s+([^\s`"']*\.(?:mjs|js|sh|py|ps1))/g;

// A backticked path that looks like a repo file rather than prose.
const PATH_TOKEN_RE = /`([^`\s]*\/[^`\s]*\.(?:md|mjs|js|sh|py|ps1|json|html))`/g;

// Mutable git refs. A remote fetch pinned to one of these can change under us
// with no diff, no review, and no way to tell after the fact.
const MUTABLE_REF_RE = /\/(?:main|master|latest|HEAD)\//;

// Loopback is not egress. Six of this repo's http:// references are local dev
// servers (discovery's choice server, plan-review's annotate server); flagging
// them would have made the rule useless on the day it landed.
export function isLoopback(host) {
  const lower = host.toLowerCase();

  // IPv6 authorities are bracketed when they carry a port ([::1]:8080) and bare
  // when they do not. Splitting on ":" to drop the port would reduce "::1" to
  // an empty string — so strip the brackets and handle IPv6 before the port.
  const bracketed = lower.match(/^\[([^\]]+)\]/);
  if (bracketed) return bracketed[1] === '::1';
  if (lower.includes('::') || lower.startsWith('0:0:0:0')) return lower === '::1' || /^0:0:0:0:0:0:0:1$/.test(lower);

  const name = lower.split(':')[0];

  return name === 'localhost' || name === '0.0.0.0' || name.startsWith('127.');
}

export function hostOf(url) {
  const afterScheme = url.split('//')[1] ?? '';

  return afterScheme.split('/')[0];
}

// ---------------------------------------------------------------------------
// Allow-list
// ---------------------------------------------------------------------------

// Every entry maps to a reason. An allow-list whose entries carry no reason
// decays into a mute suppression list — nobody can tell later whether an entry
// was reviewed or just silenced, so the schema makes the reason mandatory and
// checkAllowlist enforces it.
export function loadAllowlist(file = ALLOWLIST_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Returns problems with the allow-list itself: entries with no reason, and
// entries nothing uses any more. Stale entries are how an allow-list outlives
// the risk it documented.
export function checkAllowlist(allowlist, used) {
  const problems = [];

  for (const section of ['domains', 'scripts', 'remoteFetches']) {
    const entries = allowlist[section] ?? {};
    for (const [key, reason] of Object.entries(entries)) {
      if (typeof reason !== 'string' || reason.trim() === '') {
        problems.push(`${section}["${key}"] has no reason — say why it is allowed`);
      }
      if (!used[section].has(key)) {
        problems.push(`${section}["${key}"] is unused — nothing references it any more, remove it`);
      }
    }
  }

  return problems;
}

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

export function collectFiles(repoRoot = REPO_ROOT, root = SCAN_ROOT) {
  const dir = path.resolve(repoRoot, root);
  if (!fs.existsSync(dir)) return [];

  const files = [];
  for (const entry of fs.readdirSync(dir, { recursive: true })) {
    const rel = path.relative(repoRoot, path.join(dir, entry));
    if (rel.includes('node_modules')) continue;

    const abs = path.join(repoRoot, rel);
    if (!fs.statSync(abs).isFile()) continue;

    const ext = path.extname(rel);
    if (PROSE_EXT.has(ext) || SCRIPT_EXT.has(ext) || DATA_EXT.has(ext)) files.push(rel);
  }

  return files.sort();
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

// Line number (1-indexed) of a character offset.
function lineAt(src, index) {
  return src.slice(0, index).split('\n').length;
}

// True when a skill-relative citation resolves against the citing skill, the
// repo root, or any other skill — see the FILE-READ-ERROR comment for why the
// last one is not a loophole.
function resolvesAnywhere(token, skillDir) {
  if (fs.existsSync(path.resolve(skillDir, token))) return true;
  if (fs.existsSync(path.resolve(REPO_ROOT, token))) return true;

  const skillsDir = path.join(REPO_ROOT, SCAN_ROOT);

  return fs.readdirSync(skillsDir).some((name) => fs.existsSync(path.join(skillsDir, name, token)));
}

// Basenames of the repo's own build/maintenance scripts. A SKILL.md documenting
// `node scripts/sync.sh` is naming a real script this repo ships — it is just
// not under skills/, which is the only tree the inventory walks.
function repoScriptNames() {
  const dir = path.join(REPO_ROOT, 'scripts');
  if (!fs.existsSync(dir)) return new Set();

  return new Set(fs.readdirSync(dir).filter((f) => SCRIPT_EXT.has(path.extname(f))));
}

// Every rule runs over one file and appends to `findings`. `used` records which
// allow-list entries actually fired, so checkAllowlist can spot stale ones.
function checkFile(rel, src, allowlist, findings, used) {
  const ext = path.extname(rel);
  const isScript = SCRIPT_EXT.has(ext);
  const push = (code, index, detail) => findings.push({ code, file: rel, line: lineAt(src, index), detail });

  // EXTERNAL-DOMAIN / HTTP-NOT-HTTPS / UNPINNED-REMOTE-REF
  for (const m of src.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:]+$/, '');
    const host = hostOf(url);
    if (isLoopback(host)) continue;

    if (url.startsWith('http://')) push('HTTP-NOT-HTTPS', m.index, url);

    if (host in (allowlist.domains ?? {})) used.domains.add(host);
    else push('EXTERNAL-DOMAIN', m.index, `${host} is not an allowed domain (${url})`);

    // Only a script can *fetch*; a URL in prose is a citation. Pinning matters
    // for the fetch, not the citation.
    if (isScript && MUTABLE_REF_RE.test(url)) {
      if (url in (allowlist.remoteFetches ?? {})) used.remoteFetches.add(url);
      else push('UNPINNED-REMOTE-REF', m.index, `fetches a mutable ref: ${url}`);
    }
  }

  // PIPE-TO-SHELL
  for (const m of src.matchAll(PIPE_TO_SHELL_RE)) {
    push('PIPE-TO-SHELL', m.index, m[0].trim().slice(0, 80));
  }

  if (!PROSE_EXT.has(ext)) return;

  // INVOKES-SCRIPT — a documented invocation must name a script this repo
  // ships. Matched on basename because skills write runtime placeholders
  // (`node <skill-base>/server/docket.mjs`) that no static path can resolve.
  const declared = new Set(Object.keys(allowlist.scripts ?? {}).map((p) => path.basename(p)));
  for (const name of repoScriptNames()) declared.add(name);

  for (const m of src.matchAll(INVOCATION_RE)) {
    const base = path.basename(m[1]);
    if (declared.has(base)) continue;
    if (PLACEHOLDER.test(base)) continue;
    push('INVOKES-SCRIPT', m.index, `${m[1]} is not a declared script`);
  }

  // FILE-READ-ERROR — a progressive-disclosure link that resolves NOWHERE.
  //
  // Two narrowings, both forced by what the first drafts actually reported.
  //
  // Only `references/…` is checked. Checking every backticked path-like token
  // produced 43 findings, nearly all user-machine paths a repo checker has no
  // business resolving (`~/.codex/hooks.json`, `.claude/settings.json`,
  // `@jabworks/typescript-config/base.json`) — documentation about the reader's
  // machine, not claims about this tree.
  //
  // And a citation resolves against *any* skill, not just the citing one. That
  // draft reported 7 findings and all 7 were false: skills cite each other's
  // helpers by the same relative shape ("the memory skill's
  // `references/install-codex-hook.sh`", "see plan-review's
  // `references/annotate-server.js`") and state shipping patterns
  // ("skills self-protect with their own `references/package.json`"). The real
  // failure is a link that exists nowhere — that still fails, and it is the one
  // that strands an agent mid-task.
  const skillDir = path.join(REPO_ROOT, rel.split(path.sep).slice(0, 2).join(path.sep));
  for (const m of src.matchAll(PATH_TOKEN_RE)) {
    const token = m[1];
    if (PLACEHOLDER.test(token)) continue;
    if (!token.startsWith('references/')) continue;
    if (resolvesAnywhere(token, skillDir)) continue;

    push('FILE-READ-ERROR', m.index, `${token} resolves in no skill`);
  }
}

// SCRIPT-FILE — every executable this repo ships inside a skill must be
// declared. The rule is "declared", not "none": 28 scripts across 12 skills are
// the point of several of them.
function checkScriptInventory(files, allowlist, findings, used) {
  const declared = allowlist.scripts ?? {};

  for (const rel of files) {
    if (!SCRIPT_EXT.has(path.extname(rel))) continue;

    const key = rel.split(path.sep).join('/');
    if (key in declared) used.scripts.add(key);
    else findings.push({ code: 'SCRIPT-FILE', file: rel, line: 1, detail: 'bundled script is not declared in the allow-list' });
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function checkSupplyChain(repoRoot = REPO_ROOT, allowlist = loadAllowlist()) {
  const files = collectFiles(repoRoot);
  const findings = [];
  const used = { domains: new Set(), scripts: new Set(), remoteFetches: new Set() };

  for (const rel of files) {
    const src = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
    checkFile(rel, src, allowlist, findings, used);
  }
  checkScriptInventory(files, allowlist, findings, used);

  const allowlistProblems = checkAllowlist(allowlist, used);

  return { ok: findings.length === 0 && allowlistProblems.length === 0, files, findings, allowlistProblems };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  const result = checkSupplyChain();

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ findings: result.findings, allowlistProblems: result.allowlistProblems }, null, 2));
    return result.ok ? 0 : 1;
  }

  for (const f of result.findings) {
    console.error(`✘ ${f.file}:${f.line}  [${f.code}]  ${f.detail}`);
  }
  for (const p of result.allowlistProblems) {
    console.error(`✘ supply-chain-allowlist.json  ${p}`);
  }

  if (!result.ok) {
    const counts = result.findings.length + result.allowlistProblems.length;
    console.error(`\n${counts} supply-chain problem(s) across ${result.files.length} file(s).`);
    console.error('Fix the skill, or add an allow-list entry in scripts/supply-chain-allowlist.json with a reason.');
    return 1;
  }

  console.log(`✔ supply chain clean — ${result.files.length} file(s)`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
