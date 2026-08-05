#!/usr/bin/env node
// Canonical-form gate for SKILL.md frontmatter.
//
// Four separate incidents shipped frontmatter that a strict YAML parser
// rejects — cff6133, a13e094, d754c63, and the 2026-08-05 code-review break.
// Two of them shipped a skill whose metadata every host silently dropped, so
// triggering ran blind. Regex budget tests cannot see any of it, and
// `claude plugin validate` passes it (Claude's own frontmatter parser is
// lenient — verified 2026-08-05 against the broken file), so neither existing
// guard is an oracle for this class.
//
// The fix is to narrow the grammar instead of parsing all of YAML: every
// frontmatter line is `key: value`, and every value is either a plain scalar
// from a provably-safe charset or a double-quoted JSON string. Single quotes
// are banned outright — YAML's `''` escaping is the footgun that produced the
// 2026-08-05 break, and nothing here needs them.
//
// tests/frontmatter-yaml.test.mjs backs this with a real strict parse. This
// file stays dependency-free on purpose: it also gates scripts/sync.sh and the
// pre-commit hook, which must work in a fresh clone with no node_modules.
//
// Usage:
//   node scripts/check-frontmatter.mjs                 # check every SKILL.md
//   node scripts/check-frontmatter.mjs --fix           # rewrite illegal values
//   node scripts/check-frontmatter.mjs path/to/SKILL.md [...]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// YAML c-indicator characters. A plain scalar may not START with any of them —
// each one opens a different YAML construct (sequence, mapping, anchor, alias,
// tag, block scalar, quoted scalar, directive, comment, reserved).
const INDICATORS = new Set([...'-?:,[]{}#&*!|>\'"%@`']);

// Keys that must resolve to a non-empty string. `d754c63` shipped a skill whose
// description parsed to nothing at all; budgets alone never noticed.
const REQUIRED_STRING_KEYS = new Set(['name', 'description']);

// Trees that ship SKILL.md files. dist/ and packages/ are generated, but a
// generator bug lands there too — the OpenCode build folds when_to_use into
// description through a separate quoting path, so it needs its own coverage.
const SCAN_ROOTS = ['skills', 'dist', 'packages'];

// ---------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------

// Why a plain scalar is illegal, or null if it is safe. Order matters only for
// which message the author sees first.
function plainScalarProblem(value) {
  if (value !== value.trim()) return 'has leading or trailing whitespace';
  if (INDICATORS.has(value[0])) return `starts with the YAML indicator "${value[0]}" — quote it`;
  if (value.includes(': ')) return 'contains ": ", which YAML reads as a nested mapping key';
  if (/\s#/.test(value)) return 'contains " #", which YAML reads as a trailing comment';
  if (value.endsWith(':')) return 'ends with ":", which YAML reads as a mapping key';
  return null;
}

// Renders a string as a value that is legal in both YAML and this grammar.
// JSON escapes are a strict subset of YAML's double-quoted escapes, and
// JSON.stringify leaves non-ASCII (em dashes, arrows) literal.
export function renderValue(value) {
  return plainScalarProblem(value) === null ? value : JSON.stringify(value);
}

// Decodes a frontmatter value to the string a YAML parser would produce, or
// reports why it cannot. Returns { value } or { problem, rule }.
function decodeValue(raw) {
  if (raw.startsWith("'")) {
    return {
      rule: 'R1',
      problem: 'single-quoted — banned here; a bare apostrophe inside one ends the '
        + 'string early (this is exactly what broke code-review on 2026-08-05). '
        + 'Use a plain scalar, or double quotes.',
    };
  }
  if (raw.startsWith('"')) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { rule: 'R2', problem: 'double-quoted but not JSON-parseable — check the escaping' };
    }
    if (typeof parsed !== 'string') {
      return { rule: 'R2', problem: 'double-quoted value does not decode to a string' };
    }
    return { value: parsed };
  }
  const problem = plainScalarProblem(raw);
  if (problem) return { rule: 'R3', problem: 'plain scalar ' + problem };
  return { value: raw };
}

// ---------------------------------------------------------------------------
// Checking
// ---------------------------------------------------------------------------

// Splits a SKILL.md into { block, startLine } or null when it has no
// frontmatter. startLine is the 1-indexed line of the block's first line.
function frontmatterBlock(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  return m ? { block: m[1], startLine: 2 } : null;
}

// Returns { ok, issues: [{ line, key, rule, message }] } for one file's source.
export function checkFrontmatter(src) {
  const issues = [];
  const push = (line, key, rule, message) => issues.push({ line, key, rule, message });

  const fm = frontmatterBlock(src);
  if (!fm) return { ok: false, issues: [{ line: 1, key: null, rule: 'R0', message: 'no frontmatter block' }] };

  const { block, startLine } = fm;

  // R4 — characters that change meaning or break parsers regardless of quoting.
  // Checked over the whole block so they are reported even on lines the
  // per-line grammar rejects for another reason.
  block.split('\n').forEach((text, i) => {
    const line = startLine + i;
    if (text.includes('\t')) push(line, null, 'R4', 'contains a tab — YAML forbids tabs as indentation');
    if (text.includes('\r')) push(line, null, 'R4', 'contains a carriage return (CRLF line ending)');
    if (/ $/.test(text)) push(line, null, 'R4', 'has trailing whitespace');
    // U+2028/2029 are line separators that JSON.stringify leaves literal but that
    // YAML parsers may read as breaks — neither may reach a value.
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u2028\u2029]/.test(text)) {
      push(line, null, 'R4', 'contains a control or line-separator character');
    }
  });

  const seen = new Map();
  block.split('\n').forEach((text, i) => {
    const line = startLine + i;
    if (text.trim() === '' || text.trimStart().startsWith('#')) return;

    // R7 — `key:value` with no space is a plain scalar in YAML, not a mapping.
    // Requiring `key: value` keeps the grammar to one shape.
    const m = text.match(/^([A-Za-z0-9_-]+): (.*)$/);
    if (!m) {
      const empty = text.match(/^([A-Za-z0-9_-]+):$/);
      if (empty) push(line, empty[1], 'R5', 'has no value — hosts drop empty fields silently');
      else push(line, null, 'R7', 'is not a `key: value` line (lists and block scalars are not supported here)');
      return;
    }

    const [, key, raw] = m;
    if (seen.has(key)) push(line, key, 'R6', `duplicate key — first defined on line ${seen.get(key)}`);
    else seen.set(key, line);

    const decoded = decodeValue(raw);
    if (decoded.problem) {
      push(line, key, decoded.rule, decoded.problem);
      return;
    }
    if (REQUIRED_STRING_KEYS.has(key) && decoded.value.trim() === '') {
      push(line, key, 'R5', 'resolves to an empty string');
    }
  });

  return { ok: issues.length === 0, issues };
}

// Rewrites only the values this grammar rejects, leaving legal ones byte-identical
// so `--fix` never churns the tree. Idempotent: the output is always legal, and a
// second pass finds nothing to change.
export function normalizeFrontmatter(src) {
  const fm = frontmatterBlock(src);
  if (!fm) return src;

  const fixed = fm.block.split('\n').map((text) => {
    const m = text.match(/^([A-Za-z0-9_-]+): (.*)$/);
    if (!m) return text.replace(/ +$/, '');
    const [, key, raw] = m;

    let value;
    if (raw.startsWith("'")) {
      // Decode a YAML single-quoted scalar: '' is a literal apostrophe. A lone
      // apostrophe is the break we are fixing, so treat the rest as content.
      value = raw.replace(/^'/, '').replace(/'$/, '').replace(/''/g, "'");
    } else if (raw.startsWith('"')) {
      try {
        value = JSON.parse(raw);
      } catch {
        return text; // Unrecoverable — report it rather than guess.
      }
      if (typeof value !== 'string') return text;
      // Already legal and already double-quoted: leave the bytes alone.
      if (JSON.stringify(value) === raw) return text;
    } else {
      value = raw.replace(/ +$/, '');
      if (plainScalarProblem(value) === null) return `${key}: ${value}`;
    }

    return `${key}: ${renderValue(value)}`;
  }).join('\n');

  return src.replace(fm.block, fixed);
}

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

// Every SKILL.md under `roots`, repo-relative and sorted. Dependency-free so
// sync.sh and the pre-commit hook can call this in a fresh clone.
export function collectSkillFiles(repoRoot = REPO_ROOT, roots = SCAN_ROOTS) {
  const files = [];
  for (const root of roots) {
    const dir = path.resolve(repoRoot, root);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { recursive: true })) {
      const rel = path.relative(repoRoot, path.join(dir, entry));
      if (rel.includes('node_modules')) continue;
      if (path.basename(rel) !== 'SKILL.md') continue;
      files.push(rel);
    }
  }
  return files.sort();
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  const fix = argv.includes('--fix');
  const explicit = argv.filter((a) => a !== '--fix');

  // Directory arguments expand to the SKILL.md files beneath them, so sync.sh can
  // gate `skills` alone before the copy and the whole tree after it.
  const files = explicit.length > 0
    ? explicit.flatMap((arg) => {
      const abs = path.resolve(arg);
      return fs.existsSync(abs) && fs.statSync(abs).isDirectory()
        ? collectSkillFiles(REPO_ROOT, [abs])
        : [path.relative(REPO_ROOT, abs)];
    })
    : collectSkillFiles();

  let failed = 0;
  let fixedCount = 0;

  for (const rel of files) {
    const abs = path.join(REPO_ROOT, rel);
    let src = fs.readFileSync(abs, 'utf8');

    if (fix) {
      const next = normalizeFrontmatter(src);
      if (next !== src) {
        fs.writeFileSync(abs, next);
        src = next;
        fixedCount++;
        console.log(`fixed   ${rel}`);
      }
    }

    const { ok, issues } = checkFrontmatter(src);
    if (ok) continue;
    failed++;
    for (const issue of issues) {
      const where = issue.key ? `${issue.key}: ` : '';
      console.error(`✘ ${rel}:${issue.line}  [${issue.rule}]  ${where}${issue.message}`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} file(s) with illegal frontmatter.`);
    console.error('Run `node scripts/check-frontmatter.mjs --fix` to rewrite the mechanical cases.');
    return 1;
  }
  console.log(`✔ frontmatter canonical — ${files.length} file(s)${fixedCount ? `, ${fixedCount} fixed` : ''}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
