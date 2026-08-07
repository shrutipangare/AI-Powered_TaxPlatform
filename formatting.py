from __future__ import annotations

from datetime import datetime, timezone


def _parse(iso: str) -> datetime:
    return datetime.fromisoformat(iso)


def format_relative_date(iso: str, now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    dt = _parse(iso)
    diff_days = round((dt - now).total_seconds() / 86400)

    if diff_days == 0:
        return "today"
    if diff_days == 1:
        return "tomorrow"
    if diff_days == -1:
        return "yesterday"
    if 1 < diff_days <= 21:
        return f"in {diff_days} days"
    if -21 <= diff_days < -1:
        return f"{abs(diff_days)} days ago"

    fmt = "%b %-d, %Y" if dt.year != now.year else "%b %-d"
    return dt.strftime(fmt)


def format_date(iso: str) -> str:
    return _parse(iso).strftime("%b %-d, %Y")


def initials(name: str) -> str:
    parts = [p for p in name.split(" ") if p and p[0].isalpha()]
    return "".join(p[0].upper() for p in parts[:2])
