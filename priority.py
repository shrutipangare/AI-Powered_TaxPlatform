"""Real prioritization logic for the dashboard (challenge 07) — not a random
label. This is the single source of truth used both when the mock dataset
is generated and when the dashboard sorts/filters, so the two never disagree.
"""
from __future__ import annotations

from datetime import datetime, timezone

from models import Priority, TaxReturn


def _parse(iso: str) -> datetime:
    return datetime.fromisoformat(iso)


def days_until_due(r: TaxReturn, now: datetime | None = None) -> int:
    now = now or datetime.now(timezone.utc)
    return (_parse(r.due_date) - now).days


def urgency_score(r: TaxReturn, now: datetime | None = None) -> int:
    if r.status == "filed":
        return -1000

    now = now or datetime.now(timezone.utc)
    dtd = days_until_due(r, now)

    score = 0
    if dtd < 0:
        score += 100 + min(abs(dtd) * 2, 60)
    elif dtd <= 3:
        score += 80
    elif dtd <= 7:
        score += 50
    elif dtd <= 14:
        score += 25
    else:
        score += 5

    if r.blockers:
        score += 30 + len(r.blockers) * 10
    if r.status == "needs_review":
        score += 20
    if r.status == "client_action":
        score += 8  # visible, but not actionable by staff right now
    score += r.open_insight_count * 8

    return score


def priority_from_score(score: int) -> Priority:
    if score >= 100:
        return "urgent"
    if score >= 50:
        return "high"
    if score >= 20:
        return "normal"
    return "low"
