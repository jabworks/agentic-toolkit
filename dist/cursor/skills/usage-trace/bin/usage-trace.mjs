#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { measureLag, runIngest } from '../lib/ingest.mjs';
import { applySetup, describeSetup, undoSetup } from '../lib/setup.mjs';
import { readEvents, readJson, storeHome } from '../lib/store.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [command, ...args] = process.argv.slice(2);
const home = storeHome();
const print = value => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);

const status = () => {
  let lastLimit = null;
  const since = new Date(Date.now() - 7 * 864e5).toISOString();

  for (const event of readEvents({ home, since })) {
    if (event.type === 'limit' && (!lastLimit || event.ts > lastLimit.ts)) {
      lastLimit = event;
    }
  }

  return {
    home,
    last_run: readJson(path.join(home, 'last-run.json'), null),
    lag: measureLag({ home }),
    last_limit_snapshot: lastLimit,
    status_line_setup: describeSetup(home).alreadyApplied,
  };
};

const setup = () => {
  if (args.includes('--undo')) {
    print({ undone: undoSetup(home) });

    return;
  }

  // Changing the user's status line needs an explicit --apply, after they've seen this plan.
  if (args.includes('--apply')) {
    print({ applied: applySetup(home, path.join(here, 'snapshot.mjs')) });

    return;
  }

  print({ plan: describeSetup(home), to_apply: 'usage-trace setup --apply' });
};

const commands = {
  ingest: () => print(runIngest({ home })),
  status: () => print(status()),
  setup,
};

if (!commands[command]) {
  process.stderr.write('usage: usage-trace <ingest|status|setup [--apply|--undo]>\n');
  process.exit(2);
}

commands[command]();
