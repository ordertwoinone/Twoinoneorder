"use client";

import { Delete } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";

/**
 * The only way anything is typed at this kiosk.
 *
 * An on-screen OS keyboard is the classic way to lose a kiosk: it covers half
 * the panel, it has a settings key on it, and on a locked-down browser it may
 * not appear at all. Every field here is fed by this instead, and the inputs
 * are readOnly so nothing else can raise one.
 */
export default function Keypad({
  onDigit,
  onBackspace,
  onClear,
  clearLabel = "Clear",
  /** An extra key in the bottom-left, e.g. a dash for a member number. */
  extraKey,
  onExtra,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  clearLabel?: string;
  extraKey?: string;
  onExtra?: () => void;
}) {
  const key =
    "rounded-[1.3vh] flex items-center justify-center font-bold active:scale-95 transition-transform select-none";

  return (
    <div className="grid grid-cols-3 gap-[1.2vh]">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button
          key={d}
          onClick={() => onDigit(d)}
          className={`${key} text-[3.2vh]`}
          style={{ height: "7.6vh", background: "#fff", border: `0.16vh solid ${KIOSK.line}`, color: KIOSK.ink }}
        >
          {d}
        </button>
      ))}

      {extraKey && onExtra ? (
        <button
          onClick={onExtra}
          className={`${key} text-[2.6vh]`}
          style={{ height: "7.6vh", background: "#fff", border: `0.16vh solid ${KIOSK.line}`, color: KIOSK.ink }}
        >
          {extraKey}
        </button>
      ) : (
        <button
          onClick={onClear}
          className={`${key} text-[1.9vh]`}
          style={{ height: "7.6vh", background: "#F4F4F4", color: KIOSK.inkSoft }}
        >
          {clearLabel}
        </button>
      )}

      <button
        onClick={() => onDigit("0")}
        className={`${key} text-[3.2vh]`}
        style={{ height: "7.6vh", background: "#fff", border: `0.16vh solid ${KIOSK.line}`, color: KIOSK.ink }}
      >
        0
      </button>

      <button
        onClick={onBackspace}
        aria-label="Delete the last character"
        className={key}
        style={{ height: "7.6vh", background: "#F4F4F4", color: KIOSK.ink }}
      >
        <Delete className="w-[2.8vh] h-[2.8vh]" />
      </button>

      {/* With the extra key taking the bottom-left slot, Clear moves to its own
          full-width row rather than being dropped. */}
      {extraKey && onExtra && (
        <button
          onClick={onClear}
          className={`${key} col-span-3 text-[1.9vh]`}
          style={{ height: "6vh", background: "#F4F4F4", color: KIOSK.inkSoft }}
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
