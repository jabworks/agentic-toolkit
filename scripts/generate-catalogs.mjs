#!/usr/bin/env node
// Catalog generator — emits every registration surface from composition.json
// (docket #12): .claude-plugin/marketplace.json whole, plus the catalog tables
// in README.md / CLAUDE.md between `<!-- catalog:begin <id> -->` markers.
//
// Before this file, all four surfaces were hand-maintained and guarded after
// the fact (docs-catalog.test.mjs); three marketplace plugins once shipped
// invisible to the docs for weeks. Generating makes the omission
// unrepresentable: a plugin with no catalog row fails composition.mjs
// validation before anything is written.
//
// Marketplace descriptions are deliberately divergent from SKILL.md
// descriptions (ratified by-design 2026-08-04, PR #16) — they are declared
// input in composition.json and must never be re-derived from SKILL.md.
//
// Prose outside the markers is hand-written and never touched. A missing or
// unpaired marker is a hard error, not a silent no-op.
//
// Usage:
//   node scripts/generate-catalogs.mjs          # write all surfaces
//   (also invoked by scripts/sync.sh after the skill copies)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadComposition } from './composition.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Marketplace-level constants — not per-plugin data, so they live with the
// renderer rather than the declaration.
const MARKETPLACE_HEADER = {
  $schema: 'https://anthropic.com/claude-code/marketplace.schema.json',
  name: 'jabworks-agentic-toolkit',
  description:
    'Agentic coding toolkit for Claude Code and Codex: session handoff, plugin scaffolding, and stack-specific skill adapting.',
  owner: { name: 'Hieu Vi', email: 'hieu1871998@gmail.com' },
};
const AUTHOR = { name: 'Hieu Vi' };
const CATEGORY = 'development';

export function renderMarketplace(composition) {
  const manifest = {
    ...MARKETPLACE_HEADER,
    plugins: Object.entries(composition.plugins).map(([name, plugin]) => ({
      name,
      description: plugin.marketplace.description,
      author: AUTHOR,
      source: `./dist/plugins/${name}`,
      category: CATEGORY,
    })),
  };
  return JSON.stringify(manifest, null, 2) + '\n';
}

// One renderer per block id — blocks are code, rows are data. Row shapes:
// README blocks take { skill, blurb }; the CLAUDE.md block takes raw
// { entry, blurb } cells (entries carry formatting like "`concord` (plugin)").
const BLOCKS = {
  'readme-skills': {
    file: 'README.md',
    header: '| Skill | Description |',
    row: (r) => `| [${r.skill}](./skills/${r.skill}/) | ${r.blurb} |`,
  },
  'readme-condux': {
    file: 'README.md',
    header: '| Skill | Description |',
    row: (r) => `| [/${r.skill}](./skills/${r.skill}/) | ${r.blurb} |`,
  },
  'readme-toolkit-ops': {
    file: 'README.md',
    header: '| Skill | Description |',
    row: (r) => `| [${r.skill}](./skills/${r.skill}/) | ${r.blurb} |`,
  },
  'claude-md-skills': {
    file: 'CLAUDE.md',
    header: '| Skill | Purpose |',
    row: (r) => `| ${r.entry} | ${r.blurb} |`,
  },
};

export function renderBlock(id, composition) {
  const block = BLOCKS[id];
  const rows = composition.catalogs[id].rows;
  return [block.header, '|---|---|', ...rows.map(block.row)].join('\n');
}

function replaceBlock(content, id, body, file) {
  const begin = `<!-- catalog:begin ${id} -->`;
  const end = `<!-- catalog:end ${id} -->`;
  const beginAt = content.indexOf(begin);
  const endAt = content.indexOf(end);
  if (beginAt === -1 || endAt === -1 || endAt < beginAt) {
    throw new Error(`${file}: missing or unpaired markers for catalog block "${id}"`);
  }
  return (
    content.slice(0, beginAt + begin.length) + '\n' + body + '\n' + content.slice(endAt)
  );
}

export function generateCatalogs(repoRoot = REPO_ROOT) {
  const composition = loadComposition(repoRoot);
  const written = [];

  const marketplacePath = path.join(repoRoot, '.claude-plugin', 'marketplace.json');
  const marketplace = renderMarketplace(composition);
  if (fs.readFileSync(marketplacePath, 'utf8') !== marketplace) {
    fs.writeFileSync(marketplacePath, marketplace);
    written.push('.claude-plugin/marketplace.json');
  }

  for (const file of ['README.md', 'CLAUDE.md']) {
    const filePath = path.join(repoRoot, file);
    const before = fs.readFileSync(filePath, 'utf8');
    let after = before;
    for (const [id, block] of Object.entries(BLOCKS)) {
      if (block.file !== file) continue;
      after = replaceBlock(after, id, renderBlock(id, composition), file);
    }
    if (after !== before) {
      fs.writeFileSync(filePath, after);
      written.push(file);
    }
  }

  return written;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  try {
    const written = generateCatalogs();
    console.log(
      written.length === 0
        ? 'catalogs up to date'
        : `generated  ${written.join(', ')}`,
    );
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
