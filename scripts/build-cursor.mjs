#!/usr/bin/env node
// Generates the Cursor-facing skill distribution:
//
//   skills/<name>/ → dist/cursor/skills/<name>/
//
// Cursor (2.4+) loads SKILL.md natively but surfaces only `description` for
// model invocation and ignores `when_to_use` — the same constraint OpenCode
// has. The transform is therefore shared, not forked: this script imports
// the fold (when_to_use → description) and the tree copier from
// build-opencode.mjs and owns only the output location. The trees are
// byte-identical today and free to drift when either host grows a
// host-specific need (e.g. Cursor's `paths` / `disable-model-invocation`).
//
// Regenerated from scratch on every run; scripts/sync.sh calls this after
// the OpenCode build. tests/cursor-dist.test.mjs re-runs the transform in
// memory and fails on drift.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SKILLS_DIR, copyTransformed } from './build-opencode.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
export const CURSOR_SKILLS_DIR = path.join(REPO_ROOT, 'dist', 'cursor', 'skills');

export function build() {
  fs.rmSync(CURSOR_SKILLS_DIR, { recursive: true, force: true });
  let skillCount = 0;
  for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    copyTransformed(path.join(SKILLS_DIR, entry.name), path.join(CURSOR_SKILLS_DIR, entry.name), `skills/${entry.name}`);
    skillCount++;
  }
  return { skillCount };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { skillCount } = build();
  console.log(`built  dist/cursor/skills (${skillCount} skills)`);
}
