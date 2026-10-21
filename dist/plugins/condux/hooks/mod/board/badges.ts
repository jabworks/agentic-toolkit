import { type BoardPlan } from '../types';

// Facts read best-effort out of the plan and its ledger. A badge with nothing to read is absent, never guessed.
export const badges = (plan: BoardPlan): string[] => {
  const lines = plan.ledger?.lines.map(line => line.text) ?? [];
  const pr = lines.map(text => /\bPR\s*#(\d+)/i.exec(text)?.[1]).find(Boolean);
  const branch = lines.map(text => /\bbranch\s+`?([\w./-]+)`?/i.exec(text)?.[1]).find(Boolean);
  const commits = lines.filter(text => /\bcommit(?:ted)?\s+`?[0-9a-f]{7,}/i.test(text)).length;
  const base = plan.ledger?.baseSha;

  return [
    plan.plan.tier === null ? null : `${plan.plan.tier} tier`,
    branch ?? null,
    pr === undefined ? null : `PR #${pr}`,
    base ? `BASE ${base.slice(0, 7)}` : null,
    commits === 0 ? null : `${commits} ${commits === 1 ? 'commit' : 'commits'}`,
  ].filter((badge): badge is string => badge !== null);
};
