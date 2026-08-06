"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * Mobile splash screen — shows when the site is first opened (like a native
 * app), then fades out once the page has loaded. Renders during SSR so it's
 * visible on first paint, and only shows once per browser session. Mobile
 * only; desktop never sees it.
 *
 * The sequence: a ring of food items circles the centre, then draws in and
 * hands over to the logo. Emoji rather than photos on purpose — they paint
 * instantly with zero network cost, which is the whole point of a splash.
 */

const FOOD = ["🍔", "🍟", "🍕", "🌯", "🥪", "🍗", "☕", "🥤"];

const RADIUS = 78;      // px from centre to each food item
const ORBIT_MS = 1150;  // how long the ring spins before the logo takes over

export default function LogoLoader({
  logoUrl = "/logos/two-in-one.png",
  siteName = "Two In One",
}: {
  /** Brand mark from admin → Header / Settings, so the splash matches the site. */
  logoUrl?: string;
  siteName?: string;
}) {
  const [visible, setVisible] = useState(true);
  const [logoIn, setLogoIn] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (sessionStorage.getItem("tio-splash-shown")) {
      setVisible(false);
      return;
    }

    const start = Date.now();
    // Long enough for the ring to spin and the logo to land — anything
    // shorter and the animation gets cut off mid-way.
    const MIN_MS = 2000;

    const toLogo = setTimeout(() => setLogoIn(true), ORBIT_MS);

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
    }, 4500);

    return () => {
      window.removeEventListener("load", hide);
      clearTimeout(toLogo);
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
          <div className="relative w-[220px] h-[220px] flex items-center justify-center">
            {/* Orbiting food ring. The whole ring turns; each item turns back
                by the same amount so the food stays upright as it travels. */}
            {!reduceMotion && (
              <motion.div
                className="absolute inset-0"
                initial={{ rotate: 0, opacity: 0, scale: 0.9 }}
                animate={
                  logoIn
                    ? { rotate: 300, opacity: 0, scale: 0.55 }
                    : { rotate: 300, opacity: 1, scale: 1 }
                }
                transition={{
                  rotate: { duration: 2.6, ease: "linear" },
                  opacity: logoIn ? { duration: 0.4 } : { duration: 0.35 },
                  scale: { duration: 0.5, ease: "easeIn" },
                }}
              >
                {/* Faint track the food rides on — same radius as the items. */}
                <div
                  className="absolute rounded-full border border-dashed border-orange-100"
                  style={{ inset: 220 / 2 - RADIUS }}
                />

                {FOOD.map((food, i) => {
                  const angle = (360 / FOOD.length) * i;
                  return (
                    <div
                      key={food}
                      className="absolute top-1/2 left-1/2 w-0 h-0"
                      style={{
                        transform: `rotate(${angle}deg) translateY(-${RADIUS}px)`,
                      }}
                    >
                      <div className="absolute -translate-x-1/2 -translate-y-1/2">
                        <motion.span
                          className="block text-[26px] leading-none"
                          initial={{ rotate: -angle }}
                          animate={{ rotate: -angle - 300 }}
                          transition={{ duration: 2.6, ease: "linear" }}
                        >
                          {food}
                        </motion.span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Logo — lands in the middle once the ring closes in. */}
            <motion.img
              src={logoUrl}
              alt={siteName}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={
                logoIn || reduceMotion
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 0.5 }
              }
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="relative w-32 h-32 object-contain"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
