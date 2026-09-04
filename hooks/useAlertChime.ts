"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The two-tone chime a screen makes when an order arrives.
 *
 * Synthesised rather than played from a file, so no screen carries an audio
 * asset it has to download before it can make a noise — which on a kitchen
 * tablet is the difference between hearing the first order of the day and not.
 *
 * Opt-in, and it has to be. Browsers refuse to make a sound until the page has
 * been touched, so an alert that switched itself on would be an alert that
 * silently did nothing until somebody happened to tap something — and nobody
 * would find out until a ticket had been sitting for twenty minutes. The
 * button is that first touch, which is why the chime plays once when it is
 * pressed: it proves the speaker works before anybody relies on it.
 *
 * `storageKey` remembers the choice per screen. A kitchen display that reboots
 * overnight should come back with its alert on, not silently off — though the
 * context still starts suspended, so the first tap of the morning is what
 * actually wakes it. That is handled below rather than left to chance.
 */
export function useAlertChime(storageKey?: string) {
  const [soundOn, setSoundOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  /** The browser's AudioContext, made on demand. Null where unsupported. */
  const context = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctxRef.current = ctxRef.current ?? new Ctor();
    return ctxRef.current;
  }, []);

  const chime = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    /* Two rising notes rather than one. A single beep at kitchen volume is
       indistinguishable from every other beep in a kitchen; an interval is
       recognisable across a room and through an extractor fan. */
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      /* Ramped, not switched. An oscillator started at full gain clicks, and a
         click through a tablet speaker at volume is unpleasant enough that
         people turn the alert off. */
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }, []);

  const toggle = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      if (next) {
        // Inside the click, which is what makes the browser allow it at all.
        context()?.resume();
        chime();
      }
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, next ? "1" : "0");
        } catch {
          /* A screen with storage blocked still works; it just forgets. */
        }
      }
      return next;
    });
  }, [chime, context, storageKey]);

  /* The remembered choice, and the first touch that makes it real.

     Restoring `soundOn` from storage is not enough on its own: the context
     comes back suspended and would stay that way until somebody pressed the
     alert button, which nobody would — the button already says "on". So the
     next touch anywhere on the screen resumes it, once, and then stops
     listening. On a display nobody touches, the first ticket somebody taps to
     "Preparing" is what brings the sound up. */
  useEffect(() => {
    if (!storageKey) return;

    let remembered = false;
    try {
      remembered = localStorage.getItem(storageKey) === "1";
    } catch {
      return;
    }
    if (!remembered) return;

    setSoundOn(true);

    const wake = () => { context()?.resume(); };
    window.addEventListener("pointerdown", wake, { once: true });
    window.addEventListener("keydown", wake, { once: true });
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [context, storageKey]);

  return { soundOn, toggle, chime };
}
