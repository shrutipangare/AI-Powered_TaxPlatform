"""Shared data model for the GreenGrowth prototype.

Everything downstream (traceability, affordances, AI trust, the dashboard,
status views) reads from the same TaxReturn graph so the four challenges
stay one coherent product instead of four disconnected demos.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional

Role = Literal["client", "preparer", "reviewer", "admin"]

ReturnStatus = Literal[
    "awaiting_documents",
    "in_preparation",
    "needs_review",
    "client_action",
    "ready_to_file",
    "filed",
]

STATUS_PIPELINE: list[ReturnStatus] = [
    "awaiting_documents",
    "in_preparation",
    "needs_review",
    "client_action",
    "ready_to_file",
    "filed",
]


@dataclass(frozen=True)
class StatusMeta:
    staff_label: str
    client_label: str
    owner: Role
    color: str


RETURN_STATUS_META: dict[ReturnStatus, StatusMeta] = {
    "awaiting_documents": StatusMeta(
        "Awaiting Documents", "We need a few documents from you", "client", "amber"
    ),
    "in_preparation": StatusMeta(
        "In Preparation", "Your preparer is working on this", "preparer", "steel"
    ),
    "needs_review": StatusMeta(
        "Needs Review", "Under internal review", "reviewer", "gold"
    ),
    "client_action": StatusMeta(
        "Waiting on Client", "Action needed from you", "client", "amber"
    ),
    "ready_to_file": StatusMeta(
        "Ready to File", "Ready to file — final review complete", "preparer", "pine"
    ),
    "filed": StatusMeta("Filed", "Filed", "admin", "slate"),
}

NEXT_STEP_COPY: dict[ReturnStatus, dict[str, str]] = {
    "awaiting_documents": {
        "staff": "Send the client a reminder for the outstanding documents listed below.",
        "client": "Upload the remaining documents so we can start preparing your return.",
    },
    "in_preparation": {
        "staff": "Continue populating and verifying return fields from the uploaded documents.",
        "client": "Nothing needed from you right now — your preparer is working through your documents.",
    },
    "needs_review": {
        "staff": "Complete the internal review and either approve or send back with notes.",
        "client": "Nothing needed from you right now — your return is in internal quality review.",
    },
    "client_action": {
        "staff": "Waiting on the client — a nudge may be worth sending if this sits for more than a few days.",
        "client": "We need a quick decision or document from you before we can move forward — see below.",
    },
    "ready_to_file": {
        "staff": "Get final client sign-off, then file.",
        "client": "Your return is ready. Review the summary and give final approval to file.",
    },
    "filed": {
        "staff": "Filed — confirm acceptance was received from the tax authority.",
        "client": "Your return has been filed. We'll let you know as soon as it's accepted.",
    },
}

DocType = Literal[
    "W-2", "1099-NEC", "1099-DIV", "1099-INT", "1098", "K-1",
    "Receipt", "Prior Year Return", "Bank Statement",
]

DOC_TYPE_ICON: dict[str, str] = {
    "W-2": "📄",
    "1099-NEC": "🧾",
    "1099-DIV": "🧾",
    "1099-INT": "🧾",
    "1098": "🏠",
    "K-1": "🤝",
    "Receipt": "🧷",
    "Prior Year Return": "🗂️",
    "Bank Statement": "🏦",
}


@dataclass
class SourceDocument:
    id: str
    return_id: str
    name: str
    doc_type: DocType
    uploaded_at: str
    uploaded_by: str
    page_count: int

    @property
    def icon(self) -> str:
        return DOC_TYPE_ICON.get(self.doc_type, "📄")


@dataclass
class SourceRef:
    document_id: str
    page: int
    excerpt: str
    label: str


FieldState = Literal["locked", "editable", "ai_pending", "verified"]


@dataclass
class ReturnField:
    id: str
    return_id: str
    section: str
    label: str
    value: str
    state: FieldState
    ai_generated: bool
    confidence: Optional[float] = None
    sources: list[SourceRef] = field(default_factory=list)
    transformation: Optional[str] = None
    locked_reason: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None


EvidenceWeight = Literal["supports", "conflicts"]


@dataclass
class Evidence:
    label: str
    detail: str
    weight: EvidenceWeight
    source: Optional[SourceRef] = None


InsightKind = Literal["extraction", "recommendation", "warning"]
InsightStatus = Literal["pending", "accepted", "corrected", "dismissed"]


@dataclass
class AIInsight:
    id: str
    return_id: str
    kind: InsightKind
    title: str
    message: str
    confidence: float
    evidence: list[Evidence]
    suggested_action: str
    status: InsightStatus = "pending"
    field_id: Optional[str] = None
    uncertainty_note: Optional[str] = None
    corrected_value: Optional[str] = None
    correction_note: Optional[str] = None


@dataclass
class AuditEvent:
    id: str
    return_id: str
    timestamp: str
    actor: str
    actor_role: Role
    action: str
    client_visible: bool


ReturnType = Literal["individual", "business"]
Priority = Literal["urgent", "high", "normal", "low"]


@dataclass
class TaxReturn:
    id: str
    client_name: str
    type: ReturnType
    tax_year: int
    status: ReturnStatus
    priority: Priority
    due_date: str
    assigned_preparer: str
    last_activity_at: str
    open_insight_count: int
    document_count: int
    business_name: Optional[str] = None
    assigned_reviewer: Optional[str] = None
    blockers: list[str] = field(default_factory=list)
    # Deep detail is only populated for a subset of "hero" returns used in the
    # traceability / affordance / trust screens. The rest of the ~200 rows
    # stay list-depth so the dashboard and search are tested against real
    # volume without needing to fabricate deep data for everything.
    fields: list[ReturnField] = field(default_factory=list)
    documents: list[SourceDocument] = field(default_factory=list)
    insights: list[AIInsight] = field(default_factory=list)
    audit_log: list[AuditEvent] = field(default_factory=list)

    @property
    def display_name(self) -> str:
        return self.business_name or self.client_name
