"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The alert a screen sounds when an order arrives.
 *
 * Synthesised rather than played from a file, so no screen carries an audio
 * asset it has to download before it can make a noise — which on a kitchen
 * tablet is the difference between hearing the first order of the day and not.
 *
 * It runs for about four and a half seconds at close to full scale. That is
 * deliberate and it is not politeness: the room it has to carry across has an
 * extractor fan in it and somebody with their back to the screen.
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

  /**
   * When the burst now sounding will finish, on the wall clock.
   *
   * Deliberately Date.now() and not ctx.currentTime. An AudioContext that the
   * browser has suspended stops advancing its own clock, so a guard written
   * against it stays permanently "still playing" once the tab has been idle —
   * and every alert after that is silently swallowed. That is most of "the
   * alert sometimes does not work".
   */
  const untilRef = useRef(0);

  /** Schedules the burst on a context that is known to be running. */
  const play = useCallback((ctx: AudioContext) => {

    /*
     * Long and loud, because of the room it has to carry across.
     *
     * The first version was a polite two-note ping, about a third of a second
     * at a quarter of full scale. That is right for a phone on a desk and
     * useless over an extractor fan with a pan going — the alert was there and
     * nobody heard it. This is a repeating figure that runs for four and a half
     * seconds and is loud enough to be noticed from the other side of a
     * kitchen: long enough that somebody walking back to the pass catches it,
     * short enough that it has stopped before it becomes the thing everybody
     * wants switched off.
     */
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    const start = ctx.currentTime + 0.02;
    /* A rising third, then a fall. Three notes are recognisable as a phrase
       where two are just a beep, and a phrase is what carries through noise —
       the ear picks out the shape long after the volume is lost. */
    const phrase = [880, 1174.7, 1567.98];
    const noteLength = 0.16;
    const gap = 0.05;
    const phraseLength = phrase.length * (noteLength + gap) + 0.35;
    const repeats = 6;

    for (let r = 0; r < repeats; r += 1) {
      phrase.forEach((freq, i) => {
        const at = start + r * phraseLength + i * (noteLength + gap);

        /* Two oscillators an octave apart rather than one. A single sine is
           a pure tone and a kitchen swallows it; the octave gives the note
           edges the ear can find. Triangle for the body because a square at
           this volume is genuinely unpleasant to stand next to all day. */
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.85, at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + noteLength + 0.12);
        gain.connect(master);

        for (const [wave, mul, level] of [
          ["triangle", 1, 1],
          ["sine", 2, 0.45],
        ] as const) {
          const osc = ctx.createOscillator();
          osc.type = wave;
          osc.frequency.value = freq * mul;
          const sub = ctx.createGain();
          sub.gain.value = level;
          osc.connect(sub).connect(gain);
          osc.start(at);
          osc.stop(at + noteLength + 0.14);
        }
      });
    }

    untilRef.current = Date.now() + repeats * phraseLength * 1000;
  }, []);

  const chime = useCallback(() => {
    const ctx = context();
    if (!ctx) return;

    /* A burst already going. A second order landing mid-alert should not start
       a second one on top of it — two of these at once is not twice as easy to
       hear, it is mush. The one already sounding says the same thing. */
    if (Date.now() < untilRef.current) return;

    /*
     * Woken first, every time.
     *
     * Chrome suspends an AudioContext on a tab that has been idle, and a
     * kitchen display is idle by definition between orders. Resuming only when
     * the button was pressed meant the alert worked for the first few tickets
     * of a shift and then quietly stopped — which is the worst way for an
     * alarm to fail, because the screen goes on claiming it is armed.
     *
     * resume() is a promise, so the notes are scheduled after it settles.
     * Suspended is the common case here, not the exception.
     */
    if (ctx.state === "suspended") {
      ctx.resume().then(() => play(ctx)).catch(() => {});
    } else {
      play(ctx);
    }
  }, [context, play]);

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

    /* Not once. The context can be suspended again at any point — a tab left
       in the background, a tablet that slept — so anything that says somebody
       is at the screen is taken as a chance to wake it. Cheap when it is
       already running: resume() on a running context resolves immediately. */
    const wake = () => { context()?.resume().catch(() => {}); };
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [context, storageKey]);

  return { soundOn, toggle, chime };
}
