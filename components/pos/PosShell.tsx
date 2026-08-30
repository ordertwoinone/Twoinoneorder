"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChefHat,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Receipt,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { ROLE_LABEL, type PosStaff } from "@/lib/pos/constants";

/**
 * The rail and the bar that every till screen sits inside.
 *
 * The order of the rail is the order of a shift: take an order, work the board,
 * feed the kitchen, record what went out of the drawer, close the day. It does
 * not change between screens, because the one thing a tool used for eight hours
 * owes its user is that the button is where it was last time.
 */

const NAV = [
  { href: "/pos/till", label: "POS", icon: ShoppingCart },
  { href: "/pos/orders", label: "Orders", icon: ClipboardList },
  { href: "/pos/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/pos/expenses", label: "Expenses", icon: Receipt },
  { href: "/pos/reports", label: "Reports", icon: BarChart3 },
  { href: "/pos/close", label: "Day Close", icon: Wallet },
] as const;

export default function PosShell({
  staff,
  title,
  subtitle,
  actions,
  children,
}: {
  staff: PosStaff;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/pos/logout", { method: "POST" }).catch(() => {});
    router.replace("/pos/login");
    router.refresh();
  }

  return (
    <div className="w-full h-full flex" style={{ background: POS.page }}>
      {/* ─── Rail ─── */}
      <nav
        className="pos-chrome shrink-0 flex flex-col items-center py-3 gap-1 text-white"
        style={{ background: POS.night, width: 86 }}
      >
        <p className="text-xl font-black tracking-tight mb-2">
          <span style={{ color: POS.brand }}>2</span>
          <span className="text-sm align-middle">in</span>
          <span style={{ color: POS.brand }}>1</span>
        </p>

        {NAV.map((entry) => {
          const active = pathname?.startsWith(entry.href) ?? false;
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className="w-[70px] rounded-xl flex flex-col items-center gap-1 py-2 transition-colors"
              style={{
                background: active ? POS.action : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.62)",
              }}
            >
              <Icon size={19} />
              <span className="text-[10.5px] font-semibold leading-none">{entry.label}</span>
            </Link>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={signOut}
          className="w-[70px] rounded-xl flex flex-col items-center gap-1 py-2 transition-colors"
          style={{ color: "rgba(255,255,255,0.62)" }}
        >
          <LogOut size={19} />
          <span className="text-[10.5px] font-semibold leading-none">Logout</span>
        </button>
      </nav>

      {/* ─── Everything else ─── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="pos-chrome shrink-0 flex items-center gap-4 px-5 bg-white"
          style={{ height: 62, borderBottom: `1px solid ${POS.line}` }}
        >
          <div className="min-w-0">
            <h1 className="text-lg font-black leading-tight truncate" style={{ color: POS.ink }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11.5px] leading-tight truncate" style={{ color: POS.inkSoft }}>
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex-1" />
          {actions}

          <span
            className="shrink-0 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold"
            style={{ background: POS.page, color: POS.ink }}
          >
            <LayoutGrid size={14} style={{ color: POS.inkSoft }} />
            {staff.name || staff.staff_id}
            <span style={{ color: POS.inkSoft }}>· {ROLE_LABEL[staff.role]}</span>
          </span>
        </header>

        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
}
