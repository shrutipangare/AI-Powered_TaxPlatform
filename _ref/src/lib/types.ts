// Shared data model for the GreenGrowth prototype.
// Everything downstream (traceability, affordances, AI trust, the dashboard,
// status views) reads from the same TaxReturn graph so the four challenges
// stay one coherent product instead of four disconnected demos.

export type Role = "client" | "preparer" | "reviewer" | "admin";

export type ReturnStatus =
  | "awaiting_documents"
  | "in_preparation"
  | "needs_review"
  | "client_action"
  | "ready_to_file"
  | "filed";

export type StatusColor = "amber" | "steel" | "gold" | "pine" | "slate" | "rust";

export const RETURN_STATUS_META: Record<
  ReturnStatus,
  { staffLabel: string; clientLabel: string; owner: Role; color: StatusColor }
> = {
  awaiting_documents: {
    staffLabel: "Awaiting Documents",
    clientLabel: "We need a few documents from you",
    owner: "client",
    color: "amber",
  },
  in_preparation: {
    staffLabel: "In Preparation",
    clientLabel: "Your preparer is working on this",
    owner: "preparer",
    color: "steel",
  },
  needs_review: {
    staffLabel: "Needs Review",
    clientLabel: "Under internal review",
    owner: "reviewer",
    color: "gold",
  },
  client_action: {
    staffLabel: "Waiting on Client",
    clientLabel: "Action needed from you",
    owner: "client",
    color: "rust",
  },
  ready_to_file: {
    staffLabel: "Ready to File",
    clientLabel: "Ready to file — final review complete",
    owner: "preparer",
    color: "pine",
  },
  filed: {
    staffLabel: "Filed",
    clientLabel: "Filed",
    owner: "admin",
    color: "slate",
  },
};

export type DocType =
  | "W-2"
  | "1099-NEC"
  | "1099-DIV"
  | "1099-INT"
  | "1098"
  | "K-1"
  | "Receipt"
  | "Prior Year Return"
  | "Bank Statement";

export interface SourceDocument {
  id: string;
  returnId: string;
  name: string;
  docType: DocType;
  uploadedAt: string; // ISO date
  uploadedBy: string;
  pageCount: number;
}

export interface SourceRef {
  documentId: string;
  page: number;
  excerpt: string; // fabricated OCR-style snippet
  label: string; // e.g. "Box 1 — Wages, tips, other comp."
}

export type FieldState = "locked" | "editable" | "ai_pending" | "verified";

export interface ReturnField {
  id: string;
  returnId: string;
  section: string; // e.g. "Form 1040"
  label: string; // e.g. "Line 1a — Wages"
  value: string;
  state: FieldState;
  aiGenerated: boolean;
  confidence?: number; // 0-1, only present when aiGenerated
  sources?: SourceRef[]; // multiple when a value is derived from >1 document
  transformation?: string; // e.g. "Sum of Box 1 across 2 W-2s"
  lockedReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export type EvidenceWeight = "supports" | "conflicts";

export interface Evidence {
  label: string;
  detail: string;
  weight: EvidenceWeight;
  source?: SourceRef;
}

export type InsightKind = "extraction" | "recommendation" | "warning";
export type InsightStatus = "pending" | "accepted" | "corrected" | "dismissed";

export interface AIInsight {
  id: string;
  returnId: string;
  fieldId?: string;
  kind: InsightKind;
  title: string;
  message: string;
  confidence: number; // 0-1
  evidence: Evidence[];
  uncertaintyNote?: string;
  suggestedAction: string;
  status: InsightStatus;
  correctedValue?: string;
  correctionNote?: string;
}

export interface AuditEvent {
  id: string;
  returnId: string;
  timestamp: string;
  actor: string;
  actorRole: Role;
  action: string;
  clientVisible: boolean;
}

export type ReturnType = "individual" | "business";
export type Priority = "urgent" | "high" | "normal" | "low";

export interface TaxReturn {
  id: string;
  clientName: string;
  businessName?: string;
  type: ReturnType;
  taxYear: number;
  status: ReturnStatus;
  priority: Priority;
  dueDate: string; // ISO date
  assignedPreparer: string;
  assignedReviewer?: string;
  blockers: string[];
  lastActivityAt: string; // ISO datetime
  openInsightCount: number;
  documentCount: number;
  // Deep detail is only populated for a subset of "hero" returns used in the
  // traceability / affordance / trust screens. The rest of the ~200 rows
  // stay list-depth so the dashboard and search are tested against real
  // volume without needing to fabricate deep data for everything.
  fields?: ReturnField[];
  documents?: SourceDocument[];
  insights?: AIInsight[];
  auditLog?: AuditEvent[];
}
