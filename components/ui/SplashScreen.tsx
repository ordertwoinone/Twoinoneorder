"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * Mobile splash screen — shows when the site is first opened (like a native
 * app), then fades out once the page has loaded. Renders during SSR so it's
 * visible on first paint, and only shows once per browser session. Mobile
 * only; desktop never sees it.
 *
 * It used to orbit a ring of food emoji around the brand mark. That was two
 * animations and a logo where one picture says it better, so the artwork from
 * admin → Settings → Splash Screen is all that is left: it eases in, holds, and
 * gets out of the way. The image is the whole screen, so it is worth preloading
 * — see the <link rel="preload"> in app/layout.tsx.
 */

export default function SplashScreen({
  imageUrl,
  siteName = "Two In One",
}: {
  /** Artwork from admin → Settings, already defaulted by lib/site-flags. */
  imageUrl: string;
  siteName?: string;
}) {
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (sessionStorage.getItem("tio-splash-shown")) {
      setVisible(false);
      return;
    }

    const start = Date.now();
    // Long enough to read the artwork, short enough not to be in the way.
    const MIN_MS = 1600;

    const hide = () => {
      sessionStorage.setItem("tio-splash-shown", "1");
      const wait = Math.max(0, MIN_MS - (Date.now() - start));
      setTimeout(() => setVisible(false), wait);
    };

    if (document.readyState === "complete") hide();
    else window.addEventListener("load", hide);

    // Never let the splash get stuck.
    const safety = setTimeout(() => {
      sessionStorage.setItem("tio-splash-shown", "1");
      setVisible(false);
    }, 4000);

    return () => {
      window.removeEventListener("load", hide);
      clearTimeout(safety);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-white px-8 sm:hidden"
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            src={imageUrl}
            alt={siteName}
            initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[340px] max-h-[70vh] object-contain"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
