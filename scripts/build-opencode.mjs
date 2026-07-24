#!/usr/bin/env node
// Generates the OpenCode-facing distribution from the canonical sources:
//
//   skills/<name>/                        → dist/opencode/skills/<name>/
//   skills/subagent-execution/agents/*.md → packages/condux-opencode/agents/*.md
//   skills/<condux-member>/               → packages/condux-opencode/skills/<name>/
//
// The third output bundles the 12 condux-member skills *inside* the npm
// package so the plugin can auto-register them via config.skills.paths — one
// `plugin: ["@jabworks/condux"]` line installs both agents and skills, no
// separate `npx skills add` step. Membership is read from the committed condux
// bundle tree (the same source sync.sh uses), not hardcoded here. The transform
// is identical to dist/opencode/skills, so these copies are byte-for-byte the
// same as their dist/opencode counterparts — just scoped to the condux subset.
//
// OpenCode surfaces only `description` in its <available_skills> listing and
// ignores unknown frontmatter, so the skill transform folds `when_to_use` into
// `description` (and drops the field). Everything else — remaining frontmatter
// lines, body, auxiliary files — is copied byte-for-byte.
//
// Agent translation: OpenCode agents carry `description` + `mode` frontmatter
// and use the markdown body as the system prompt. Claude-only fields (model,
// color, memory) are dropped; the <example> blocks are stripped from the
// description. No model pin — injected agents inherit the session default.
// A Claude `tools:` allowlist becomes OpenCode `permission` denials — see
// RESTRICTED_PERMISSIONS for why it is `permission` and not `tools`, and why
// only the mutation/execution gates carry across.
//
// Both outputs are regenerated from scratch on every run; scripts/sync.sh calls
// this after mirroring dist/plugins. tests/opencode-dist.test.mjs re-runs the
// same transforms in memory and fails on drift.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
export const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
export const OPENCODE_SKILLS_DIR = path.join(REPO_ROOT, 'dist', 'opencode', 'skills');
export const AGENTS_SRC_DIR = path.join(SKILLS_DIR, 'subagent-execution', 'agents');
export const AGENTS_DST_DIR = path.join(REPO_ROOT, 'packages', 'condux-opencode', 'agents');
// Condux bundle membership lives in the committed dist tree — the same source
// sync.sh reads to route a skill into the bundle. Deriving the list from here
// (rather than a second hardcoded list) keeps the npm-bundled subset in lockstep
// with the marketplace bundle.
export const CONDUX_BUNDLE_DIR = path.join(REPO_ROOT, 'dist', 'plugins', 'condux', 'skills', 'condux');
export const CONDUX_OPENCODE_SKILLS_DIR = path.join(REPO_ROOT, 'packages', 'condux-opencode', 'skills');

export function conduxSkillNames() {
  return fs.readdirSync(CONDUX_BUNDLE_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

// --------------------------------------------------------------------------
// Frontmatter — all toolkit frontmatter values are single-line scalars
// (plain, 'single-quoted', or "double-quoted"). Fail loudly on anything else
// rather than risk corrupting a skill.
// --------------------------------------------------------------------------

export function splitFrontmatter(text, label) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error(`${label}: no frontmatter block found`);
  const entries = [];
  for (const line of match[1].split('\n')) {
    if (line.trim() === '') continue;
    const kv = line.match(/^([a-zA-Z_-]+): (.*)$/);
    if (!kv) throw new Error(`${label}: unsupported frontmatter line (multi-line value?): ${line}`);
    entries.push({ key: kv[1], raw: kv[2], line });
  }
  return { entries, body: text.slice(match[0].length) };
}

export function decodeScalar(raw) {
  if (raw.startsWith('"') && raw.endsWith('"')) return JSON.parse(raw);
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replaceAll("''", "'");
  return raw;
}

// JSON.stringify output is a valid YAML double-quoted scalar.
const encodeScalar = (value) => JSON.stringify(value);

// --------------------------------------------------------------------------
// Skill transform: fold when_to_use into description, drop the field.
// Skills without when_to_use pass through byte-identical.
// --------------------------------------------------------------------------

export function transformSkill(text, label) {
  const { entries } = splitFrontmatter(text, label);
  const whenToUse = entries.find((e) => e.key === 'when_to_use');
  if (!whenToUse) return text;
  const description = entries.find((e) => e.key === 'description');
  if (!description) throw new Error(`${label}: has when_to_use but no description`);

  const merged = decodeScalar(description.raw) + ' ' + decodeScalar(whenToUse.raw);
  // Function-form replacement: a plain string here would have $-sequences in the
  // description ($&, $', $1, …) interpreted as replacement patterns.
  return text
    .replace(description.line + '\n', () => 'description: ' + encodeScalar(merged) + '\n')
    .replace(whenToUse.line + '\n', '');
}

// --------------------------------------------------------------------------
// Agent translation: Claude agent dialect → OpenCode agent dialect.
// --------------------------------------------------------------------------

// Claude's `tools:` frontmatter is an allowlist; the OpenCode equivalent is
// `permission`, NOT `tools`. OpenCode's `tools` field is deprecated and is
// folded into `permission` while the config file is parsed — a plugin injecting
// agents through the `config` hook runs after that, so a `tools` map there is
// silently inert. `permission` is merged at agent-resolution time and does take
// effect. OpenCode's `edit` permission covers edit/write/patch as one gate.
//
// Only these two carry across — they are what an agent's stated guarantee rests
// on ("never modify files", "no bash execution"). Read-side tools deliberately
// keep OpenCode's defaults: several Claude allowlists omit Grep/Glob while their
// prompts still direct the agent to search, so denying those would break the
// agent rather than constrain it.
const RESTRICTED_PERMISSIONS = [
  { permission: 'bash', claude: ['Bash'] },
  { permission: 'edit', claude: ['Edit', 'Write', 'NotebookEdit'] },
];

// Returns the OpenCode permission denials for a Claude allowlist, or null when
// the agent is unrestricted (no `tools:` line, or a wildcard) — matching Claude,
// where an absent allowlist means every tool is available.
export function agentPermissionPolicy(entries) {
  const tools = entries.find((e) => e.key === 'tools');
  if (!tools) return null;
  const raw = decodeScalar(tools.raw).trim();
  if (raw === '*' || /^all tools$/i.test(raw)) return null;
  const allowed = new Set(raw.split(',').map((t) => t.trim()));
  const denied = {};
  for (const { permission, claude } of RESTRICTED_PERMISSIONS) {
    if (!claude.some((name) => allowed.has(name))) denied[permission] = 'deny';
  }
  return Object.keys(denied).length > 0 ? denied : null;
}

export function translateAgent(text, label) {
  const { entries, body } = splitFrontmatter(text, label);
  const description = entries.find((e) => e.key === 'description');
  if (!description) throw new Error(`${label}: agent has no description`);
  const summary = decodeScalar(description.raw).split('\n\n<example>')[0].trim();
  const denied = agentPermissionPolicy(entries);
  // JSON is a valid YAML flow mapping, and keeps the value on one line so it
  // stays inside splitFrontmatter's single-line-scalar contract.
  const permissionLine = denied ? 'permission: ' + JSON.stringify(denied) + '\n' : '';
  return '---\ndescription: ' + encodeScalar(summary) + '\nmode: subagent\n' + permissionLine + '---\n' + body;
}

// --------------------------------------------------------------------------
// Generation
// --------------------------------------------------------------------------

// Only the skill's own top-level SKILL.md is transformed (depth 0) — a nested
// SKILL.md (e.g. an eval fixture under references/ or evals/) is data and must
// copy byte-for-byte.
function copyTransformed(srcDir, dstDir, label, depth = 0) {
  fs.mkdirSync(dstDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyTransformed(src, dst, label, depth + 1);
    } else if (entry.name === 'SKILL.md' && depth === 0) {
      fs.writeFileSync(dst, transformSkill(fs.readFileSync(src, 'utf8'), label));
    } else {
      fs.copyFileSync(src, dst);
    }
  }
}

export function build() {
  fs.rmSync(OPENCODE_SKILLS_DIR, { recursive: true, force: true });
  let skillCount = 0;
  for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    copyTransformed(path.join(SKILLS_DIR, entry.name), path.join(OPENCODE_SKILLS_DIR, entry.name), `skills/${entry.name}`);
    skillCount++;
  }

  fs.rmSync(AGENTS_DST_DIR, { recursive: true, force: true });
  fs.mkdirSync(AGENTS_DST_DIR, { recursive: true });
  let agentCount = 0;
  for (const file of fs.readdirSync(AGENTS_SRC_DIR).sort()) {
    if (!file.endsWith('.md')) continue;
    const translated = translateAgent(fs.readFileSync(path.join(AGENTS_SRC_DIR, file), 'utf8'), `agents/${file}`);
    fs.writeFileSync(path.join(AGENTS_DST_DIR, file), translated);
    agentCount++;
  }

  // Bundle the condux-member skills inside the npm package (same transform as
  // dist/opencode/skills, scoped to the bundle) so the plugin can auto-register
  // them via config.skills.paths.
  fs.rmSync(CONDUX_OPENCODE_SKILLS_DIR, { recursive: true, force: true });
  let conduxSkillCount = 0;
  for (const name of conduxSkillNames()) {
    copyTransformed(path.join(SKILLS_DIR, name), path.join(CONDUX_OPENCODE_SKILLS_DIR, name), `skills/${name}`);
    conduxSkillCount++;
  }

  return { skillCount, agentCount, conduxSkillCount };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { skillCount, agentCount, conduxSkillCount } = build();
  console.log(
    `built  dist/opencode/skills (${skillCount} skills), ` +
      `packages/condux-opencode/agents (${agentCount} agents), ` +
      `packages/condux-opencode/skills (${conduxSkillCount} condux skills)`,
  );
}
