import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const SKILL_DIR = path.join(REPO_ROOT, 'skills', 'condux-doctor');
const REGISTRY = path.join(SKILL_DIR, 'conflicts.json');
const MODULE = path.join(SKILL_DIR, 'conflicts.mjs');
const DOCTOR = path.join(SKILL_DIR, 'doctor.mjs');
const INSTALLER = path.join(REPO_ROOT, 'plugins', 'condux', 'install.mjs');

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const { detectConflicts, describe: describeFindings, probe } = await import(MODULE);

// A machine that carries the conflict, built from scratch so the test never
// depends on what the developer running it happens to have installed.
function fakeHome(t, { plugins = [], skills = [], codexPlugins = [] } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'condux-conflicts-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));

  const claude = path.join(home, '.claude');
  fs.mkdirSync(path.join(claude, 'plugins'), { recursive: true });
  fs.writeFileSync(
    path.join(claude, 'plugins', 'installed_plugins.json'),
    JSON.stringify({ version: 2, plugins: Object.fromEntries(plugins.map((key) => [key, [{ scope: 'user' }]])) }),
  );

  fs.mkdirSync(path.join(claude, 'skills'), { recursive: true });
  for (const name of skills) fs.mkdirSync(path.join(claude, 'skills', name), { recursive: true });

  // The feature flag is set so the rest of the report comes back clean: this
  // fixture is an otherwise-healthy machine, so that when the exit code is
  // asserted the conflict row is the only thing that could have moved it.
  const codex = path.join(home, '.codex');
  fs.mkdirSync(codex, { recursive: true });
  fs.writeFileSync(
    path.join(codex, 'config.toml'),
    `[features]\nhooks = true\n\n` + codexPlugins.map((key) => `[plugins."${key}"]\nenabled = true\n`).join('\n'),
  );

  return {
    home,
    hosts: { claude, codex, opencode: null },
    env: { ...process.env, HOME: home, CODEX_HOME: codex, XDG_CONFIG_HOME: path.join(home, '.config') },
  };
}

test('every registry entry carries what the warning has to print', () => {
  assert.ok(Array.isArray(registry.conflicts) && registry.conflicts.length > 0, 'registry has no entries');

  for (const entry of registry.conflicts) {
    const where = `conflicts.json entry "${entry.id}"`;
    for (const field of ['id', 'title', 'homepage', 'verified', 'relationship', 'impact', 'recommendation']) {
      assert.ok(typeof entry[field] === 'string' && entry[field].length > 0, `${where} is missing ${field}`);
    }

    // `verified` is the load-bearing one: an entry naming another project's
    // skills must have been read off a real install, because a wrong name in a
    // shipped warning is worse than no warning at all.
    assert.match(entry.verified, /\d/, `${where} has no version or date in verified`);

    assert.ok(typeof entry.detect?.plugin === 'string', `${where} has no detect.plugin`);
    assert.ok(Array.isArray(entry.detect?.skills) && entry.detect.skills.length > 0, `${where} has no detect.skills`);
    assert.ok(Array.isArray(entry.overlaps) && entry.overlaps.length > 0, `${where} has no overlaps`);

    for (const pair of entry.overlaps) {
      assert.ok(pair.theirs && pair.ours && pair.both, `${where} has an incomplete overlap pair`);
      assert.ok(
        fs.existsSync(path.join(REPO_ROOT, 'skills', pair.ours)),
        `${where} maps onto "${pair.ours}", which is not a skill in this repo`,
      );
    }

    // Only placeholders the reader actually substitutes; anything else reaches
    // the user as literal braces.
    for (const [key, allowed] of [['plugin', 'key'], ['skills', 'dir']]) {
      const template = entry.remedy?.[key];
      assert.ok(typeof template === 'string' && template.length > 0, `${where} has no remedy.${key}`);
      for (const [, name] of template.matchAll(/\{(\w+)\}/g)) {
        assert.equal(name, allowed, `${where} remedy.${key} uses unknown placeholder {${name}}`);
      }
    }
  }
});

test('no registry entry names a skill this toolkit itself ships', () => {
  // The detector matches directory names, so a registry name equal to one of
  // our own skills would fire on every condux user's own install. There is no
  // overlap today and that is not luck — condux 2.0.0 renamed off superpowers
  // vocabulary deliberately. This is what keeps it true: the trap only springs
  // the day someone proposes a skill called `writing-plans`, and it should
  // spring here rather than in the field.
  const ours = new Set(fs.readdirSync(path.join(REPO_ROOT, 'skills')));

  for (const entry of registry.conflicts) {
    const collisions = entry.detect.skills.filter((name) => ours.has(name));
    assert.deepEqual(
      collisions,
      [],
      `conflicts.json entry "${entry.id}" names skills this repo also ships (${collisions.join(', ')}) — ` +
        'the probe would accuse a clean condux install of conflicting with itself',
    );
  }
});

test('the registry is the only place a conflicting library is named', () => {
  // Two copies of this table is the failure this design exists to avoid: the
  // one thing that must not go stale is the half naming someone else's skills.
  // Comments included, deliberately. Exempting them needs a comment parser to
  // be right about, and "the name appears in conflicts.json and nowhere else"
  // is a rule that can be checked with a substring search and read off the
  // failure message. An example worth naming in a comment can be named in the
  // registry's own `note` field.
  const names = registry.conflicts.map((entry) => entry.detect.plugin);

  for (const file of [DOCTOR, INSTALLER, MODULE]) {
    const source = fs.readFileSync(file, 'utf8');
    for (const name of names) {
      assert.ok(
        !source.includes(name),
        `${path.basename(file)} names "${name}" — a conflicting library belongs only in conflicts.json`,
      );
    }
  }
});

test('a conflicting plugin registration is detected on either host', (t) => {
  const entry = registry.conflicts[0];

  for (const host of ['claude', 'codex']) {
    const key = `${entry.detect.plugin}@some-marketplace`;
    const fake = fakeHome(t, host === 'claude' ? { plugins: [key] } : { codexPlugins: [key] });

    const findings = detectConflicts(registry.conflicts, fake.hosts, fake.home);
    assert.equal(findings.length, 1, `no finding on ${host}`);
    assert.equal(findings[0].plugin.key, key);
    assert.equal(findings[0].plugin.host, host);

    const row = describeFindings(findings);
    assert.equal(row.status, 'warn', 'a competing library is a warning, never a break');
    assert.ok(row.detail.includes(entry.title));
    assert.ok(row.fix.includes(key), 'the removal command must name the resolved plugin key');
  }
});

test('loose skill directories are detected without any plugin installed', (t) => {
  const entry = registry.conflicts[0];
  const floor = entry.detect.minSkills ?? 2;
  const fake = fakeHome(t, { skills: entry.detect.skills.slice(0, floor) });

  const findings = detectConflicts(registry.conflicts, fake.hosts, fake.home);
  assert.equal(findings.length, 1, 'skills on disk are a surface of their own');
  assert.equal(findings[0].plugin, null);
  assert.equal(findings[0].skills.length, floor);
});

test('a dangling symlink is not an installed skill', (t) => {
  // Found on a real machine: ~/.claude/skills held 14 superpowers names, every
  // one a symlink into a ~/.agents/skills tree that had since been pruned. The
  // first version of this detector counted all 14.
  const entry = registry.conflicts[0];
  const fake = fakeHome(t, {});
  const skillsDir = path.join(fake.hosts.claude, 'skills');

  for (const name of entry.detect.skills.slice(0, 4)) {
    fs.symlinkSync(path.join(fake.home, '.agents', 'skills', name), path.join(skillsDir, name));
  }

  assert.deepEqual(detectConflicts(registry.conflicts, fake.hosts, fake.home), [], 'broken links are not installs');

  // The same links, once their target exists, are.
  fs.mkdirSync(path.join(fake.home, '.agents', 'skills'), { recursive: true });
  for (const name of entry.detect.skills.slice(0, 4)) {
    fs.mkdirSync(path.join(fake.home, '.agents', 'skills', name), { recursive: true });
  }

  const findings = detectConflicts(registry.conflicts, fake.hosts, fake.home);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].skills.length, 4);
  // Reported where removal bites, not where the link sits.
  assert.ok(
    describeFindings(findings).detail.includes(path.join(fake.home, '.agents', 'skills')),
    'the report names the symlink directory instead of the real one',
  );
});

test('one matching directory name is not enough to accuse anyone', (t) => {
  const entry = registry.conflicts[0];
  const floor = entry.detect.minSkills ?? 2;
  assert.ok(floor > 1, 'a floor of 1 would fire on a single common word');

  const fake = fakeHome(t, { skills: entry.detect.skills.slice(0, floor - 1) });
  const findings = detectConflicts(registry.conflicts, fake.hosts, fake.home);
  assert.deepEqual(findings, [], 'below the floor must stay silent');

  assert.equal(describeFindings([]).status, 'done');
});

test('a missing or unreadable registry degrades to skipped, never a throw', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'condux-registry-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const absent = probe(path.join(dir, 'nope.json'), { claude: null, codex: null, opencode: null }, dir);
  assert.equal(absent.status, 'skipped');

  const broken = path.join(dir, 'conflicts.json');
  fs.writeFileSync(broken, '{ not json');
  assert.equal(probe(broken, { claude: null, codex: null, opencode: null }, dir).status, 'skipped');
});

test('the detector reaches the network and the shell not at all', () => {
  // The doctor advertises itself as offline and read-only, and this probe is
  // the one that reads other people's directories — it has to stay that way.
  const source = fs.readFileSync(MODULE, 'utf8');
  for (const forbidden of ['fetch(', 'node:http', 'node:https', 'child_process', 'writeFile', 'mkdir', 'rm(']) {
    assert.ok(!source.includes(forbidden), `conflicts.mjs uses ${forbidden}`);
  }
});

test('the doctor reports the conflict and still exits 0', (t) => {
  const entry = registry.conflicts[0];
  const key = `${entry.detect.plugin}@some-marketplace`;
  const fake = fakeHome(t, { plugins: [key], skills: entry.detect.skills.slice(0, 3) });

  const result = spawnSync(process.execPath, [DOCTOR], { env: fake.env, encoding: 'utf8', timeout: 30000 });

  assert.match(result.stdout, /^conflicts +warn /m, 'no conflicts row in the report');
  assert.ok(result.stdout.includes(key), 'the row does not name the installed key');
  assert.equal(result.status, 0, 'a conflict must not fail the doctor — condux itself is fine');
});

test('the installer reports the conflict under --dry-run and still exits 0', (t) => {
  const entry = registry.conflicts[0];
  const key = `${entry.detect.plugin}@some-marketplace`;
  const fake = fakeHome(t, { plugins: [key] });

  const result = spawnSync(process.execPath, [INSTALLER, '--dry-run'], {
    env: fake.env,
    encoding: 'utf8',
    timeout: 30000,
  });

  assert.match(result.stdout, /^conflicts +warn /m, 'the front door is where the warning matters most');
  assert.equal(result.status, 0, 'a dry run that found a conflict has still not failed');
});

test('uninstall says nothing about what else is installed', (t) => {
  const entry = registry.conflicts[0];
  const fake = fakeHome(t, { plugins: [`${entry.detect.plugin}@some-marketplace`] });

  const result = spawnSync(process.execPath, [INSTALLER, '--uninstall'], {
    env: fake.env,
    encoding: 'utf8',
    timeout: 30000,
  });

  assert.ok(!/^conflicts /m.test(result.stdout), 'on the way out, another library stops being condux business');
});
