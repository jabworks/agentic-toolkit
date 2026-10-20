// Path helpers for a module that runs with no Node: plain string work over POSIX and Windows paths. These are docket's
// (skills/record/pane/hooks/docket.ts), copied because plugins install independently and share no code.
const DRIVE_RE = /^[A-Za-z]:$/;

const separatorOf = (path: string): string => (path.includes('\\') && !path.includes('/') ? '\\' : '/');

export const ancestors = (dir: string): string[] => {
  const sep = separatorOf(dir);
  const parts = dir.split(/[\\/]/).filter(part => part !== '');
  const isUnc = dir.startsWith('\\\\');
  const isAbsolute = dir.startsWith('/') || dir.startsWith('\\');
  const hasDrive = parts.length > 0 && DRIVE_RE.test(parts[0] ?? '');
  const result: string[] = [];

  let prefix = '';

  if (isUnc) {
    prefix = '\\\\';
  } else if (isAbsolute) {
    prefix = sep;
  }

  for (let count = parts.length; count >= 1; count -= 1) {
    // A bare drive (`C:`) is not a directory; the root entry below stands in for it.
    if (hasDrive && count === 1) {
      break;
    }

    result.push(prefix + parts.slice(0, count).join(sep));
  }

  if (hasDrive) {
    result.push(`${parts[0]}${sep}`);
  } else if (isAbsolute && !isUnc) {
    result.push(sep);
  }

  return result;
};

export const joinPath = (dir: string, ...parts: string[]): string => {
  const sep = separatorOf(dir);
  const isRoot = dir === '/' || dir === '\\';
  let result = isRoot ? '' : dir.replace(/[\\/]+$/, '');

  for (const part of parts) {
    const clean = part.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '');

    if (clean === '') {
      continue;
    }

    result = `${result}${sep}${clean}`;
  }

  return result === '' ? dir : result;
};
