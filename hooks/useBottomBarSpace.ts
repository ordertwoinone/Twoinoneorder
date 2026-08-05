"use client";
import { useEffect } from "react";

/**
 * Reserves room above the bottom tab bar while a page's floating cart bar is on
 * screen.
 *
 * Anything else that docks to the bottom — the install prompt — measures from
 * `--bottom-stack + --cart-bar-space`, so it stacks above the cart bar instead
 * of landing on top of it. The variable clears on unmount, and only one such
 * bar exists per page, so there is nothing to reference-count.
 */
export function useBottomBarSpace(height: number) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--cart-bar-space", `${height}px`);
    return () => {
      root.style.removeProperty("--cart-bar-space");
    };
  }, [height]);
}
