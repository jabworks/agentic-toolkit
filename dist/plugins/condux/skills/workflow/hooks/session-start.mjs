#!/usr/bin/env node
// SessionStart hook: puts condux's routing rule in context before the first
// prompt, so /workflow is reached as the entry point rather than inferred from
// the skill catalog.
//
// Why this exists: the trigger evals (scripts/eval-triggers.mjs, reports in
// skills/toolkit-research-frontier/references/) put workflow at ~26-27/33 on
// catalog inference alone. The misses are not silence — they are condux's own
// siblings winning the query (root-cause-analysis on a crash report, draft-plan
// on "write the plan", code-review on "fix the findings"). That collision cannot
// be fixed by strengthening workflow's description without stealing trigger
// space from those siblings, which toolkit-skill-standards forbids. An
// always-in-context instruction outranks catalog inference, so the rule goes
// here instead.
//
// The payload is routing.md, edited as prose — never inlined here.
//
// Host contracts differ, so the host is passed explicitly rather than sniffed
// from the environment:
//   --claude  Claude Code wants a JSON envelope on stdout
//   --codex   Codex injects raw stdout (bounded by additionalContextLimit)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Resolved relative to this file, not to a plugin-root env var: the script and
// its payload ship together, so they move together.
const PAYLOAD = path.join(HERE, 'routing.md');

function main(argv) {
  let text;
  try {
    text = fs.readFileSync(PAYLOAD, 'utf8').trim();
  } catch {
    // A hook that breaks the session is worse than a hook that does nothing.
    // Exit clean and let the skill catalog do its ~80% job.
    return 0;
  }
  if (text === '') return 0;

  if (argv.includes('--codex')) {
    process.stdout.write(text + '\n');
    return 0;
  }

  // Default to Claude Code's envelope. JSON.stringify handles the escaping that
  // shell-based versions of this hook get wrong.
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: text,
    },
  }) + '\n');
  return 0;
}

process.exit(main(process.argv.slice(2)));
