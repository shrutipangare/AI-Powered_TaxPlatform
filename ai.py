"""The one genuinely-wired AI call in this prototype.

Everything else in the app (confidence scores, evidence, extracted values)
is fabricated demo data per the case study's own instructions. This module
is the exception: when a preparer corrects an AI insight, the free-text
reason they type gets sent to Claude and turned into a clean one-sentence
summary suitable for an audit log / retraining dataset. It's a small,
contained example of wiring a real model call into the same UI pattern the
rest of the app only simulates.

Fails soft everywhere: no API key, a network error, or an empty note all
just mean no AI summary is shown — the raw note the preparer typed is
always saved and displayed regardless, so this never blocks the demo.
"""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

_MODEL = "claude-haiku-4-5-20251001"
_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    from anthropic import Anthropic
    _client = Anthropic(api_key=api_key)
    return _client


def summarize_correction(
    field_label: str, ai_value: str, corrected_value: str, note: str
) -> str | None:
    """Turn a preparer's free-text correction reason into a one-sentence,
    audit-log-ready summary. Returns None (never raises) if unavailable."""
    if not note.strip():
        return None
    client = _get_client()
    if client is None:
        return None

    prompt = (
        f"A tax preparer corrected an AI-extracted value on field "
        f"\"{field_label}\" from \"{ai_value}\" to \"{corrected_value}\". "
        f"Their reason, in their own words: \"{note.strip()}\"\n\n"
        "Write one short, plain-English sentence summarizing why the "
        "correction was made, suitable for an audit log. No preamble, "
        "just the sentence."
    )
    try:
        response = client.messages.create(
            model=_MODEL,
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(
            block.text for block in response.content if block.type == "text"
        ).strip()
        return text or None
    except Exception:
        return None
