"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus, Download, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "other";

const DISMISS_KEY = "tio-install-dismissed";
const DISMISS_DAYS = 14;

function recentlyDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as desktop Safari; detect touch Macs too.
  const iPadOS = /macintosh/i.test(ua) && typeof document !== "undefined" && "ontouchend" in document;
  if (/iphone|ipad|ipod/i.test(ua) || iPadOS) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

// On iOS every browser is WebKit, but the "Add to Home Screen" entry point
// differs between Safari and Chrome/Edge/Firefox.
function detectIosBrowser(): "safari" | "chrome" | "other" {
  if (typeof navigator === "undefined") return "safari";
  const ua = navigator.userAgent;
  if (/crios/i.test(ua)) return "chrome";
  if (/fxios|edgios/i.test(ua)) return "other";
  return "safari";
}

function getWindowPrompt(): BeforeInstallPromptEvent | null {
  return (
    (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent })
      .deferredInstallPrompt || null
  );
}

export default function PwaProvider() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [iosBrowser, setIosBrowser] = useState<"safari" | "chrome" | "other">("safari");

  // Register the service worker.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures are non-fatal */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  // Decide whether/how to surface the install banner.
  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    const plat = detectPlatform();
    setPlatform(plat);
    if (plat === "ios") setIosBrowser(detectIosBrowser());

    // Chromium: the event may have been captured before mount (inline head
    // script stashes it on window.deferredInstallPrompt). Only auto-show the
    // banner when a real native prompt exists — otherwise the "Get App" button
    // (in the menu) is the entry point, so we don't nag on iOS.
    function offer() {
      if (isStandalone() || recentlyDismissed()) return;
      const evt = getWindowPrompt();
      if (!evt) return;
      setDeferred(evt);
      setShowBanner(true);
    }
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      (window as unknown as { deferredInstallPrompt?: Event }).deferredInstallPrompt = e;
      offer();
    }

    window.addEventListener("pwa-installable", offer);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setShowBanner(false);
      setGuideOpen(false);
    });

    offer(); // shows the banner only if a prompt was already captured

    return () => {
      window.removeEventListener("pwa-installable", offer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const dismiss = useCallback(() => {
    setShowBanner(false);
    setGuideOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  // Never a dead end: fire the native prompt if we have it, otherwise open the
  // platform-specific manual instructions.
  const handleInstall = useCallback(async () => {
    const evt = deferred || getWindowPrompt();
    if (evt) {
      try {
        await evt.prompt();
        const choice = await evt.userChoice;
        (window as unknown as { deferredInstallPrompt?: null }).deferredInstallPrompt = null;
        setDeferred(null);
        if (choice.outcome === "accepted") setShowBanner(false);
        return;
      } catch {
        /* prompt unavailable/used — fall through to manual steps */
      }
    }
    setGuideOpen(true);
  }, [deferred]);

  // Lets a "Get App" button anywhere in the UI trigger the install flow.
  useEffect(() => {
    if (isStandalone()) return;
    const open = () => handleInstall();
    window.addEventListener("tio-open-install", open);
    return () => window.removeEventListener("tio-open-install", open);
  }, [handleInstall]);

  return (
    <>
      <AnimatePresence>
        {showBanner && !guideOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className={`fixed z-[60] left-3 right-3 bottom-[calc(env(safe-area-inset-bottom,0px)_+_76px)] sm:left-auto sm:right-4 sm:bottom-4 sm:w-[360px] ${
              deferred ? "" : "sm:hidden"
            }`}
            role="dialog"
            aria-label="Install app"
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.16)]">
              <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192.png" alt="Two In One Order" className="w-full h-full object-contain" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-extrabold text-gray-900 leading-tight">
                  Install Two In One Order
                </p>
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                  Install the app for a faster, full-screen experience.
                </p>
              </div>

              <button
                onClick={handleInstall}
                className="shrink-0 inline-flex items-center gap-1.5 text-white text-xs font-bold px-3.5 py-2 rounded-full active:scale-95 transition-transform"
                style={{ background: "#ea580c", boxShadow: "0 4px 14px rgba(234,88,12,0.4)" }}
              >
                <Download size={14} />
                Install
              </button>

              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 active:scale-90 transition"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual install guide — shown when no one-tap prompt is available
          (always on iOS; on Android before Chrome offers the native prompt). */}
      <AnimatePresence>
        {guideOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[70]"
              onClick={() => setGuideOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed left-0 right-0 bottom-0 z-[71] bg-white rounded-t-3xl sm:mx-auto sm:bottom-6 sm:w-[420px] sm:rounded-3xl sm:shadow-2xl"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
              role="dialog"
              aria-label="How to install"
            >
              <div className="px-5 pt-3">
                <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/icon-192.png" alt="Two In One" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-gray-900">Add to Home Screen</p>
                    <p className="text-[11px] text-gray-500">Install Two In One Order as an app</p>
                  </div>
                  <button
                    onClick={() => setGuideOpen(false)}
                    aria-label="Close"
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                <ol className="space-y-3 pb-2">
                  {platform === "ios" && iosBrowser === "safari" && (
                    <>
                      <Step n={1}>
                        Tap the <Share size={14} className="inline text-orange-600 -mt-0.5" /> <b>Share</b>{" "}
                        button in Safari&apos;s toolbar.
                      </Step>
                      <Step n={2}>
                        Scroll down and tap <b>Add to Home Screen</b>{" "}
                        <Plus size={14} className="inline text-orange-600 -mt-0.5" />.
                      </Step>
                      <Step n={3}>
                        Tap <b>Add</b> in the top-right corner.
                      </Step>
                    </>
                  )}

                  {platform === "ios" && iosBrowser !== "safari" && (
                    <>
                      <Step n={1}>
                        Tap the <Share size={14} className="inline text-orange-600 -mt-0.5" /> <b>Share</b>{" "}
                        button (in the address bar or the <MoreVertical size={13} className="inline text-orange-600 -mt-0.5" /> menu).
                      </Step>
                      <Step n={2}>
                        Choose <b>Add to Home Screen</b>{" "}
                        <Plus size={14} className="inline text-orange-600 -mt-0.5" />.
                      </Step>
                      <Step n={3}>
                        Tap <b>Add</b> to confirm.
                      </Step>
                    </>
                  )}

                  {platform !== "ios" && (
                    <>
                      <Step n={1}>
                        Tap the <MoreVertical size={14} className="inline text-orange-600 -mt-0.5" /> <b>menu</b>{" "}
                        in the top-right of Chrome.
                      </Step>
                      <Step n={2}>
                        Tap <b>Install app</b> (or <b>Add to Home screen</b>).
                      </Step>
                      <Step n={3}>
                        Confirm with <b>Install</b>.
                      </Step>
                    </>
                  )}
                </ol>

                {platform === "ios" && iosBrowser !== "safari" && (
                  <p className="text-[11px] text-gray-400 leading-snug mt-1 mb-1">
                    Tip: if you don&apos;t see <b>Add to Home Screen</b>, open this page in{" "}
                    <b>Safari</b> instead — the option is always there.
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center mt-0.5"
        style={{ background: "#ea580c" }}
      >
        {n}
      </span>
      <span className="text-[13px] text-gray-700 leading-relaxed">{children}</span>
    </li>
  );
}
