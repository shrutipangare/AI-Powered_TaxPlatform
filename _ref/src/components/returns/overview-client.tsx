"use client";

import { CircleCheck, CircleDot, Circle, TriangleAlert, Clock } from "lucide-react";
import type { TaxReturn } from "@/lib/types";
import { RETURN_STATUS_META } from "@/lib/types";
import { STATUS_PIPELINE, NEXT_STEP_COPY } from "@/lib/status-copy";
import { useViewMode } from "@/components/view-mode";
import { formatDate, formatRelativeDate } from "@/lib/format";

export function OverviewClient({ taxReturn }: { taxReturn: TaxReturn }) {
  const { mode } = useViewMode();
  const currentIndex = STATUS_PIPELINE.indexOf(taxReturn.status);
  const nextStep = NEXT_STEP_COPY[taxReturn.status][mode];
  const owner = RETURN_STATUS_META[taxReturn.status].owner;

  const events = (taxReturn.auditLog ?? []).filter(
    (e) => mode === "staff" || e.clientVisible
  );

  const showBlockersToClient =
    mode === "client" && taxReturn.status === "client_action" && taxReturn.blockers.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {/* Pipeline stepper */}
        <div className="rounded-lg border border-paper-line bg-paper-raised p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Progress</h2>
          <ol className="flex items-start justify-between gap-1">
            {STATUS_PIPELINE.map((status, i) => {
              const meta = RETURN_STATUS_META[status];
              const isDone = i < currentIndex;
              const isCurrent = i === currentIndex;
              const label = mode === "client" ? meta.clientLabel : meta.staffLabel;
              return (
                <li key={status} className="flex flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <div
                      className={`h-px flex-1 ${i === 0 ? "opacity-0" : isDone || isCurrent ? "bg-pine" : "bg-paper-line"}`}
                    />
                    {isDone ? (
                      <CircleCheck size={20} className="mx-1 shrink-0 text-pine" />
                    ) : isCurrent ? (
                      <CircleDot size={20} className="mx-1 shrink-0 text-pine" />
                    ) : (
                      <Circle size={20} className="mx-1 shrink-0 text-paper-line" />
                    )}
                    <div
                      className={`h-px flex-1 ${i === STATUS_PIPELINE.length - 1 ? "opacity-0" : isDone ? "bg-pine" : "bg-paper-line"}`}
                    />
                  </div>
                  <span
                    className={`mt-2 max-w-[6.5rem] text-[11px] leading-tight font-medium ${
                      isCurrent ? "text-pine-dark" : isDone ? "text-ink-soft" : "text-ink-faint"
                    }`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Activity */}
        <div className="rounded-lg border border-paper-line bg-paper-raised p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">
            {mode === "client" ? "Updates" : "Activity"}
          </h2>
          {events.length === 0 ? (
            <p className="text-sm text-ink-faint">No activity yet.</p>
          ) : (
            <ol className="space-y-4">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-ink-faint">
                    <Clock size={12} />
                  </div>
                  <div>
                    <p className="text-sm text-ink">{e.action}</p>
                    <p className="text-xs text-ink-faint">
                      {mode === "staff" ? `${e.actor} · ` : ""}
                      {formatDate(e.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* What's next */}
        <div className="rounded-lg border border-pine/30 bg-pine-soft/40 p-5">
          <h2 className="mb-1 text-sm font-semibold text-pine-dark">What&rsquo;s next</h2>
          <p className="text-sm text-ink">{nextStep}</p>
          <p className="mt-3 text-xs font-medium text-ink-soft">
            Owner: <span className="capitalize">{owner === "client" ? "You" : owner}</span>
          </p>
        </div>

        {/* Blockers */}
        {mode === "staff" && taxReturn.blockers.length > 0 && (
          <div className="rounded-lg border border-rust/30 bg-rust-soft p-5">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rust">
              <TriangleAlert size={15} /> Blocking this return
            </h2>
            <ul className="space-y-1.5 text-sm text-ink">
              {taxReturn.blockers.map((b, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-rust">·</span> {b}
                </li>
              ))}
            </ul>
          </div>
        )}
        {showBlockersToClient && (
          <div className="rounded-lg border border-rust/30 bg-rust-soft p-5">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rust">
              <TriangleAlert size={15} /> We need something from you
            </h2>
            <p className="text-sm text-ink">
              There&rsquo;s one open item we&rsquo;re working through together — your preparer will reach
              out with specifics, or you can check your messages for the request.
            </p>
          </div>
        )}

        {/* Key facts */}
        <div className="rounded-lg border border-paper-line bg-paper-raised p-5 text-sm">
          <h2 className="mb-3 text-sm font-semibold text-ink">Key facts</h2>
          <dl className="space-y-2">
            <Fact label="Due" value={`${formatDate(taxReturn.dueDate)} (${formatRelativeDate(taxReturn.dueDate)})`} />
            <Fact label="Preparer" value={taxReturn.assignedPreparer} />
            {mode === "staff" && taxReturn.assignedReviewer && (
              <Fact label="Reviewer" value={taxReturn.assignedReviewer} />
            )}
            <Fact label="Documents on file" value={String(taxReturn.documentCount)} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
