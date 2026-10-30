#!/usr/bin/env node
/**
 * Records limit percentages from the status line's stdin. Self-contained because
 * setup copies it into the store home: the plugin's own path changes on every
 * update, and a status line pointing at it would break. Swallows every error, so
 * a failure here can never reach the status line.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MIN_INTERVAL_MS = 5 * 60 * 1000;

export const recordSnapshot = (input, home, now = new Date()) => {
  const payload = JSON.parse(input);
  const fiveHour = payload.rate_limits?.five_hour?.used_percentage;
  const sevenDay = payload.rate_limits?.seven_day?.used_percentage;

  if (typeof fiveHour !== 'number' && typeof sevenDay !== 'number') {
    return false;
  }

  const stateFile = path.join(home, 'limit-state.json');
  let last = {};

  try {
    last = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    // First snapshot.
  }

  const changed = last.fiveHour !== fiveHour || last.sevenDay !== sevenDay;

  if (!changed && now.getTime() - (last.at || 0) < MIN_INTERVAL_MS) {
    return false;
  }

  const ts = now.toISOString();
  const event = {
    v: 1,
    type: 'limit',
    id: crypto.randomUUID(),
    ts,
    host: 'claude',
    session: payload.session_id,
    five_hour: fiveHour,
    seven_day: sevenDay,
    source: 'statusline',
  };

  fs.mkdirSync(path.join(home, 'events'), { recursive: true });
  fs.appendFileSync(path.join(home, 'events', `${ts.slice(0, 7)}.jsonl`), `${JSON.stringify(event)}\n`);
  fs.writeFileSync(stateFile, JSON.stringify({ fiveHour, sevenDay, at: now.getTime() }));

  return true;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;

if (isMain) {
  try {
    const home = process.env.USAGE_TRACE_HOME || path.join(os.homedir(), '.usage-trace');

    recordSnapshot(fs.readFileSync(0, 'utf8'), home);
  } catch {
    // Fails open by contract.
  }
}
