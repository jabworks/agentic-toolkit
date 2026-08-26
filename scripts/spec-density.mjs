#!/usr/bin/env node
// Non-blocking readability reporter for the specs/ tree (specs/spec-artifact-readability,
// design §5 + addendum). Prints, per concern-file name, the numbers that tracked
// reality when the new templates were validated on 2026-08-26:
//
//   - paragraphs over three lines (PRIMARY) — the walls the templates exist to
//     prevent. This is the number that moved in every file the redesign fixed.
//   - prose % (secondary context) — kept because it is the historical baseline
//     metric, but it failed on quirks.md (labelled one-liners score as prose:
//     88% → 80% while long paragraphs halved), which is why it is not the gate
//     and not the headline. The gate is structural: tests/spec-structure.test.mjs.
//
// Always exits 0. --json emits machine-readable output instead of the table.
//
// The measurement is the one the design's baseline table used — fenced-block
// interiors count as neither prose nor structure. Changing any rule here
// silently shifts every number off the 2026-08-26 baseline; don't.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function computeDensity(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let inCode = false;
  let para = 0;
  const paras = [];
  let struct = 0;

  for (const line of lines) {
    if (/^```/.test(line)) { inCode = !inCode; if (para) { paras.push(para); para = 0; } continue; }
    if (inCode) continue;
    if (/^#{1,6}\s/.test(line)) { if (para) { paras.push(para); para = 0; } continue; }
    if (/^\s*\|/.test(line)) { struct++; if (para) { paras.push(para); para = 0; } continue; }
    if (/^\s*([-*+]|\d+\.)\s/.test(line)) { struct++; if (para) { paras.push(para); para = 0; } continue; }
    if (/^\s*$/.test(line)) { if (para) { paras.push(para); para = 0; } continue; }
    para++;
  }
  if (para) paras.push(para);

  const prose = paras.reduce((a, b) => a + b, 0);
  return {
    lines: lines.length,
    longParas: paras.filter((p) => p > 3).length,
    prosePct: prose + struct ? Math.round((100 * prose) / (prose + struct)) : 0,
  };
}

function collect(specsDir) {
  const byName = {};
  for (const dir of fs.readdirSync(specsDir)) {
    const abs = path.join(specsDir, dir);
    if (!fs.statSync(abs).isDirectory()) continue; // skips the generated specs/index.md
    for (const file of fs.readdirSync(abs)) {
      if (!file.endsWith('.md')) continue;
      const d = computeDensity(fs.readFileSync(path.join(abs, file), 'utf8'));
      (byName[file] ??= []).push({ spec: dir, ...d });
    }
  }
  return byName;
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function main() {
  const specsDir = path.join(REPO_ROOT, 'specs');
  const byName = collect(specsDir);
  const rows = Object.entries(byName)
    .map(([file, entries]) => ({
      file,
      count: entries.length,
      longParas: entries.reduce((a, e) => a + e.longParas, 0),
      medianLines: median(entries.map((e) => e.lines)),
      prosePct: median(entries.map((e) => e.prosePct)),
    }))
    .sort((a, b) => b.longParas - a.longParas);

  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ files: byName, summary: rows }, null, 2) + '\n');
    return;
  }

  const pad = (s, n) => String(s).padEnd(n);
  const rpad = (s, n) => String(s).padStart(n);
  console.log(pad('file', 22) + rpad('n', 3) + rpad('paras>3ln', 11) + rpad('med lines', 11) + rpad('prose %', 9));
  for (const r of rows) {
    console.log(pad(r.file, 22) + rpad(r.count, 3) + rpad(r.longParas, 11) + rpad(r.medianLines, 11) + rpad(r.prosePct + '%', 9));
  }
  console.log('\nparas>3ln is the number to drive down; prose % is context only');
  console.log('(labelled one-liners score as prose — see specs/spec-artifact-readability/design.md §5 addendum).');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
