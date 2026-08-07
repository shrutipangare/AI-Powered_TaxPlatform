import type { TaxReturn } from "./types";

// Real prioritization logic, not a random label — this is what backs the
// "actionable dashboard" (challenge 07) and doubles as the single source of
// truth used at generation time and at sort/filter time, so the two never
// disagree.
export function urgencyScore(r: TaxReturn, now: Date = new Date()): number {
  if (r.status === "filed") return -1000;

  const daysUntilDue = Math.floor(
    (new Date(r.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  let score = 0;

  if (daysUntilDue < 0) score += 100 + Math.min(Math.abs(daysUntilDue) * 2, 60);
  else if (daysUntilDue <= 3) score += 80;
  else if (daysUntilDue <= 7) score += 50;
  else if (daysUntilDue <= 14) score += 25;
  else score += 5;

  if (r.blockers.length > 0) score += 30 + r.blockers.length * 10;
  if (r.status === "needs_review") score += 20;
  if (r.status === "client_action") score += 8; // visible, but not actionable by staff right now
  score += r.openInsightCount * 8;

  return score;
}

export function priorityFromScore(score: number): TaxReturn["priority"] {
  if (score >= 100) return "urgent";
  if (score >= 50) return "high";
  if (score >= 20) return "normal";
  return "low";
}

export function daysUntilDue(r: TaxReturn, now: Date = new Date()): number {
  return Math.floor(
    (new Date(r.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}
