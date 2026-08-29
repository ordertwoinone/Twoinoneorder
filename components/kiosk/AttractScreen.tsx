"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, CreditCard } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import { AD_FALLBACK_SECONDS, type KioskAd, type KioskSettings } from "@/lib/kiosk/types";
import { KioskWordmark } from "./Chrome";

/**
 * The screen nobody is standing at.
 *
 * It plays whatever admin → Kiosk → Ads holds, on a loop, and the entire panel
 * is the Order button — someone walking up presses the middle of the screen,
 * not a target. The gold button is there to say what pressing it does, not
 * because it is the only thing that works.
 *
 * The loops carry no audio track at all, so there is no sound control: a
 * button that cannot do anything is worse on a public screen than no button.
 * Muted is also the only state any browser will autoplay from.
 */
export default function AttractScreen({
  settings,
  ads,
  deviceName,
  closedMessage,
  onStart,
}: {
  settings: KioskSettings;
  ads: KioskAd[];
  /** Which panel this is, for whoever is installing four of them. */
  deviceName?: string;
  /** Set when this panel is not taking orders. Replaces the Order button. */
  closedMessage?: string;
  onStart: () => void;
}) {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const slides = ads.length > 0 ? ads : [];
  const ad: KioskAd | undefined = slides[index];

  const next = useCallback(() => {
    setIndex((i) => (slides.length === 0 ? 0 : (i + 1) % slides.length));
  }, [slides.length]);

  /* One slide never advances — the timer would just re-mount the same video
     every few seconds and restart it mid-shot. */
  useEffect(() => {
    if (slides.length < 2 || !ad) return;
    const seconds = ad.duration_seconds > 0 ? ad.duration_seconds : AD_FALLBACK_SECONDS;
    // A video with no stated length runs to its own end instead; see onEnded.
    if (ad.media_type === "video" && ad.duration_seconds <= 0) return;
    const timer = setTimeout(next, seconds * 1000);
    return () => clearTimeout(timer);
  }, [ad, next, slides.length]);

  /* Kicked on every slide: a fresh <video> element does not always autoplay on
     its own once the page has been up for hours. */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.play().catch(() => { /* a panel that refuses autoplay still shows the poster */ });
  }, [index]);

  const headline = ad?.headline || "";
  const subline = ad?.subline || "";

  return (
    <div
      className={`w-full h-full relative overflow-hidden ${closedMessage ? "" : "cursor-pointer"}`}
      style={{ background: KIOSK.night }}
      onClick={closedMessage ? undefined : onStart}
    >
      {/* ─── The ad itself ─── */}
      <div className="absolute inset-0">
        {ad?.media_type === "video" && ad.media_url ? (
          <video
            key={ad.id}
            ref={videoRef}
            src={ad.media_url}
            poster={ad.poster_url || undefined}
            autoPlay
            muted
            playsInline
            loop={slides.length < 2}
            onEnded={slides.length > 1 ? next : undefined}
            className="w-full h-full object-cover"
          />
        ) : ad?.media_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img key={ad.id} src={ad.media_url} alt="" className="w-full h-full object-cover" />
        ) : (
          /* Nothing loaded yet in admin. The screen still invites a press
             rather than standing there black and looking broken. */
          <div className="w-full h-full" style={{ background: `linear-gradient(160deg, #1c1c1c, ${KIOSK.night})` }} />
        )}
      </div>

      {/* Top and bottom are darkened so the wordmark and the button stay legible
          whatever photograph is behind them. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.22) 32%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.92) 100%)",
        }}
      />

      {/* ─── Foreground ─── */}
      <div className="absolute inset-0 flex flex-col text-white p-[3vh]">
        <div className="flex items-start justify-between">
          <KioskWordmark
            name={settings.brand_name}
            subtitle={settings.brand_subtitle}
            logoUrl={settings.logo_url || undefined}
            size="lg"
          />
          {/* Faint on purpose. It is for the person installing the fourth panel
              and wondering which one they are standing at, not for a customer. */}
          {deviceName && (
            <span className="text-[1.3vh] font-semibold text-white/40 mt-[0.6vh]">
              {deviceName}
            </span>
          )}
        </div>

        {headline && (
          <div className="mt-[3.5vh] text-center px-[1vh]">
            <h1
              className="font-black uppercase leading-[0.95] text-[5.4vh]"
              style={{ textShadow: "0 0.3vh 1.6vh rgba(0,0,0,0.55)" }}
            >
              {headline}
            </h1>
            {subline && (
              <p
                className="mt-[1.6vh] font-semibold text-[2.3vh] text-white/95"
                style={{ textShadow: "0 0.2vh 1vh rgba(0,0,0,0.6)" }}
              >
                {subline}
              </p>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* ─── The invitation, or the reason there is not one ─── */}
        {closedMessage ? (
          <div
            className="w-full rounded-[2.4vh] flex items-center justify-center px-[3vh] py-[3.5vh]"
            style={{ background: "rgba(255,255,255,0.1)", border: "0.18vh solid rgba(255,255,255,0.3)" }}
          >
            <p className="text-center font-bold text-[2.6vh] leading-snug text-white/95">
              {closedMessage}
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="w-full rounded-[2.4vh] flex items-center justify-center gap-[1.6vh] font-black active:scale-[0.97] transition-transform"
              style={{
                background: KIOSK.gold,
                color: KIOSK.onGold,
                height: "10vh",
                fontSize: "4.2vh",
                boxShadow: "0 1.4vh 3.6vh rgba(0,0,0,0.45)",
              }}
            >
              {settings.order_button_text}
              <ChevronRight strokeWidth={3} className="w-[4.4vh] h-[4.4vh]" />
            </button>

            <p className="text-center mt-[1.8vh] text-[1.9vh] font-medium text-white/85">
              {settings.touch_hint}
            </p>
          </>
        )}

        {settings.privilege_enabled && settings.privilege_strip && (
          <div
            className="mt-[2.2vh] rounded-[1.4vh] flex items-center justify-center gap-[1.2vh] py-[1.5vh] px-[2vh]"
            style={{ background: "rgba(255,255,255,0.09)", border: "0.13vh solid rgba(255,198,41,0.45)" }}
          >
            <CreditCard style={{ color: KIOSK.gold }} className="w-[2.2vh] h-[2.2vh]" />
            <p className="text-[1.75vh] font-semibold text-white/95">{settings.privilege_strip}</p>
          </div>
        )}

        {/* ─── Which ad this is ─── */}
        {slides.length > 1 && (
          <div className="mt-[2.2vh] flex items-center justify-center gap-[1.4vh]">
            <div className="flex items-center gap-[0.8vh]">
              {slides.map((s, i) => (
                <span
                  key={s.id}
                  className="rounded-full transition-all"
                  style={{
                    width: i === index ? "1.5vh" : "1vh",
                    height: "1vh",
                    background: i === index ? "#fff" : "rgba(255,255,255,0.4)",
                  }}
                />
              ))}
            </div>
            <span className="text-[1.35vh] font-medium text-white/60">
              Ad {index + 1} of {slides.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
