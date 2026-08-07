"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  TriangleAlert,
  User,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { ReturnStatus, TaxReturn } from "@/lib/types";
import { RETURN_STATUS_META } from "@/lib/types";
import { daysUntilDue, urgencyScore } from "@/lib/priority";
import { formatRelativeDate } from "@/lib/format";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";

type Queue = "mine" | "firm";
type StatusFilter = ReturnStatus | "all";

function reasonFor(r: TaxReturn): string | null {
  const dtd = daysUntilDue(r);
  if (r.blockers.length > 0) return r.blockers[0];
  if (dtd < 0) return `Overdue by ${Math.abs(dtd)} day${Math.abs(dtd) === 1 ? "" : "s"}`;
  if (r.status === "needs_review") return "Waiting on your review";
  if (r.openInsightCount >= 2) return `${r.openInsightCount} open AI flags need a look`;
  if (dtd <= 3) return `Due ${formatRelativeDate(r.dueDate)}`;
  return null;
}

export function DashboardClient({
  returns,
  currentUser,
}: {
  returns: TaxReturn[];
  currentUser: string;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<Queue>("mine");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const scoped = useMemo(
    () =>
      queue === "mine"
        ? returns.filter((r) => r.assignedPreparer === currentUser)
        : returns,
    [returns, queue, currentUser]
  );

  const ranked = useMemo(
    () =>
      [...scoped].sort((a, b) => urgencyScore(b) - urgencyScore(a)),
    [scoped]
  );

  const active = useMemo(() => ranked.filter((r) => r.status !== "filed"), [ranked]);

  const kpis = useMemo(() => {
    const overdue = active.filter((r) => daysUntilDue(r) < 0).length;
    const needsReview = active.filter((r) => r.status === "needs_review").length;
    const urgent = active.filter((r) => r.priority === "urgent").length;
    return { activeCount: active.length, overdue, needsReview, urgent };
  }, [active]);

  const spotlight = useMemo(() => active.slice(0, 6), [active]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ranked.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = `${r.clientName} ${r.businessName ?? ""} ${r.id} ${r.assignedPreparer}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [ranked, statusFilter, query]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Ranked by what needs a decision, not by what&rsquo;s newest.
          </p>
        </div>

        <div className="inline-flex rounded-md border border-paper-line bg-paper-raised p-0.5">
          <button
            onClick={() => setQueue("mine")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              queue === "mine" ? "bg-paper text-ink shadow-sm" : "text-ink-soft"
            }`}
          >
            <User size={14} /> My Queue
          </button>
          <button
            onClick={() => setQueue("firm")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              queue === "firm" ? "bg-paper text-ink shadow-sm" : "text-ink-soft"
            }`}
          >
            <Users size={14} /> Firm-wide
          </button>
        </div>
      </header>

      {/* KPI row */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Active returns" value={kpis.activeCount} />
        <KpiCard label="Overdue" value={kpis.overdue} tone={kpis.overdue > 0 ? "rust" : undefined} />
        <KpiCard label="Needs review" value={kpis.needsReview} tone={kpis.needsReview > 0 ? "gold" : undefined} />
        <KpiCard label="Urgent priority" value={kpis.urgent} tone={kpis.urgent > 0 ? "rust" : undefined} />
      </div>

      {/* What to work on right now */}
      <section className="mb-10">
        <h2 className="mb-3 font-[family-name:var(--font-heading)] text-lg font-semibold text-ink">
          What to work on right now
        </h2>
        {spotlight.length === 0 ? (
          <p className="rounded-md border border-paper-line bg-paper-raised px-4 py-6 text-sm text-ink-soft">
            Nothing urgent in this queue — nice work.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {spotlight.map((r) => {
              const reason = reasonFor(r);
              return (
                <Link
                  key={r.id}
                  href={`/returns/${r.id}`}
                  className="group flex flex-col gap-2 rounded-lg border border-paper-line bg-paper-raised p-4 transition-colors hover:border-pine/40 hover:bg-pine-soft/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">
                        {r.businessName ?? r.clientName}
                      </p>
                      {r.businessName && (
                        <p className="text-xs text-ink-faint">{r.clientName}</p>
                      )}
                    </div>
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <StatusBadge status={r.status} size="sm" />
                  {reason && (
                    <p className="flex items-start gap-1.5 text-xs text-ink-soft">
                      <TriangleAlert size={13} className="mt-0.5 shrink-0 text-gold" />
                      {reason}
                    </p>
                  )}
                  <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-pine opacity-0 transition-opacity group-hover:opacity-100">
                    Open return <ArrowRight size={12} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Full queue table */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-ink">
            Full queue
            <span className="ml-2 font-[family-name:var(--font-body)] text-sm font-normal text-ink-faint">
              {filtered.length} of {scoped.length}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search client, business, or ID"
                className="w-56 rounded-md border border-paper-line bg-paper py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-paper-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-pine focus:outline-none"
            >
              <option value="all">All statuses</option>
              {(Object.keys(RETURN_STATUS_META) as ReturnStatus[]).map((s) => (
                <option key={s} value={s}>
                  {RETURN_STATUS_META[s].staffLabel}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-paper-line">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line bg-paper-raised text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-2.5">Client</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Due</th>
                <th className="px-4 py-2.5">Assigned to</th>
                <th className="px-4 py-2.5 text-right">AI flags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 60).map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-paper-line last:border-0 hover:bg-paper-raised"
                  onClick={() => router.push(`/returns/${r.id}`)}
                >
                  <td className="px-4 py-2.5">
                    <Link href={`/returns/${r.id}`} className="font-medium text-ink hover:text-pine">
                      {r.businessName ?? r.clientName}
                    </Link>
                    {r.businessName && (
                      <span className="ml-1.5 text-xs text-ink-faint">{r.clientName}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="px-4 py-2.5">
                    <PriorityBadge priority={r.priority} />
                  </td>
                  <td className="px-4 py-2.5 font-[family-name:var(--font-ledger)] text-ink-soft">
                    {formatRelativeDate(r.dueDate)}
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">{r.assignedPreparer}</td>
                  <td className="px-4 py-2.5 text-right">
                    {r.openInsightCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-gold">
                        <Sparkles size={12} /> {r.openInsightCount}
                      </span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 60 && (
          <p className="mt-2 text-xs text-ink-faint">
            Showing 60 of {filtered.length} matching returns — refine search or filters to narrow further.
          </p>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "rust" | "gold";
}) {
  return (
    <div className="rounded-lg border border-paper-line bg-paper-raised px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p
        className={`mt-1 font-[family-name:var(--font-ledger)] text-2xl font-semibold ${
          tone === "rust" ? "text-rust" : tone === "gold" ? "text-gold" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
