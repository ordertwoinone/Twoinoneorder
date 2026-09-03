"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  ChefHat,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Receipt,
  ShoppingCart,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { ROLE_LABEL, type PosStaff } from "@/lib/pos/constants";
import { can, type PosPermission } from "@/lib/pos/permissions";

/**
 * The rail and the bar that every till screen sits inside.
 *
 * The order of the rail is the order of a shift: take an order, work the board,
 * feed the kitchen, mark what has run out, record what went out of the drawer,
 * hand the drawer over, close the restaurant. It does not change between
 * screens, because the one thing a tool used for eight hours owes its user is
 * that the button is where it was last time.
 *
 * What changes between people is which buttons are there at all. Each entry
 * names the permission it stands behind, so a rail is drawn from what this
 * account may actually open — see lib/pos/permissions.ts. It is a courtesy
 * rather than a control: every one of these pages checks the same permission
 * again on the server, because a hidden link is not a locked door.
 */

const NAV: { href: string; label: string; icon: typeof ShoppingCart; key: PosPermission }[] = [
  { href: "/pos/till", label: "POS", icon: ShoppingCart, key: "till" },
  { href: "/pos/orders", label: "Orders", icon: ClipboardList, key: "orders" },
  { href: "/pos/kitchen", label: "Kitchen", icon: ChefHat, key: "kitchen" },
  { href: "/pos/availability", label: "Item Availability", icon: SlidersHorizontal, key: "availability" },
  { href: "/pos/expenses", label: "Expenses", icon: Receipt, key: "expenses" },
  { href: "/pos/reports", label: "Reports", icon: BarChart3, key: "reports" },
  { href: "/pos/close", label: "Shift Close", icon: Wallet, key: "shift_close" },
  { href: "/pos/day-close", label: "Day Close", icon: CalendarCheck, key: "day_close" },
];

export default function PosShell({
  staff,
  title,
  subtitle,
  actions,
  warning,
  children,
}: {
  staff: PosStaff;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** The unclosed-day banner, when there is one. Rendered under the bar. */
  warning?: React.ReactNode;
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

        {/* Only what this account can open. A cook's rail is the kitchen board
            and the availability switch; everything else on it would land them
            on a page that only sends them back. */}
        {NAV.filter((entry) => can(staff, entry.key)).map((entry) => {
          /* Exact match on the two closes. startsWith() made "Shift Close"
             light up while standing on /pos/day-close, because one path is a
             prefix of nothing but the other is not — and two lit buttons on a
             rail is a screen you cannot tell where you are on. */
          const active =
            pathname === entry.href ||
            (pathname?.startsWith(`${entry.href}/`) ?? false);
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
              {/* Two lines where a label needs them — "Item Availability" on
                  one line at this width is four unreadable pixels of text. */}
              <span className="px-1 text-center text-[10.5px] font-semibold leading-[1.15]">
                {entry.label}
              </span>
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

        {warning}

        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
}
