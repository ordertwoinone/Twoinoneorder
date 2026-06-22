"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

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

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export default function PwaProvider() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [iosHint, setIosHint] = useState(false);

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

  // Android / Chromium install flow.
  // `beforeinstallprompt` can fire BEFORE React mounts, so an inline <head>
  // script (see layout) stashes it on window.deferredInstallPrompt. We read
  // that here and also keep listening in case it fires later.
  useEffect(() => {
    function offer() {
      if (isStandalone() || recentlyDismissed()) return;
      const evt = (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent })
        .deferredInstallPrompt;
      if (evt) {
        setDeferred(evt);
        setShowBanner(true);
      }
    }
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      (window as unknown as { deferredInstallPrompt?: Event }).deferredInstallPrompt = e;
      offer();
    }

    offer(); // event may already have been captured before mount
    window.addEventListener("pwa-installable", offer);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => setShowBanner(false));
    return () => {
      window.removeEventListener("pwa-installable", offer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  // iOS has no beforeinstallprompt — offer manual "Add to Home Screen" guidance.
  useEffect(() => {
    if (isIos() && !isStandalone() && !recentlyDismissed()) {
      const t = setTimeout(() => {
        setIosHint(true);
        setShowBanner(true);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = useCallback(() => {
    setShowBanner(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  const install = useCallback(async () => {
    const evt =
      deferred ||
      (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent })
        .deferredInstallPrompt;
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    (window as unknown as { deferredInstallPrompt?: null }).deferredInstallPrompt = null;
    setDeferred(null);
    setShowBanner(false);
  }, [deferred]);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="fixed left-3 right-3 z-[60] sm:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
          role="dialog"
          aria-label="Install app"
        >
          <div className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.16)]">
            <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="Two In One" className="w-full h-full object-contain" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold text-gray-900 leading-tight">
                Install Two In One
              </p>
              {iosHint ? (
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5 flex items-center flex-wrap gap-1">
                  Tap <Share size={12} className="inline text-orange-600" /> then
                  <span className="font-semibold text-gray-700">Add to Home Screen</span>
                  <Plus size={12} className="inline text-orange-600" />
                </p>
              ) : (
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                  Add to your home screen for a faster, app-like experience.
                </p>
              )}
            </div>

            {!iosHint && (
              <button
                onClick={install}
                className="shrink-0 inline-flex items-center gap-1.5 text-white text-xs font-bold px-3.5 py-2 rounded-full active:scale-95 transition-transform"
                style={{ background: "#ea580c", boxShadow: "0 4px 14px rgba(234,88,12,0.4)" }}
              >
                <Download size={14} />
                Install
              </button>
            )}

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
  );
}
