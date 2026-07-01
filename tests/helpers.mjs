// tests/helpers.mjs
// Shared helpers for spawning the toolkit's stdlib Node servers in tests and
// waiting for them to report a ready URL, instead of an arbitrary sleep.
import { spawn } from 'node:child_process';

// Spawns `node <scriptPath> ...args`, waits for stdout to match `urlPattern`
// (capture group 1 = port), and resolves with { proc, port }. Rejects if the
// pattern doesn't appear within `timeoutMs`.
export function spawnServer(scriptPath, args, urlPattern, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [scriptPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let buffer = '';
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(
        'server did not report a ready URL within ' + timeoutMs + 'ms. Output so far:\n' + buffer
      ));
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(urlPattern);
      if (match) {
        clearTimeout(timer);
        resolve({ proc, port: Number(match[1]) });
      }
    });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

// Stops a spawned server. Manual-mode servers never call process.exit() on
// their own, so SIGTERM (default action: terminate) is the reliable path;
// SIGKILL is a fallback if it hasn't exited after 1s.
export function stopServer(proc) {
  return new Promise((resolve) => {
    proc.once('exit', () => resolve());
    proc.kill('SIGTERM');
    setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 1000);
  });
}
