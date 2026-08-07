"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileStack, Leaf } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/returns", label: "Returns", icon: FileStack },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r border-paper-line bg-paper-raised px-4 py-6">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-pine text-paper">
          <Leaf size={18} strokeWidth={2.25} />
        </span>
        <span className="font-[family-name:var(--font-heading)] text-lg font-semibold text-ink">
          GreenGrowth
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-pine-soft text-pine-dark"
                  : "text-ink-soft hover:bg-paper hover:text-ink"
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-md border border-paper-line bg-paper px-3 py-3">
        <p className="text-xs font-medium text-ink-soft">Signed in as</p>
        <p className="mt-0.5 text-sm font-medium text-ink">Janelle Ruiz, CPA</p>
        <p className="text-xs text-ink-faint">Senior Preparer</p>
      </div>
    </aside>
  );
}
