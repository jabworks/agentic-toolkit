import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { readJson, writeJson } from './store.mjs';

const settingsPath = () =>
  path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'settings.json');

const shimCommand = home => `bash "${path.join(home, 'statusline.sh')}"`;

const shimBody = (home, original) => `#!/bin/bash
# Written by usage-trace setup. Undo with: usage-trace setup --undo
input=$(cat)
printf '%s' "$input" | node "${path.join(home, 'snapshot.mjs')}" >/dev/null 2>&1 &
${original ? `printf '%s' "$input" | ${original}` : ''}
`;

export const describeSetup = home => {
  const settings = readJson(settingsPath(), {});
  const current = settings.statusLine?.command;

  return {
    settings: settingsPath(),
    current: current || null,
    next: shimCommand(home),
    alreadyApplied: current === shimCommand(home),
  };
};

export const applySetup = (home, snapshotSource) => {
  const file = settingsPath();
  const plan = describeSetup(home);

  if (plan.alreadyApplied) {
    return plan;
  }

  const settings = readJson(file, {});

  fs.mkdirSync(home, { recursive: true });
  fs.copyFileSync(snapshotSource, path.join(home, 'snapshot.mjs'));
  fs.writeFileSync(path.join(home, 'statusline.sh'), shimBody(home, plan.current), { mode: 0o755 });

  writeJson(path.join(home, 'setup.json'), { original: settings.statusLine || null });

  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `${file}.usage-trace-bak`);
  }

  settings.statusLine = { ...settings.statusLine, type: 'command', command: plan.next };
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);

  return plan;
};

export const undoSetup = home => {
  const saved = readJson(path.join(home, 'setup.json'), null);

  if (!saved) {
    return false;
  }

  const file = settingsPath();
  const settings = readJson(file, {});

  if (saved.original) {
    settings.statusLine = saved.original;
  } else {
    delete settings.statusLine;
  }

  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
  fs.rmSync(path.join(home, 'setup.json'));

  return true;
};
