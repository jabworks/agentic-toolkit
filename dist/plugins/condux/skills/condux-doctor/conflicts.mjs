// Detects skill libraries that compete with condux for the same routing
// decisions, so the installer and the doctor can warn in the same words.
//
// The registry is data (conflicts.json) and this is the logic that reads it —
// the same split as routing.md against session-start.mjs, and for the same
// reason: adding a conflict is a data edit, and neither of the two callers
// grows its own copy of the table.
//
// Name matching only. No network, no version resolution, no comparing skill
// descriptions by meaning — that last one is a real question (docket #10) and
// an unanswered one, and a doctor that advertises itself as offline and
// read-only is not where it gets prototyped.

import fs from 'node:fs';
import path from 'node:path';

// A single skill directory name proves nothing — "brainstorming" is a word
// before it is a library. The floor is per-entry so a future entry with one
// very distinctive skill name can lower it deliberately.
const DEFAULT_MIN_SKILLS = 2;

export function loadRegistry(file) {
  if (!file || !fs.existsSync(file)) return { error: 'no conflicts.json beside this script' };

  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed?.conflicts)) return { error: 'conflicts.json has no conflicts array' };

    return { entries: parsed.conflicts };
  } catch (err) {
    return { error: String(err?.message ?? err) };
  }
}

// Claude Code records installed plugins as JSON keys, Codex as TOML table
// headers, and both spell the key the same way: <name>@<marketplace>. Reading
// the registration rather than the plugins/cache/ directory is deliberate — a
// cache entry outlives the install that created it.
function installedPluginKeys(hosts) {
  const keys = [];

  if (hosts.claude) {
    const file = path.join(hosts.claude, 'plugins', 'installed_plugins.json');
    if (fs.existsSync(file)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        for (const key of Object.keys(parsed?.plugins ?? {})) keys.push({ key, host: 'claude' });
      } catch {
        // An unreadable host registry is that host's problem, not a conflict.
      }
    }
  }

  if (hosts.codex) {
    const file = path.join(hosts.codex, 'config.toml');
    if (fs.existsSync(file)) {
      try {
        for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
          const match = /^\s*\[plugins\."([^"]+)"\]/.exec(line);
          if (match) keys.push({ key: match[1], host: 'codex' });
        }
      } catch {
        // Same.
      }
    }
  }

  return keys;
}

// Every place a host will load a loose skill from. `npx skills add` and the
// shared ~/.agents tree both land here, which is how a machine carries the
// conflict without the plugin ever being installed.
function skillDirs(hosts, home) {
  return [
    hosts.claude && path.join(hosts.claude, 'skills'),
    home && path.join(home, '.agents', 'skills'),
    hosts.codex && path.join(hosts.codex, 'skills'),
    hosts.opencode && path.join(hosts.opencode, 'skills'),
  ].filter((dir) => dir && fs.existsSync(dir));
}

// ~/.claude/skills/<name> is routinely a symlink into ~/.agents/skills/<name>,
// so one skill is visible from two directories. Resolving is what counts it
// once, and the resolved path is also the one the report quotes — see where
// `home` is set below for why that, and not the directory it was listed in.
function realPath(file) {
  try {
    return fs.realpathSync(file);
  } catch {
    return file;
  }
}

export function detectConflicts(entries, hosts, home) {
  const pluginKeys = installedPluginKeys(hosts);
  const dirs = skillDirs(hosts, home);
  const findings = [];

  for (const entry of entries) {
    const wanted = entry?.detect?.plugin;
    const plugin = wanted ? pluginKeys.find(({ key }) => key.split('@')[0] === wanted) ?? null : null;

    const seen = new Map();
    for (const dir of dirs) {
      let names = [];
      try {
        names = fs.readdirSync(dir);
      } catch {
        continue;
      }

      for (const name of names) {
        if (!(entry?.detect?.skills ?? []).includes(name)) continue;

        // existsSync follows the link, so a dangling one is false. That is the
        // point: ~/.claude/skills is full of symlinks into a shared tree, and
        // when that tree is pruned the links stay behind. A host cannot load a
        // skill through a broken link, so neither may this count it as one —
        // warning about a library that is not really there is the fastest way
        // to teach someone to ignore the warning.
        const entryPath = path.join(dir, name);
        if (!fs.existsSync(entryPath)) continue;

        const resolved = realPath(entryPath);
        // Report where removal would actually have an effect. Deleting
        // ~/.claude/skills/<name> when it is a symlink removes the link and
        // leaves the skill sitting in ~/.agents/skills, which is both useless
        // and confusing when the next run warns about it again.
        if (!seen.has(resolved)) seen.set(resolved, { name, dir, home: path.dirname(resolved) });
      }
    }

    const floor = entry?.detect?.minSkills ?? DEFAULT_MIN_SKILLS;
    const skills = seen.size >= floor ? [...seen.values()] : [];

    if (plugin || skills.length > 0) findings.push({ entry, plugin, skills });
  }

  return findings;
}

function fill(template, values) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (whole, key) => values[key] ?? whole);
}

// One row, phrased identically wherever it is printed. The status is `warn`
// and never `broken`: condux is installed correctly, and the installer's own
// verify beat keys its exit code on `broken` — a conflict must be loud without
// failing an install that in fact succeeded.
export function describe(findings) {
  if (findings.length === 0) {
    return { status: 'done', detail: 'no known-conflicting skill library found on this machine' };
  }

  const details = [];
  const fixes = [];

  for (const { entry, plugin, skills } of findings) {
    const where = [];
    if (plugin) where.push(`installed as ${plugin.key} on ${plugin.host}`);
    if (skills.length > 0) {
      const dirs = [...new Set(skills.map(({ home }) => home))];
      where.push(`${skills.length} of its skills present in ${dirs.join(', ')}`);
    }

    const pairs = (entry.overlaps ?? []).length;
    details.push(`${entry.title} — ${where.join('; ')}${pairs > 0 ? `; ${pairs} skills overlap condux` : ''}`);

    if (plugin) fixes.push(fill(entry.remedy?.plugin, { key: plugin.key }));
    if (skills.length > 0) {
      const dirs = [...new Set(skills.map(({ home }) => home))];
      fixes.push(fill(entry.remedy?.skills, { dir: dirs.join(', ') }));
    }
  }

  return {
    status: 'warn',
    detail: details.join(' · '),
    // Printed, never run. Removing another vendor's registration is outside
    // what this installer registered, and so outside what it may reverse.
    fix: `${fixes.filter(Boolean).join(' — or ')} (run one library or the other; condux does not remove it for you)`,
  };
}

// The whole probe, so a caller adds a host label and nothing else.
export function probe(file, hosts, home) {
  const { entries, error } = loadRegistry(file);
  if (error) return { status: 'skipped', detail: `conflict registry unavailable: ${error}` };

  return describe(detectConflicts(entries, hosts, home));
}
