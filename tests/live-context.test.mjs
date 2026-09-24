import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Docket #86: a ```! live-context block runs when the skill loads, and Claude
// Code refuses the whole skill when it fails. workflow's `git status` /
// `git log` failed outside a repo and in a repo with no commits — exactly a new
// project's kickoff — and an agent made an unrequested empty commit to get the
// skill to load. Every line must fail open, so each one runs in both venues and
// must exit 0 with nothing on stderr (a host may treat either as a failure).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS = path.resolve(__dirname, '../skills');

function liveContextBlocks() {
  const blocks = [];

  for (const name of fs.readdirSync(SKILLS)) {
    const file = path.join(SKILLS, name, 'SKILL.md');

    if (!fs.existsSync(file)) continue;

    for (const match of fs.readFileSync(file, 'utf8').matchAll(/^```!\n([\s\S]*?)^```$/gm)) {
      blocks.push({ name, lines: match[1].split('\n').filter(line => line.trim()) });
    }
  }

  return blocks;
}

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
}

function venue(label, setup) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-context-'));
  setup(dir);

  return { label, dir };
}

// GIT_CEILING_DIRECTORIES stops git from walking up into a repo that happens
// to contain the temp dir, so "no repo" really is no repo.
const run = (line, cwd) =>
  spawnSync('sh', ['-c', line], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(cwd) },
  });

test('the live-context scan finds workflow\'s block', () => {
  assert.ok(
    liveContextBlocks().some(block => block.name === 'workflow'),
    'expected a ```! block in skills/workflow/SKILL.md — did the fence syntax change?',
  );
});

test('every live-context line fails open outside a repo and in a repo with no commits (docket #86)', () => {
  const venues = [
    venue('outside any git repository', () => {}),
    venue('inside a repository with no commits', dir => git(dir, 'init', '-q')),
  ];

  for (const { name, lines } of liveContextBlocks()) {
    for (const line of lines) {
      for (const { label, dir } of venues) {
        const res = run(line, dir);
        assert.equal(res.status, 0, `${name}: \`${line}\` exits ${res.status} ${label}`);
        assert.equal(res.stderr, '', `${name}: \`${line}\` writes to stderr ${label}: ${res.stderr}`);
      }
    }
  }
});

test('workflow\'s live context still reports a real repository', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-context-'));
  git(dir, 'init', '-q');
  git(dir, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'first commit');
  fs.writeFileSync(path.join(dir, 'new-file.txt'), 'x');

  const { lines } = liveContextBlocks().find(block => block.name === 'workflow');
  const output = lines.map(line => run(line, dir).stdout).join('');

  assert.match(output, /\?\? new-file\.txt/, 'git status output is missing');
  assert.match(output, /first commit/, 'git log output is missing');
});
