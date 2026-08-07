import { mulberry32, pick, pickWeighted, randInt } from "./rng";
import { priorityFromScore, urgencyScore } from "./priority";
import type {
  AIInsight,
  AuditEvent,
  DocType,
  ReturnField,
  ReturnStatus,
  SourceDocument,
  TaxReturn,
} from "./types";

const DAY = 1000 * 60 * 60 * 24;
const now = () => new Date();
const isoDaysFromNow = (days: number) =>
  new Date(now().getTime() + days * DAY).toISOString();
const isoDaysAgo = (days: number) => isoDaysFromNow(-days);

// ---------------------------------------------------------------------------
// Hero returns — fully wired with documents, fields, AI insights, and an
// audit log. These back challenges 01 (traceability), 08 (affordances) and
// 10 (trustworthy AI). Deliberately includes a low-confidence flag and a
// corrected insight so the demo isn't a single happy path.
// ---------------------------------------------------------------------------

function heroChen(): TaxReturn {
  const returnId = "RTN-1001";

  const documents: SourceDocument[] = [
    {
      id: "DOC-1001-A",
      returnId,
      name: "W-2 — Bright Horizons Media",
      docType: "W-2",
      uploadedAt: isoDaysAgo(19),
      uploadedBy: "Maria Chen",
      pageCount: 1,
    },
    {
      id: "DOC-1001-B",
      returnId,
      name: "W-2 — Lakeside Consulting (part-year)",
      docType: "W-2",
      uploadedAt: isoDaysAgo(19),
      uploadedBy: "Maria Chen",
      pageCount: 1,
    },
    {
      id: "DOC-1001-C",
      returnId,
      name: "1099-INT — Meridian Credit Union",
      docType: "1099-INT",
      uploadedAt: isoDaysAgo(14),
      uploadedBy: "Maria Chen",
      pageCount: 1,
    },
    {
      id: "DOC-1001-D",
      returnId,
      name: "1099-DIV — Fairview Brokerage",
      docType: "1099-DIV",
      uploadedAt: isoDaysAgo(11),
      uploadedBy: "Maria Chen",
      pageCount: 2,
    },
  ];

  const fields: ReturnField[] = [
    {
      id: "FLD-1001-wages",
      returnId,
      section: "Form 1040",
      label: "Line 1a — Wages, tips, other compensation",
      value: "$96,420.00",
      state: "verified",
      aiGenerated: true,
      confidence: 0.97,
      sources: [
        {
          documentId: "DOC-1001-A",
          page: 1,
          label: "Box 1 — Wages, tips, other comp.",
          excerpt: "Box 1  Wages, tips, other compensation ....... 71,200.00",
        },
        {
          documentId: "DOC-1001-B",
          page: 1,
          label: "Box 1 — Wages, tips, other comp.",
          excerpt: "Box 1  Wages, tips, other compensation ....... 25,220.00",
        },
      ],
      transformation: "Sum of Box 1 across 2 W-2s: $71,200.00 + $25,220.00",
      verifiedBy: "Janelle Ruiz, CPA",
      verifiedAt: isoDaysAgo(6),
    },
    {
      id: "FLD-1001-interest",
      returnId,
      section: "Form 1040",
      label: "Line 2b — Taxable interest",
      value: "$412.18",
      state: "verified",
      aiGenerated: true,
      confidence: 0.99,
      sources: [
        {
          documentId: "DOC-1001-C",
          page: 1,
          label: "Box 1 — Interest income",
          excerpt: "Box 1  Interest income ....... 412.18",
        },
      ],
      transformation: "Direct pull, no calculation required",
      verifiedBy: "Janelle Ruiz, CPA",
      verifiedAt: isoDaysAgo(6),
    },
    {
      id: "FLD-1001-dividends",
      returnId,
      section: "Form 1040",
      label: "Line 3b — Ordinary dividends",
      value: "$1,840.55",
      state: "ai_pending",
      aiGenerated: true,
      confidence: 0.91,
      sources: [
        {
          documentId: "DOC-1001-D",
          page: 1,
          label: "Box 1a — Total ordinary dividends",
          excerpt: "1a  Total ordinary dividends ....... 1,840.55",
        },
      ],
      transformation: "Direct pull, no calculation required",
    },
    {
      id: "FLD-1001-filing-status",
      returnId,
      section: "Form 1040",
      label: "Filing Status",
      value: "Single",
      state: "locked",
      aiGenerated: false,
      lockedReason:
        "Confirmed with client during intake and unchanged from last year — locked to prevent an accidental edit mid-preparation. A preparer can unlock it from the field menu.",
    },
    {
      id: "FLD-1001-address",
      returnId,
      section: "Client Profile",
      label: "Mailing Address",
      value: "482 Ashgrove Ln, Portland, OR 97214",
      state: "editable",
      aiGenerated: false,
    },
  ];

  const insights: AIInsight[] = [
    {
      id: "INS-1001-div",
      returnId,
      fieldId: "FLD-1001-dividends",
      kind: "extraction",
      title: "Ordinary dividends extracted from 1099-DIV",
      message:
        "Extracted $1,840.55 in ordinary dividends from Fairview Brokerage. Value matches Box 1a exactly with no rounding or formatting ambiguity.",
      confidence: 0.91,
      evidence: [
        {
          label: "Clean single-box match",
          detail: "Box 1a value maps directly to Line 3b with no transformation.",
          weight: "supports",
          source: {
            documentId: "DOC-1001-D",
            page: 1,
            label: "Box 1a — Total ordinary dividends",
            excerpt: "1a  Total ordinary dividends ....... 1,840.55",
          },
        },
      ],
      suggestedAction: "Approve to mark this field verified.",
      status: "pending",
    },
    {
      id: "INS-1001-qbi",
      returnId,
      kind: "recommendation",
      title: "Possible QBI deduction not yet claimed",
      message:
        "Maria's Lakeside Consulting income may qualify for a Qualified Business Income deduction if it was reported on a 1099-NEC rather than a W-2. Currently modeled as W-2 wages, which would make this inapplicable — worth a quick client check.",
      confidence: 0.62,
      evidence: [
        {
          label: "Consulting-style employer name",
          detail:
            "\"Lakeside Consulting\" plus a mid-year start date is a common pattern for reclassified contract work.",
          weight: "supports",
        },
        {
          label: "Document says W-2, not 1099-NEC",
          detail: "The uploaded document is explicitly a W-2, which reports employee wages, not self-employment income.",
          weight: "conflicts",
        },
      ],
      uncertaintyNote:
        "Confidence is capped at 0.62 because the primary evidence (document type) contradicts the pattern that triggered this suggestion. Treat as a prompt to ask the client, not a finding.",
      suggestedAction: "Ask client to confirm whether this was W-2 or contract work before filing.",
      status: "pending",
    },
    {
      id: "INS-1001-warning",
      returnId,
      kind: "warning",
      title: "Two employers within one filing year",
      message:
        "Wages were reported across 2 separate employers. This is common and not itself a problem, but double-check for excess Social Security withholding if combined wages exceed the annual wage base.",
      confidence: 0.85,
      evidence: [
        {
          label: "Combined wages under wage base",
          detail: "$96,420.00 combined is below the relevant Social Security wage base for the year.",
          weight: "conflicts",
        },
      ],
      suggestedAction: "No action required — confirmed below threshold.",
      status: "dismissed",
    },
  ];

  const auditLog: AuditEvent[] = [
    {
      id: "AUD-1001-1",
      returnId,
      timestamp: isoDaysAgo(19),
      actor: "Maria Chen",
      actorRole: "client",
      action: "Uploaded 4 documents",
      clientVisible: true,
    },
    {
      id: "AUD-1001-2",
      returnId,
      timestamp: isoDaysAgo(18),
      actor: "System",
      actorRole: "admin",
      action: "AI extraction completed on all uploaded documents",
      clientVisible: false,
    },
    {
      id: "AUD-1001-3",
      returnId,
      timestamp: isoDaysAgo(6),
      actor: "Janelle Ruiz, CPA",
      actorRole: "preparer",
      action: "Verified wages and interest income fields",
      clientVisible: false,
    },
  ];

  return {
    id: returnId,
    clientName: "Maria Chen",
    type: "individual",
    taxYear: 2025,
    status: "in_preparation",
    priority: "normal",
    dueDate: isoDaysFromNow(18),
    assignedPreparer: "Janelle Ruiz, CPA",
    assignedReviewer: "Dana Okoye, CPA",
    blockers: [],
    lastActivityAt: isoDaysAgo(6),
    openInsightCount: 2,
    documentCount: documents.length,
    fields,
    documents,
    insights,
    auditLog,
  };
}

function heroOkafor(): TaxReturn {
  const returnId = "RTN-1002";

  const documents: SourceDocument[] = [
    {
      id: "DOC-1002-A",
      returnId,
      name: "1099-NEC — Summit Design Studio",
      docType: "1099-NEC",
      uploadedAt: isoDaysAgo(9),
      uploadedBy: "David Okafor",
      pageCount: 1,
    },
    {
      id: "DOC-1002-B",
      returnId,
      name: "Receipt — Home Office Equipment",
      docType: "Receipt",
      uploadedAt: isoDaysAgo(8),
      uploadedBy: "David Okafor",
      pageCount: 1,
    },
    {
      id: "DOC-1002-C",
      returnId,
      name: "Bank Statement — Business Checking, Nov",
      docType: "Bank Statement",
      uploadedAt: isoDaysAgo(8),
      uploadedBy: "David Okafor",
      pageCount: 4,
    },
  ];

  const fields: ReturnField[] = [
    {
      id: "FLD-1002-nec",
      returnId,
      section: "Schedule C",
      label: "Gross receipts — Summit Design Studio",
      value: "$18,400.00",
      state: "verified",
      aiGenerated: true,
      confidence: 0.98,
      sources: [
        {
          documentId: "DOC-1002-A",
          page: 1,
          label: "Box 1 — Nonemployee compensation",
          excerpt: "Box 1  Nonemployee compensation ....... 18,400.00",
        },
      ],
      transformation: "Direct pull, no calculation required",
      verifiedBy: "Tom Reyes, CPA",
      verifiedAt: isoDaysAgo(3),
    },
    {
      id: "FLD-1002-expense",
      returnId,
      section: "Schedule C",
      label: "Line 27a — Other expenses: Equipment",
      value: "$1,240.00",
      state: "ai_pending",
      aiGenerated: true,
      confidence: 0.58,
      sources: [
        {
          documentId: "DOC-1002-B",
          page: 1,
          label: "Receipt total",
          excerpt: "TOTAL ....... $1,240.00 (handwritten, partially legible)",
        },
      ],
      transformation: "Extracted total from a photographed receipt; category inferred from item description.",
    },
  ];

  const insights: AIInsight[] = [
    {
      id: "INS-1002-expense",
      returnId,
      fieldId: "FLD-1002-expense",
      kind: "extraction",
      title: "Equipment expense extracted from photographed receipt",
      message:
        "Extracted $1,240.00 from a home office equipment receipt. Image quality was moderate — the vendor name and one digit of the total were only partially legible.",
      confidence: 0.58,
      evidence: [
        {
          label: "Total matched on second read",
          detail: "OCR agreed on \"$1,240.00\" across 2 of 3 passes over the image.",
          weight: "supports",
          source: {
            documentId: "DOC-1002-B",
            page: 1,
            label: "Receipt total",
            excerpt: "TOTAL ....... $1,240.00 (handwritten, partially legible)",
          },
        },
        {
          label: "No matching bank transaction found yet",
          detail: "Business checking statement for the same period doesn't show an exact $1,240.00 charge, only a $1,290.00 debit 2 days later.",
          weight: "conflicts",
          source: {
            documentId: "DOC-1002-C",
            page: 2,
            label: "Nov 14 — Debit card purchase",
            excerpt: "11/14  POS DEBIT  NORTHPOINT OFFICE SUPPLY  -1,290.00",
          },
        },
      ],
      uncertaintyNote:
        "Confidence held below 0.60 because the receipt image and the bank statement disagree by $50.00. This needs a human to reconcile before the field can be verified.",
      suggestedAction: "Compare against the $1,290.00 bank debit and confirm the correct amount with the client.",
      status: "pending",
    },
  ];

  const auditLog: AuditEvent[] = [
    {
      id: "AUD-1002-1",
      returnId,
      timestamp: isoDaysAgo(9),
      actor: "David Okafor",
      actorRole: "client",
      action: "Uploaded 3 documents",
      clientVisible: true,
    },
    {
      id: "AUD-1002-2",
      returnId,
      timestamp: isoDaysAgo(3),
      actor: "Tom Reyes, CPA",
      actorRole: "preparer",
      action: "Verified gross receipts field",
      clientVisible: false,
    },
  ];

  return {
    id: returnId,
    clientName: "David Okafor",
    type: "individual",
    taxYear: 2025,
    status: "needs_review",
    priority: "high",
    dueDate: isoDaysFromNow(5),
    assignedPreparer: "Tom Reyes, CPA",
    assignedReviewer: "Dana Okoye, CPA",
    blockers: ["Equipment expense amount conflicts with bank statement"],
    lastActivityAt: isoDaysAgo(3),
    openInsightCount: 1,
    documentCount: documents.length,
    fields,
    documents,
    insights,
    auditLog,
  };
}

function heroWhitfield(): TaxReturn {
  const returnId = "RTN-1003";

  const documents: SourceDocument[] = [
    {
      id: "DOC-1003-A",
      returnId,
      name: "K-1 — Whitfield & Co Partnership",
      docType: "K-1",
      uploadedAt: isoDaysAgo(25),
      uploadedBy: "Marcus Whitfield",
      pageCount: 3,
    },
    {
      id: "DOC-1003-B",
      returnId,
      name: "Prior Year Return — 2024",
      docType: "Prior Year Return",
      uploadedAt: isoDaysAgo(25),
      uploadedBy: "Marcus Whitfield",
      pageCount: 12,
    },
  ];

  const fields: ReturnField[] = [
    {
      id: "FLD-1003-k1income",
      returnId,
      section: "Schedule E",
      label: "Line 28 — Partnership income",
      value: "$142,880.00",
      state: "verified",
      aiGenerated: true,
      confidence: 0.95,
      sources: [
        {
          documentId: "DOC-1003-A",
          page: 1,
          label: "Box 1 — Ordinary business income",
          excerpt: "Box 1  Ordinary business income (loss) ....... 142,880.00",
        },
      ],
      transformation: "Direct pull, no calculation required",
      verifiedBy: "Janelle Ruiz, CPA",
      verifiedAt: isoDaysAgo(20),
    },
    {
      id: "FLD-1003-priorbasis",
      returnId,
      section: "Schedule E — Basis Worksheet",
      label: "Beginning partner basis",
      value: "$318,004.00",
      state: "locked",
      aiGenerated: true,
      confidence: 0.99,
      sources: [
        {
          documentId: "DOC-1003-B",
          page: 9,
          label: "Ending basis, prior year",
          excerpt: "Partner ending capital account, 12/31/2024 ....... 318,004.00",
        },
      ],
      transformation: "Carried forward from last year's ending basis — locked so it can't drift from the prior filing.",
      lockedReason:
        "Carried forward directly from the signed 2024 return. Locked because this value must match the prior filing exactly; edit last year's return instead if it's wrong.",
    },
  ];

  const insights: AIInsight[] = [];

  const auditLog: AuditEvent[] = [
    {
      id: "AUD-1003-1",
      returnId,
      timestamp: isoDaysAgo(25),
      actor: "Marcus Whitfield",
      actorRole: "client",
      action: "Uploaded 2 documents",
      clientVisible: true,
    },
    {
      id: "AUD-1003-2",
      returnId,
      timestamp: isoDaysAgo(20),
      actor: "Janelle Ruiz, CPA",
      actorRole: "preparer",
      action: "Verified partnership income field",
      clientVisible: false,
    },
  ];

  return {
    id: returnId,
    clientName: "Marcus Whitfield",
    businessName: "Whitfield & Co",
    type: "business",
    taxYear: 2025,
    status: "ready_to_file",
    priority: "low",
    dueDate: isoDaysFromNow(32),
    assignedPreparer: "Janelle Ruiz, CPA",
    assignedReviewer: "Dana Okoye, CPA",
    blockers: [],
    lastActivityAt: isoDaysAgo(20),
    openInsightCount: 0,
    documentCount: documents.length,
    fields,
    documents,
    insights,
    auditLog,
  };
}

const heroReturns = [heroChen(), heroOkafor(), heroWhitfield()];

// ---------------------------------------------------------------------------
// Bulk, list-depth returns — these exist to give the dashboard, search, and
// status views real volume (per the case study: "hundreds of mock items, not
// a handful of demo rows"). They don't carry full field/document/insight
// graphs; only the hero returns above do.
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  "Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Mason",
  "Isabella", "Lucas", "Mia", "James", "Amelia", "Benjamin", "Harper",
  "Elijah", "Evelyn", "Aiden", "Abigail", "Grayson", "Emily", "Wyatt",
  "Elizabeth", "Julian", "Sofia", "Levi", "Avery", "Owen", "Ella",
  "Carter", "Priya", "Diego", "Naledi", "Yusuf", "Aiko", "Kwame",
  "Ingrid", "Mateo", "Chidi", "Freya",
];
const LAST_NAMES = [
  "Nakamura", "Odom", "Petrova", "Larsen", "Whitfield", "Okoye", "Chen",
  "Alvarez", "Reyes", "Novak", "Singh", "Feldman", "Marchetti", "Okafor",
  "Hendricks", "Bianchi", "Kowalski", "Delgado", "Mensah", "Sato",
  "Ferreira", "Grant", "Holloway", "Iqbal", "Jansen", "Kaplan",
];
const BUSINESS_SUFFIXES = ["& Co", "Partners", "Group", "LLC", "Studio", "Holdings"];
const STAFF = [
  "Janelle Ruiz, CPA",
  "Tom Reyes, CPA",
  "Priya Anand, CPA",
  "Marcus Webb, EA",
  "Dana Okoye, CPA",
  "Sofia Marchetti, CPA",
];
const REVIEWERS = ["Dana Okoye, CPA", "Priya Anand, CPA", "Sofia Marchetti, CPA"];

const STATUS_WEIGHTS: [ReturnStatus, number][] = [
  ["awaiting_documents", 18],
  ["in_preparation", 30],
  ["needs_review", 16],
  ["client_action", 14],
  ["ready_to_file", 12],
  ["filed", 10],
];

const BLOCKER_POOL = [
  "Missing spouse W-2",
  "Unreconciled bank transaction",
  "Client signature outstanding",
  "1099 amount conflicts with bank statement",
  "Awaiting corrected K-1 from partnership",
  "Prior year AGI mismatch",
];

function generateBulkReturns(count: number, seed: number): TaxReturn[] {
  const rand = mulberry32(seed);
  const results: TaxReturn[] = [];

  for (let i = 0; i < count; i++) {
    const id = `RTN-${2000 + i}`;
    const type = pickWeighted(rand, [
      ["individual", 7],
      ["business", 3],
    ] as const);
    const first = pick(rand, FIRST_NAMES);
    const last = pick(rand, LAST_NAMES);
    const clientName = `${first} ${last}`;
    const businessName =
      type === "business" ? `${last} ${pick(rand, BUSINESS_SUFFIXES)}` : undefined;

    const status = pickWeighted(rand, STATUS_WEIGHTS);

    // Due dates skew toward "soon" so the dashboard has real urgency spread;
    // filed returns get a due date in the past since the work is done.
    let dueDate: string;
    if (status === "filed") {
      dueDate = isoDaysAgo(randInt(rand, 1, 40));
    } else {
      const roll = rand();
      if (roll < 0.12) dueDate = isoDaysAgo(randInt(rand, 1, 6)); // overdue
      else if (roll < 0.35) dueDate = isoDaysFromNow(randInt(rand, 1, 7));
      else if (roll < 0.65) dueDate = isoDaysFromNow(randInt(rand, 8, 21));
      else dueDate = isoDaysFromNow(randInt(rand, 22, 75));
    }

    const hasBlocker = status !== "filed" && status !== "ready_to_file" && rand() < 0.22;
    const blockers = hasBlocker
      ? [pick(rand, BLOCKER_POOL)]
      : [];

    const openInsightCount =
      status === "filed" ? 0 : pickWeighted(rand, [
        [0, 40],
        [1, 30],
        [2, 18],
        [3, 8],
        [4, 4],
      ] as const);

    const lastActivityAt =
      status === "filed" ? isoDaysAgo(randInt(rand, 10, 60)) : isoDaysAgo(randInt(rand, 0, 21));

    const draft: TaxReturn = {
      id,
      clientName,
      businessName,
      type,
      taxYear: 2025,
      status,
      priority: "normal", // placeholder, computed below
      dueDate,
      assignedPreparer: pick(rand, STAFF),
      assignedReviewer: rand() < 0.8 ? pick(rand, REVIEWERS) : undefined,
      blockers,
      lastActivityAt,
      openInsightCount,
      documentCount: randInt(rand, 1, 14),
    };

    draft.priority = priorityFromScore(urgencyScore(draft));
    results.push(draft);
  }

  return results;
}

let cachedReturns: TaxReturn[] | null = null;

export function getAllReturns(): TaxReturn[] {
  if (cachedReturns) return cachedReturns;
  const bulk = generateBulkReturns(197, 20260806);
  const all = [...heroReturns, ...bulk];
  // Keep hero return priorities consistent with the same scoring function
  // used everywhere else instead of the hand-picked placeholder above.
  for (const r of all) {
    r.priority = priorityFromScore(urgencyScore(r));
  }
  cachedReturns = all;
  return all;
}

export function getReturnById(id: string): TaxReturn | undefined {
  return getAllReturns().find((r) => r.id === id);
}

export function getHeroReturns(): TaxReturn[] {
  return heroReturns;
}

export function getDocTypeIcon(docType: DocType): string {
  switch (docType) {
    case "W-2":
      return "📄";
    case "1099-NEC":
    case "1099-DIV":
    case "1099-INT":
      return "🧾";
    case "1098":
      return "🏠";
    case "K-1":
      return "🤝";
    case "Receipt":
      return "🧷";
    case "Prior Year Return":
      return "🗂️";
    case "Bank Statement":
      return "🏦";
    default:
      return "📄";
  }
}
