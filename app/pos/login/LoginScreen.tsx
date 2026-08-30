"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Delete, Lock, ShieldCheck, User } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { PIN_MAX } from "@/lib/pos/constants";

/**
 * Staff Login.
 *
 * Two fields and a keypad. Which field the keypad is typing into is shown by
 * the ring around it, because on a tablet there is no cursor to look for and
 * "why are my digits going in the wrong box" is the single most common way a
 * login screen wastes somebody's time at the start of a shift.
 *
 * The PIN is never echoed back, and the error is the same sentence whether the
 * ID was wrong or the PIN was — the screen faces a public room, and telling the
 * difference turns it into a list of who works here.
 */
export default function LoginScreen({ branchName }: { branchName: string }) {
  const router = useRouter();
  const [field, setField] = useState<"staff" | "pin">("staff");
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function press(digit: string) {
    setError("");
    if (field === "staff") setStaffId((v) => (v.length >= 20 ? v : v + digit));
    else setPin((v) => (v.length >= PIN_MAX ? v : v + digit));
  }

  function back() {
    setError("");
    if (field === "staff") setStaffId((v) => v.slice(0, -1));
    else setPin((v) => v.slice(0, -1));
  }

  async function submit() {
    if (!staffId.trim() || !pin) {
      setError("Enter your staff ID and PIN");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pos/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffId.trim(),
          pin,
          // Purely for the session list in admin — which tablet this was.
          device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "",
        }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(body?.error || "Could not sign you in");
        setPin("");
        setField("pin");
        return;
      }
      /* refresh(), not just push(): the destination is a server component that
         reads the session, and without it the router would serve the cached
         signed-out version of the page it already has. */
      router.replace("/pos");
      router.refresh();
    } catch {
      setError("No connection to the server. Check the network.");
    } finally {
      setBusy(false);
    }
  }

  const key =
    "rounded-2xl flex items-center justify-center font-bold text-3xl active:scale-95 transition-transform select-none";

  return (
    <div className="w-full h-full flex pos-chrome">
      {/* ─── Brand side ─── */}
      <div
        className="hidden md:flex w-[42%] shrink-0 flex-col items-center justify-center px-10 text-white"
        style={{ background: `linear-gradient(165deg, ${POS.night}, #0A2A2E)` }}
      >
        <p className="text-5xl font-black tracking-tight">
          <span style={{ color: POS.brand }}>2</span>
          <span className="text-3xl align-middle">in</span>
          <span style={{ color: POS.brand }}>1</span>
        </p>
        <p className="mt-2 text-lg font-bold tracking-[0.2em]">TWO IN ONE</p>
        <p className="text-[11px] font-semibold tracking-[0.32em]" style={{ color: POS.brand }}>
          RESTAURANT
        </p>

        <h1 className="mt-12 text-4xl font-black">Welcome Back</h1>
        <span className="mt-4 mb-4 h-1 w-16 rounded-full" style={{ background: POS.brand }} />
        <p className="text-base text-white/70">Sign in to access the POS system</p>
      </div>

      {/* ─── Form side ─── */}
      <div className="flex-1 flex items-center justify-center p-6 pos-scroll" style={{ background: POS.page }}>
        <div className="w-full max-w-[430px] rounded-3xl bg-white p-7 shadow-sm border" style={{ borderColor: POS.line }}>
          <h2 className="text-center text-2xl font-black" style={{ color: POS.ink }}>
            Staff Login
          </h2>
          <p className="mt-1 text-center text-sm" style={{ color: POS.inkSoft }}>
            Enter your credentials to continue
          </p>

          <p className="mt-5 mb-1.5 text-xs font-semibold" style={{ color: POS.ink }}>
            Restaurant / Branch
          </p>
          {/* One branch for now, so it states which rather than pretending to
              be a choice that does nothing. */}
          <div
            className="rounded-xl px-3.5 py-3 text-sm font-semibold"
            style={{ background: POS.page, border: `1px solid ${POS.line}`, color: POS.ink }}
          >
            {branchName}
          </div>

          <Field
            label="User ID"
            icon={<User size={16} />}
            value={staffId}
            placeholder="Enter Staff ID"
            active={field === "staff"}
            onFocus={() => setField("staff")}
          />

          <Field
            label="PIN"
            icon={<Lock size={16} />}
            value={"•".repeat(pin.length)}
            placeholder="Enter PIN"
            active={field === "pin"}
            onFocus={() => setField("pin")}
          />

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => press(d)}
                className={key}
                style={{ height: 58, background: "#fff", border: `1px solid ${POS.line}`, color: POS.ink }}
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => { setError(""); setStaffId(""); setPin(""); setField("staff"); }}
              className={`${key} text-base`}
              style={{ height: 58, background: POS.page, color: POS.inkSoft }}
            >
              Clear
            </button>
            <button
              onClick={() => press("0")}
              className={key}
              style={{ height: 58, background: "#fff", border: `1px solid ${POS.line}`, color: POS.ink }}
            >
              0
            </button>
            <button
              onClick={back}
              aria-label="Delete the last digit"
              className={key}
              style={{ height: 58, background: POS.page, color: POS.ink }}
            >
              <Delete size={24} />
            </button>
          </div>

          <p
            className="mt-3 min-h-[20px] text-center text-[13px] font-semibold"
            style={{ color: POS.bad }}
          >
            {error}
          </p>

          <button
            onClick={submit}
            disabled={busy}
            className="mt-1 w-full rounded-xl flex items-center justify-center gap-2 text-base font-bold text-white active:scale-[0.99] transition-transform disabled:opacity-60"
            style={{ background: POS.action, height: 54 }}
          >
            <Lock size={17} />
            {busy ? "SIGNING IN…" : "LOGIN TO POS"}
          </button>

          <p className="mt-3 text-center text-[13px]" style={{ color: POS.inkSoft }}>
            Forgot your PIN?{" "}
            <span className="font-semibold" style={{ color: POS.action }}>
              Contact Admin
            </span>
          </p>

          <p
            className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold"
            style={{ color: POS.inkSoft }}
          >
            <ShieldCheck size={14} style={{ color: POS.good }} />
            Authorized staff only
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  placeholder,
  active,
  onFocus,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  active: boolean;
  onFocus: () => void;
}) {
  return (
    <div className="mt-3.5">
      <p className="mb-1.5 text-xs font-semibold" style={{ color: POS.ink }}>
        {label}
      </p>
      {/* A div, not an input: the keypad is the only way in, and a real input
          would raise the tablet's own keyboard over half the screen. */}
      <button
        onClick={onFocus}
        className="w-full rounded-xl flex items-center gap-2.5 px-3.5 text-start"
        style={{
          height: 50,
          background: "#fff",
          border: `2px solid ${active ? POS.action : POS.line}`,
          color: POS.inkSoft,
        }}
      >
        <span style={{ color: active ? POS.action : POS.inkSoft }}>{icon}</span>
        <span
          className="flex-1 truncate text-[15px] font-semibold tracking-wide"
          style={{ color: value ? POS.ink : "#B6BCC2" }}
        >
          {value || placeholder}
        </span>
      </button>
    </div>
  );
}
