"use client";

import { Check, Globe, User } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import { KIOSK_LANGS, type KioskLang } from "@/lib/kiosk/i18n";

/**
 * The furniture every ordering screen wears: the wordmark, where the customer
 * is up to, and the two controls that stay put throughout.
 */

/** The five stops between walking up and walking away with a number. */
export const KIOSK_STEPS = [
  { key: "choose", label: "step.choose" },
  { key: "review", label: "step.review" },
  { key: "privilege", label: "step.privilege" },
  { key: "phone", label: "step.phone" },
  { key: "done", label: "step.done" },
] as const;

export type KioskStepKey = (typeof KIOSK_STEPS)[number]["key"];

export function KioskWordmark({
  name,
  subtitle,
  logoUrl,
  size = "sm",
}: {
  name: string;
  subtitle: string;
  logoUrl?: string;
  size?: "sm" | "lg";
  }) {
  const big = size === "lg";
  if (logoUrl) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={logoUrl} alt={name} className={big ? "h-[4.5vh] w-auto" : "h-[3vh] w-auto"} />;
  }
  return (
    <div className="leading-none">
      <p
        className={`font-black tracking-tight ${big ? "text-[2.6vh]" : "text-[1.9vh]"}`}
        style={{ color: "inherit" }}
      >
        {name}
      </p>
      <p
        className={`font-semibold tracking-[0.18em] ${big ? "text-[1.1vh]" : "text-[0.85vh]"} opacity-70 mt-[0.4vh]`}
      >
        {subtitle}
      </p>
    </div>
  );
}

/**
 * The progress rail.
 *
 * Steps already behind the customer get a tick rather than staying numbered —
 * at a kiosk the reassuring thing is seeing what is finished, not counting what
 * is left. Steps the flow is configured to skip are not drawn at all.
 */
export function KioskStepper({
  current,
  skip = [],
  t,
}: {
  current: KioskStepKey;
  skip?: KioskStepKey[];
  t: (key: string) => string;
}) {
  const steps = KIOSK_STEPS.filter((s) => !skip.includes(s.key));
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-[0.9vh] flex-wrap">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-[0.9vh]">
            {i > 0 && <span className="text-[1.1vh]" style={{ color: KIOSK.line }}>•</span>}
            <div className="flex items-center gap-[0.55vh]">
              <span
                className="flex items-center justify-center rounded-full font-bold w-[2.1vh] h-[2.1vh] text-[1.05vh] shrink-0"
                style={
                  done
                    ? { background: "transparent", color: KIOSK.good, border: `0.16vh solid ${KIOSK.good}` }
                    : active
                      ? { background: KIOSK.gold, color: KIOSK.onGold }
                      : { background: "#F1F1F1", color: "#9CA3AF" }
                }
              >
                {done ? <Check size="70%" strokeWidth={3.5} /> : i + 1}
              </span>
              <span
                className="text-[1.15vh] font-semibold whitespace-nowrap"
                style={{ color: active ? KIOSK.ink : done ? KIOSK.good : "#9CA3AF" }}
              >
                {t(step.label)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Language and sign-in, in the corner of every ordering screen.
 *
 * Both languages are shown as buttons rather than a dropdown that cycles: a
 * customer scanning for Arabic should see the word العربية on the screen, not
 * have to press something labelled English to find out what is behind it.
 */
export function KioskCornerControls({
  lang,
  onLang,
  t,
}: {
  lang: KioskLang;
  onLang: (next: KioskLang) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center gap-[0.9vh]">
      <div
        className="flex items-center gap-[0.3vh] rounded-full p-[0.3vh]"
        style={{ border: `0.13vh solid ${KIOSK.line}` }}
      >
        <Globe className="w-[1.4vh] h-[1.4vh] mx-[0.5vh]" style={{ color: KIOSK.inkSoft }} />
        {KIOSK_LANGS.map((option) => {
          const on = lang === option.code;
          return (
            <button
              key={option.code}
              onClick={() => onLang(option.code)}
              className="rounded-full px-[1.2vh] py-[0.6vh] text-[1.2vh] font-bold active:scale-95 transition-transform"
              style={{
                background: on ? KIOSK.gold : "transparent",
                color: on ? KIOSK.onGold : KIOSK.inkSoft,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span
        className="flex items-center gap-[0.5vh] rounded-full px-[1.4vh] py-[0.8vh] text-[1.2vh] font-semibold opacity-45"
        style={{ border: `0.13vh solid ${KIOSK.line}`, color: KIOSK.ink }}
      >
        <User className="w-[1.4vh] h-[1.4vh]" />
        {t("common.login")}
      </span>
    </div>
  );
}

/** The bar across the top of every screen after the idle one. */
export function KioskHeader({
  brandName,
  brandSubtitle,
  logoUrl,
  deviceName,
  step,
  skip,
  lang,
  onLang,
  t,
}: {
  brandName: string;
  brandSubtitle: string;
  logoUrl?: string;
  /** Which panel this is. Shown small — it is for staff, not for customers. */
  deviceName?: string;
  step: KioskStepKey;
  skip?: KioskStepKey[];
  lang: KioskLang;
  onLang: (next: KioskLang) => void;
  t: (key: string) => string;
}) {
  return (
    <header
      className="shrink-0 px-[2.4vh] pt-[2.2vh] pb-[1.4vh]"
      style={{ color: KIOSK.ink, borderBottom: `0.13vh solid ${KIOSK.line}` }}
    >
      <div className="flex items-center justify-between gap-[1.5vh]">
        <div className="flex items-center gap-[1.2vh] min-w-0">
          <KioskWordmark name={brandName} subtitle={brandSubtitle} logoUrl={logoUrl} />
          {deviceName && (
            <span
              className="shrink-0 rounded-full px-[0.9vh] py-[0.3vh] text-[1vh] font-bold"
              style={{ background: "#F4F4F4", color: "#9CA3AF" }}
            >
              {deviceName}
            </span>
          )}
        </div>
        <KioskCornerControls lang={lang} onLang={onLang} t={t} />
      </div>
      <div className="mt-[1.3vh]">
        <KioskStepper current={step} skip={skip} t={t} />
      </div>
    </header>
  );
}
