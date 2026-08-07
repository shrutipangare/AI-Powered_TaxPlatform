"""Server-side mutable overrides for the approve/reject/accept/correct flows.

Flask requests are stateless, so instead of the client-side React state the
original prototype used, actions here mutate a module-level in-memory store.
That's a deliberate simplification (still no real database — a server
restart wipes it, see README) but it means state now survives a page
refresh, which the original client-only version couldn't do.
"""
from __future__ import annotations

from models import FieldState, InsightStatus

_field_overrides: dict[str, dict] = {}
_insight_overrides: dict[str, dict] = {}


def field_state(field) -> FieldState:
    return _field_overrides.get(field.id, {}).get("state", field.state)


def field_value(field) -> str:
    return _field_overrides.get(field.id, {}).get("value", field.value)


def field_note(field_id: str) -> str | None:
    return _field_overrides.get(field_id, {}).get("note")


def approve_field(field_id: str) -> None:
    _field_overrides.setdefault(field_id, {})["state"] = "verified"


def reject_field(field_id: str) -> None:
    _field_overrides[field_id] = {
        **_field_overrides.get(field_id, {}),
        "state": "editable",
        "note": "Rejected by preparer — needs manual entry.",
    }


def revert_field(field_id: str) -> None:
    _field_overrides.pop(field_id, None)


def save_field_value(field_id: str, value: str) -> None:
    _field_overrides.setdefault(field_id, {})["value"] = value


def insight_status(insight) -> InsightStatus:
    return _insight_overrides.get(insight.id, {}).get("status", insight.status)


def insight_corrected_value(insight) -> str | None:
    return _insight_overrides.get(insight.id, {}).get("corrected_value", insight.corrected_value)


def insight_correction_note(insight) -> str | None:
    return _insight_overrides.get(insight.id, {}).get("correction_note", insight.correction_note)


def insight_correction_summary(insight) -> str | None:
    return _insight_overrides.get(insight.id, {}).get("correction_summary")


def accept_insight(insight_id: str) -> None:
    _insight_overrides[insight_id] = {"status": "accepted"}


def dismiss_insight(insight_id: str) -> None:
    _insight_overrides[insight_id] = {"status": "dismissed"}


def correct_insight(insight_id: str, value: str, note: str, summary: str | None = None) -> None:
    _insight_overrides[insight_id] = {
        "status": "corrected",
        "corrected_value": value,
        "correction_note": note,
        "correction_summary": summary,
    }


def reset_all() -> None:
    """Used by the 'Reset demo data' control so the prototype can be replayed
    without restarting the server."""
    _field_overrides.clear()
    _insight_overrides.clear()
