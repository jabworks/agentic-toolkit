#!/usr/bin/env node
// Folds `when_to_use` into `description` in the marketplace install tree:
//
//   skills/<name>/SKILL.md → dist/plugins/<plugin>/skills/<name>/SKILL.md
//
// Codex never shows the model `when_to_use` (docket #115), and eleven of the
// thirteen plugins load through its Agent Plugins loader, which discovers
// skills/ by convention with no path override, so a Codex-only tree is
// unreachable. Claude Code already appends `when_to_use` to `description` in
// its skill listing, so folding the shared tree changes only what Codex sees
// (specs/agent-plugins-conformance decision 6).
//
// sync.sh copies every declared pair byte for byte first; this pass then
// rewrites each pair's top-level SKILL.md with build-opencode.mjs's fold.
// Nested SKILL.md files (eval fixtures) and every other file stay verbatim.
// tests/dist-mirror.test.mjs and tests/composition.test.mjs compare each dest
// file against expectedBytes() and fail on drift.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadComposition } from './composition.mjs';
import { transformSkill } from './build-opencode.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// The bytes a dist file must hold, given its source file and its path
// relative to the pair root. Only the pair's own SKILL.md is folded.
export function expectedBytes(srcPath, rel) {
  const raw = fs.readFileSync(srcPath);
  return rel === 'SKILL.md' ? Buffer.from(transformSkill(raw.toString('utf8'), srcPath)) : raw;
}

export function foldPlugins(repoRoot = REPO_ROOT) {
  let rewritten = 0;
  for (const { src, dest } of loadComposition(repoRoot).syncPairs) {
    const srcPath = path.join(repoRoot, src, 'SKILL.md');
    const destPath = path.join(repoRoot, dest, 'SKILL.md');
    if (!fs.existsSync(srcPath) || !fs.existsSync(destPath)) continue;
    const want = expectedBytes(srcPath, 'SKILL.md');
    if (fs.readFileSync(destPath).equals(want)) continue;
    fs.writeFileSync(destPath, want);
    rewritten++;
  }
  return { rewritten };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { rewritten } = foldPlugins();
  console.log(`folded dist/plugins SKILL.md when_to_use → description (${rewritten} rewritten)`);
}
