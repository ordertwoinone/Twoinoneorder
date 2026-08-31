"use client";

import { useEffect, useState } from "react";
import { Bike, Check, MapPin, Printer, Receipt, RotateCw, ShieldCheck, ShoppingBag } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import { aed } from "@/lib/kiosk/cart";
import type { KioskSettings } from "@/lib/kiosk/types";
import KioskQr from "./KioskQr";

/**
 * Step 5 — the number they walk away with.
 *
 * The order id is the largest thing on the panel by a wide margin, because it
 * is the one piece of this screen the customer has to carry to the counter. The
 * QR is a convenience beside it, not the way the order is claimed.
 *
 * The screen clears itself, and says so: a kiosk left showing someone's phone
 * number and total to the next person in the queue is a small privacy leak that
 * happens hundreds of times a day.
 */
export interface KioskConfirmation {
  id: string | null;
  code: string;
  count: number;
  total: number;
  saved: number;
  discount: number;
  phone: string;
  privilege: { member_id: string; percent: number } | null;
  trackUrl: string;
  /** Where the food is going, so the screen stops promising a counter. */
  fulfilment: "pickup" | "delivery";
  address: string;
}

/** "+971501234567" → "+971 5X XXX 4567" — enough to recognise, not to read off. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length < 7) return digits;
  const tail = digits.slice(-4);
  const head = digits.slice(0, digits.length - 9 > 0 ? digits.length - 9 : 4);
  return `${head} 5X XXX ${tail}`;
}

export default function DoneScreen({
  settings,
  confirmation,
  onReset,
}: {
  settings: KioskSettings;
  confirmation: KioskConfirmation;
  onReset: () => void;
}) {
  const [left, setLeft] = useState(settings.reset_seconds);

  /* The countdown is shown rather than the screen simply vanishing: someone
     still writing the number down needs to know they are on the clock, and
     touching the panel puts it back — see KioskApp, which resets on any touch. */
  useEffect(() => {
    if (settings.reset_seconds <= 0) return;
    setLeft(settings.reset_seconds);
    const tick = setInterval(() => setLeft((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => clearInterval(tick);
  }, [settings.reset_seconds]);

  useEffect(() => {
    if (settings.reset_seconds > 0 && left === 0) onReset();
  }, [left, onReset, settings.reset_seconds]);

  return (
    <div className="kiosk-scroll flex-1 px-[3vh] pt-[2.4vh] pb-[2.4vh]">
      {/* ─── Confirmed ─── */}
      <div className="text-center">
        <div
          className="mx-auto rounded-full flex items-center justify-center w-[11vh] h-[11vh]"
          style={{ border: `0.55vh solid ${KIOSK.good}` }}
        >
          <Check strokeWidth={3.5} className="w-[6vh] h-[6vh]" style={{ color: KIOSK.good }} />
        </div>
        <h1 className="mt-[1.6vh] font-black text-[4.2vh] leading-none" style={{ color: KIOSK.good }}>
          Order Confirmed!
        </h1>
        <p className="mt-[1vh] text-[1.8vh]" style={{ color: KIOSK.inkSoft }}>
          Thank you — your order has been sent to the kitchen.
        </p>
      </div>

      {/* ─── The number ─── */}
      <div
        className="mt-[2.4vh] rounded-[2vh] flex items-stretch overflow-hidden"
        style={{ border: `0.2vh solid ${KIOSK.gold}` }}
      >
        <div className="flex-1 p-[2.4vh] min-w-0">
          <p
            className="text-[1.4vh] font-bold tracking-[0.14em] uppercase"
            style={{ color: KIOSK.inkSoft }}
          >
            Your order id
          </p>
          <p
            className="font-black leading-none my-[1vh] text-[6.4vh] break-all"
            style={{ color: KIOSK.ink }}
          >
            {confirmation.code}
          </p>
          <p className="text-[1.5vh]" style={{ color: KIOSK.inkSoft }}>
            {confirmation.fulfilment === "delivery"
              ? "Quote this number if you call about your order."
              : "Please show this number at the pickup counter."}
          </p>
        </div>

        {confirmation.trackUrl && (
          <div
            className="shrink-0 flex flex-col items-center justify-center px-[2.4vh] py-[2vh] gap-[0.9vh]"
            style={{ borderLeft: `0.13vh solid ${KIOSK.line}`, background: "#FCFCFC" }}
          >
            <KioskQr value={confirmation.trackUrl} size={150} />
            <p
              className="text-[1.2vh] font-semibold text-center leading-tight"
              style={{ color: KIOSK.inkSoft }}
            >
              Scan to track
              <br />
              your order
            </p>
          </div>
        )}
      </div>

      {/* ─── When and where ─── */}
      <div
        className="mt-[1.8vh] rounded-[2vh] p-[2.2vh]"
        style={{ border: `0.16vh solid ${KIOSK.line}` }}
      >
        <div className="flex items-start justify-between gap-[2vh]">
          <div>
            <p className="text-[1.45vh]" style={{ color: KIOSK.inkSoft }}>
              Estimated ready time
            </p>
            <p className="font-black text-[4vh] leading-tight mt-[0.3vh]" style={{ color: KIOSK.ink }}>
              {settings.ready_minutes_min}–{settings.ready_minutes_max} min
            </p>
          </div>
          <div className="text-end max-w-[55%]">
            <p className="text-[1.45vh]" style={{ color: KIOSK.inkSoft }}>
              {confirmation.fulfilment === "delivery" ? "Delivering to" : "Pickup"}
            </p>
            <p
              className="font-bold text-[1.7vh] mt-[0.4vh] flex items-start gap-[0.6vh] justify-end leading-snug"
              style={{ color: KIOSK.ink }}
            >
              {confirmation.fulfilment === "delivery" ? (
                <Bike className="w-[1.8vh] h-[1.8vh] shrink-0 mt-[0.2vh]" />
              ) : (
                <MapPin className="w-[1.8vh] h-[1.8vh] shrink-0 mt-[0.2vh]" />
              )}
              <span>
                {confirmation.fulfilment === "delivery"
                  ? confirmation.address
                  : settings.pickup_counter}
              </span>
            </p>
          </div>
        </div>

        {/* Where it has got to. Nothing is ticked past "Received" yet — the
            kitchen moves it on, and the QR is how the customer follows it. */}
        <div className="mt-[2vh] flex items-center">
          {(confirmation.fulfilment === "delivery"
            ? ["Received", "Preparing", "On the way"]
            : ["Received", "Preparing", "Ready"]
          ).map((stage, i) => (
            <div key={stage} className="flex-1 flex items-center">
              <div className="flex flex-col items-center gap-[0.7vh] shrink-0">
                <span
                  className="rounded-full w-[1.6vh] h-[1.6vh]"
                  style={{ background: i === 0 ? KIOSK.good : "#D8D8D8" }}
                />
                <span
                  className="text-[1.3vh] font-bold whitespace-nowrap"
                  style={{ color: i === 0 ? KIOSK.good : "#9CA3AF" }}
                >
                  {stage}
                </span>
              </div>
              {i < 2 && (
                <span className="flex-1 h-[0.22vh] mx-[0.8vh] mb-[2vh]" style={{ background: "#E5E5E5" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── What it came to ─── */}
      <div
        className="mt-[1.8vh] rounded-[2vh] p-[2.2vh] flex items-start gap-[2vh]"
        style={{ border: `0.16vh solid ${KIOSK.line}` }}
      >
        <div className="flex-1">
          <p
            className="flex items-center gap-[0.7vh] text-[1.5vh] font-semibold"
            style={{ color: KIOSK.inkSoft }}
          >
            <ShoppingBag className="w-[1.8vh] h-[1.8vh]" />
            {confirmation.count} item{confirmation.count === 1 ? "" : "s"}
          </p>
          <p className="mt-[1.2vh] text-[1.45vh]" style={{ color: KIOSK.inkSoft }}>
            Total
          </p>
          <p className="font-black text-[3vh] leading-tight" style={{ color: KIOSK.ink }}>
            {aed(confirmation.total)}
          </p>
          <p className="text-[1.35vh] mt-[0.5vh]" style={{ color: KIOSK.inkSoft }}>
            {confirmation.fulfilment === "delivery"
              ? "Pay the driver when it arrives."
              : "Pay at the counter when you collect."}
          </p>
          {confirmation.privilege && (
            <span
              className="inline-flex items-center gap-[0.6vh] mt-[1.2vh] rounded-full px-[1.2vh] py-[0.6vh] text-[1.3vh] font-bold"
              style={{ background: "#F0FDF4", color: "#15803D" }}
            >
              <ShieldCheck className="w-[1.6vh] h-[1.6vh]" />
              Privilege discount applied
            </span>
          )}
        </div>

        {confirmation.phone && (
          <div
            className="shrink-0 rounded-[1.3vh] p-[1.6vh] text-center"
            style={{ background: "#FCFCFC", border: `0.13vh solid ${KIOSK.line}` }}
          >
            <Receipt className="w-[2.4vh] h-[2.4vh] mx-auto" style={{ color: KIOSK.inkSoft }} />
            <p className="text-[1.3vh] mt-[0.7vh]" style={{ color: KIOSK.inkSoft }}>
              Receipt sent to
            </p>
            <p className="text-[1.45vh] font-bold mt-[0.2vh]" style={{ color: KIOSK.ink }}>
              {maskPhone(confirmation.phone)}
            </p>
          </div>
        )}
      </div>

      {/* ─── Out ─── */}
      <div className="kiosk-no-print mt-[2vh] flex gap-[1.4vh]">
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-[1.4vh] flex items-center justify-center gap-[0.9vh] font-bold text-[1.7vh] active:scale-95 transition-transform"
          style={{ background: "#fff", border: `0.16vh solid ${KIOSK.line}`, color: KIOSK.ink, height: "6.4vh" }}
        >
          <Printer className="w-[2vh] h-[2vh]" />
          Print Receipt
        </button>
        {confirmation.trackUrl && (
          <a
            href={confirmation.trackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-[1.4vh] flex items-center justify-center gap-[0.9vh] font-bold text-[1.7vh] active:scale-95 transition-transform"
            style={{ background: "#fff", border: `0.16vh solid ${KIOSK.line}`, color: KIOSK.ink, height: "6.4vh" }}
          >
            <MapPin className="w-[2vh] h-[2vh]" />
            Track Order
          </a>
        )}
      </div>

      <button
        onClick={onReset}
        className="kiosk-no-print w-full mt-[1.4vh] rounded-[1.6vh] flex items-center justify-center gap-[1.2vh] font-black text-[2.4vh] active:scale-[0.98] transition-transform"
        style={{ background: KIOSK.gold, color: KIOSK.onGold, height: "8vh" }}
      >
        Start New Order
        <RotateCw strokeWidth={3} className="w-[2.6vh] h-[2.6vh]" />
      </button>

      {settings.reset_seconds > 0 && (
        <p className="kiosk-no-print mt-[1.2vh] text-center text-[1.35vh]" style={{ color: KIOSK.inkSoft }}>
          Screen will clear automatically in {left} second{left === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}
