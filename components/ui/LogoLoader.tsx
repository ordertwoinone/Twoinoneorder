"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Mobile splash screen — shows the logo centered on a plain white background
 * when the site is first opened (like a native app), then fades out once the
 * page has loaded. Renders during SSR so it's visible on first paint, and only
 * shows once per browser session. Mobile only; desktop never sees it.
 */
export default function LogoLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("tio-splash-shown")) {
      setVisible(false);
      return;
    }

    const start = Date.now();
    const MIN_MS = 700; // keep the logo on screen long enough to read

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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-white sm:hidden"
          aria-hidden="true"
        >
          <motion.img
            src="/logos/two-in-one.png"
            alt="Two In One Order"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-44 h-44 object-contain"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
