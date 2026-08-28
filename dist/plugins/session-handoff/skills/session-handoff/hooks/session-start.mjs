#!/usr/bin/env node
// SessionStart hook: when handoff documents exist, put a one-breath routing
// nudge in context so resume-shaped requests reach the session-handoff skill.
//
// Why this exists: the period-2 trigger measurement
// (specs/trigger-reliability/period-2-report.md in jabworks/agentic-toolkit)
// found resume phrases firing the skill ~9% of the time while wrap-up phrases
// fired ~64% — same skill, same declared vocabulary. The difference is that a
// third-party memory digest injected at session start already answers the
// resume question's information need, so the workflow (staleness scoring,
// red flags, prune) silently never runs. Vocabulary cannot fix that class of
// miss; an in-context directive can. Suppression-class analysis and the
// pattern rules live in specs/trigger-reliability/ (D2).
//
// The nudge is CONDITIONAL: no handoff on disk → no output, zero tokens. And
// it is a directive, never content — a nudge that summarized the handoff
// would recreate the suppression it exists to counter.
//
// The payload is nudge.md, edited as prose — never inlined here.
//
// Host contracts differ, so the host is passed explicitly:
//   --claude  Claude Code wants a JSON envelope on stdout
//   --codex   Codex injects raw stdout (bounded by additionalContextLimit)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAYLOAD = path.join(HERE, 'nudge.md');
const HANDOFF_DIRS = ['.session-handoff', 'handoffs'];

function gitRoot(from) {
  let dir = from;
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function handoffsExist(root) {
  for (const name of HANDOFF_DIRS) {
    try {
      const entries = fs.readdirSync(path.join(root, name));
      if (entries.some((e) => e.endsWith('.md') || e.endsWith('.html'))) return true;
    } catch {
      // missing dir is the normal case, not an error
    }
  }
  return false;
}

function main(argv) {
  let text;
  try {
    const cwd = process.cwd();
    const root = gitRoot(cwd) ?? cwd;
    if (!handoffsExist(root)) return 0; // conditional: nothing to resume, say nothing
    text = fs.readFileSync(PAYLOAD, 'utf8').trim();
  } catch {
    // A hook that breaks the session is worse than a hook that does nothing.
    return 0;
  }
  if (!text) return 0;

  if (argv.includes('--codex')) {
    process.stdout.write(text + '\n');
    return 0;
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: text,
    },
  }) + '\n');
  return 0;
}

let code = 0;
try {
  code = main(process.argv.slice(2));
} catch {
  code = 0; // fail open, always
}
process.exit(code);
