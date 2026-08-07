"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  Lightbulb,
  TriangleAlert,
  CircleCheck,
  CircleX,
  Check,
  Pencil,
  Ban,
  type LucideIcon,
} from "lucide-react";
import type { AIInsight, InsightStatus, InsightKind, TaxReturn } from "@/lib/types";
import { ConfidencePill } from "@/components/ui/badges";
import { getDocTypeIcon } from "@/lib/mock-data";

const KIND_META: Record<InsightKind, { label: string; icon: LucideIcon }> = {
  extraction: { label: "Extraction", icon: Sparkles },
  recommendation: { label: "Recommendation", icon: Lightbulb },
  warning: { label: "Warning", icon: TriangleAlert },
};

const STATUS_META: Record<InsightStatus, { label: string; className: string }> = {
  pending: { label: "Needs your review", className: "bg-gold-soft text-gold border-gold/30" },
  accepted: { label: "Accepted", className: "bg-pine-soft text-pine-dark border-pine/30" },
  corrected: { label: "Corrected", className: "bg-steel-soft text-steel border-steel/30" },
  dismissed: { label: "Dismissed", className: "bg-slate-soft text-slate border-slate/30" },
};

export function InsightsClient({ taxReturn }: { taxReturn: TaxReturn }) {
  const insights = taxReturn.insights!;
  const [overrides, setOverrides] = useState<
    Record<string, { status: InsightStatus; correctedValue?: string; correctionNote?: string }>
  >({});
  const [selectedId, setSelectedId] = useState(insights[0]?.id);
  const [correcting, setCorrecting] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...insights].sort((a, b) => {
        const statusA = overrides[a.id]?.status ?? a.status;
        const statusB = overrides[b.id]?.status ?? b.status;
        if (statusA === "pending" && statusB !== "pending") return -1;
        if (statusB === "pending" && statusA !== "pending") return 1;
        return b.confidence - a.confidence;
      }),
    [insights, overrides]
  );

  const selected = insights.find((i) => i.id === selectedId) ?? sorted[0];
  const selectedStatus = selected ? overrides[selected.id]?.status ?? selected.status : "pending";

  function accept(id: string) {
    setOverrides((prev) => ({ ...prev, [id]: { status: "accepted" } }));
  }

  function dismiss(id: string) {
    setOverrides((prev) => ({ ...prev, [id]: { status: "dismissed" } }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-2">
        {sorted.map((insight) => {
          const status = overrides[insight.id]?.status ?? insight.status;
          const meta = KIND_META[insight.kind];
          const Icon = meta.icon;
          const active = insight.id === selected?.id;
          return (
            <button
              key={insight.id}
              onClick={() => {
                setSelectedId(insight.id);
                setCorrecting(null);
              }}
              className={`flex w-full flex-col gap-2 rounded-lg border p-4 text-left transition-colors ${
                active
                  ? "border-pine/40 bg-pine-soft/40"
                  : "border-paper-line bg-paper hover:bg-paper-raised"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                  <Icon size={13} /> {meta.label}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_META[status].className}`}
                >
                  {STATUS_META[status].label}
                </span>
              </div>
              <p className="text-sm font-medium text-ink">{insight.title}</p>
              <ConfidencePill confidence={insight.confidence} />
            </button>
          );
        })}
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        {selected && (
          <div className="rounded-lg border border-paper-line bg-paper-raised p-5">
            <div className="mb-1 flex items-center gap-2">
              {(() => {
                const Icon = KIND_META[selected.kind].icon;
                return <Icon size={15} className="text-ink-soft" />;
              })()}
              <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                {KIND_META[selected.kind].label}
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-ink">
              {selected.title}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">{selected.message}</p>

            <div className="mt-3 flex items-center gap-2">
              <ConfidencePill confidence={selected.confidence} />
              {selected.uncertaintyNote && (
                <span className="text-xs text-ink-faint">why not higher?</span>
              )}
            </div>
            {selected.uncertaintyNote && (
              <p className="mt-1.5 rounded-md border border-gold/30 bg-gold-soft px-3 py-2 text-xs text-ink">
                {selected.uncertaintyNote}
              </p>
            )}

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Evidence
              </p>
              <div className="space-y-2">
                {selected.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className={`rounded-md border p-3 ${
                      ev.weight === "supports"
                        ? "border-pine/25 bg-pine-soft/30"
                        : "border-rust/25 bg-rust-soft/40"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {ev.weight === "supports" ? (
                        <CircleCheck size={15} className="mt-0.5 shrink-0 text-pine" />
                      ) : (
                        <CircleX size={15} className="mt-0.5 shrink-0 text-rust" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{ev.label}</p>
                        <p className="mt-0.5 text-xs text-ink-soft">{ev.detail}</p>
                        {ev.source && (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-faint">
                            <span>{getDocTypeIcon("Receipt")}</span>
                            source: p.{ev.source.page} — “{ev.source.excerpt}”
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-md border border-steel/25 bg-steel-soft p-3">
              <p className="text-xs font-semibold text-steel">Suggested action</p>
              <p className="mt-1 text-sm text-ink">{selected.suggestedAction}</p>
            </div>

            <div className="mt-5">
              {selectedStatus === "pending" && (
                <>
                  {correcting === selected.id ? (
                    <CorrectionForm
                      insight={selected}
                      onSubmit={(value, note) => {
                        setOverrides((prev) => ({
                          ...prev,
                          [selected.id]: { status: "corrected", correctedValue: value, correctionNote: note },
                        }));
                        setCorrecting(null);
                      }}
                      onCancel={() => setCorrecting(null)}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => accept(selected.id)}
                        className="flex items-center gap-1.5 rounded-md bg-pine px-3 py-1.5 text-xs font-medium text-paper hover:bg-pine-dark"
                      >
                        <Check size={13} /> Accept
                      </button>
                      <button
                        onClick={() => setCorrecting(selected.id)}
                        className="flex items-center gap-1.5 rounded-md border border-paper-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-paper"
                      >
                        <Pencil size={13} /> This isn&rsquo;t right
                      </button>
                      <button
                        onClick={() => dismiss(selected.id)}
                        className="flex items-center gap-1.5 rounded-md border border-paper-line px-3 py-1.5 text-xs font-medium text-ink-faint hover:bg-paper"
                      >
                        <Ban size={13} /> Dismiss
                      </button>
                    </div>
                  )}
                </>
              )}

              {selectedStatus === "accepted" && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-pine-dark">
                  <CircleCheck size={15} /> Accepted — this stands as-is.
                </p>
              )}

              {selectedStatus === "corrected" && (
                <div className="rounded-md border border-steel/30 bg-steel-soft p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-steel">
                    <Pencil size={13} /> Corrected by preparer
                  </p>
                  <p className="mt-1 text-sm text-ink">
                    New value: {overrides[selected.id]?.correctedValue ?? selected.correctedValue}
                  </p>
                  {(overrides[selected.id]?.correctionNote ?? selected.correctionNote) && (
                    <p className="mt-1 text-xs text-ink-soft">
                      Note: {overrides[selected.id]?.correctionNote ?? selected.correctionNote}
                    </p>
                  )}
                </div>
              )}

              {selectedStatus === "dismissed" && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate">
                  <Ban size={15} /> Dismissed — no action taken on the return.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CorrectionForm({
  insight,
  onSubmit,
  onCancel,
}: {
  insight: AIInsight;
  onSubmit: (value: string, note: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="rounded-md border border-paper-line bg-paper p-3">
      <p className="mb-2 text-xs font-semibold text-ink">Correct this {insight.kind}</p>
      <label className="mb-2 block">
        <span className="mb-1 block text-xs text-ink-faint">Correct value</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. $1,290.00"
          className="w-full rounded-md border border-paper-line bg-paper-raised px-2.5 py-1.5 font-[family-name:var(--font-ledger)] text-sm text-ink focus:border-pine focus:outline-none"
        />
      </label>
      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-ink-faint">Why (optional, helps retraining)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-paper-line bg-paper-raised px-2.5 py-1.5 text-sm text-ink focus:border-pine focus:outline-none"
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(value || "(no value entered)", note)}
          disabled={!value}
          className="rounded-md bg-pine px-3 py-1.5 text-xs font-medium text-paper hover:bg-pine-dark disabled:opacity-40"
        >
          Submit correction
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-paper-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-paper-raised"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
