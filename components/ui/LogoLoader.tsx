"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Full-screen branded splash shown on a cold page load. It renders during SSR
 * (so it's visible on first paint, no blank flash) and fades out once the page
 * has loaded. Shows once per browser session so internal navigations stay snappy.
 */
export default function LogoLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Already shown this session → don't splash again.
    if (sessionStorage.getItem("tio-splash-shown")) {
      setVisible(false);
      return;
    }

    const start = Date.now();
    const MIN_MS = 600; // let the logo animation breathe

    const hide = () => {
      sessionStorage.setItem("tio-splash-shown", "1");
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_MS - elapsed);
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
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
          aria-hidden="true"
        >
          <div className="relative flex items-center justify-center">
            {/* Spinning ring around the logo */}
            <span className="loader-ring absolute w-28 h-28" />
            <span className="loader-logo relative w-20 h-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/two-in-one.png"
                alt="Two In One"
                className="w-full h-full object-contain"
              />
            </span>
          </div>
          <p className="mt-6 text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400">
            Two In One Order
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
