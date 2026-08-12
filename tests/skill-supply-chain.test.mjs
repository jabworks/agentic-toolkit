// Gate for scripts/check-supply-chain.mjs.
//
// The live assertion is that skills/ and plugins/ carry no unreviewed external
// dependency or risky invocation. The fixtures below are the more valuable
// half: each one is a false positive an earlier draft of a rule actually
// produced, kept as a regression so the rule cannot quietly re-broaden. A
// supply-chain rule that cries wolf gets suppressed wholesale, which is worse
// than not having it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkAllowlist,
  checkSupplyChain,
  collectFiles,
  hostOf,
  isLoopback,
  loadAllowlist,
} from '../scripts/check-supply-chain.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

test('skills/ and plugins/ have no unreviewed external dependency or risky invocation', () => {
  const { ok, findings, allowlistProblems } = checkSupplyChain();

  const detail = [
    ...findings.map((f) => `${f.file}:${f.line} [${f.code}] ${f.detail}`),
    ...allowlistProblems.map((p) => `allow-list: ${p}`),
  ].join('\n');

  assert.equal(ok, true, 'supply-chain violations — fix the skill, or add a reasoned allow-list entry:\n' + detail);
});

test('the scan actually covers the skills tree', () => {
  const files = collectFiles();

  // A checker that silently scans nothing passes forever. Anchor on the real
  // shape of the tree rather than an exact count, which every new skill changes.
  assert.ok(files.length > 100, `expected the scan to cover the skills tree, got ${files.length} file(s)`);
  assert.ok(files.some((f) => f.endsWith(path.join('workflow', 'SKILL.md'))), 'workflow/SKILL.md was not scanned');
  assert.ok(files.some((f) => f.endsWith('.mjs')), 'no bundled scripts were scanned');
});

test('the scan also covers the plugins tree', () => {
  // plugins/ went unscanned for the two releases between the repo's first
  // plugin-level executable and this test. The skills-tree assertion above
  // passes at full strength on a scan that opens neither plugin file, so the
  // second root needs its own anchor: an executable and the prose that runs it.
  const files = collectFiles();
  const plugins = files.filter((f) => f.startsWith(`plugins${path.sep}`));

  assert.ok(plugins.length > 0, 'the plugins tree was not scanned at all');
  assert.ok(
    plugins.includes(path.join('plugins', 'condux', 'install.mjs')),
    "condux's plugin-level installer was not scanned",
  );
  assert.ok(
    plugins.includes(path.join('plugins', 'condux', 'INSTALL.md')),
    'the prose instructing an agent to run that installer was not scanned',
  );
});

test('a single root passed as a string still scans that tree', () => {
  // collectFiles took one root string until plugins/ was added. Iterating a
  // string yields characters, none of which name a directory, so a stale caller
  // would get [] back and every rule would report clean over nothing.
  const asString = collectFiles(REPO_ROOT, 'plugins');
  const asArray = collectFiles(REPO_ROOT, ['plugins']);

  assert.ok(asString.length > 0, 'a string root scanned nothing');
  assert.deepEqual(asString, asArray, 'a string root and a single-element array disagree');
});

test('plugin-level prose may cite a skill reference by its skill-relative path', () => {
  // The trap in widening the scan: citations resolve against skills/ no matter
  // which tree the citing file lives in. concord's plugin README points at
  // `references/INSTALL.md`, meaning skills/remember/references/INSTALL.md.
  // Resolving against the citing file's own root instead — plugins/concord/ —
  // reports a live, correct link as dangling.
  const citing = path.join(REPO_ROOT, 'plugins', 'concord', 'README.md');
  const cited = path.join(REPO_ROOT, 'skills', 'remember', 'references', 'INSTALL.md');

  assert.match(fs.readFileSync(citing, 'utf8'), /`references\/INSTALL\.md`/, 'the citation this guards is gone');
  assert.ok(fs.existsSync(cited), 'the file that citation resolves to is gone');

  const { findings } = checkSupplyChain();
  const dangling = findings.filter((f) => f.code === 'FILE-READ-ERROR' && f.file.startsWith(`plugins${path.sep}`));

  assert.deepEqual(dangling, [], 'a plugin-level citation of a skill reference was flagged as dangling');
});

test('loopback is not egress', () => {
  // Six of this repo's http:// references are local dev servers. Flagging them
  // would have made the rule useless on the day it landed.
  for (const host of ['127.0.0.1', '127.0.0.1:7777', 'localhost', 'localhost:3000', '::1', '0.0.0.0']) {
    assert.equal(isLoopback(host), true, `${host} should be loopback`);
  }
  for (const host of ['github.com', 'raw.githubusercontent.com', 'example.com:443']) {
    assert.equal(isLoopback(host), false, `${host} should not be loopback`);
  }
});

test('hostOf strips scheme and path', () => {
  assert.equal(hostOf('https://raw.githubusercontent.com/a/b/c.json'), 'raw.githubusercontent.com');
  assert.equal(hostOf('http://127.0.0.1:7777/api/decision'), '127.0.0.1:7777');
});

test('an allow-list entry without a reason fails', () => {
  const used = { domains: new Set(['example.com']), scripts: new Set(), remoteFetches: new Set() };
  const problems = checkAllowlist({ domains: { 'example.com': '' } }, used);

  assert.equal(problems.length, 1);
  assert.match(problems[0], /has no reason/);
});

test('an allow-list entry nothing uses fails', () => {
  const used = { domains: new Set(), scripts: new Set(), remoteFetches: new Set() };
  const problems = checkAllowlist({ domains: { 'example.com': 'reviewed 2026-08-09' } }, used);

  assert.equal(problems.length, 1);
  assert.match(problems[0], /is unused/);
});

test('every shipped allow-list entry carries a non-empty reason', () => {
  const allowlist = loadAllowlist();

  for (const section of ['domains', 'scripts', 'remoteFetches']) {
    for (const [key, reason] of Object.entries(allowlist[section])) {
      assert.equal(typeof reason, 'string', `${section}["${key}"] reason is not a string`);
      assert.ok(reason.trim().length > 20, `${section}["${key}"] reason is too thin to be a review record`);
    }
  }
});

test('prose about pipe-to-shell is not an instruction to run it', () => {
  // The survey file that introduced this rule documents the pattern in a table
  // as `curl … | sh` — an ellipsis, no URL. An earlier draft flagged it, which
  // would have meant the rule's own documentation could not be committed.
  const survey = path.join(
    REPO_ROOT,
    'skills/toolkit-research-frontier/references/awesome-copilot-survey-2026-08-09.md',
  );

  assert.ok(fs.existsSync(survey), 'the survey that motivates this rule is missing');

  const { findings } = checkSupplyChain();
  const onSurvey = findings.filter((f) => survey.endsWith(f.file) && f.code === 'PIPE-TO-SHELL');

  assert.deepEqual(onSurvey, [], 'documentation of the pattern was flagged as a use of it');
});

test('a cross-skill references/ citation resolves', () => {
  // Skills cite each other's helpers by the same relative shape — "the memory
  // skill's references/install-codex-hook.sh", "see plan-review's
  // references/annotate-server.js". Resolving only against the citing skill
  // reported 7 findings and all 7 were false.
  const { findings } = checkSupplyChain();
  const dangling = findings.filter((f) => f.code === 'FILE-READ-ERROR');

  assert.deepEqual(dangling, [], 'a references/ citation that exists elsewhere in skills/ was flagged');
});

test('the litellm fetch is declared as an unpinned remote ref', () => {
  // The one genuine external dependency in the tree. If it ever gets pinned or
  // vendored, this test fails and the allow-list entry should go with it.
  const allowlist = loadAllowlist();
  const [url, reason] = Object.entries(allowlist.remoteFetches)[0];

  assert.match(url, /raw\.githubusercontent\.com\/BerriAI\/litellm\/main\//);
  assert.match(reason, /pin|vendor/i, 'the reason should name the exit condition');
});
