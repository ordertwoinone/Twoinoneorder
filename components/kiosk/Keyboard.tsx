"use client";

import { useState } from "react";
import { ArrowBigUp, Delete } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";

/**
 * Letters, for the one field on this screen that needs them.
 *
 * The numeric pad is enough for a phone number and a card number, which is
 * everything else the kiosk asks for. An address is not, and the tablet's own
 * keyboard is not an option: in kiosk mode it may not appear at all, and where
 * it does it covers half a portrait panel and brings a settings key with it.
 *
 * So this is deliberately plain — QWERTY, one shift, a space bar wide enough to
 * hit with a thumb. Shift releases after a letter, the way a phone does, since
 * the only capitals anybody types into an address are the first ones.
 */

const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export default function Keyboard({
  onKey,
  onBackspace,
  onSpace,
}: {
  onKey: (character: string) => void;
  onBackspace: () => void;
  onSpace: () => void;
}) {
  const [shift, setShift] = useState(true);

  const key =
    "rounded-[1vh] flex items-center justify-center font-bold active:scale-95 transition-transform select-none";
  const keyStyle = {
    height: "6vh",
    background: "#fff",
    border: `0.13vh solid ${KIOSK.line}`,
    color: KIOSK.ink,
    fontSize: "2vh",
  } as const;

  function press(character: string) {
    onKey(shift ? character.toUpperCase() : character);
    // Releases after one letter, like a phone. Holding it is not worth a mode.
    if (shift) setShift(false);
  }

  return (
    <div className="flex flex-col gap-[0.7vh]">
      <div className="flex gap-[0.6vh]">
        {NUMBERS.map((n) => (
          <button key={n} onClick={() => onKey(n)} className={`${key} flex-1`} style={keyStyle}>
            {n}
          </button>
        ))}
      </div>

      {ROWS.map((row, i) => (
        <div key={i} className="flex gap-[0.6vh]" style={{ paddingInline: `${i * 2}%` }}>
          {i === 2 && (
            <button
              onClick={() => setShift((v) => !v)}
              aria-label="Shift"
              className={`${key} px-[1.6vh]`}
              style={{
                ...keyStyle,
                background: shift ? KIOSK.gold : "#F4F4F4",
                color: shift ? KIOSK.onGold : KIOSK.ink,
              }}
            >
              <ArrowBigUp className="w-[2.2vh] h-[2.2vh]" />
            </button>
          )}

          {row.map((letter) => (
            <button
              key={letter}
              onClick={() => press(letter)}
              className={`${key} flex-1`}
              style={keyStyle}
            >
              {shift ? letter.toUpperCase() : letter}
            </button>
          ))}

          {i === 2 && (
            <button
              onClick={onBackspace}
              aria-label="Delete the last character"
              className={`${key} px-[1.6vh]`}
              style={{ ...keyStyle, background: "#F4F4F4" }}
            >
              <Delete className="w-[2.2vh] h-[2.2vh]" />
            </button>
          )}
        </div>
      ))}

      <div className="flex gap-[0.6vh]">
        {[",", "-", "/"].map((c) => (
          <button key={c} onClick={() => onKey(c)} className={`${key} px-[2vh]`} style={keyStyle}>
            {c}
          </button>
        ))}
        <button onClick={onSpace} className={`${key} flex-1`} style={keyStyle}>
          space
        </button>
      </div>
    </div>
  );
}
