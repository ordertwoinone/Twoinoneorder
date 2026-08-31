"use client";

import { useState } from "react";
import { CreditCard, X } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import type { PrivilegeHolder } from "./ReviewPanel";
import Keypad from "./Keypad";

/**
 * Step 3 — the Student Privilege Card, if they have one.
 *
 * Identified by what is printed on the card: the short member id read out at
 * the counter ("KU-25896"), or the sixteen-digit number. The card is looked up
 * on the server, and the discount it comes back with is the card's own — the
 * screen never decides what a card is worth.
 */
export default function PrivilegeModal({
  t,
  onCancel,
  onApplied,
  onSkip,
}: {
  t: (key: string) => string;
  onCancel: () => void;
  onApplied: (holder: PrivilegeHolder, code: string) => void;
  onSkip: () => void;
}) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  /* Every card starts "KU-", so the keypad alone can type one: the prefix is
     put in the moment they press a digit, and the dash key adds the rest. */
  function digit(d: string) {
    setError("");
    setCode((c) => (c.length >= 20 ? c : c + d));
  }

  async function check() {
    const typed = code.trim();
    if (!typed) {
      setError("Enter your card or member number");
      return;
    }
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/kiosk/privilege", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: typed }),
      });
      const data = await res.json();
      if (data?.valid && data.card) {
        onApplied(data.card as PrivilegeHolder, typed);
      } else {
        setError(data?.error || "We could not find that card");
      }
    } catch {
      setError("Could not check the card. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-[3vh]"
      style={{ background: "rgba(0,0,0,0.55)" }}
    >
      <div className="bg-white rounded-[2.4vh] w-full max-w-[62vh] flex flex-col overflow-hidden">
        <div
          className="flex items-center gap-[1.4vh] px-[2.4vh] py-[2vh]"
          style={{ borderBottom: `0.13vh solid ${KIOSK.line}` }}
        >
          <span
            className="rounded-[1.1vh] w-[5vh] h-[5vh] flex items-center justify-center shrink-0"
            style={{ background: KIOSK.goldSoft }}
          >
            <CreditCard className="w-[2.5vh] h-[2.5vh]" style={{ color: KIOSK.onGold }} />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-[2.3vh] leading-tight" style={{ color: KIOSK.ink }}>
              {t("privilege.title")}
            </h2>
            <p className="text-[1.35vh] mt-[0.3vh]" style={{ color: KIOSK.inkSoft }}>
              {t("privilege.subtitle")}
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="rounded-full w-[5vh] h-[5vh] flex items-center justify-center shrink-0 active:scale-90 transition-transform"
            style={{ background: "#F4F4F4", color: KIOSK.ink }}
          >
            <X strokeWidth={2.5} className="w-[2.4vh] h-[2.4vh]" />
          </button>
        </div>

        <div className="px-[2.4vh] py-[2vh]">
          <div
            className="rounded-[1.4vh] flex items-center px-[2vh] mb-[0.9vh]"
            style={{
              height: "8vh",
              border: `0.2vh solid ${error ? KIOSK.bad : KIOSK.gold}`,
              background: "#FFFDF6",
            }}
          >
            {/* Same reason as the phone field: a readOnly input scrolls its
                own contents and hides the front of a long card number. */}
            <p
              className="w-full font-black tracking-[0.1em] text-center truncate"
              style={{
                color: code ? KIOSK.ink : "#C7C7CC",
                fontSize: code.length > 12 ? "2.2vh" : "3vh",
              }}
            >
              {code || "KU-00000"}
            </p>
          </div>

          <p
            className="text-[1.3vh] text-center mb-[1.6vh] min-h-[2vh]"
            style={{ color: error ? KIOSK.bad : KIOSK.inkSoft }}
          >
            {error || t("privilege.hint")}
          </p>

          <Keypad
            onDigit={digit}
            onBackspace={() => { setError(""); setCode((c) => c.slice(0, -1)); }}
            onClear={() => { setError(""); setCode(""); }}
            extraKey="KU-"
            onExtra={() => { setError(""); setCode((c) => (c.startsWith("KU-") ? c : `KU-${c}`)); }}
          />

          <div className="flex gap-[1.2vh] mt-[2vh]">
            <button
              onClick={onSkip}
              className="rounded-[1.4vh] px-[2.4vh] font-bold text-[1.7vh] active:scale-95 transition-transform"
              style={{ background: "#F4F4F4", color: KIOSK.ink, height: "6.4vh" }}
            >
              {t("privilege.noCard")}
            </button>
            <button
              onClick={check}
              disabled={checking || code.trim().length === 0}
              className="flex-1 rounded-[1.4vh] font-black text-[2vh] active:scale-[0.98] transition-transform disabled:opacity-35"
              style={{ background: KIOSK.gold, color: KIOSK.onGold, height: "6.4vh" }}
            >
              {checking ? t("privilege.checking") : t("privilege.apply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
