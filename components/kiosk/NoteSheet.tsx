"use client";

import { useEffect, useState } from "react";
import { Check, MessageSquarePlus, X } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import type { KioskLang } from "@/lib/kiosk/i18n";
import TextKeyboard from "./TextKeyboard";

/**
 * Adding a note — to one dish, or to the whole order.
 *
 * One sheet for both, because they are the same act with a different subject
 * and two near-identical modals would drift apart the first time either was
 * touched. What changes is the heading and which suggestions are offered.
 *
 * The suggestions are the point. Almost every note a kitchen actually receives
 * is one of six sentences, and a customer with a queue behind them will tap a
 * chip and will not spell out "no onions please" letter by letter on a wall
 * panel. The keyboard is there for the seventh sentence, not the first six.
 *
 * Chips are additive rather than exclusive: "no onions" and "extra spicy" is a
 * real order, and making them radio buttons would quietly drop one.
 */

export const ITEM_NOTE_MAX = 120;
export const ORDER_NOTE_MAX = 300;

/** The six things people actually ask for, per dish. */
const ITEM_CHIPS: Record<KioskLang, string[]> = {
  en: ["No onions", "No pickles", "Extra spicy", "Not spicy", "No sauce", "Well done"],
  ar: ["بدون بصل", "بدون مخلل", "حار إضافي", "غير حار", "بدون صوص", "مطبوخ جيداً"],
};

/** And for the ticket as a whole. */
const ORDER_CHIPS: Record<KioskLang, string[]> = {
  en: [
    "No cutlery",
    "Extra napkins",
    "Please call on arrival",
    "Pack separately",
    "Make it quick",
    "Extra bags",
  ],
  ar: [
    "بدون أدوات مائدة",
    "مناديل إضافية",
    "اتصل بي عند الوصول",
    "غلّفها بشكل منفصل",
    "أرجو الاستعجال",
    "أكياس إضافية",
  ],
};

export default function NoteSheet({
  t,
  lang,
  /** The dish this is about, or empty for the whole order. */
  subject,
  scope,
  initial,
  onCancel,
  onSave,
}: {
  t: (key: string) => string;
  lang: KioskLang;
  subject: string;
  scope: "item" | "order";
  initial: string;
  onCancel: () => void;
  onSave: (note: string) => void;
}) {
  const max = scope === "item" ? ITEM_NOTE_MAX : ORDER_NOTE_MAX;
  const [text, setText] = useState(initial.slice(0, max));
  const [shift, setShift] = useState(true);
  /* The letters start in whatever the customer is reading, and can be switched
     without switching the kiosk — somebody reading Arabic may still want to
     write "no onions" in English, and often does. */
  const [layout, setLayout] = useState<KioskLang>(lang);

  const chips = (scope === "item" ? ITEM_CHIPS : ORDER_CHIPS)[lang];

  // Escape closes it, for the one panel somebody has plugged a keyboard into.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function append(chunk: string) {
    setText((v) => (v + chunk).slice(0, max));
    // Shift is a one-shot capital, as it is on every phone.
    setShift(false);
  }

  /** A chip goes on the end of whatever is already there, comma-separated. */
  function toggleChip(chip: string) {
    setText((v) => {
      const parts = v.split(",").map((p) => p.trim()).filter(Boolean);
      const at = parts.findIndex((p) => p.toLowerCase() === chip.toLowerCase());
      const next = at >= 0 ? parts.filter((_, i) => i !== at) : [...parts, chip];
      return next.join(", ").slice(0, max);
    });
  }

  const chosen = new Set(
    text.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean),
  );

  return (
    <div
      className="absolute inset-0 z-[70] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <button className="absolute inset-0" aria-label={t("note.cancel")} onClick={onCancel} />

      <div
        className="relative w-full max-w-[110vh] bg-white rounded-t-[2.4vh] flex flex-col"
        style={{ maxHeight: "94%" }}
      >
        {/* ─── What this is about ─── */}
        <div
          className="shrink-0 flex items-center justify-between px-[2.6vh] py-[2vh]"
          style={{ borderBottom: `0.13vh solid ${KIOSK.line}` }}
        >
          <div className="min-w-0">
            <h2 className="font-black text-[2.4vh] leading-none" style={{ color: KIOSK.ink }}>
              {scope === "item" ? t("note.itemTitle") : t("note.orderTitle")}
            </h2>
            <p className="text-[1.5vh] mt-[0.6vh] truncate" style={{ color: KIOSK.inkSoft }}>
              {subject || t("note.orderSubtitle")}
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label={t("note.cancel")}
            className="shrink-0 rounded-full w-[5vh] h-[5vh] flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "#F4F4F4", color: KIOSK.ink }}
          >
            <X strokeWidth={2.5} className="w-[2.4vh] h-[2.4vh]" />
          </button>
        </div>

        <div className="kiosk-scroll flex-1 px-[2.6vh] py-[1.8vh]">
          {/* ─── The six sentences ─── */}
          <div className="flex flex-wrap gap-[1vh]">
            {chips.map((chip) => {
              const on = chosen.has(chip.toLowerCase());
              return (
                <button
                  key={chip}
                  onClick={() => toggleChip(chip)}
                  className="flex items-center gap-[0.7vh] rounded-full px-[1.8vh] font-bold text-[1.6vh] active:scale-95 transition-transform"
                  style={{
                    height: "5vh",
                    background: on ? KIOSK.gold : "#F6F6F7",
                    color: on ? KIOSK.onGold : KIOSK.ink,
                    border: `0.16vh solid ${on ? KIOSK.gold : KIOSK.line}`,
                  }}
                >
                  {on && <Check strokeWidth={3.5} className="w-[1.7vh] h-[1.7vh]" />}
                  {chip}
                </button>
              );
            })}
          </div>

          {/* ─── And anything else ─── */}
          <div
            className="mt-[1.8vh] rounded-[1.4vh] px-[1.8vh] py-[1.4vh]"
            style={{
              border: `0.2vh solid ${text ? KIOSK.gold : KIOSK.line}`,
              background: text ? "#FFFDF6" : "#fff",
              minHeight: "9vh",
            }}
          >
            {/* A real textarea, so a hardware keyboard works and so the text
                wraps and scrolls the way people expect. The on-screen keys
                below only append to it. */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, max))}
              rows={2}
              dir="auto"
              placeholder={t("note.placeholder")}
              className="w-full resize-none bg-transparent font-semibold focus:outline-none"
              style={{ fontSize: "2.1vh", color: KIOSK.ink, lineHeight: 1.4 }}
            />
          </div>

          <p className="mt-[0.7vh] text-[1.25vh] text-end" style={{ color: KIOSK.inkSoft }}>
            {text.length} / {max}
          </p>

          {/* ─── Something to type on ─── */}
          <div className="mt-[1vh]">
            <TextKeyboard
              lang={lang}
              layout={layout}
              shift={shift}
              onShift={() => setShift((v) => !v)}
              onLayout={() => setLayout((l) => (l === "ar" ? "en" : "ar"))}
              onKey={append}
              onSpace={() => append(" ")}
              onBackspace={() => setText((v) => v.slice(0, -1))}
            />
          </div>
        </div>

        {/* ─── Keep it or drop it ─── */}
        <div
          className="shrink-0 flex gap-[1.2vh] px-[2.6vh] py-[1.8vh]"
          style={{ borderTop: `0.13vh solid ${KIOSK.line}` }}
        >
          {/* Clearing is its own button rather than "delete it all by hand".
              A customer who changes their mind about a note should not have to
              hold backspace forty times. */}
          <button
            onClick={() => onSave("")}
            className="rounded-[1.4vh] px-[2.4vh] font-bold text-[1.7vh] active:scale-95 transition-transform"
            style={{ background: "#F4F4F4", color: KIOSK.ink, height: "6.4vh" }}
          >
            {initial ? t("note.clear") : t("note.cancel")}
          </button>

          <button
            onClick={() => onSave(text.trim().slice(0, max))}
            className="flex-1 rounded-[1.4vh] flex items-center justify-center gap-[1vh] font-black text-[2vh] active:scale-[0.98] transition-transform"
            style={{ background: KIOSK.gold, color: KIOSK.onGold, height: "6.4vh" }}
          >
            <MessageSquarePlus strokeWidth={2.5} className="w-[2.2vh] h-[2.2vh]" />
            {t("note.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
