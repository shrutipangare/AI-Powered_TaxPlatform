"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import type { ReturnStatus, TaxReturn } from "@/lib/types";
import { RETURN_STATUS_META } from "@/lib/types";
import { formatRelativeDate } from "@/lib/format";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";

const HERO_IDS = new Set(["RTN-1001", "RTN-1002", "RTN-1003"]);

export function ReturnsListClient({ returns }: { returns: TaxReturn[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return returns
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter((r) => {
        if (!q) return true;
        const haystack = `${r.clientName} ${r.businessName ?? ""} ${r.id}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => (a.businessName ?? a.clientName).localeCompare(b.businessName ?? b.clientName));
  }, [returns, query, statusFilter]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink">
          Returns
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {returns.length} returns on file · try{" "}
          <Link href="/returns/RTN-1001" className="text-pine underline underline-offset-2">
            RTN-1001
          </Link>
          ,{" "}
          <Link href="/returns/RTN-1002" className="text-pine underline underline-offset-2">
            RTN-1002
          </Link>{" "}
          or{" "}
          <Link href="/returns/RTN-1003" className="text-pine underline underline-offset-2">
            RTN-1003
          </Link>{" "}
          for the full traceability + AI detail walkthrough.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client, business, or ID"
            className="w-64 rounded-md border border-paper-line bg-paper py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReturnStatus | "all")}
          className="rounded-md border border-paper-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-pine focus:outline-none"
        >
          <option value="all">All statuses</option>
          {(Object.keys(RETURN_STATUS_META) as ReturnStatus[]).map((s) => (
            <option key={s} value={s}>
              {RETURN_STATUS_META[s].staffLabel}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-faint">{filtered.length} matching</span>
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
            {filtered.slice(0, 80).map((r) => (
              <tr key={r.id} className="border-b border-paper-line last:border-0 hover:bg-paper-raised">
                <td className="px-4 py-2.5">
                  <Link href={`/returns/${r.id}`} className="font-medium text-ink hover:text-pine">
                    {r.businessName ?? r.clientName}
                  </Link>
                  {r.businessName && <span className="ml-1.5 text-xs text-ink-faint">{r.clientName}</span>}
                  {HERO_IDS.has(r.id) && (
                    <span className="ml-2 rounded-full bg-pine-soft px-1.5 py-0.5 text-[10px] font-medium text-pine-dark">
                      full demo
                    </span>
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
      {filtered.length > 80 && (
        <p className="mt-2 text-xs text-ink-faint">
          Showing 80 of {filtered.length} — refine search or filters to narrow further.
        </p>
      )}
    </div>
  );
}
