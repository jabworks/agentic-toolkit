#!/usr/bin/env node
// The plugin release channel. Plugin versions live in plugin.json and are
// bumped in ordinary commits, so nothing ever reached the GitHub releases page
// — 25 versions shipped untagged before this existed.
//
// One operation, run in two situations: find every <plugin>--v<version> that
// has no tag, and create it. Backfilling history and releasing today's bump are
// the same thing, which is why there is no separate backfill mode.
//
// Dry run by default. Nothing touches git or GitHub without --execute.
//
// Usage:
//   node scripts/release-plugins.mjs                      # what would be created
//   node scripts/release-plugins.mjs --plugin condux      # one plugin
//   node scripts/release-plugins.mjs --execute            # tag + release
//   node scripts/release-plugins.mjs --write-changelog    # regenerate CHANGELOG.md

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Overridable so the gh-dependent paths are testable without a network or a
// real token: the tests point this at a script that records its argv.
const GH = process.env.RELEASE_PLUGINS_GH || 'gh';

// Noise in the notes: the changesets bot and merge commits say nothing about
// what changed in a plugin.
const SKIP_SUBJECTS = [/^Version Packages/, /^Merge (pull request|branch|remote)/];

const USAGE = `usage: release-plugins [options]

  --plugin <name>      restrict to one plugin
  --since <ref>        only versions introduced after <ref> (what CI uses)
  --repair             create releases for tags that have one missing
  --initial            seed one release per plugin at its current version
  --execute            create the tags and GitHub releases (default: dry run)
  --write-changelog    regenerate CHANGELOG.md from the same data
  --repo-root <path>   operate on another checkout (tests)
`;

function parseFlags(argv) {
  const flags = {};

  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];

    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }

  return flags;
}

function git(root, args, { allowFailure = false } = {}) {
  const res = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (res.status !== 0) {
    if (allowFailure) return null;
    throw new Error(`git ${args.join(' ')} failed: ${res.stderr.trim()}`);
  }

  return res.stdout;
}

function pluginNames(root) {
  const dir = path.join(root, 'dist', 'plugins');
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, '.claude-plugin', 'plugin.json')))
    .map((entry) => entry.name)
    .sort();
}

function manifestPath(plugin) {
  return `dist/plugins/${plugin}/.claude-plugin/plugin.json`;
}

function versionAt(root, sha, file) {
  const blob = git(root, ['show', `${sha}:${file}`], { allowFailure: true });
  if (blob === null) return null;

  try {
    return JSON.parse(blob).version ?? null;
  } catch {
    return null;
  }
}

// A version's release point is the FIRST commit whose manifest carries it.
// Deriving it that way rather than by diffing each commit against its parent
// survives renames and rewritten history — plugin-foundry became toolkit-ops,
// and a parent-diff walk loses everything before that.
function releasePoints(root, plugin) {
  const file = manifestPath(plugin);
  const log = git(root, ['log', '--format=%H\t%cs', '--reverse', '--', file], { allowFailure: true });
  if (!log) return [];

  const seen = new Map();

  for (const line of log.trim().split('\n').filter(Boolean)) {
    const [sha, date] = line.split('\t');
    const version = versionAt(root, sha, file);
    if (!version || seen.has(version)) continue;
    seen.set(version, { plugin, version, sha, date });
  }

  // The working tree counts as a release point when its version has not been
  // committed yet. Without this the changelog could never contain the bump it
  // ships with: the entry would need a commit that does not exist until the
  // commit carrying the entry is made.
  const working = path.join(root, file);
  if (fs.existsSync(working)) {
    try {
      const version = JSON.parse(fs.readFileSync(working, 'utf8')).version ?? null;
      if (version && !seen.has(version)) {
        seen.set(version, { plugin, version, sha: null, date: new Date().toISOString().slice(0, 10) });
      }
    } catch {
      // A manifest that does not parse is plugin-manifests.test.mjs's problem.
    }
  }

  return [...seen.values()];
}

// A release must describe a commit that is actually on the default branch.
// Tagging from a feature branch would publish a version nobody can fetch.
function publishedShas(root) {
  const ref = ['origin/main', 'main'].find((candidate) => git(root, ['rev-parse', '--verify', candidate], { allowFailure: true }));
  if (!ref) return null;

  const out = git(root, ['log', '--format=%H', ref], { allowFailure: true }) ?? '';

  return new Set(out.trim().split('\n').filter(Boolean));
}

// What a push introduced. CI releases exactly this: without it, the first run
// after any gap would publish every untagged version behind the watermark —
// roughly forty releases in one burst, which is not what a push means.
function shasSince(root, ref) {
  const resolved = git(root, ['rev-parse', '--verify', `${ref}^{commit}`], { allowFailure: true });
  const from = resolved ? ref : 'HEAD^';
  const out = git(root, ['log', '--format=%H', `${from}..HEAD`], { allowFailure: true });
  if (out === null) return null;

  return new Set(out.trim().split('\n').filter(Boolean));
}

// Tag creation and release creation are two calls, and the second one can fail
// on its own — it did, transiently, on the seeding run. Treating "tag exists"
// as "released" would strand those forever, so releases are tracked separately.
function existingReleases(root) {
  const res = spawnSync(GH, ['release', 'list', '--limit', '1000', '--json', 'tagName'], { cwd: root, encoding: 'utf8' });
  if (res.status !== 0) return null;

  try {
    return new Set(JSON.parse(res.stdout).map((release) => release.tagName));
  } catch {
    return null;
  }
}

function existingTags(root) {
  const out = git(root, ['tag', '--list'], { allowFailure: true }) ?? '';

  return new Set(out.trim().split('\n').filter(Boolean));
}

function tagFor(plugin, version) {
  return `${plugin}--v${version}`;
}

// Notes come from what actually shipped: every commit touching the plugin's
// dist tree since the previous version's release point. dist/ is the exact set
// of files that ship, so no skill-to-bundle mapping is needed.
function notesFor(root, plugin, fromSha, toSha) {
  const range = fromSha ? `${fromSha}..${toSha}` : toSha;
  const out = git(root, ['log', '--format=%s', range, '--', `dist/plugins/${plugin}/`], { allowFailure: true }) ?? '';
  const subjects = out.trim().split('\n').filter(Boolean)
    .filter((subject) => !SKIP_SUBJECTS.some((pattern) => pattern.test(subject)));

  return [...new Set(subjects)];
}

function buildPlan(root, only, { needReleases = false } = {}) {
  const tags = existingTags(root);
  const releases = needReleases ? existingReleases(root) : null;
  const published = publishedShas(root);
  const today = new Date().toISOString().slice(0, 10);
  const entries = [];

  for (const plugin of pluginNames(root)) {
    if (only && plugin !== only) continue;

    const points = releasePoints(root, plugin);

    // Watermark: the newest version of this plugin that already has a tag.
    // Everything at or before it is settled history — without this rule, every
    // untagged version ever shipped would come back as pending on every run.
    let watermark = -1;
    points.forEach((point, index) => {
      if (tags.has(tagFor(plugin, point.version))) watermark = index;
    });

    points.forEach((point, index) => {
      const previous = points[index - 1];
      const tag = tagFor(plugin, point.version);
      const notes = point.sha === null
        ? notesFor(root, plugin, previous?.sha, 'HEAD')
        : notesFor(root, plugin, previous?.sha, point.sha);
      entries.push({
        ...point,
        tag,
        tagged: tags.has(tag),
        released: releases === null ? null : releases.has(tag),
        historical: index <= watermark,
        latest: index === points.length - 1,
        priorVersions: points.slice(0, index).map((earlier) => earlier.version),
        onDefaultBranch: point.sha !== null && (published === null || published.has(point.sha)),
        uncommitted: point.sha === null,
        notes,
        // A release created long after the commit it describes is a
        // reconstruction, and says so rather than posing as contemporaneous.
        reconstructed: point.date !== today,
      });
    });
  }

  return entries.sort((a, b) => (a.date === b.date ? a.plugin.localeCompare(b.plugin) : a.date.localeCompare(b.date)));
}

// Two selections over the same plan. `initial` seeds a plugin that has never
// been released here; the default is every version newer than the watermark.
function pending(entries, { initial, since, repair }) {
  // Repair looks at the opposite set: tags that exist but never got a release.
  if (repair) return entries.filter((entry) => entry.tagged && entry.released === false);

  const releasable = entries.filter((entry) => !entry.tagged && entry.onDefaultBranch);
  if (initial) return releasable.filter((entry) => entry.latest);
  if (since) return releasable.filter((entry) => since.has(entry.sha));

  return releasable.filter((entry) => !entry.historical);
}

function releaseBody(entry, today, { initial = false } = {}) {
  const lines = [];
  if (entry.reconstructed) {
    lines.push(`_Reconstructed from git history on ${today}; this release was not published at the time._`, '');
  }

  const notes = entry.notes.length > 0 ? entry.notes : [`chore(${entry.plugin}): version ${entry.version}`];
  lines.push(...notes.map((subject) => `- ${subject}`));

  // The seeding release carries what it supersedes, so the versions that never
  // got a release are still discoverable from the page that replaced them.
  if (initial && entry.priorVersions.length > 0) {
    lines.push(
      '',
      `First tracked release. ${entry.priorVersions.length} earlier version(s) shipped before this channel existed ` +
      `(${entry.priorVersions[0]} … ${entry.priorVersions[entry.priorVersions.length - 1]}) — see CHANGELOG.md for their notes.`,
    );
  }

  return lines.join('\n') + '\n';
}

function execute(root, entries, { initial }) {
  const today = new Date().toISOString().slice(0, 10);
  let created = 0;

  for (const entry of entries) {
    const bodyFile = path.join(os.tmpdir(), `release-${entry.tag.replace(/[^\w.-]/g, '_')}.md`);
    fs.writeFileSync(bodyFile, releaseBody(entry, today, { initial }));

    try {
      // A repair run re-enters with the tag already in place.
      if (!entry.tagged) {
        git(root, ['tag', entry.tag, entry.sha]);
        git(root, ['push', 'origin', entry.tag]);
      }

      // No --target: the tag is pushed above and already names the commit.
      // Passing it makes GitHub re-point the ref, which a token without the
      // `workflow` scope may not do when that commit touches .github/workflows
      // — the failure that stranded six releases on the seeding run.
      const res = spawnSync(GH, [
        'release', 'create', entry.tag,
        '--title', `${entry.plugin} v${entry.version}`,
        '--notes-file', bodyFile,
        // A release describing an old commit must not claim the Latest badge
        // just because it was published last.
        ...(entry.reconstructed ? ['--latest=false'] : []),
      ], { cwd: root, encoding: 'utf8' });

      if (res.status !== 0) {
        process.stderr.write(`FAILED ${entry.tag}: ${(res.stderr ?? '').trim()}\n`);
        continue;
      }

      created++;
      process.stdout.write(`released ${entry.tag}\n`);
    } finally {
      fs.rmSync(bodyFile, { force: true });
    }
  }

  return created;
}

function renderChangelog(entries) {
  const lines = [
    '# Changelog',
    '',
    'Every plugin version that has shipped, newest first. Generated from git',
    'history by `scripts/release-plugins.mjs --write-changelog` — do not edit by',
    'hand.',
    '',
    'Versions from the seeding release onward also have a `<plugin>--v<version>`',
    'tag and a GitHub release. Earlier ones shipped before that channel existed',
    'and are recorded only here — which is the reason this file is generated from',
    'history rather than from the tags.',
    '',
    'The `@jabworks/condux` npm package has its own changelog at',
    '`packages/condux-opencode/CHANGELOG.md`, maintained by changesets.',
    '',
  ];

  const newestFirst = [...entries].reverse();
  for (const entry of newestFirst) {
    lines.push(`## ${entry.plugin} ${entry.version} — ${entry.date}`, '');
    const notes = entry.notes.length > 0 ? entry.notes : [`chore(${entry.plugin}): version ${entry.version}`];
    lines.push(...notes.map((subject) => `- ${subject}`), '');
  }

  return lines.join('\n');
}

function printPlan(entries, selected) {
  const chosen = new Set(selected.map((entry) => entry.tag));

  for (const entry of entries) {
    if (!chosen.has(entry.tag) && !entry.tagged) continue;
    const mark = chosen.has(entry.tag) ? 'CREATE ' : 'tagged ';
    const flag = entry.reconstructed && !entry.tagged ? ' (reconstructed)' : '';
    process.stdout.write(
      `${mark} ${entry.tag.padEnd(28)} ${entry.date}  ${(entry.sha ?? 'uncommitted').slice(0, 8).padEnd(8)}  ${entry.notes.length} commit(s)${flag}\n`,
    );
  }

  const untracked = entries.filter((entry) => !entry.tagged && !chosen.has(entry.tag) && entry.onDefaultBranch).length;
  const unmerged = entries.filter((entry) => !entry.tagged && !entry.onDefaultBranch && !entry.uncommitted);
  const uncommitted = entries.filter((entry) => entry.uncommitted);
  process.stdout.write(`\n${selected.length} release(s) to create.`);
  process.stdout.write(untracked > 0 ? ` ${untracked} older version(s) stay in CHANGELOG.md only.\n` : '\n');

  if (uncommitted.length > 0) {
    process.stdout.write(
      `${uncommitted.length} version(s) bumped but not committed: ` +
      `${uncommitted.map((entry) => entry.tag).join(', ')}\n`,
    );
  }

  if (unmerged.length > 0) {
    process.stdout.write(
      `${unmerged.length} version(s) held back — their commits are not on the default branch yet: ` +
      `${unmerged.map((entry) => entry.tag).join(', ')}\n`,
    );
  }
}

function main(argv) {
  const flags = parseFlags(argv);
  if (flags.help) {
    process.stdout.write(USAGE);

    return 0;
  }

  const root = typeof flags['repo-root'] === 'string' ? path.resolve(flags['repo-root']) : REPO_ROOT;
  const entries = buildPlan(root, typeof flags.plugin === 'string' ? flags.plugin : null, {
    needReleases: flags.repair === true,
  });

  if (flags['write-changelog']) {
    fs.writeFileSync(path.join(root, 'CHANGELOG.md'), renderChangelog(entries));
    process.stdout.write(`wrote CHANGELOG.md — ${entries.length} version(s)\n`);

    return 0;
  }

  const initial = flags.initial === true;
  const repair = flags.repair === true;
  const since = typeof flags.since === 'string' ? shasSince(root, flags.since) : null;
  const selected = pending(entries, { initial, since, repair });
  printPlan(entries, selected);

  if (!flags.execute) {
    process.stdout.write('dry run — re-run with --execute to create them.\n');

    return 0;
  }

  if (selected.length === 0) return 0;

  const created = execute(root, selected, { initial });

  return created === selected.length ? 0 : 1;
}

process.exit(main(process.argv.slice(2)));
