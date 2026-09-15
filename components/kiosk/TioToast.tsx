"use client";

import { useEffect } from "react";
import { Plus, X } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import { kioskField, type KioskLang } from "@/lib/kiosk/i18n";
import { sizedImage } from "@/lib/image-url";
import { discountedPrice } from "@/lib/kalba/pricing";
import { aed, itemPrice } from "@/lib/kiosk/cart";
import type { KioskItem } from "@/lib/kiosk/types";
import TioAvatar from "./TioAvatar";

/** Long enough to read one sentence and reach for it; short enough to be gone. */
const SHOW_FOR_MS = 7000;

/**
 * TIO's pop-up after a dish goes in: one thing that goes with it.
 *
 * It sits above the basket bar and never over the grid's Add buttons, it goes
 * on its own, and it offers one dish, not four — this is a nudge, not a menu.
 */
export default function TioToast({
  t,
  lang,
  item,
  message,
  onAdd,
  onClose,
}: {
  t: (key: string) => string;
  lang: KioskLang;
  item: KioskItem;
  message: string;
  onAdd: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [item.id, onClose]);

  const price = discountedPrice(itemPrice(item), item.discount_percent ?? 0);

  return (
    <div
      key={item.id}
      className="tio-rise absolute z-20 start-[2.4vh] end-[2.4vh] flex items-center gap-[1.6vh] rounded-[2vh] bg-white px-[1.8vh] py-[1.4vh]"
      style={{
        bottom: "11vh",
        border: `0.2vh solid ${KIOSK.gold}`,
        boxShadow: "0 1.2vh 3.6vh rgba(0,0,0,0.22)",
      }}
      role="status"
    >
      <TioAvatar size="7vh" float />

      <div className="flex-1 min-w-0">
        <p className="text-[1.2vh] font-extrabold tracking-wide" style={{ color: KIOSK.goldDeep }}>
          {t("tio.name")}
        </p>
        <p className="font-bold text-[1.75vh] leading-snug mt-[0.2vh]" style={{ color: KIOSK.ink }} dir="auto">
          {message}
        </p>
      </div>

      {item.image_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={sizedImage(item.image_url, 200)}
          alt=""
          className="w-[7vh] h-[7vh] rounded-[1.2vh] object-cover shrink-0"
        />
      )}

      <button
        onClick={onAdd}
        className="shrink-0 rounded-[1.3vh] px-[1.8vh] flex flex-col items-center justify-center font-black active:scale-95 transition-transform"
        style={{ background: KIOSK.gold, color: KIOSK.onGold, height: "7vh" }}
        aria-label={`${t("tio.add")} ${kioskField(lang, item, "name")}`}
      >
        <span className="flex items-center gap-[0.5vh] text-[1.8vh]">
          <Plus strokeWidth={3} className="w-[1.9vh] h-[1.9vh]" />
          {t("tio.add")}
        </span>
        <span className="text-[1.15vh] font-bold">{aed(price)}</span>
      </button>

      <button
        onClick={onClose}
        aria-label={t("tio.noThanks")}
        className="shrink-0 rounded-full w-[4.4vh] h-[4.4vh] flex items-center justify-center active:scale-90 transition-transform"
        style={{ background: "#F4F4F4", color: KIOSK.inkSoft }}
      >
        <X strokeWidth={2.5} className="w-[2vh] h-[2vh]" />
      </button>
    </div>
  );
}
