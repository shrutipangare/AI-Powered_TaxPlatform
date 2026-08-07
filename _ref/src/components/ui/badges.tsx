import {
  Lock,
  Pencil,
  Sparkles,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";
import type {
  FieldState,
  Priority,
  ReturnStatus,
  StatusColor,
} from "@/lib/types";
import { RETURN_STATUS_META } from "@/lib/types";
import type { ViewMode } from "@/components/view-mode";

const COLOR_CLASSES: Record<StatusColor, string> = {
  amber: "bg-gold-soft text-gold border-gold/30",
  steel: "bg-steel-soft text-steel border-steel/30",
  gold: "bg-gold-soft text-gold border-gold/30",
  pine: "bg-pine-soft text-pine-dark border-pine/30",
  slate: "bg-slate-soft text-slate border-slate/30",
  rust: "bg-rust-soft text-rust border-rust/30",
};

const DOT_CLASSES: Record<StatusColor, string> = {
  amber: "bg-gold",
  steel: "bg-steel",
  gold: "bg-gold",
  pine: "bg-pine",
  slate: "bg-slate",
  rust: "bg-rust",
};

export function StatusBadge({
  status,
  mode = "staff",
  size = "md",
}: {
  status: ReturnStatus;
  mode?: ViewMode;
  size?: "sm" | "md";
}) {
  const meta = RETURN_STATUS_META[status];
  const label = mode === "client" ? meta.clientLabel : meta.staffLabel;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 font-medium ${
        COLOR_CLASSES[meta.color]
      } ${size === "sm" ? "py-0.5 text-xs" : "py-1 text-sm"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[meta.color]}`} />
      {label}
    </span>
  );
}

const PRIORITY_META: Record<Priority, { label: string; color: StatusColor }> = {
  urgent: { label: "Urgent", color: "rust" },
  high: { label: "High", color: "gold" },
  normal: { label: "Normal", color: "steel" },
  low: { label: "Low", color: "slate" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        COLOR_CLASSES[meta.color]
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[meta.color]}`} />
      {meta.label}
    </span>
  );
}

const FIELD_STATE_META: Record<
  FieldState,
  { label: string; icon: LucideIcon; className: string }
> = {
  locked: {
    label: "Locked",
    icon: Lock,
    className: "bg-slate-soft text-slate border-slate/30",
  },
  editable: {
    label: "Editable",
    icon: Pencil,
    className: "bg-steel-soft text-steel border-steel/30",
  },
  ai_pending: {
    label: "AI-generated · Pending approval",
    icon: Sparkles,
    className: "bg-gold-soft text-gold border-gold/30",
  },
  verified: {
    label: "Verified",
    icon: CircleCheck,
    className: "bg-pine-soft text-pine-dark border-pine/30",
  },
};

export function FieldStateBadge({
  state,
  compact = false,
}: {
  state: FieldState;
  compact?: boolean;
}) {
  const meta = FIELD_STATE_META[state];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${meta.className}`}
      title={meta.label}
    >
      <Icon size={12} strokeWidth={2.25} />
      {compact ? meta.label.split(" · ")[0] : meta.label}
    </span>
  );
}

export function ConfidencePill({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone =
    confidence >= 0.85 ? "pine" : confidence >= 0.65 ? "gold" : "rust";
  const classes: Record<string, string> = {
    pine: "bg-pine-soft text-pine-dark border-pine/30",
    gold: "bg-gold-soft text-gold border-gold/30",
    rust: "bg-rust-soft text-rust border-rust/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-[family-name:var(--font-ledger)] text-xs font-medium ${classes[tone]}`}
    >
      {pct}% confidence
    </span>
  );
}
