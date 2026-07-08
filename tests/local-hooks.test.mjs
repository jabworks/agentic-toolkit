import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Campaign Front C3: WARN (never fail) when the local pre-commit sync hook is
// missing. The hook lives in .git/hooks/ and is not version-controlled, so a
// fresh clone silently lacks the auto-sync safety net until
// `bash scripts/install-hooks.sh` is run. CI checkouts never have it and don't
// need it (CI runs the drift checks directly), so the warning is local-only.
test('local pre-commit sync hook is installed (warn-only, never fails)', (t) => {
  if (process.env.CI) {
    t.diagnostic('CI checkout — local pre-commit hook not expected; drift is checked directly');
    return;
  }
  const hook = path.join(REPO_ROOT, '.git', 'hooks', 'pre-commit');
  if (!fs.existsSync(hook)) {
    t.diagnostic('WARNING: .git/hooks/pre-commit is missing on this clone — sync will not run automatically on commit. Install it: bash scripts/install-hooks.sh');
    return;
  }
  const body = fs.readFileSync(hook, 'utf8');
  if (!body.includes('scripts/sync.sh')) {
    t.diagnostic('WARNING: .git/hooks/pre-commit exists but does not run scripts/sync.sh — reinstall it: bash scripts/install-hooks.sh');
  }
});
