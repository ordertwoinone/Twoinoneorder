"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Keyboard, Plus, SendHorizontal, X } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import { kioskField, type KioskLang } from "@/lib/kiosk/i18n";
import { sizedImage } from "@/lib/image-url";
import { discountedPrice } from "@/lib/kalba/pricing";
import { aed, itemPrice, type KioskQty } from "@/lib/kiosk/cart";
import {
  TIO_CHIPS,
  TIO_QUERY_MAX,
  allergyNote,
  fetchTio,
  looksLikeAllergyQuestion,
  type TioChipKey,
} from "@/lib/kiosk/tio";
import type { KioskItem } from "@/lib/kiosk/types";
import TioAvatar, { TioThinking } from "./TioAvatar";
import TextKeyboard from "./TextKeyboard";

/**
 * Help me choose — and ask about a dish.
 *
 * Chips first, because the queue is real and most people want one of seven
 * things. The keyboard is folded away until someone asks for it, for the
 * question nobody wrote a chip for: "what goes with karak?", "does the brownie
 * have nuts?".
 *
 * Only the latest exchange is kept. This is a kiosk, not a chat app: the next
 * question replaces the last answer, and closing the sheet forgets both.
 */
interface Exchange {
  asked: string;
  loading: boolean;
  message: string;
  items: KioskItem[];
  allergy: boolean;
  failed: boolean;
}

export default function TioSheet({
  t,
  lang,
  items,
  cart,
  qty,
  onAdd,
  onClose,
}: {
  t: (key: string) => string;
  lang: KioskLang;
  items: KioskItem[];
  cart: string[];
  qty: KioskQty;
  onAdd: (item: KioskItem) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [shift, setShift] = useState(true);
  const [layout, setLayout] = useState<KioskLang>(lang);
  const [exchange, setExchange] = useState<Exchange | null>(null);

  const answerRef = useRef<HTMLDivElement | null>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function ask(query: string, chip?: TioChipKey) {
    const asked = query.trim().slice(0, TIO_QUERY_MAX);
    if (!asked) return;

    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;

    /* The warning is decided on the screen too, before any answer comes back,
       so it is there even if the answer never does. */
    const allergyAsked = !chip && looksLikeAllergyQuestion(asked);
    setExchange({ asked, loading: true, message: "", items: [], allergy: allergyAsked, failed: false });
    setTyping(false);
    setText("");
    requestAnimationFrame(() => answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

    const { reply, error } = await fetchTio({ kind: "ask", lang, cart, query: asked, chip }, controller.signal);
    if (controller.signal.aborted) return;

    const found = (reply?.itemIds ?? [])
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is KioskItem => Boolean(i));

    setExchange({
      asked,
      loading: false,
      message: reply?.message || error || t("tio.error"),
      items: found,
      allergy: allergyAsked || Boolean(reply?.allergy),
      failed: !reply,
    });
  }

  return (
    <div className="absolute inset-0 z-[35] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <button className="absolute inset-0" aria-label={t("tio.close")} onClick={onClose} />

      <div
        className="tio-rise relative w-full max-w-[110vh] bg-white rounded-t-[2.4vh] flex flex-col"
        style={{ maxHeight: "92%" }}
      >
        {/* ─── Who this is ─── */}
        <div
          className="shrink-0 flex items-center gap-[1.6vh] px-[2.6vh] py-[1.8vh]"
          style={{ borderBottom: `0.13vh solid ${KIOSK.line}` }}
        >
          <TioAvatar size="7.4vh" float />
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-[2.6vh] leading-none" style={{ color: KIOSK.ink }}>
              {t("tio.sheetTitle")}
            </h2>
            <p className="text-[1.5vh] mt-[0.7vh]" style={{ color: KIOSK.inkSoft }}>
              {t("tio.sheetSubtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("tio.close")}
            className="shrink-0 rounded-full w-[5vh] h-[5vh] flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "#F4F4F4", color: KIOSK.ink }}
          >
            <X strokeWidth={2.5} className="w-[2.4vh] h-[2.4vh]" />
          </button>
        </div>

        <div className="kiosk-scroll flex-1 px-[2.6vh] py-[1.8vh] min-h-[20vh]">
          {/* ─── The seven things people want ─── */}
          <div className="flex flex-wrap gap-[1vh]">
            {TIO_CHIPS.map((chip) => {
              const label = chip[lang];
              const on = exchange?.asked === label;
              return (
                <button
                  key={chip.key}
                  onClick={() => ask(label, chip.key)}
                  disabled={exchange?.loading}
                  className="rounded-full px-[1.8vh] font-bold text-[1.6vh] active:scale-95 transition-transform disabled:opacity-50"
                  style={{
                    height: "5vh",
                    background: on ? KIOSK.gold : "#F6F6F7",
                    color: on ? KIOSK.onGold : KIOSK.ink,
                    border: `0.16vh solid ${on ? KIOSK.gold : KIOSK.line}`,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* ─── The latest answer ─── */}
          {exchange && (
            <div ref={answerRef} className="mt-[2.2vh] scroll-mt-[2vh]">
              <div className="flex justify-end">
                <p
                  className="tio-bubble max-w-[80%] rounded-[1.8vh] rounded-ee-[0.4vh] px-[1.8vh] py-[1.1vh] text-[1.7vh] font-bold"
                  style={{ background: KIOSK.gold, color: KIOSK.onGold }}
                  dir="auto"
                >
                  {exchange.asked}
                </p>
              </div>

              <div className="flex items-start gap-[1.2vh] mt-[1.2vh]">
                <TioAvatar size="4.6vh" ring={false} />
                <div
                  className="tio-bubble max-w-[85%] rounded-[1.8vh] rounded-ss-[0.4vh] px-[1.8vh] py-[1.2vh]"
                  style={{ background: "#F4F4F5" }}
                >
                  {exchange.loading ? (
                    <span className="flex items-center gap-[1vh] py-[0.6vh]">
                      <TioThinking label={t("tio.thinking")} />
                    </span>
                  ) : (
                    <p
                      className="text-[1.7vh] font-semibold leading-snug whitespace-pre-line"
                      style={{ color: exchange.failed ? KIOSK.bad : KIOSK.ink }}
                      dir="auto"
                    >
                      {exchange.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Drawn from our own copy, never the model's: this is the one
                  sentence that must be there, worded the same, every time. */}
              {exchange.allergy && (
                <div
                  className="mt-[1.4vh] flex items-start gap-[1.2vh] rounded-[1.4vh] px-[1.6vh] py-[1.3vh]"
                  style={{ background: "#FEF2F2", border: "0.16vh solid #FECACA" }}
                  role="alert"
                >
                  <AlertTriangle className="w-[2.4vh] h-[2.4vh] shrink-0 mt-[0.1vh]" style={{ color: KIOSK.bad }} />
                  <div>
                    <p className="font-black text-[1.5vh]" style={{ color: "#991B1B" }}>
                      {t("tio.allergyTitle")}
                    </p>
                    <p className="text-[1.45vh] font-semibold leading-snug mt-[0.2vh]" style={{ color: "#7F1D1D" }}>
                      {allergyNote(lang)}
                    </p>
                  </div>
                </div>
              )}

              {exchange.items.length > 0 && (
                <div className="mt-[1.6vh] grid grid-cols-2 gap-[1.2vh]">
                  {exchange.items.map((item) => (
                    <ResultRow
                      key={item.id}
                      t={t}
                      lang={lang}
                      item={item}
                      count={qty[item.id] ?? 0}
                      onAdd={() => onAdd(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Asking in your own words ─── */}
        <div className="shrink-0 px-[2.6vh] pt-[1.4vh] pb-[1.8vh]" style={{ borderTop: `0.13vh solid ${KIOSK.line}` }}>
          <form
            className="flex items-center gap-[1vh]"
            onSubmit={(e) => { e.preventDefault(); ask(text); }}
          >
            <div
              className="flex-1 flex items-center rounded-[1.4vh] px-[1.6vh]"
              style={{ height: "6.2vh", border: `0.2vh solid ${typing || text ? KIOSK.gold : KIOSK.line}` }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, TIO_QUERY_MAX))}
                onFocus={() => setTyping(true)}
                inputMode="none"
                dir="auto"
                placeholder={t("tio.placeholder")}
                className="w-full bg-transparent font-semibold focus:outline-none"
                style={{ fontSize: "1.8vh", color: KIOSK.ink }}
              />
            </div>
            <button
              type="button"
              onClick={() => setTyping((v) => !v)}
              aria-label={typing ? t("tio.hideKeyboard") : t("tio.type")}
              className="shrink-0 rounded-[1.4vh] w-[6.2vh] h-[6.2vh] flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: typing ? KIOSK.goldSoft : "#F4F4F4", color: KIOSK.ink }}
            >
              <Keyboard className="w-[2.6vh] h-[2.6vh]" />
            </button>
            <button
              type="submit"
              disabled={!text.trim() || exchange?.loading}
              className="shrink-0 rounded-[1.4vh] px-[2.2vh] h-[6.2vh] flex items-center gap-[0.8vh] font-black text-[1.9vh] active:scale-95 transition-transform disabled:opacity-40"
              style={{ background: KIOSK.gold, color: KIOSK.onGold }}
            >
              {t("tio.ask")}
              <SendHorizontal strokeWidth={2.5} className="w-[2.2vh] h-[2.2vh] rtl:-scale-x-100" />
            </button>
          </form>

          {typing && (
            <div className="mt-[1.2vh]">
              <TextKeyboard
                lang={lang}
                layout={layout}
                shift={shift}
                onShift={() => setShift((v) => !v)}
                onLayout={() => setLayout((l) => (l === "ar" ? "en" : "ar"))}
                onKey={(char) => { setText((v) => (v + char).slice(0, TIO_QUERY_MAX)); setShift(false); }}
                onSpace={() => setText((v) => (v + " ").slice(0, TIO_QUERY_MAX))}
                onBackspace={() => setText((v) => v.slice(0, -1))}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  t,
  lang,
  item,
  count,
  onAdd,
}: {
  t: (key: string) => string;
  lang: KioskLang;
  item: KioskItem;
  count: number;
  onAdd: () => void;
}) {
  const price = discountedPrice(itemPrice(item), item.discount_percent ?? 0);
  return (
    <div
      className="tio-bubble flex items-center gap-[1.2vh] rounded-[1.6vh] p-[1vh]"
      style={{ border: `0.16vh solid ${count > 0 ? KIOSK.gold : KIOSK.line}` }}
    >
      {item.image_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={sizedImage(item.image_url, 200)}
          alt=""
          className="w-[8vh] h-[8vh] rounded-[1.2vh] object-cover shrink-0"
        />
      ) : (
        <span className="w-[8vh] h-[8vh] rounded-[1.2vh] shrink-0" style={{ background: KIOSK.goldSoft }} />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[1.55vh] leading-tight line-clamp-2" style={{ color: KIOSK.ink }}>
          {kioskField(lang, item, "name")}
        </p>
        <p className="font-black text-[1.5vh] mt-[0.5vh]" style={{ color: KIOSK.ink }}>
          {aed(price)}
        </p>
        {count > 0 && (
          <p className="text-[1.15vh] font-bold mt-[0.2vh]" style={{ color: KIOSK.good }}>
            {t("tio.inOrder")} · {count}
          </p>
        )}
      </div>
      <button
        onClick={onAdd}
        aria-label={`${t("tio.add")} ${kioskField(lang, item, "name")}`}
        className="shrink-0 rounded-full w-[5vh] h-[5vh] flex items-center justify-center active:scale-90 transition-transform"
        style={{ background: KIOSK.gold, color: KIOSK.onGold }}
      >
        <Plus strokeWidth={3} className="w-[2.4vh] h-[2.4vh]" />
      </button>
    </div>
  );
}
