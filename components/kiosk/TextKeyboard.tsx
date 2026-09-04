"use client";

import { ArrowBigUp, Delete, Globe, Space } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import type { KioskLang } from "@/lib/kiosk/i18n";

/**
 * A keyboard drawn on the screen, because the screen is all there is.
 *
 * The kiosk is a panel bolted to a wall with no keyboard attached to it. Every
 * other field on it takes digits, so Keypad.tsx was enough; a note is the first
 * thing here anybody has to spell. Relying on the browser to raise the
 * operating system's own keyboard is what would normally be done and it is not
 * safe here: Chrome in kiosk mode on a Windows panel raises nothing at all, and
 * the customer would be left tapping a field that never fills.
 *
 * So the keys are ours. A hardware keyboard, if one is ever plugged in, still
 * works — the field behind this is a real input and this only appends to it.
 *
 * Both alphabets, because the kiosk sells in both. An Arabic customer typing
 * "بدون بصل" on a QWERTY layout is not a customer who has been given Arabic.
 */

const LATIN: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m", ",", "."],
];

const ARABIC: string[][] = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط"],
  ["ئ", "ء", "ؤ", "ر", "ى", "ة", "و", "ز", "ظ", "د"],
];

export default function TextKeyboard({
  lang,
  shift,
  onShift,
  onKey,
  onSpace,
  onBackspace,
  onLayout,
  layout,
}: {
  lang: KioskLang;
  shift: boolean;
  onShift: () => void;
  onKey: (char: string) => void;
  onSpace: () => void;
  onBackspace: () => void;
  /** Switching the letters, which is not the same as switching the kiosk. */
  onLayout: () => void;
  layout: KioskLang;
}) {
  const rows = layout === "ar" ? ARABIC : LATIN;
  const arabic = layout === "ar";

  return (
    /* Always left-to-right, even in Arabic. A keyboard is a picture of a
       physical object, not a line of text — mirroring it puts the keys in an
       order nobody has ever typed on. */
    <div className="select-none" dir="ltr">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-[0.7vh] mb-[0.7vh]">
          {row.map((key) => (
            <Key
              key={key}
              label={!arabic && shift ? key.toUpperCase() : key}
              onPress={() => onKey(!arabic && shift ? key.toUpperCase() : key)}
            />
          ))}
        </div>
      ))}

      <div className="flex justify-center gap-[0.7vh]">
        {/* Shift is meaningless in Arabic, which has no letter case, so it is
            not drawn there rather than drawn and doing nothing. */}
        {!arabic && (
          <Key wide onPress={onShift} active={shift} ariaLabel="Shift">
            <ArrowBigUp strokeWidth={2.5} className="w-[2.2vh] h-[2.2vh]" />
          </Key>
        )}

        <Key wide onPress={onLayout} ariaLabel="Switch the keyboard letters">
          <Globe strokeWidth={2.5} className="w-[2vh] h-[2vh]" />
          <span className="text-[1.3vh] font-bold ms-[0.5vh]">
            {arabic ? "ABC" : "عربي"}
          </span>
        </Key>

        <Key grow onPress={onSpace} ariaLabel="Space">
          <Space strokeWidth={2.5} className="w-[2.2vh] h-[2.2vh]" />
        </Key>

        <Key wide onPress={onBackspace} ariaLabel="Backspace">
          <Delete strokeWidth={2.5} className="w-[2.2vh] h-[2.2vh]" />
        </Key>
      </div>

      {/* The kiosk's own language is untouched by the button above. Somebody
          reading Arabic may still want to write "no onions" in English. */}
      <span className="sr-only">{lang}</span>
    </div>
  );
}

function Key({
  label,
  children,
  onPress,
  wide,
  grow,
  active,
  ariaLabel,
}: {
  label?: string;
  children?: React.ReactNode;
  onPress: () => void;
  wide?: boolean;
  grow?: boolean;
  active?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      /* onPointerDown, not onClick. A key that waits for the finger to lift
         feels like a lag at the speed people type, and the click that follows a
         touch is ~100ms behind the tap. */
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      className={`flex items-center justify-center rounded-[1vh] font-bold active:scale-90 transition-transform ${grow ? "flex-1" : ""}`}
      style={{
        height: "5.6vh",
        minWidth: wide ? "9vh" : "5.4vh",
        fontSize: "2vh",
        background: active ? KIOSK.gold : "#F2F2F4",
        color: active ? KIOSK.onGold : KIOSK.ink,
        border: `0.13vh solid ${active ? KIOSK.gold : "#E4E4E7"}`,
      }}
    >
      {children ?? label}
    </button>
  );
}
