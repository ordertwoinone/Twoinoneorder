"use client";

import { useState } from "react";
import { ArrowLeft, Bike, Check, Lock, ShieldCheck, ShoppingBag } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import { aed, type KioskTotals } from "@/lib/kiosk/cart";
import type { KioskFulfilment, KioskSettings } from "@/lib/kiosk/types";
import type { PrivilegeHolder } from "./ReviewPanel";
import Keypad from "./Keypad";

/**
 * Step 4 — the phone number, now required.
 *
 * It was skippable, and the branch asked for that to go: the number is how the
 * order reaches the customer and how the counter finds them again, so an order
 * without one is one nobody can chase. DONE stays off until the number is
 * long enough for the country code beside it, rather than accepting four digits
 * and failing later.
 */

/** The country codes worth offering at a kiosk in Kalba. */
const DIAL_CODES = [
  { code: "+971", flag: "🇦🇪", digits: 9 },
  { code: "+966", flag: "🇸🇦", digits: 9 },
  { code: "+968", flag: "🇴🇲", digits: 8 },
  { code: "+974", flag: "🇶🇦", digits: 8 },
  { code: "+91", flag: "🇮🇳", digits: 10 },
  { code: "+44", flag: "🇬🇧", digits: 10 },
];

/** "501234567" → "50 123 4567", the way a UAE number is read aloud. */
function pretty(digits: string): string {
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

export default function PhoneScreen({
  settings,
  totals,
  privilege,
  fulfilment,
  onFulfilment,
  submitting,
  error,
  onBack,
  onDone,
}: {
  settings: KioskSettings;
  totals: KioskTotals;
  privilege: PrivilegeHolder | null;
  fulfilment: KioskFulfilment;
  onFulfilment: (choice: KioskFulfilment) => void;
  submitting: boolean;
  error: string;
  onBack: () => void;
  onDone: (phone: string, channels: string[]) => void;
}) {
  const [dial, setDial] = useState(DIAL_CODES[0]);
  const [digits, setDigits] = useState("");
  const [sms, setSms] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);

  // A leading zero is how the number is written locally but not how it dials.
  const national = digits.replace(/^0+/, "");
  const complete = national.length >= dial.digits;

  const channels = [sms && "sms", whatsapp && "whatsapp"].filter(Boolean) as string[];

  const delivering = fulfilment === "delivery";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="kiosk-scroll flex-1 px-[3vh] pt-[2.4vh] pb-[1.6vh]">
        <h1 className="font-black text-[4vh] leading-none" style={{ color: KIOSK.ink }}>
          Enter Your Phone Number
        </h1>
        <p className="mt-[1vh] text-[1.8vh]" style={{ color: KIOSK.inkSoft }}>
          We&rsquo;ll send your order number and digital receipt by SMS.
        </p>

        {/* Collecting or delivering, asked here because this is the screen the
            customer is already stopped at. Two buttons and nothing else: the
            branch takes the address on the phone number above. */}
        <div className="mt-[2vh] grid grid-cols-2 gap-[1.4vh]">
          {([
            ["pickup", ShoppingBag, "Pickup"],
            ["delivery", Bike, "Delivery"],
          ] as const).map(([key, Icon, label]) => {
            const on = fulfilment === key;
            return (
              <button
                key={key}
                onClick={() => onFulfilment(key)}
                className="flex items-center justify-center gap-[1.2vh] rounded-[1.6vh] font-black text-[2.4vh] active:scale-[0.98] transition-transform"
                style={{
                  height: "8.5vh",
                  border: `0.25vh solid ${on ? KIOSK.gold : KIOSK.line}`,
                  background: on ? KIOSK.gold : "#fff",
                  color: on ? KIOSK.onGold : KIOSK.inkSoft,
                }}
              >
                <Icon className="w-[3vh] h-[3vh]" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Full width, above the split. This sat inside the left-hand column
            between the country code and the order summary, which left about
            290px for eleven digits — so the number the customer had just keyed
            was ellipsised and they could not read it back. Nothing else on the
            screen needs to be beside it. */}
        <div className="mt-[2vh] flex gap-[1.4vh] items-stretch">
          <select
            value={dial.code}
            onChange={(e) =>
              setDial(DIAL_CODES.find((d) => d.code === e.target.value) ?? DIAL_CODES[0])
            }
            className="rounded-[1.3vh] px-[1.4vh] font-bold text-[2vh] shrink-0 bg-white"
            style={{ border: `0.16vh solid ${KIOSK.line}`, height: "9vh", color: KIOSK.ink }}
          >
            {DIAL_CODES.map((d) => (
              <option key={d.code} value={d.code}>
                {d.flag} {d.code}
              </option>
            ))}
          </select>

          <div
            className="flex-1 rounded-[1.3vh] flex items-center px-[2.4vh] min-w-0"
            style={{
              height: "9vh",
              border: `0.2vh solid ${digits ? KIOSK.gold : KIOSK.line}`,
              background: digits ? "#FFFDF6" : "#fff",
            }}
          >
            {/* A plain element, not a readOnly input: an input scrolls its own
                contents, so the first digits slid out of view as the number
                grew. The keypad is the only way in, so it need not be a field. */}
            <p
              className="w-full font-black tracking-[0.06em] whitespace-nowrap"
              style={{ color: digits ? KIOSK.ink : "#C7C7CC", fontSize: "3.4vh" }}
            >
              {digits ? pretty(digits) : "50 123 4567"}
            </p>
          </div>
        </div>

        <div className="mt-[2vh] flex gap-[2.4vh] items-start">
          {/* ─── Typing it ─── */}
          <div className="flex-1 min-w-0">
            <Keypad
              onDigit={(d) => setDigits((v) => (v.length >= 14 ? v : v + d))}
              onBackspace={() => setDigits((v) => v.slice(0, -1))}
              onClear={() => setDigits("")}
            />

            {/* ─── What to do with it ─── */}
            <div className="mt-[1.8vh] space-y-[1vh]">
              {settings.sms_receipt_enabled && (
                <CheckRow label="Send receipt by SMS" on={sms} onToggle={() => setSms((v) => !v)} />
              )}
              {settings.whatsapp_receipt_enabled && (
                <CheckRow
                  label="Send receipt by WhatsApp"
                  on={whatsapp}
                  onToggle={() => setWhatsapp((v) => !v)}
                />
              )}
            </div>

            <p
              className="flex items-center gap-[0.7vh] mt-[1.4vh] text-[1.3vh]"
              style={{ color: KIOSK.inkSoft }}
            >
              <Lock className="w-[1.5vh] h-[1.5vh]" />
              Your number is used only for this order.
            </p>
          </div>

          {/* ─── What it comes to ─── */}
          <aside
            className="w-[38%] shrink-0 rounded-[1.8vh] p-[2vh]"
            style={{ border: `0.16vh solid ${KIOSK.line}`, background: "#FCFCFC" }}
          >
            <div className="flex items-center gap-[1vh] mb-[1.4vh]">
              <ShoppingBag className="w-[2vh] h-[2vh]" style={{ color: KIOSK.inkSoft }} />
              <h2 className="font-black text-[1.8vh]" style={{ color: KIOSK.ink }}>
                Final Order Summary
              </h2>
            </div>

            <p className="text-[1.4vh] mb-[0.8vh]" style={{ color: KIOSK.inkSoft }}>
              {totals.count} item{totals.count === 1 ? "" : "s"}
            </p>
            <p
              className="flex items-center gap-[0.6vh] text-[1.4vh] font-bold mb-[1.4vh]"
              style={{ color: KIOSK.ink }}
            >
              {delivering ? (
                <Bike className="w-[1.6vh] h-[1.6vh]" />
              ) : (
                <ShoppingBag className="w-[1.6vh] h-[1.6vh]" />
              )}
              {delivering ? "Delivery" : "Pickup"}
            </p>

            <Row label="Subtotal" value={aed(totals.subtotal)} />
            {totals.itemOffers > 0 && (
              <Row label="Item offers" value={`− ${aed(totals.itemOffers)}`} good />
            )}
            {totals.privilegeDiscount > 0 && (
              <Row
                label={`Privilege discount (${privilege?.discount_percent ?? 0}%)`}
                value={`− ${aed(totals.privilegeDiscount)}`}
                good
              />
            )}

            <div
              className="mt-[1.4vh] pt-[1.4vh]"
              style={{ borderTop: `0.13vh solid ${KIOSK.line}` }}
            >
              <p className="text-[1.4vh]" style={{ color: KIOSK.inkSoft }}>
                Total
              </p>
              <p className="font-black text-[3.6vh] leading-tight" style={{ color: KIOSK.ink }}>
                {aed(totals.total)}
              </p>
              {totals.totalSaved > 0 && (
                <p className="text-[1.4vh] font-bold mt-[0.3vh]" style={{ color: KIOSK.good }}>
                  You save {aed(totals.totalSaved)}
                </p>
              )}
              <p className="text-[1.2vh] mt-[0.5vh]" style={{ color: KIOSK.inkSoft }}>
                Includes {aed(totals.vat)} VAT
              </p>
            </div>

            {privilege && (
              <div
                className="mt-[1.6vh] rounded-[1.2vh] px-[1.3vh] py-[1.2vh] flex items-center gap-[0.9vh]"
                style={{ background: "#F0FDF4", border: "0.16vh solid #BBF7D0" }}
              >
                <ShieldCheck className="w-[2vh] h-[2vh] shrink-0" style={{ color: KIOSK.good }} />
                <span className="text-[1.3vh] font-bold leading-tight" style={{ color: "#15803D" }}>
                  Privilege Card
                  <br />
                  Applied
                </span>
              </div>
            )}
          </aside>
        </div>

        {error && (
          <p
            className="mt-[1.6vh] rounded-[1.2vh] px-[1.6vh] py-[1.2vh] text-[1.5vh] font-semibold"
            style={{ background: "#FEF2F2", color: KIOSK.bad }}
          >
            {error}
          </p>
        )}
      </div>

      {/* ─── The way on ─── */}
      <div
        className="shrink-0 px-[3vh] py-[1.8vh] flex items-center gap-[1.4vh] bg-white"
        style={{ borderTop: `0.13vh solid ${KIOSK.line}` }}
      >
        <button
          onClick={onBack}
          disabled={submitting}
          className="rounded-[1.4vh] px-[2.4vh] flex items-center gap-[0.9vh] font-bold text-[1.7vh] active:scale-95 transition-transform disabled:opacity-40"
          style={{ background: "#F4F4F4", color: KIOSK.ink, height: "6.6vh" }}
        >
          <ArrowLeft strokeWidth={3} className="w-[2vh] h-[2vh]" />
          Back
        </button>

        <button
          onClick={() => onDone(`${dial.code}${national}`, channels)}
          disabled={submitting || !complete}
          className="flex-1 rounded-[1.4vh] flex items-center justify-center gap-[1.2vh] font-black text-[2.2vh] active:scale-[0.98] transition-transform disabled:opacity-35"
          style={{ background: KIOSK.gold, color: KIOSK.onGold, height: "6.6vh" }}
        >
          {submitting ? "Sending to the kitchen…" : "DONE"}
          {!submitting && <Check strokeWidth={3.5} className="w-[2.4vh] h-[2.4vh]" />}
        </button>
      </div>
    </div>
  );
}

function CheckRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-[1.2vh] rounded-[1.2vh] px-[1.4vh] py-[1.2vh] text-start active:scale-[0.99] transition-transform"
      style={{ border: `0.16vh solid ${on ? KIOSK.gold : KIOSK.line}`, background: on ? KIOSK.goldSoft : "#fff" }}
    >
      <span
        className="shrink-0 rounded-[0.6vh] w-[2.6vh] h-[2.6vh] flex items-center justify-center"
        style={{
          background: on ? KIOSK.gold : "#fff",
          border: `0.16vh solid ${on ? KIOSK.gold : "#D4D4D8"}`,
          color: KIOSK.onGold,
        }}
      >
        {on && <Check strokeWidth={4} className="w-[1.6vh] h-[1.6vh]" />}
      </span>
      <span className="text-[1.55vh] font-semibold" style={{ color: KIOSK.ink }}>
        {label}
      </span>
    </button>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-[1vh] py-[0.35vh]">
      <span className="text-[1.35vh]" style={{ color: KIOSK.inkSoft }}>
        {label}
      </span>
      <span
        className="text-[1.45vh] font-bold whitespace-nowrap"
        style={{ color: good ? KIOSK.good : KIOSK.ink }}
      >
        {value}
      </span>
    </div>
  );
}
