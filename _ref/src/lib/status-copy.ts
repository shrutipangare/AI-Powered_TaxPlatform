import type { ReturnStatus } from "./types";

// Canonical stage order used for the progress stepper — every return moves
// left to right through this pipeline (see RETURN_STATUS_META for the
// per-status labels shown at each stage).
export const STATUS_PIPELINE: ReturnStatus[] = [
  "awaiting_documents",
  "in_preparation",
  "needs_review",
  "client_action",
  "ready_to_file",
  "filed",
];

export const NEXT_STEP_COPY: Record<
  ReturnStatus,
  { staff: string; client: string }
> = {
  awaiting_documents: {
    staff: "Send the client a reminder for the outstanding documents listed below.",
    client: "Upload the remaining documents so we can start preparing your return.",
  },
  in_preparation: {
    staff: "Continue populating and verifying return fields from the uploaded documents.",
    client: "Nothing needed from you right now — your preparer is working through your documents.",
  },
  needs_review: {
    staff: "Complete the internal review and either approve or send back with notes.",
    client: "Nothing needed from you right now — your return is in internal quality review.",
  },
  client_action: {
    staff: "Waiting on the client — a nudge may be worth sending if this sits for more than a few days.",
    client: "We need a quick decision or document from you before we can move forward — see below.",
  },
  ready_to_file: {
    staff: "Get final client sign-off, then file.",
    client: "Your return is ready. Review the summary and give final approval to file.",
  },
  filed: {
    staff: "Filed — confirm acceptance was received from the tax authority.",
    client: "Your return has been filed. We'll let you know as soon as it's accepted.",
  },
};
