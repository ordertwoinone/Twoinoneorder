"use client";

import { Check, Globe, User } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";

/**
 * The furniture every ordering screen wears: the wordmark, where the customer
 * is up to, and the two controls that stay put throughout.
 */

/** The five stops between walking up and walking away with a number. */
export const KIOSK_STEPS = [
  { key: "choose", label: "Choose" },
  { key: "review", label: "Review" },
  { key: "privilege", label: "Privilege Card" },
  { key: "phone", label: "Phone Number" },
  { key: "done", label: "Done" },
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
}: {
  current: KioskStepKey;
  skip?: KioskStepKey[];
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
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Language and sign-in, in the corner of every ordering screen. */
export function KioskCornerControls({
  language,
  onLanguage,
}: {
  language: string;
  onLanguage: () => void;
}) {
  return (
    <div className="flex items-center gap-[0.9vh]">
      <button
        onClick={onLanguage}
        className="flex items-center gap-[0.5vh] rounded-full px-[1.4vh] py-[0.8vh] text-[1.2vh] font-semibold active:scale-95 transition-transform"
        style={{ border: `0.13vh solid ${KIOSK.line}`, color: KIOSK.ink }}
      >
        <Globe className="w-[1.4vh] h-[1.4vh]" />
        {language}
      </button>
      <span
        className="flex items-center gap-[0.5vh] rounded-full px-[1.4vh] py-[0.8vh] text-[1.2vh] font-semibold opacity-45"
        style={{ border: `0.13vh solid ${KIOSK.line}`, color: KIOSK.ink }}
      >
        <User className="w-[1.4vh] h-[1.4vh]" />
        Login
      </span>
    </div>
  );
}

/** The bar across the top of every screen after the idle one. */
export function KioskHeader({
  brandName,
  brandSubtitle,
  logoUrl,
  step,
  skip,
  language,
  onLanguage,
  stacked = false,
}: {
  brandName: string;
  brandSubtitle: string;
  logoUrl?: string;
  step: KioskStepKey;
  skip?: KioskStepKey[];
  language: string;
  onLanguage: () => void;
  /* The phone and confirmation screens carry all five steps, which will not sit
     beside the wordmark — they drop to their own line instead of shrinking. */
  stacked?: boolean;
}) {
  return (
    <header
      className="shrink-0 px-[2.4vh] pt-[2.2vh] pb-[1.4vh]"
      style={{ color: KIOSK.ink, borderBottom: `0.13vh solid ${KIOSK.line}` }}
    >
      <div className="flex items-center justify-between gap-[1.5vh]">
        <KioskWordmark name={brandName} subtitle={brandSubtitle} logoUrl={logoUrl} />
        {!stacked && <KioskStepper current={step} skip={skip} />}
        <KioskCornerControls language={language} onLanguage={onLanguage} />
      </div>
      {stacked && (
        <div className="mt-[1.4vh]">
          <KioskStepper current={step} skip={skip} />
        </div>
      )}
    </header>
  );
}
