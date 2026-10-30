#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Detached so the session never waits on a backfill; prints nothing, so it adds
// no context. A failure here only delays capture until the next session.
try {
  const child = spawn(process.execPath, [path.join(here, '..', 'bin', 'usage-trace.mjs'), 'ingest'], {
    detached: true,
    stdio: 'ignore',
  });

  child.on('error', () => {});
  child.unref();
} catch {
  // Fails open by contract.
}
