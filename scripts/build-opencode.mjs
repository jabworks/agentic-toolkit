#!/usr/bin/env node
// Generates the OpenCode-facing distribution from the canonical sources:
//
//   skills/<name>/                        → dist/opencode/skills/<name>/
//   skills/subagent-execution/agents/*.md → packages/condux-opencode/agents/*.md
//
// OpenCode surfaces only `description` in its <available_skills> listing and
// ignores unknown frontmatter, so the skill transform folds `when_to_use` into
// `description` (and drops the field). Everything else — remaining frontmatter
// lines, body, auxiliary files — is copied byte-for-byte.
//
// Agent translation: OpenCode agents carry `description` + `mode` frontmatter
// and use the markdown body as the system prompt. Claude-only fields (tools,
// model, color, memory) are dropped; the <example> blocks are stripped from the
// description. No model pin — injected agents inherit the session default.
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
  return text
    .replace(description.line + '\n', 'description: ' + encodeScalar(merged) + '\n')
    .replace(whenToUse.line + '\n', '');
}

// --------------------------------------------------------------------------
// Agent translation: Claude agent dialect → OpenCode agent dialect.
// --------------------------------------------------------------------------

export function translateAgent(text, label) {
  const { entries, body } = splitFrontmatter(text, label);
  const description = entries.find((e) => e.key === 'description');
  if (!description) throw new Error(`${label}: agent has no description`);
  const summary = decodeScalar(description.raw).split('\n\n<example>')[0].trim();
  return '---\ndescription: ' + encodeScalar(summary) + '\nmode: subagent\n---\n' + body;
}

// --------------------------------------------------------------------------
// Generation
// --------------------------------------------------------------------------

function copyTransformed(srcDir, dstDir, label) {
  fs.mkdirSync(dstDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyTransformed(src, dst, label);
    } else if (entry.name === 'SKILL.md') {
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

  return { skillCount, agentCount };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { skillCount, agentCount } = build();
  console.log(`built  dist/opencode/skills (${skillCount} skills), packages/condux-opencode/agents (${agentCount} agents)`);
}
