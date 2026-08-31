"use client";

import { useState } from "react";
import { ArrowLeft, Bike, Check, Lock, MapPin, ShieldCheck, ShoppingBag } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import { aed, type KioskTotals } from "@/lib/kiosk/cart";
import type { KioskFulfilment, KioskSettings } from "@/lib/kiosk/types";
import Keyboard from "./Keyboard";
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
  address,
  onAddress,
  submitting,
  error,
  onBack,
  onDone,
}: {
  settings: KioskSettings;
  totals: KioskTotals;
  privilege: PrivilegeHolder | null;
  fulfilment: KioskFulfilment;
  address: string;
  onAddress: (value: string) => void;
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

  /* A delivery has to have somewhere to go. Short enough to be a typo rather
     than an address, and the driver is the one who pays for that mistake. */
  const delivering = fulfilment === "delivery";
  const addressOk = !delivering || address.trim().length >= 10;
  const ready = complete && addressOk;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="kiosk-scroll flex-1 px-[3vh] pt-[2.4vh] pb-[1.6vh]">
        <h1 className="font-black text-[4vh] leading-none" style={{ color: KIOSK.ink }}>
          {delivering ? "Where are we delivering?" : "Enter Your Phone Number"}
        </h1>
        <p className="mt-[1vh] text-[1.8vh]" style={{ color: KIOSK.inkSoft }}>
          {delivering
            ? "We need a number and an address before the kitchen starts."
            : "We’ll send your order number and digital receipt by SMS."}
        </p>

        <div className="mt-[2.6vh] flex gap-[2.4vh] items-start">
          {/* ─── Typing it ─── */}
          <div className="flex-1 min-w-0">
            <div className="flex gap-[1.2vh] mb-[1.6vh]">
              <select
                value={dial.code}
                onChange={(e) =>
                  setDial(DIAL_CODES.find((d) => d.code === e.target.value) ?? DIAL_CODES[0])
                }
                className="rounded-[1.3vh] px-[1.4vh] font-bold text-[1.9vh] shrink-0 bg-white"
                style={{ border: `0.16vh solid ${KIOSK.line}`, height: "8vh", color: KIOSK.ink }}
              >
                {DIAL_CODES.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.flag} {d.code}
                  </option>
                ))}
              </select>

              <div
                className="flex-1 rounded-[1.3vh] flex items-center px-[2vh] min-w-0"
                style={{
                  height: "8vh",
                  border: `0.2vh solid ${digits ? KIOSK.gold : KIOSK.line}`,
                  background: digits ? "#FFFDF6" : "#fff",
                }}
              >
                <input
                  value={pretty(digits)}
                  readOnly
                  placeholder="50 123 4567"
                  /* Sized to fit "50 123 4567" in the box beside the country
                     code, rather than running out of it. */
                  className="w-full bg-transparent font-black text-[2.2vh] tracking-wide"
                  style={{ color: digits ? KIOSK.ink : "#C7C7CC" }}
                />
              </div>
            </div>

            {delivering ? (
              <>
                <div
                  className="rounded-[1.3vh] px-[1.6vh] py-[1.2vh] mb-[1.2vh]"
                  style={{
                    border: `0.2vh solid ${address ? KIOSK.gold : KIOSK.line}`,
                    background: address ? "#FFFDF6" : "#fff",
                    minHeight: "7vh",
                  }}
                >
                  <p
                    className="flex items-center gap-[0.6vh] text-[1.2vh] font-semibold mb-[0.4vh]"
                    style={{ color: KIOSK.inkSoft }}
                  >
                    <MapPin className="w-[1.4vh] h-[1.4vh]" />
                    Delivery address
                  </p>
                  <p
                    className="text-[1.9vh] font-bold leading-snug break-words"
                    style={{ color: address ? KIOSK.ink : "#C7C7CC" }}
                  >
                    {address || "Building, street, area"}
                  </p>
                </div>

                {/* Letters, because a numeric pad cannot write an address and
                    the tablet's own keyboard would cover half the panel. */}
                <Keyboard
                  onKey={(c) => onAddress(address.length >= 160 ? address : address + c)}
                  onBackspace={() => onAddress(address.slice(0, -1))}
                  onSpace={() => onAddress(address.length >= 160 ? address : `${address} `)}
                />
              </>
            ) : (
              <Keypad
                onDigit={(d) => setDigits((v) => (v.length >= 14 ? v : v + d))}
                onBackspace={() => setDigits((v) => v.slice(0, -1))}
                onClear={() => setDigits("")}
              />
            )}

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
              {delivering ? "Delivery" : "Collect at the counter"}
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
            {totals.deliveryCharge > 0 && (
              <Row label="Delivery" value={aed(totals.deliveryCharge)} />
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
          disabled={submitting || !ready}
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
