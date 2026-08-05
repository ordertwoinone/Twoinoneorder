"use client";
import { useEffect } from "react";

/**
 * Reserves room above the bottom tab bar while a page's floating cart bar is on
 * screen.
 *
 * Anything else that docks to the bottom — the install prompt, the Spin & Win
 * banner — measures from `--bottom-stack + --cart-bar-space`, so it stacks
 * above the cart bar instead of landing on top of it. The height comes from
 * `--cart-bar-h` so it is stated once, in globals.css. The variable clears on
 * unmount, and only one such bar exists per page, so there is nothing to
 * reference-count.
 */
export function useBottomBarSpace() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--cart-bar-space", "var(--cart-bar-h)");
    return () => {
      root.style.removeProperty("--cart-bar-space");
    };
  }, []);
}
