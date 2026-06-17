"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Copy, Check, Sparkles } from "lucide-react";

interface Segment {
  id: string;
  label: string;
  code: string;
  color: string;
  weight: number;
  is_winning: boolean;
}

interface Settings {
  title: string;
  subtitle: string;
  button_label: string;
  spin_label: string;
  win_message: string;
  lose_message: string;
  cooldown_hours: number;
  require_email: boolean;
}

interface WheelData {
  enabled: boolean;
  settings?: Settings;
  segments?: Segment[];
}

type Prize = { label: string; code: string; is_winning: boolean };

const LS_LAST_SPIN = "spinwheel:lastSpin";
const LS_RESULT = "spinwheel:result";
const LS_EMAIL = "spinwheel:email";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Geometry: angle 0 = top, increasing clockwise ──────────────────────────
const SIZE = 300;
const CENTER = SIZE / 2;
const RW = 132; // slice radius (leaves room for the decorative rim)
const R_RING = 142; // bulb / rim radius
const R_HUB = 48; // clean centre mask radius
const BULB_COUNT = 16;

function pointOnCircle(angleDeg: number, radius: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(a), y: CENTER - radius * Math.cos(a) };
}

function slicePath(startAngle: number, endAngle: number, radius: number) {
  const start = pointOnCircle(startAngle, radius);
  const end = pointOnCircle(endAngle, radius);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function darken(hex: string, amount = 0.25) {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const num = parseInt(m, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 320,
  delay: Math.random() * 0.25,
  rotate: Math.random() * 360,
  color: ["#ea580c", "#16a34a", "#2563eb", "#db2777", "#f59e0b", "#9333ea"][i % 6],
  size: 6 + Math.random() * 6,
}));

export default function SpinWheel() {
  const [data, setData] = useState<WheelData | null>(null);
  const [open, setOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Prize | null>(null);
  const [copied, setCopied] = useState(false);
  const [locked, setLocked] = useState(false); // already played / cooldown
  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [emailError, setEmailError] = useState("");
  const settledRef = useRef(false);
  const winnerRef = useRef<Prize | null>(null);

  useEffect(() => {
    fetch("/api/spin-wheel", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: WheelData) => setData(d))
      .catch(() => setData({ enabled: false }));
  }, []);

  // Reset state each time the modal opens.
  useEffect(() => {
    if (!open || !data?.settings) return;
    setCopied(false);
    setEmailError("");
    const requireEmail = data.settings.require_email;
    const storedEmail = localStorage.getItem(LS_EMAIL);
    if (storedEmail) setEmail(storedEmail);

    // Per-browser cooldown applies to ALL modes.
    const cooldownMs = data.settings.cooldown_hours * 60 * 60 * 1000;
    const last = Number(localStorage.getItem(LS_LAST_SPIN) || 0);
    const inCooldown = cooldownMs > 0 && last > 0 && Date.now() - last < cooldownMs;

    if (inCooldown) {
      // Already spun recently — show their previous result, skip the email form.
      setLocked(true);
      setEmailDone(true);
      const stored = localStorage.getItem(LS_RESULT);
      if (stored) { try { setResult(JSON.parse(stored)); } catch { /* ignore */ } }
    } else {
      setLocked(false);
      setResult(null);
      // Email mode shows the form first; anonymous mode can spin straight away.
      setEmailDone(!requireEmail);
    }
  }, [open, data]);

  const segments = useMemo(() => data?.segments ?? [], [data]);
  const seg = segments.length > 0 ? 360 / segments.length : 0;

  const slices = useMemo(
    () =>
      segments.map((s, i) => {
        const mid = (i + 0.5) * seg;
        const flip = mid > 90 && mid < 270;
        return { ...s, path: slicePath(i * seg, (i + 1) * seg, RW), mid, flip };
      }),
    [segments, seg]
  );

  if (!data?.enabled || !data.settings || segments.length < 2) return null;
  const settings = data.settings;

  // Core spin — asks the server for an authoritative winner (enforces per-slice
  // limits + records the entry), then animates the wheel to land on it.
  async function doSpin() {
    if (spinning) return;
    setResult(null);
    setEmailError("");
    settledRef.current = false;
    setSpinning(true);

    let res: {
      winner?: { id?: string; label: string; code: string; is_winning: boolean };
      alreadyPlayed?: boolean;
      error?: string;
    };
    try {
      const mail = settings.require_email ? (localStorage.getItem(LS_EMAIL) || email).trim().toLowerCase() : "";
      res = await fetch("/api/spin-wheel/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail }),
      }).then((r) => r.json());
    } catch {
      setSpinning(false);
      setEmailError("Something went wrong. Please try again.");
      return;
    }

    if (!res?.winner || res.error) {
      setSpinning(false);
      setEmailError(res?.error || "No prizes are available right now.");
      return;
    }

    const winner = res.winner;
    winnerRef.current = { label: winner.label, code: winner.code, is_winning: winner.is_winning };

    // Already played — reveal their existing prize without spinning.
    if (res.alreadyPlayed) {
      setSpinning(false);
      setResult(winnerRef.current);
      setLocked(true);
      setEmailError("This email has already played — here's your code.");
      return;
    }

    const idx = Math.max(0, segments.findIndex((s) => s.id === winner.id));
    const turns = 6;
    const target = 360 * turns - (idx + 0.5) * seg;
    const current = rotation % 360;
    const next = rotation - current + target + (target <= current ? 360 : 0);

    localStorage.setItem(LS_LAST_SPIN, String(Date.now()));
    localStorage.setItem(LS_RESULT, JSON.stringify(winnerRef.current));
    setRotation(next);
  }

  // Centre-hub click (used in anonymous mode).
  function handleSpin() {
    if (spinning || locked || (settings.require_email && !emailDone)) return;
    doSpin();
  }

  function onSpinComplete() {
    if (settledRef.current || !spinning) return;
    settledRef.current = true;
    setSpinning(false);
    setResult(winnerRef.current);
    // Lock after a spin when there's a cooldown or an email was captured.
    if (settings.cooldown_hours > 0 || settings.require_email) setLocked(true);
  }

  function copyCode() {
    if (!result?.code) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Validate email, then spin (the server enforces the "one prize per email" rule).
  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    setEmailError("");
    if (!EMAIL_RE.test(mail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    localStorage.setItem(LS_EMAIL, mail);
    setEmailDone(true);
    await doSpin();
  }

  const needEmail = settings.require_email && !emailDone;
  const won = result?.is_winning && result?.code;
  const showConfetti = !!won && !spinning;
  const hubDisabled = spinning || locked || needEmail;

  return (
    <>
      {/* ── Floating button (bottom-left) ─────────────────────── */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 sm:bottom-6 sm:left-6 z-50 flex items-center gap-2 rounded-full text-white shadow-xl shadow-orange-500/40 pl-2 pr-4 py-2 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #f97316 0%, #db2777 60%, #7c3aed 100%)" }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 220, damping: 18 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label={settings.button_label}
      >
        <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/20">
          <motion.span
            className="absolute inset-0 rounded-full bg-white/30"
            animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="relative"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles size={20} />
          </motion.span>
        </span>
        <span className="text-sm font-bold whitespace-nowrap">{settings.button_label}</span>
      </motion.button>

      {/* ── Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !spinning && setOpen(false)} />

            <motion.div
              className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
              style={{ background: "linear-gradient(165deg, #1e1b4b 0%, #4c1d95 55%, #831843 100%)" }}
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <button
                onClick={() => !spinning && setOpen(false)}
                className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {/* Confetti burst */}
              {showConfetti && (
                <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                  {CONFETTI.map((c) => (
                    <motion.span
                      key={c.id}
                      className="absolute left-1/2 top-1/3 rounded-sm"
                      style={{ width: c.size, height: c.size, background: c.color }}
                      initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                      animate={{ opacity: [1, 1, 0], x: c.x, y: 260, rotate: c.rotate }}
                      transition={{ duration: 1.6, delay: c.delay, ease: "easeOut" }}
                    />
                  ))}
                </div>
              )}

              <div className="relative z-10 px-4 sm:px-6 pt-6 pb-6 text-center">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">{settings.title}</h2>
                <p className="text-xs sm:text-sm text-white/70 mt-1">{settings.subtitle}</p>

                {/* ── Wheel ───────────────────────────────────── */}
                <div className="relative mx-auto my-4 sm:my-6 w-full max-w-[280px] aspect-square">
                  <div className="absolute inset-0 rounded-full blur-2xl opacity-50" style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)" }} />

                  {/* Pointer */}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-30">
                    <svg width="34" height="40" viewBox="0 0 34 40">
                      <defs>
                        <linearGradient id="ptr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fde68a" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                      </defs>
                      <path d="M17 38 L3 8 A15 15 0 0 1 31 8 Z" fill="url(#ptr)" stroke="#fff" strokeWidth="2" />
                      <circle cx="17" cy="12" r="4" fill="#fff" />
                    </svg>
                  </div>

                  {/* Rotating wheel */}
                  <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: rotation }}
                    transition={{ duration: 4.8, ease: [0.16, 1, 0.3, 1] }}
                    onAnimationComplete={onSpinComplete}
                  >
                    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full">
                      <defs>
                        {slices.map((s, i) => (
                          <radialGradient key={s.id} id={`grad-${i}`} cx="50%" cy="50%" r="65%">
                            <stop offset="35%" stopColor={darken(s.color, 0.28)} />
                            <stop offset="100%" stopColor={s.color} />
                          </radialGradient>
                        ))}
                      </defs>
                      {slices.map((s, i) => {
                        const lp = pointOnCircle(s.mid, RW * 0.7);
                        return (
                          <g key={s.id}>
                            <path d={s.path} fill={`url(#grad-${i})`} stroke="#ffffff" strokeWidth={2.5} />
                            <text
                              x={lp.x}
                              y={lp.y}
                              fill="#fff"
                              fontSize="12"
                              fontWeight="800"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              transform={`rotate(${s.flip ? s.mid + 180 : s.mid} ${lp.x} ${lp.y})`}
                              style={{ pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.5)", letterSpacing: "0.2px" }}
                            >
                              {s.label.length > 11 ? s.label.slice(0, 10) + "…" : s.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </motion.div>

                  {/* Static decorative rim, twinkling bulbs + clean centre (no rotation) */}
                  <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                      <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fde68a" />
                        <stop offset="50%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#92400e" />
                      </linearGradient>
                    </defs>
                    <circle cx={CENTER} cy={CENTER} r={R_RING - 1} fill="none" stroke="url(#rim)" strokeWidth="12" />
                    <circle cx={CENTER} cy={CENTER} r={R_RING - 7} fill="none" stroke="#78350f" strokeWidth="1.5" opacity="0.4" />
                    {Array.from({ length: BULB_COUNT }).map((_, i) => {
                      const p = pointOnCircle((360 / BULB_COUNT) * i, R_RING - 1);
                      return (
                        <motion.circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={3.2}
                          fill="#fffbeb"
                          animate={{ opacity: [1, 0.25, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: (i % 2) * 0.5, ease: "easeInOut" }}
                        />
                      );
                    })}
                    {/* Clean centre mask so labels never collide with the hub */}
                    <circle cx={CENTER} cy={CENTER} r={R_HUB} fill="#ffffff" />
                    <circle cx={CENTER} cy={CENTER} r={R_HUB} fill="none" stroke="url(#rim)" strokeWidth="3" />
                  </svg>

                  {/* Centre hub / spin button — wrapper centres, motion only scales
                      (Framer Motion's transform would otherwise override the translate). */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[26%] h-[26%]">
                    <motion.button
                      onClick={handleSpin}
                      disabled={hubDisabled}
                      className="w-full h-full rounded-full flex items-center justify-center text-[11px] sm:text-[13px] font-extrabold text-white border-[3px] border-white shadow-xl disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg, #f97316, #db2777)" }}
                      animate={!hubDisabled ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      whileTap={!hubDisabled ? { scale: 0.9 } : undefined}
                    >
                      {spinning ? "…" : settings.spin_label}
                    </motion.button>
                  </div>
                </div>

                {/* ── State area ──────────────────────────────── */}
                {spinning ? (
                  <p className="text-sm font-semibold text-amber-200 animate-pulse">Good luck… 🤞</p>
                ) : needEmail ? (
                  <form onSubmit={submitEmail} className="space-y-2">
                    <p className="text-xs text-white/70">Enter your email to unlock your spin</p>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                      placeholder="you@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/40 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    {emailError && <p className="text-xs text-amber-300">{emailError}</p>}
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #f97316, #db2777)" }}
                    >
                      Unlock &amp; Spin 🎯
                    </button>
                  </form>
                ) : result && !spinning ? (
                  won ? (
                    <div className="rounded-2xl bg-white/10 border border-amber-300/40 p-4 backdrop-blur-sm">
                      <Gift size={26} className="mx-auto text-amber-300" />
                      <p className="text-sm font-semibold text-amber-200 mt-1">{settings.win_message}</p>
                      <p className="text-xl font-extrabold text-white">{result.label}</p>
                      <button
                        onClick={copyCode}
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/95 border-2 border-dashed border-amber-500 font-mono font-bold text-amber-700 hover:bg-white transition-colors"
                      >
                        {result.code}
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                      <p className="text-[11px] text-white/60 mt-2">Use this code at checkout</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
                      <p className="text-sm font-semibold text-white/80">{settings.lose_message}</p>
                    </div>
                  )
                ) : locked ? (
                  <p className="text-xs text-white/60">
                    You&apos;ve already spun. Come back later for another chance!
                  </p>
                ) : emailError ? (
                  <p className="text-xs text-amber-300">{emailError}</p>
                ) : (
                  <p className="text-xs text-white/60">Tap the centre to spin! 🎉</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
