"""Mock data generator.

Three "hero" returns carry full field/document/insight/audit depth and back
challenges 01, 08, and 10. ~200 additional list-depth returns give the
dashboard and search real volume to run against (challenge 07), generated
with a seeded RNG so the dataset is stable across every request and every
screen recording take.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from models import (
    AIInsight,
    AuditEvent,
    Evidence,
    ReturnField,
    ReturnStatus,
    SourceDocument,
    SourceRef,
    TaxReturn,
)
from priority import priority_from_score, urgency_score


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso_days_from_now(days: float) -> str:
    return (_now() + timedelta(days=days)).isoformat()


def _iso_days_ago(days: float) -> str:
    return _iso_days_from_now(-days)


# ---------------------------------------------------------------------------
# Hero returns
# ---------------------------------------------------------------------------

def _hero_chen() -> TaxReturn:
    rid = "RTN-1001"

    documents = [
        SourceDocument("DOC-1001-A", rid, "W-2 — Bright Horizons Media", "W-2", _iso_days_ago(19), "Maria Chen", 1),
        SourceDocument("DOC-1001-B", rid, "W-2 — Lakeside Consulting (part-year)", "W-2", _iso_days_ago(19), "Maria Chen", 1),
        SourceDocument("DOC-1001-C", rid, "1099-INT — Meridian Credit Union", "1099-INT", _iso_days_ago(14), "Maria Chen", 1),
        SourceDocument("DOC-1001-D", rid, "1099-DIV — Fairview Brokerage", "1099-DIV", _iso_days_ago(11), "Maria Chen", 2),
    ]

    fields = [
        ReturnField(
            id="FLD-1001-wages", return_id=rid, section="Form 1040",
            label="Line 1a — Wages, tips, other compensation", value="$96,420.00",
            state="verified", ai_generated=True, confidence=0.97,
            sources=[
                SourceRef("DOC-1001-A", 1, "Box 1  Wages, tips, other compensation ....... 71,200.00", "Box 1 — Wages, tips, other comp."),
                SourceRef("DOC-1001-B", 1, "Box 1  Wages, tips, other compensation ....... 25,220.00", "Box 1 — Wages, tips, other comp."),
            ],
            transformation="Sum of Box 1 across 2 W-2s: $71,200.00 + $25,220.00",
            verified_by="Janelle Ruiz, CPA", verified_at=_iso_days_ago(6),
        ),
        ReturnField(
            id="FLD-1001-interest", return_id=rid, section="Form 1040",
            label="Line 2b — Taxable interest", value="$412.18",
            state="verified", ai_generated=True, confidence=0.99,
            sources=[SourceRef("DOC-1001-C", 1, "Box 1  Interest income ....... 412.18", "Box 1 — Interest income")],
            transformation="Direct pull, no calculation required",
            verified_by="Janelle Ruiz, CPA", verified_at=_iso_days_ago(6),
        ),
        ReturnField(
            id="FLD-1001-dividends", return_id=rid, section="Form 1040",
            label="Line 3b — Ordinary dividends", value="$1,840.55",
            state="ai_pending", ai_generated=True, confidence=0.91,
            sources=[SourceRef("DOC-1001-D", 1, "1a  Total ordinary dividends ....... 1,840.55", "Box 1a — Total ordinary dividends")],
            transformation="Direct pull, no calculation required",
        ),
        ReturnField(
            id="FLD-1001-filing-status", return_id=rid, section="Form 1040",
            label="Filing Status", value="Single", state="locked", ai_generated=False,
            locked_reason="Confirmed with client during intake and unchanged from last year — locked to prevent an accidental edit mid-preparation. A preparer can unlock it from the field menu.",
        ),
        ReturnField(
            id="FLD-1001-address", return_id=rid, section="Client Profile",
            label="Mailing Address", value="482 Ashgrove Ln, Portland, OR 97214",
            state="editable", ai_generated=False,
        ),
    ]

    insights = [
        AIInsight(
            id="INS-1001-div", return_id=rid, field_id="FLD-1001-dividends", kind="extraction",
            title="Ordinary dividends extracted from 1099-DIV",
            message="Extracted $1,840.55 in ordinary dividends from Fairview Brokerage. Value matches Box 1a exactly with no rounding or formatting ambiguity.",
            confidence=0.91,
            evidence=[
                Evidence(
                    "Clean single-box match", "Box 1a value maps directly to Line 3b with no transformation.",
                    "supports",
                    SourceRef("DOC-1001-D", 1, "1a  Total ordinary dividends ....... 1,840.55", "Box 1a — Total ordinary dividends"),
                ),
            ],
            suggested_action="Approve to mark this field verified.",
            status="pending",
        ),
        AIInsight(
            id="INS-1001-qbi", return_id=rid, kind="recommendation",
            title="Possible QBI deduction not yet claimed",
            message="Maria's Lakeside Consulting income may qualify for a Qualified Business Income deduction if it was reported on a 1099-NEC rather than a W-2. Currently modeled as W-2 wages, which would make this inapplicable — worth a quick client check.",
            confidence=0.62,
            evidence=[
                Evidence("Consulting-style employer name", "\"Lakeside Consulting\" plus a mid-year start date is a common pattern for reclassified contract work.", "supports"),
                Evidence("Document says W-2, not 1099-NEC", "The uploaded document is explicitly a W-2, which reports employee wages, not self-employment income.", "conflicts"),
            ],
            uncertainty_note="Confidence is capped at 0.62 because the primary evidence (document type) contradicts the pattern that triggered this suggestion. Treat as a prompt to ask the client, not a finding.",
            suggested_action="Ask client to confirm whether this was W-2 or contract work before filing.",
            status="pending",
        ),
        AIInsight(
            id="INS-1001-warning", return_id=rid, kind="warning",
            title="Two employers within one filing year",
            message="Wages were reported across 2 separate employers. This is common and not itself a problem, but double-check for excess Social Security withholding if combined wages exceed the annual wage base.",
            confidence=0.85,
            evidence=[Evidence("Combined wages under wage base", "$96,420.00 combined is below the relevant Social Security wage base for the year.", "conflicts")],
            suggested_action="No action required — confirmed below threshold.",
            status="dismissed",
        ),
    ]

    audit_log = [
        AuditEvent("AUD-1001-1", rid, _iso_days_ago(19), "Maria Chen", "client", "Uploaded 4 documents", True),
        AuditEvent("AUD-1001-2", rid, _iso_days_ago(18), "System", "admin", "AI extraction completed on all uploaded documents", False),
        AuditEvent("AUD-1001-3", rid, _iso_days_ago(6), "Janelle Ruiz, CPA", "preparer", "Verified wages and interest income fields", False),
    ]

    return TaxReturn(
        id=rid, client_name="Maria Chen", type="individual", tax_year=2025,
        status="in_preparation", priority="normal", due_date=_iso_days_from_now(18),
        assigned_preparer="Janelle Ruiz, CPA", assigned_reviewer="Dana Okoye, CPA",
        blockers=[], last_activity_at=_iso_days_ago(6), open_insight_count=2,
        document_count=len(documents), fields=fields, documents=documents,
        insights=insights, audit_log=audit_log,
    )


def _hero_okafor() -> TaxReturn:
    rid = "RTN-1002"

    documents = [
        SourceDocument("DOC-1002-A", rid, "1099-NEC — Summit Design Studio", "1099-NEC", _iso_days_ago(9), "David Okafor", 1),
        SourceDocument("DOC-1002-B", rid, "Receipt — Home Office Equipment", "Receipt", _iso_days_ago(8), "David Okafor", 1),
        SourceDocument("DOC-1002-C", rid, "Bank Statement — Business Checking, Nov", "Bank Statement", _iso_days_ago(8), "David Okafor", 4),
    ]

    fields = [
        ReturnField(
            id="FLD-1002-nec", return_id=rid, section="Schedule C",
            label="Gross receipts — Summit Design Studio", value="$18,400.00",
            state="verified", ai_generated=True, confidence=0.98,
            sources=[SourceRef("DOC-1002-A", 1, "Box 1  Nonemployee compensation ....... 18,400.00", "Box 1 — Nonemployee compensation")],
            transformation="Direct pull, no calculation required",
            verified_by="Tom Reyes, CPA", verified_at=_iso_days_ago(3),
        ),
        ReturnField(
            id="FLD-1002-expense", return_id=rid, section="Schedule C",
            label="Line 27a — Other expenses: Equipment", value="$1,240.00",
            state="ai_pending", ai_generated=True, confidence=0.58,
            sources=[SourceRef("DOC-1002-B", 1, "TOTAL ....... $1,240.00 (handwritten, partially legible)", "Receipt total")],
            transformation="Extracted total from a photographed receipt; category inferred from item description.",
        ),
    ]

    insights = [
        AIInsight(
            id="INS-1002-expense", return_id=rid, field_id="FLD-1002-expense", kind="extraction",
            title="Equipment expense extracted from photographed receipt",
            message="Extracted $1,240.00 from a home office equipment receipt. Image quality was moderate — the vendor name and one digit of the total were only partially legible.",
            confidence=0.58,
            evidence=[
                Evidence(
                    "Total matched on second read", "OCR agreed on \"$1,240.00\" across 2 of 3 passes over the image.",
                    "supports",
                    SourceRef("DOC-1002-B", 1, "TOTAL ....... $1,240.00 (handwritten, partially legible)", "Receipt total"),
                ),
                Evidence(
                    "No matching bank transaction found yet",
                    "Business checking statement for the same period doesn't show an exact $1,240.00 charge, only a $1,290.00 debit 2 days later.",
                    "conflicts",
                    SourceRef("DOC-1002-C", 2, "11/14  POS DEBIT  NORTHPOINT OFFICE SUPPLY  -1,290.00", "Nov 14 — Debit card purchase"),
                ),
            ],
            uncertainty_note="Confidence held below 0.60 because the receipt image and the bank statement disagree by $50.00. This needs a human to reconcile before the field can be verified.",
            suggested_action="Compare against the $1,290.00 bank debit and confirm the correct amount with the client.",
            status="pending",
        ),
    ]

    audit_log = [
        AuditEvent("AUD-1002-1", rid, _iso_days_ago(9), "David Okafor", "client", "Uploaded 3 documents", True),
        AuditEvent("AUD-1002-2", rid, _iso_days_ago(3), "Tom Reyes, CPA", "preparer", "Verified gross receipts field", False),
    ]

    return TaxReturn(
        id=rid, client_name="David Okafor", type="individual", tax_year=2025,
        status="needs_review", priority="high", due_date=_iso_days_from_now(5),
        assigned_preparer="Tom Reyes, CPA", assigned_reviewer="Dana Okoye, CPA",
        blockers=["Equipment expense amount conflicts with bank statement"],
        last_activity_at=_iso_days_ago(3), open_insight_count=1,
        document_count=len(documents), fields=fields, documents=documents,
        insights=insights, audit_log=audit_log,
    )


def _hero_whitfield() -> TaxReturn:
    rid = "RTN-1003"

    documents = [
        SourceDocument("DOC-1003-A", rid, "K-1 — Whitfield & Co Partnership", "K-1", _iso_days_ago(25), "Marcus Whitfield", 3),
        SourceDocument("DOC-1003-B", rid, "Prior Year Return — 2024", "Prior Year Return", _iso_days_ago(25), "Marcus Whitfield", 12),
    ]

    fields = [
        ReturnField(
            id="FLD-1003-k1income", return_id=rid, section="Schedule E",
            label="Line 28 — Partnership income", value="$142,880.00",
            state="verified", ai_generated=True, confidence=0.95,
            sources=[SourceRef("DOC-1003-A", 1, "Box 1  Ordinary business income (loss) ....... 142,880.00", "Box 1 — Ordinary business income")],
            transformation="Direct pull, no calculation required",
            verified_by="Janelle Ruiz, CPA", verified_at=_iso_days_ago(20),
        ),
        ReturnField(
            id="FLD-1003-priorbasis", return_id=rid, section="Schedule E — Basis Worksheet",
            label="Beginning partner basis", value="$318,004.00",
            state="locked", ai_generated=True, confidence=0.99,
            sources=[SourceRef("DOC-1003-B", 9, "Partner ending capital account, 12/31/2024 ....... 318,004.00", "Ending basis, prior year")],
            transformation="Carried forward from last year's ending basis — locked so it can't drift from the prior filing.",
            locked_reason="Carried forward directly from the signed 2024 return. Locked because this value must match the prior filing exactly; edit last year's return instead if it's wrong.",
        ),
    ]

    audit_log = [
        AuditEvent("AUD-1003-1", rid, _iso_days_ago(25), "Marcus Whitfield", "client", "Uploaded 2 documents", True),
        AuditEvent("AUD-1003-2", rid, _iso_days_ago(20), "Janelle Ruiz, CPA", "preparer", "Verified partnership income field", False),
    ]

    return TaxReturn(
        id=rid, client_name="Marcus Whitfield", business_name="Whitfield & Co",
        type="business", tax_year=2025, status="ready_to_file", priority="low",
        due_date=_iso_days_from_now(32), assigned_preparer="Janelle Ruiz, CPA",
        assigned_reviewer="Dana Okoye, CPA", blockers=[], last_activity_at=_iso_days_ago(20),
        open_insight_count=0, document_count=len(documents), fields=fields,
        documents=documents, insights=[], audit_log=audit_log,
    )


HERO_RETURNS: list[TaxReturn] = [_hero_chen(), _hero_okafor(), _hero_whitfield()]

# ---------------------------------------------------------------------------
# Bulk, list-depth returns — real volume for the dashboard, search, and
# status views (per the case study: "hundreds of mock items, not a handful
# of demo rows"). No deep field/document/insight graphs; only the hero
# returns above carry those.
# ---------------------------------------------------------------------------

## Deliberately picked for easy on-camera pronunciation (this pool backs
## every name shown on the dashboard and returns list, which get read aloud
## in the demo video) — common, unambiguous first/last names, nothing with
## unfamiliar consonant clusters or non-obvious stress patterns.
FIRST_NAMES = [
    "Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Mason",
    "Isabella", "Lucas", "Mia", "James", "Amelia", "Benjamin", "Harper",
    "Elijah", "Evelyn", "Aiden", "Abigail", "Grayson", "Emily", "Wyatt",
    "Elizabeth", "Julian", "Sofia", "Levi", "Avery", "Owen", "Ella",
    "Carter", "Diego", "Ingrid", "Mateo", "Freya", "Nora", "Victor",
    "Grace", "Marcus", "Maya", "Priya",
]
LAST_NAMES = [
    "Larsen", "Whitfield", "Okoye", "Chen", "Alvarez", "Reyes", "Novak",
    "Singh", "Feldman", "Okafor", "Hendricks", "Delgado", "Ferreira",
    "Grant", "Holloway", "Jansen", "Kaplan", "Bennett", "Foster", "Parker",
    "Morgan", "Hughes", "Sullivan", "Coleman", "Barrett", "Wallace",
]
BUSINESS_SUFFIXES = ["& Co", "Partners", "Group", "LLC", "Studio", "Holdings"]
STAFF = [
    "Janelle Ruiz, CPA", "Tom Reyes, CPA", "Priya Anand, CPA",
    "Marcus Webb, EA", "Dana Okoye, CPA", "Sofia Bennett, CPA",
]
REVIEWERS = ["Dana Okoye, CPA", "Priya Anand, CPA", "Sofia Bennett, CPA"]

STATUS_WEIGHTS: list[tuple[ReturnStatus, int]] = [
    ("awaiting_documents", 18),
    ("in_preparation", 30),
    ("needs_review", 16),
    ("client_action", 14),
    ("ready_to_file", 12),
    ("filed", 10),
]

BLOCKER_POOL = [
    "Missing spouse W-2",
    "Unreconciled bank transaction",
    "Client signature outstanding",
    "1099 amount conflicts with bank statement",
    "Awaiting corrected K-1 from partnership",
    "Prior year AGI mismatch",
]


def _generate_bulk_returns(count: int, seed: int) -> list[TaxReturn]:
    rng = random.Random(seed)
    results: list[TaxReturn] = []

    statuses, weights = zip(*STATUS_WEIGHTS)

    for i in range(count):
        rid = f"RTN-{2000 + i}"
        rtype = rng.choices(["individual", "business"], weights=[7, 3])[0]
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        client_name = f"{first} {last}"
        business_name = f"{last} {rng.choice(BUSINESS_SUFFIXES)}" if rtype == "business" else None

        status = rng.choices(statuses, weights=weights)[0]

        if status == "filed":
            due_date = _iso_days_ago(rng.randint(1, 40))
        else:
            roll = rng.random()
            if roll < 0.12:
                due_date = _iso_days_ago(rng.randint(1, 6))  # overdue
            elif roll < 0.35:
                due_date = _iso_days_from_now(rng.randint(1, 7))
            elif roll < 0.65:
                due_date = _iso_days_from_now(rng.randint(8, 21))
            else:
                due_date = _iso_days_from_now(rng.randint(22, 75))

        has_blocker = status not in ("filed", "ready_to_file") and rng.random() < 0.22
        blockers = [rng.choice(BLOCKER_POOL)] if has_blocker else []

        open_insight_count = 0
        if status != "filed":
            open_insight_count = rng.choices([0, 1, 2, 3, 4], weights=[40, 30, 18, 8, 4])[0]

        last_activity_at = (
            _iso_days_ago(rng.randint(10, 60)) if status == "filed" else _iso_days_ago(rng.randint(0, 21))
        )

        r = TaxReturn(
            id=rid, client_name=client_name, business_name=business_name, type=rtype,
            tax_year=2025, status=status, priority="normal", due_date=due_date,
            assigned_preparer=rng.choice(STAFF),
            assigned_reviewer=rng.choice(REVIEWERS) if rng.random() < 0.8 else None,
            blockers=blockers, last_activity_at=last_activity_at,
            open_insight_count=open_insight_count, document_count=rng.randint(1, 14),
        )
        r.priority = priority_from_score(urgency_score(r))
        results.append(r)

    return results


_cached_returns: list[TaxReturn] | None = None


def get_all_returns() -> list[TaxReturn]:
    global _cached_returns
    if _cached_returns is not None:
        return _cached_returns
    bulk = _generate_bulk_returns(197, seed=20260806)
    all_returns = [*HERO_RETURNS, *bulk]
    for r in all_returns:
        r.priority = priority_from_score(urgency_score(r))
    _cached_returns = all_returns
    return _cached_returns


def get_return_by_id(return_id: str) -> TaxReturn | None:
    return next((r for r in get_all_returns() if r.id == return_id), None)
