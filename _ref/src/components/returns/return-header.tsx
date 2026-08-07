"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Eye, User } from "lucide-react";
import type { TaxReturn } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { formatRelativeDate } from "@/lib/format";
import { useViewMode } from "@/components/view-mode";

export function ReturnHeader({ taxReturn }: { taxReturn: TaxReturn }) {
  const pathname = usePathname();
  const { mode, setMode } = useViewMode();
  const base = `/returns/${taxReturn.id}`;

  const pendingInsights = taxReturn.insights?.filter((i) => i.status === "pending").length ?? 0;

  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/review`, label: "Review & Traceability" },
    {
      href: `${base}/insights`,
      label: "AI Insights",
      badge: pendingInsights > 0 ? pendingInsights : undefined,
    },
  ];

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-pine"
      >
        <ChevronLeft size={14} /> Back to dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink">
            {taxReturn.businessName ?? taxReturn.clientName}
          </h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {taxReturn.businessName ? `${taxReturn.clientName} · ` : ""}
            {taxReturn.type === "business" ? "Business return" : "Individual return"} · Tax year{" "}
            {taxReturn.taxYear} · {taxReturn.id}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={taxReturn.status} mode={mode} />
            <PriorityBadge priority={taxReturn.priority} />
            <span className="text-xs text-ink-faint">
              Due {formatRelativeDate(taxReturn.dueDate)} · {taxReturn.assignedPreparer}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            Preview as
          </span>
          <div className="inline-flex rounded-md border border-paper-line bg-paper-raised p-0.5">
            <button
              onClick={() => setMode("staff")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "staff" ? "bg-paper text-ink shadow-sm" : "text-ink-soft"
              }`}
            >
              <User size={12} /> Staff
            </button>
            <button
              onClick={() => setMode("client")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "client" ? "bg-paper text-ink shadow-sm" : "text-ink-soft"
              }`}
            >
              <Eye size={12} /> Client
            </button>
          </div>
        </div>
      </div>

      <nav className="mt-6 flex gap-1 border-b border-paper-line">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-pine text-pine-dark"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className="rounded-full bg-gold-soft px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
