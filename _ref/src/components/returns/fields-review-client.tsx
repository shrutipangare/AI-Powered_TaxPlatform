"use client";

import { useMemo, useState } from "react";
import {
  Lock,
  Pencil,
  Sparkles,
  CircleCheck,
  FileText,
  Plus,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import type { FieldState, ReturnField, TaxReturn } from "@/lib/types";
import { FieldStateBadge, ConfidencePill } from "@/components/ui/badges";
import { getDocTypeIcon } from "@/lib/mock-data";
import { formatDate } from "@/lib/format";

type LocalState = {
  states: Record<string, FieldState>;
  values: Record<string, string>;
  notes: Record<string, string>;
};

export function FieldsReviewClient({ taxReturn }: { taxReturn: TaxReturn }) {
  const fields = taxReturn.fields!;
  const documents = taxReturn.documents!;

  const grouped = useMemo(() => {
    const map = new Map<string, ReturnField[]>();
    for (const f of fields) {
      if (!map.has(f.section)) map.set(f.section, []);
      map.get(f.section)!.push(f);
    }
    return Array.from(map.entries());
  }, [fields]);

  const [selectedId, setSelectedId] = useState(fields[0]?.id);
  const [local, setLocal] = useState<LocalState>({ states: {}, values: {}, notes: {} });
  const [confirming, setConfirming] = useState<string | null>(null);

  const docById = (id: string) => documents.find((d) => d.id === id);

  const stateOf = (f: ReturnField) => local.states[f.id] ?? f.state;
  const valueOf = (f: ReturnField) => local.values[f.id] ?? f.value;

  const selected = fields.find((f) => f.id === selectedId) ?? fields[0];

  function approve(fieldId: string) {
    setLocal((prev) => ({ ...prev, states: { ...prev.states, [fieldId]: "verified" } }));
    setConfirming(null);
  }

  function reject(fieldId: string) {
    setLocal((prev) => ({
      ...prev,
      states: { ...prev.states, [fieldId]: "editable" },
      notes: { ...prev.notes, [fieldId]: "Rejected by preparer — needs manual entry." },
    }));
  }

  function revert(fieldId: string) {
    setLocal((prev) => {
      const states = { ...prev.states };
      delete states[fieldId];
      return { ...prev, states };
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Field list */}
      <div className="space-y-6">
        <LegendStrip />
        {grouped.map(([section, sectionFields]) => (
          <div key={section}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {section}
            </h3>
            <div className="overflow-hidden rounded-lg border border-paper-line">
              {sectionFields.map((f, i) => {
                const state = stateOf(f);
                const active = f.id === selected?.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                      i !== 0 ? "border-t border-paper-line" : ""
                    } ${active ? "bg-pine-soft/50" : "bg-paper hover:bg-paper-raised"}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{f.label}</p>
                      <p className="mt-0.5 font-[family-name:var(--font-ledger)] text-sm text-ink-soft">
                        {valueOf(f)}
                      </p>
                    </div>
                    <FieldStateBadge state={state} compact />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        {selected && (
          <div className="rounded-lg border border-paper-line bg-paper-raised">
            <div className="border-b border-paper-line p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {selected.section}
                  </p>
                  <h2 className="mt-0.5 font-[family-name:var(--font-heading)] text-lg font-semibold text-ink">
                    {selected.label}
                  </h2>
                </div>
                <FieldStateBadge state={stateOf(selected)} />
              </div>
              <p className="mt-3 font-[family-name:var(--font-ledger)] text-2xl font-semibold text-ink">
                {valueOf(selected)}
              </p>
              {selected.aiGenerated && selected.confidence !== undefined && (
                <div className="mt-2">
                  <ConfidencePill confidence={selected.confidence} />
                </div>
              )}
            </div>

            <div className="space-y-5 p-5">
              {selected.transformation && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    How this value was derived
                  </p>
                  <p className="text-sm text-ink-soft">{selected.transformation}</p>
                </div>
              )}

              {selected.sources && selected.sources.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Source document{selected.sources.length > 1 ? "s" : ""}
                  </p>
                  <div className="space-y-2">
                    {selected.sources.map((src, i) => {
                      const doc = docById(src.documentId);
                      return (
                        <div key={i}>
                          {i > 0 && (
                            <div className="flex justify-center py-1 text-ink-faint">
                              <Plus size={14} />
                            </div>
                          )}
                          <div className="rounded-md border border-paper-line bg-paper p-3">
                            <div className="mb-2 flex items-center gap-2 text-xs text-ink-soft">
                              <span>{doc ? getDocTypeIcon(doc.docType) : <FileText size={12} />}</span>
                              <span className="font-medium text-ink">{doc?.name ?? "Unknown document"}</span>
                              <span className="text-ink-faint">· page {src.page}</span>
                            </div>
                            <p className="mb-1 text-[11px] font-medium text-ink-faint">{src.label}</p>
                            <p className="rounded bg-paper-raised px-2.5 py-2 font-[family-name:var(--font-ledger)] text-xs text-ink">
                              {src.excerpt}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {stateOf(selected) === "locked" && selected.lockedReason && (
                <div className="rounded-md border border-slate/30 bg-slate-soft p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate">
                    <Lock size={13} /> Why this is locked
                  </p>
                  <p className="mt-1 text-sm text-ink">{selected.lockedReason}</p>
                </div>
              )}

              {stateOf(selected) === "editable" && (
                <EditableField
                  field={selected}
                  value={valueOf(selected)}
                  note={local.notes[selected.id]}
                  onSave={(v) =>
                    setLocal((prev) => ({ ...prev, values: { ...prev.values, [selected.id]: v } }))
                  }
                />
              )}

              {stateOf(selected) === "ai_pending" && (
                <div className="rounded-md border border-gold/30 bg-gold-soft p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-gold">
                    <Sparkles size={13} /> Requires approval before it&rsquo;s used on the return
                  </p>
                  <p className="mt-1 mb-3 text-sm text-ink">
                    This value was extracted by AI and hasn&rsquo;t been confirmed yet. Approving
                    locks it in as verified; rejecting sends it back for manual entry.
                  </p>
                  {confirming === selected.id ? (
                    <div className="rounded-md border border-gold/40 bg-paper p-3">
                      <p className="mb-2 text-sm font-medium text-ink">
                        Confirm — mark {valueOf(selected)} as verified?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(selected.id)}
                          className="flex items-center gap-1.5 rounded-md bg-pine px-3 py-1.5 text-xs font-medium text-paper hover:bg-pine-dark"
                        >
                          <Check size={13} /> Yes, mark verified
                        </button>
                        <button
                          onClick={() => setConfirming(null)}
                          className="rounded-md border border-paper-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-paper-raised"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirming(selected.id)}
                        className="flex items-center gap-1.5 rounded-md bg-pine px-3 py-1.5 text-xs font-medium text-paper hover:bg-pine-dark"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        onClick={() => reject(selected.id)}
                        className="flex items-center gap-1.5 rounded-md border border-paper-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-rust-soft hover:text-rust"
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )}

              {stateOf(selected) === "verified" && (
                <div className="rounded-md border border-pine/30 bg-pine-soft/50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-pine-dark">
                    <CircleCheck size={13} /> Verified
                  </p>
                  <p className="mt-1 text-sm text-ink">
                    {selected.verifiedBy
                      ? `${selected.verifiedBy}${selected.verifiedAt ? ` · ${formatDate(selected.verifiedAt)}` : ""}`
                      : "Approved just now."}
                  </p>
                  {selected.state !== "verified" && (
                    <button
                      onClick={() => revert(selected.id)}
                      className="mt-2 flex items-center gap-1 text-xs font-medium text-ink-faint hover:text-ink"
                    >
                      <RotateCcw size={11} /> Revert to pending
                    </button>
                  )}
                </div>
              )}

              {local.notes[selected.id] && stateOf(selected) === "editable" && (
                <p className="text-xs text-rust">{local.notes[selected.id]}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditableField({
  field,
  value,
  note,
  onSave,
}: {
  field: ReturnField;
  value: string;
  note?: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);

  return (
    <div className="rounded-md border border-steel/30 bg-steel-soft p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-steel">
        <Pencil size={13} /> Editable field
      </p>
      {note && <p className="mt-1 text-xs text-rust">{note}</p>}
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setSaved(false);
          }}
          className="flex-1 rounded-md border border-paper-line bg-paper px-2.5 py-1.5 font-[family-name:var(--font-ledger)] text-sm text-ink focus:border-pine focus:outline-none"
        />
        <button
          onClick={() => {
            onSave(draft);
            setSaved(true);
          }}
          className="rounded-md bg-pine px-3 py-1.5 text-xs font-medium text-paper hover:bg-pine-dark"
        >
          Save
        </button>
      </div>
      {saved && <p className="mt-1.5 text-xs text-pine-dark">Saved.</p>}
      <p className="mt-2 text-xs text-ink-faint" data-field-id={field.id}>
        Manually entered — not derived from AI extraction, so no source or confidence applies.
      </p>
    </div>
  );
}

function LegendStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-paper-line bg-paper px-3 py-2.5 text-xs text-ink-faint">
      <span className="font-medium text-ink-soft">Field states:</span>
      <FieldStateBadge state="locked" compact />
      <FieldStateBadge state="editable" compact />
      <FieldStateBadge state="ai_pending" compact />
      <FieldStateBadge state="verified" compact />
    </div>
  );
}
