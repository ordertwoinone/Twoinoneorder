"use client";

import { useRouter } from "next/navigation";
import { Clock, LogOut, Wallet } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { ROLE_LABEL, type PosStaff } from "@/lib/pos/constants";
import type { PosShift } from "@/lib/pos/shift";

/**
 * A holding screen while order entry is built.
 *
 * Deliberately not a mock of the till: it says what is running and what is not,
 * so the login and shift flow can be put on a real tablet and used now without
 * anyone mistaking an empty menu grid for a broken one.
 */
export default function TillHolding({ staff, shift }: { staff: PosStaff; shift: PosShift }) {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/pos/logout", { method: "POST" }).catch(() => {});
    router.replace("/pos/login");
    router.refresh();
  }

  const opened = new Date(shift.opened_at);

  return (
    <div className="w-full h-full flex flex-col" style={{ background: POS.page }}>
      <header
        className="pos-chrome shrink-0 flex items-center gap-4 px-5 text-white"
        style={{ background: POS.night, height: 64 }}
      >
        <p className="text-2xl font-black tracking-tight shrink-0">
          <span style={{ color: POS.brand }}>2</span>
          <span className="text-base align-middle">in</span>
          <span style={{ color: POS.brand }}>1</span>
        </p>
        <h1 className="text-xl font-bold">POS</h1>
        <div className="flex-1" />
        <span className="rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: POS.nightSoft }}>
          {staff.name || staff.staff_id} · {ROLE_LABEL[staff.role]}
        </span>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold active:scale-95 transition-transform"
          style={{ background: POS.nightSoft }}
        >
          <LogOut size={15} />
          Logout
        </button>
      </header>

      <div className="pos-scroll flex-1 flex items-center justify-center p-6">
        <div
          className="w-full max-w-[560px] rounded-2xl bg-white p-7 text-center"
          style={{ border: `1px solid ${POS.line}` }}
        >
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: POS.goodSoft }}
          >
            <Wallet size={26} style={{ color: POS.good }} />
          </span>

          <h2 className="mt-4 text-2xl font-black" style={{ color: POS.ink }}>
            Your shift is open
          </h2>
          <p className="mt-1.5 text-sm" style={{ color: POS.inkSoft }}>
            {shift.shift_label} shift, opened at{" "}
            {opened.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} with a float
            of AED {Number(shift.opening_float).toFixed(2)}.
          </p>

          <div
            className="mt-5 rounded-xl px-4 py-3.5 text-start"
            style={{ background: POS.page, border: `1px solid ${POS.line}` }}
          >
            <p className="flex items-center gap-2 text-[13px] font-bold" style={{ color: POS.ink }}>
              <Clock size={15} />
              Order entry is the next piece of work
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: POS.inkSoft }}>
              The menu grid, the cart and the payment panel land here. Until then, orders come in
              from the kiosk and are worked from admin &rarr; Kiosk &rarr; Orders.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
